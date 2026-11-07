"""Local evaluator; does not make PayPal requests.

For true secret isolation, run this process in a separate container with only
DB/Ollama environment variables, not API payment credentials.
"""
import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select, update
from database import AsyncSessionLocal, engine
from contracts import calculate_terms_hash
from models import (
    ContractStatus, EvaluationJob, EvaluationContract, SkillPackage,
    EvaluationDataset, EvaluationRecordResult, JobStatus, EvalVerdict, PaymentState, PurchaseMode,
)
from package_guard import PackageGuard
from verifier import DeterministicVerifier
from config import get_settings

log = logging.getLogger(__name__)


async def call_local_ollama_fresh_context(
    model_name: str,
    system_prompt: str,
    task_input: dict,
    output_schema: dict,
    skill_instructions: str | None = None,
    skill_examples: list | None = None,
) -> dict:
    settings = get_settings()
    if model_name not in settings["ALLOWED_OLLAMA_MODELS"]:
        return {
            "output": None,
            "error": "Model is not allowlisted",
            "infra_error": True,
            "tokens": 0,
            "ms": 0,
        }
    full_system = system_prompt.strip()
    if skill_instructions:
        full_system += "\n\n--- OPTIONAL SKILL INSTRUCTIONS ---\n" + skill_instructions.strip()
    if skill_examples:
        full_system += "\n\n--- SKILL EXAMPLES ---\n" + json.dumps(skill_examples, ensure_ascii=False)
    prompt_text = (
        "Produce only a JSON object satisfying this supplied schema.\n"
        + "Schema: " + json.dumps(output_schema, ensure_ascii=False)
        + "\nInput: " + json.dumps(task_input, ensure_ascii=False)
    )
    started = time.perf_counter()
    try:
        timeout = max(30, int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90")))

        ollama_auth = None
        if os.getenv("OLLAMA_PASSWORD"):
            ollama_auth = httpx.BasicAuth(
                os.getenv("OLLAMA_USERNAME", "agentgain"),
                os.environ["OLLAMA_PASSWORD"],
            )

        async with httpx.AsyncClient(
            timeout=float(timeout),
            trust_env=False,
            auth=ollama_auth,
        ) as client:
            resp = await client.post(
                settings["OLLAMA_BASE_URL"] + "/api/generate",
                json={
                    "model": model_name,
                    "system": full_system,
                    "prompt": prompt_text,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.0, "num_ctx": 2048},
                },
            )
            resp.raise_for_status()
            data = resp.json()
        tokens = int(data.get("prompt_eval_count") or 0) + int(data.get("eval_count") or 0)
        try:
            output = json.loads(data.get("response", ""))
        except (json.JSONDecodeError, TypeError):
            return {
                "output": None,
                "error": "Model output was not valid JSON",
                "infra_error": False,
                "tokens": max(tokens, 1),
                "ms": max(int((time.perf_counter() - started) * 1000), 1),
            }
        return {
            "output": output,
            "error": None,
            "infra_error": False,
            "tokens": max(tokens, 1),
            "ms": max(int((time.perf_counter() - started) * 1000), 1),
        }
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        return {
            "output": None,
            "error": (
    f"Ollama HTTP {exc.response.status_code}: {exc.response.text[:500]}"
    if isinstance(exc, httpx.HTTPStatusError)
    else f"Local model service error: {type(exc).__name__}: {exc}"
),
            "infra_error": True,
            "tokens": 0,
            "ms": max(int((time.perf_counter() - started) * 1000), 1),
        }


async def claim_next_job() -> str | None:
    async with AsyncSessionLocal() as db:
        async with db.begin():
            stmt = select(EvaluationJob).where(EvaluationJob.status == JobStatus.QUEUED)
            if engine.url.get_backend_name() == "postgresql":
                stmt = stmt.with_for_update(skip_locked=True)
            stmt = stmt.limit(1)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            if job is None:
                return None
            job.status = JobStatus.RUNNING
            job.attempt_count += 1
            job.started_at = datetime.now(timezone.utc)
            return job.id


