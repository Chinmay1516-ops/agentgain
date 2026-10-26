import hashlib
import json
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import init_db, get_db
from models import (
    SkillPackage, BuyerTaskFailure, EvaluationDataset,
    EvaluationContract, PaymentState
)
from package_guard import PackageGuard
from verifier import DeterministicVerifier
from worker import call_local_ollama_fresh_context

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="AgentGain — Developer 1 Core API", lifespan=lifespan)


class SkillCreateRequest(BaseModel):
    id: str
    version: str = "1.0.0"
    seller_id: str
    title: str
    description: str
    instructions_md: str
    examples_json: list
    supported_tasks: list[str]
    price_usd: float
    licence_terms: str
    seller_eval_policy: dict

class BuyerTaskAttemptRequest(BaseModel):
    buyer_id: str
    task_type: str
    model_name: str = "qwen2.5:7b-instruct"
    system_prompt: str
    raw_input_json: dict
    expected_schema_json: dict
    expected_checked_answer: dict

class DatasetUploadRequest(BaseModel):
    buyer_id: str
    origin_failure_id: str | None = None
    records_json: list[dict]
    output_schema_json: dict
    baseline_agent_config: dict

class RetryOriginalTaskRequest(BaseModel):
    contract_id: str
    failure_id: str
    fresh_input_json: dict | None = None



@app.post("/api/skills/register")
async def register_skill(req: SkillCreateRequest, db: AsyncSession = Depends(get_db)):
    content_hash = PackageGuard.validate_structured_skill(req.model_dump())

    existing = await db.execute(
        select(SkillPackage).where(SkillPackage.content_sha256 == content_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Skill version with identical content hash already registered.")

    skill = SkillPackage(
        id=req.id,
        version=req.version,
        seller_id=req.seller_id,
        title=req.title,
        description=req.description,
        instructions_md=req.instructions_md,
        examples_json=req.examples_json,
        supported_tasks=req.supported_tasks,
        price_usd=req.price_usd,
        licence_terms=req.licence_terms,
        seller_eval_policy=req.seller_eval_policy,
        content_sha256=content_hash
    )
    db.add(skill)
    await db.commit()
    return {
        "skill_id": skill.id,
        "version": skill.version,
        "content_sha256": skill.content_sha256,
        "checkout_link": f"/checkout/{skill.id}?version={skill.version}"
    }



@app.post("/api/buyer/attempt-task")
async def attempt_buyer_task(req: BuyerTaskAttemptRequest, db: AsyncSession = Depends(get_db)):
    res = await call_local_ollama_fresh_context(
        model_name=req.model_name,
        system_prompt=req.system_prompt,
        task_input=req.raw_input_json,
        output_schema=req.expected_schema_json
    )
    passed, validation_err = DeterministicVerifier.check_single_output(
        res["output"], req.expected_checked_answer, req.expected_schema_json
    )
    recorded_error = res["error"] or validation_err or "Passed without error"

   
    skills_result = await db.execute(select(SkillPackage))
    all_skills = skills_result.scalars().all()
    matched_skill = next(
        (s for s in all_skills if req.task_type in (s.supported_tasks or [])),
        None
    )

    failure_id = f"fail_{uuid.uuid4().hex[:10]}"
    failure_row = BuyerTaskFailure(
        id=failure_id,
        buyer_id=req.buyer_id,
        task_type=req.task_type,
        raw_input_json=req.raw_input_json,
        expected_schema_json=req.expected_schema_json,
        initial_agent_output=res["output"],
        recorded_validation_error=recorded_error,
        recommended_skill_id=matched_skill.id if matched_skill else None
    )
    db.add(failure_row)
    await db.commit()

    return {
        "failure_id": failure_id,
        "task_passed": passed,
        "initial_agent_output": res["output"],
        "recorded_validation_error": recorded_error,
        "recommended_skill": {
            "skill_id": matched_skill.id,
            "title": matched_skill.title,
            "description": matched_skill.description,
            "price_usd": float(matched_skill.price_usd),
            "checkout_link": f"/checkout/{matched_skill.id}?version={matched_skill.version}"
        } if matched_skill else None
    }



@app.post("/api/datasets/prepare")
async def prepare_evaluation_dataset(req: DatasetUploadRequest, db: AsyncSession = Depends(get_db)):
    if len(req.records_json) < 3:
        raise HTTPException(
            status_code=400,
            detail="Evaluation dataset must contain at least 3 separate checked records."
        )


    if req.origin_failure_id:
        orig = await db.get(BuyerTaskFailure, req.origin_failure_id)
        if orig:
            for rec in req.records_json:
                if rec.get("input") == orig.raw_input_json:
                    raise HTTPException(
                        status_code=400,
                        detail="Evaluation dataset must be separate from the original failed task in Step 3."
                    )

    canonical_dataset = json.dumps(req.records_json, sort_keys=True).encode("utf-8")
    dataset_hash = hashlib.sha256(canonical_dataset).hexdigest()

    ds_id = f"ds_{uuid.uuid4().hex[:10]}"
    ds = EvaluationDataset(
        id=ds_id,
        buyer_id=req.buyer_id,
        origin_failure_id=req.origin_failure_id,
        records_json=req.records_json,
        output_schema_json=req.output_schema_json,
        baseline_agent_config=req.baseline_agent_config,
        dataset_sha256=dataset_hash
    )
    db.add(ds)
    await db.commit()

    return {
        "dataset_id": ds.id,
        "dataset_sha256": ds.dataset_sha256,
        "record_count": len(req.records_json)
    }



@app.post("/api/buyer/retry-original-task")
async def retry_original_task(req: RetryOriginalTaskRequest, db: AsyncSession = Depends(get_db)):
    contract = await db.get(EvaluationContract, req.contract_id)
    if not contract or contract.payment_state != PaymentState.CAPTURE_COMPLETED:
        raise HTTPException(
            status_code=403,
            detail="Skill reuse requires confirmed PayPal payment state CAPTURE_COMPLETED."
        )

    failure_row = await db.get(BuyerTaskFailure, req.failure_id)
    skill = await db.get(SkillPackage, contract.skill_id)
    dataset = await db.get(EvaluationDataset, contract.dataset_id)

    sys_prompt = dataset.baseline_agent_config.get("system_prompt", "")
    res = await call_local_ollama_fresh_context(
        model_name=contract.model_name,
        system_prompt=sys_prompt,
        task_input=failure_row.raw_input_json,
        output_schema=failure_row.expected_schema_json,
        skill_instructions=skill.instructions_md,
        skill_examples=skill.examples_json
    )

    try:
        import jsonschema
        jsonschema.validate(instance=res["output"], schema=failure_row.expected_schema_json)
        passed = True
        rem_err = None
    except Exception as exc:
        passed = False
        rem_err = str(exc)

    failure_row.post_purchase_output = res["output"]
    failure_row.post_purchase_passed = passed
    failure_row.post_purchase_remaining_errors = rem_err
    await db.commit()

    return {
        "failure_id": failure_row.id,
        "original_error": failure_row.recorded_validation_error,
        "post_purchase_output": res["output"],
        "post_purchase_passed": passed,
        "remaining_errors": rem_err
    }