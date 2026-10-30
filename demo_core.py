"""Separate demo jobs. Never changes payment, receipt or purchase evaluation state."""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey, select, update
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from database import engine, AsyncSessionLocal
from models import Base, EvaluationContract, EvaluationDataset, SkillPackage, ContractStatus, PaymentState, PurchaseMode
from contracts import calculate_terms_hash
from payments import ensure_approved
from package_guard import PackageGuard
from verifier import DeterministicVerifier
from worker import call_local_ollama_fresh_context
from config import get_settings

class DemoRun(Base):
    __tablename__ = 'agentgain_demo_runs'
    id = Column(String(64), primary_key=True)
    contract_id = Column(String(64), ForeignKey('evaluation_contracts.id'), unique=True, nullable=False)
    buyer_id = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default='QUEUED')
    rows = Column(JSON, nullable=False, default=list)
    summary = Column(JSON, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)

async def init_demo():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def validated_inputs(db, contract_id):
    c = await db.get(EvaluationContract, contract_id)
    if not c:
        raise HTTPException(404, 'Contract not found')
    ensure_approved(c)
    if c.status != ContractStatus.FROZEN or c.payment_state != PaymentState.UNINITIALIZED or c.paypal_order_id:
        raise HTTPException(409, 'Use a frozen contract without a PayPal order for this local demo')
    if c.purchase_mode != PurchaseMode.FULL_SKILL:
        raise HTTPException(422, 'This demo supports FULL_SKILL contracts')
    ds = await db.get(EvaluationDataset, c.dataset_id)
    s = await db.get(SkillPackage, c.skill_id)
    t = c.terms_snapshot
    if not ds or not s or ds.buyer_id != c.buyer_id:
        raise HTTPException(409, 'Contract inputs unavailable')
    if (calculate_terms_hash(ds.records_json) != c.dataset_sha256
        or calculate_terms_hash(ds.output_schema_json) != t['dataset_schema_hash']
        or calculate_terms_hash(ds.baseline_agent_config) != t['baseline_configuration_hash']
        or s.version != c.skill_version or s.content_sha256 != c.skill_content_sha256
        or PackageGuard.validate_structured_skill({'version':s.version, 'instructions_md':s.instructions_md,
            'examples_json':s.examples_json, 'supported_tasks':s.supported_tasks}) != c.skill_content_sha256):
        raise HTTPException(409, 'Inputs no longer match approved contract')
    return c, ds, s

async def queue_demo(contract_id, buyer_id):
    async with AsyncSessionLocal() as db:
        c, _, _ = await validated_inputs(db, contract_id)
        if c.buyer_id != buyer_id:
            raise HTTPException(403, 'You cannot use another buyer contract')
        run = (await db.execute(select(DemoRun).where(DemoRun.contract_id == contract_id))).scalar_one_or_none()
        if run:
            return run.id
        run = DemoRun(id='demo_'+uuid.uuid4().hex, contract_id=contract_id, buyer_id=buyer_id, status='QUEUED', rows=[])
        db.add(run)
        try:
            await db.commit()
            return run.id
        except IntegrityError:
            await db.rollback()
            existing = (await db.execute(select(DemoRun).where(DemoRun.contract_id == contract_id))).scalar_one()
            return existing.id

async def claim_demo():
    async with AsyncSessionLocal() as db:
        async with db.begin():
            query = select(DemoRun).where(DemoRun.status == 'QUEUED').order_by(DemoRun.id).limit(1)
            if engine.url.get_backend_name() == 'postgresql':
                query = query.with_for_update(skip_locked=True)
            r = (await db.execute(query)).scalar_one_or_none()
            if not r:
                return None
            changed = await db.execute(update(DemoRun).where(DemoRun.id==r.id, DemoRun.status=='QUEUED')
                .values(status='RUNNING', started_at=datetime.now(timezone.utc)))
            return r.id if changed.rowcount == 1 else None

async def finish_error(run_id, message):
    async with AsyncSessionLocal() as db:
        await db.execute(update(DemoRun).where(DemoRun.id==run_id, DemoRun.status=='RUNNING')
            .values(status='TECHNICAL_ERROR', summary={'verdict':'TECHNICAL_ERROR', 'reason':message}))
        await db.commit()

async def evaluate(run_id):
    async with AsyncSessionLocal() as db:
        run = await db.get(DemoRun, run_id)
        if not run or run.status != 'RUNNING':
            return
        c, ds, skill = await validated_inputs(db, run.contract_id)
        records, schema, prompt, model, rules = ds.records_json, ds.output_schema_json, ds.baseline_agent_config['system_prompt'], c.model_name, c.scoring_rules_json
        instructions, examples = skill.instructions_md, skill.examples_json
    scores, rows = [], []
    for i, record in enumerate(records):
        args = dict(model_name=model, system_prompt=prompt, task_input=record['input'], output_schema=schema)
        if i % 2 == 0:
            baseline = await call_local_ollama_fresh_context(**args)
            skilled = await call_local_ollama_fresh_context(**args, skill_instructions=instructions, skill_examples=examples)
        else:
            skilled = await call_local_ollama_fresh_context(**args, skill_instructions=instructions, skill_examples=examples)
            baseline = await call_local_ollama_fresh_context(**args)
        bp, _ = DeterministicVerifier.check_single_output(baseline['output'], record['checked_answer'], schema)
        sp, _ = DeterministicVerifier.check_single_output(skilled['output'], record['checked_answer'], schema)
        comparison, description = DeterministicVerifier.classify_record_pair(bp, sp)
        score = dict(baseline_passed=bp, skilled_passed=sp, comparison_status=comparison,
            baseline_tokens=baseline['tokens'], skilled_tokens=skilled['tokens'],
            baseline_ms=baseline['ms'], skilled_ms=skilled['ms'],
            baseline_infra_error=baseline['infra_error'], skilled_infra_error=skilled['infra_error'])
        scores.append(score)
        # Keep skill outputs private in unpaid demos, as in existing analytics.
        rows.append(dict(record_index=i, execution_order='BASELINE_FIRST' if i%2==0 else 'SKILLED_FIRST',
            **score, description=description))
        async with AsyncSessionLocal() as db:
            await db.execute(update(DemoRun).where(DemoRun.id==run_id, DemoRun.status=='RUNNING').values(rows=rows))
            await db.commit()
    summary = DeterministicVerifier.compute_contract_verdict(scores, rules)
    async with AsyncSessionLocal() as db:
        await db.execute(update(DemoRun).where(DemoRun.id==run_id, DemoRun.status=='RUNNING')
            .values(status='COMPLETED', summary=summary))
        await db.commit()

async def expire_demo():
    cutoff = datetime.now(timezone.utc)-timedelta(seconds=get_settings()['MAX_JOB_RUNTIME_SECONDS'])
    async with AsyncSessionLocal() as db:
        await db.execute(update(DemoRun).where(DemoRun.status=='RUNNING', DemoRun.started_at < cutoff)
            .values(status='TECHNICAL_ERROR', summary={'verdict':'TECHNICAL_ERROR','reason':'Demo worker timeout or interruption. Create a new contract to retry.'}))
        await db.commit()