async def process_single_job(job_id: str) -> None:
    # Step 1: Fetch contract and dataset metadata in an initial short session
    async with AsyncSessionLocal() as db:
        job = await db.get(EvaluationJob, job_id)
        if job is None or job.status != JobStatus.RUNNING:
            return
        try:
            contract = await db.get(EvaluationContract, job.contract_id)
            if not contract or contract.status != ContractStatus.FROZEN or contract.payment_state != PaymentState.AUTHORIZED:
                raise RuntimeError("Contract must be frozen and PayPal authorization confirmed")
            
            skill = await db.get(SkillPackage, contract.skill_id)
            ds = await db.get(EvaluationDataset, contract.dataset_id)
            if skill is None or ds is None:
                raise RuntimeError("Frozen skill or dataset missing")

            contract_id = contract.id
            model_name = contract.model_name
            schema = ds.output_schema_json
            prompt = ds.baseline_agent_config["system_prompt"]
            records = ds.records_json
            skill_instructions = skill.instructions_md
            skill_examples = skill.examples_json
        except Exception as exc:
            log.exception("Initialization failed for job %s", job_id)
            job.last_error = f"{type(exc).__name__}: {exc}"
            job.status = JobStatus.COMPLETED
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()
            return

    # Step 2: Evaluate records outside long-lived transactions to prevent connection timeouts
    results = []
    try:
        for index, rec in enumerate(records):
            kwargs = {
                "model_name": model_name,
                "system_prompt": prompt,
                "task_input": rec["input"],
                "output_schema": schema,
            }
            if index % 2 == 0:
                b = await call_local_ollama_fresh_context(**kwargs)
                s = await call_local_ollama_fresh_context(
                    **kwargs,
                    skill_instructions=skill_instructions,
                    skill_examples=skill_examples,
                )
                order = "BASELINE_FIRST"
            else:
                s = await call_local_ollama_fresh_context(
                    **kwargs,
                    skill_instructions=skill_instructions,
                    skill_examples=skill_examples,
                )
                b = await call_local_ollama_fresh_context(**kwargs)
                order = "SKILLED_FIRST"

            bp, be = DeterministicVerifier.check_single_output(b["output"], rec["checked_answer"], schema)
            sp, se = DeterministicVerifier.check_single_output(s["output"], rec["checked_answer"], schema)
            comp, summary = DeterministicVerifier.classify_record_pair(bp, sp)

            # Save each record result immediately in its own short-lived session
            async with AsyncSessionLocal() as db_rec:
                db_rec.add(
                    EvaluationRecordResult(
                        id=f"rec_{uuid.uuid4().hex}",
                        contract_id=contract_id,
                        record_index=index,
                        execution_order=order,
                        input_data=rec["input"],
                        checked_answer=rec["checked_answer"],
                        baseline_output=b["output"],
                        baseline_error=b["error"] or be,
                        baseline_passed=bp,
                        baseline_tokens=b["tokens"],
                        baseline_ms=b["ms"],
                        skilled_output=s["output"],
                        skilled_error=s["error"] or se,
                        skilled_passed=sp,
                        skilled_tokens=s["tokens"],
                        skilled_ms=s["ms"],
                        comparison_status=comp,
                        diff_summary=summary,
                    )
                )
                await db_rec.commit()

            results.append({
                "baseline_passed": bp,
                "skilled_passed": sp,
                "comparison_status": comp,
                "baseline_tokens": b["tokens"],
                "skilled_tokens": s["tokens"],
                "baseline_ms": b["ms"],
                "skilled_ms": s["ms"],
                "baseline_infra_error": b["infra_error"],
                "skilled_infra_error": s["infra_error"],
            })

        # Step 3: Finalize contract verdict and complete job in a final short session
        async with AsyncSessionLocal() as db_final:
            contract = await db_final.get(EvaluationContract, contract_id)
            job = await db_final.get(EvaluationJob, job_id)

            if contract.purchase_mode == PurchaseMode.VERIFIED_WORK:
                verdict = DeterministicVerifier.compute_verified_work_verdict(
                    results,
                    contract.scoring_rules_json,
                    Decimal(str(contract.unit_price_usd)),
                    contract.max_billable_records,
                )
                contract.accepted_record_count = verdict["accepted_record_count"]
                contract.payable_amount_usd = verdict["payable_amount_usd"]
            else:
                verdict = DeterministicVerifier.compute_contract_verdict(results, contract.scoring_rules_json)

            contract.eval_verdict = verdict["verdict"]
            contract.baseline_accuracy_pct = verdict.get("baseline_accuracy_pct")
            contract.skilled_accuracy_pct = verdict.get("skilled_accuracy_pct")
            contract.net_lift_pct = verdict.get("net_lift_pct")
            contract.improvements_count = verdict.get("improvements_count", 0)
            contract.regressions_count = verdict.get("regressions_count", 0)
            contract.baseline_total_tokens = verdict.get("baseline_total_tokens", 0)
            contract.skilled_total_tokens = verdict.get("skilled_total_tokens", 0)
            contract.baseline_total_ms = verdict.get("baseline_total_ms", 0)
            contract.skilled_total_ms = verdict.get("skilled_total_ms", 0)
            contract.verdict_reason = verdict["reason"]

            job.status = JobStatus.COMPLETED
            job.finished_at = datetime.now(timezone.utc)
            await db_final.commit()

    except Exception as exc:
        log.exception("Evaluation failed for job %s", job_id)
        async with AsyncSessionLocal() as db_err:
            job = await db_err.get(EvaluationJob, job_id)
            contract = await db_err.get(EvaluationContract, job.contract_id) if job else None
            if job and contract and job.status == JobStatus.RUNNING:
                job.last_error = f"{type(exc).__name__}: {exc}"
                job.status = JobStatus.COMPLETED
                job.finished_at = datetime.now(timezone.utc)
                contract.eval_verdict = EvalVerdict.TECHNICAL_ERROR
                contract.verdict_reason = "Worker failed: evaluation could not be completed"
                if contract.purchase_mode == PurchaseMode.VERIFIED_WORK:
                    contract.accepted_record_count = 0
                    contract.payable_amount_usd = Decimal("0.00")
                await db_err.commit()


async def expire_overdue_jobs():
    """Fail closed for jobs stuck RUNNING after process crash or timeout."""
    now = datetime.now(timezone.utc)
    ttl = get_settings()["MAX_JOB_RUNTIME_SECONDS"]
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(select(EvaluationJob).where(EvaluationJob.status == JobStatus.RUNNING))
        ).scalars().all()
        for job in rows:
            if not job.started_at:
                continue
            started = job.started_at.replace(tzinfo=timezone.utc) if job.started_at.tzinfo is None else job.started_at
            if (now - started).total_seconds() <= ttl:
                continue
            c = await db.get(EvaluationContract, job.contract_id)
            if not c or c.payment_state != PaymentState.AUTHORIZED or c.eval_verdict != EvalVerdict.PENDING:
                continue
            changed = await db.execute(
                update(EvaluationJob)
                .where(
                    EvaluationJob.id == job.id,
                    EvaluationJob.status == JobStatus.RUNNING,
                )
                .values(
                    status=JobStatus.COMPLETED,
                    last_error="Evaluation job exceeded configured maximum duration",
                    finished_at=now,
                )
            )
            if changed.rowcount == 1:
                c.eval_verdict = EvalVerdict.TECHNICAL_ERROR
                c.verdict_reason = "Evaluation timed out; cancellation eligible"
                await db.commit()


async def poll_queue_forever():
    if engine.url.get_backend_name() != "postgresql":
        log.warning("Running worker on SQLite; use PostgreSQL in production for SKIP LOCKED concurrency.")
    log.info("Started isolated worker (PayPal credentials not used)")
    while True:
        try:
            job_id = await claim_next_job()
            if job_id:
                await process_single_job(job_id)
            else:
                await asyncio.sleep(2)
        except Exception:
            log.exception("Worker polling error")
            await asyncio.sleep(3)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(poll_queue_forever())