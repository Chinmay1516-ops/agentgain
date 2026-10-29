"""AgentGain sandbox API: skill registration, buyer task, evaluation, checkout."""
import asyncio
import contextlib
import hashlib
import json
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal

import jsonschema
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser, require_role, require_buyer_owner
from config import get_settings
from contracts import calculate_terms_hash, router as contracts_router
from database import get_db, init_db
from models import (
    SkillPackage, BuyerTaskFailure, EvaluationDataset, EvaluationContract,
    PaymentState, PurchaseMode,
)
from package_guard import PackageGuard
from verifier import DeterministicVerifier
from worker import call_local_ollama_fresh_context, claim_next_job, process_single_job
from payments import router as payments_router, payment_controller_loop
from analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # Only creates missing tables; does not migrate existing ones.
    controller_task = None
    if get_settings()["PAYMENT_CONTROLLER_ENABLED"]:
        controller_task = asyncio.create_task(payment_controller_loop())
    try:
        yield
    finally:
        if controller_task:
            controller_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await controller_task


app = FastAPI(title="AgentGain — PayPal SANDBOX", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings()["FRONTEND_ORIGINS"],
    allow_credentials=False, allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class SkillCreateRequest(BaseModel):
    id: str | None = None  # Optional for compatibility with existing seed/test scripts
    version: str = Field(min_length=1)
    seller_id: str | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    instructions_md: str = Field(min_length=1, max_length=40000)
    examples_json: list
    supported_tasks: list[str]
    price_usd: Decimal = Field(gt=Decimal("0"))
    currency: str = "USD"
    licence_terms: str = Field(min_length=1)
    seller_eval_policy: dict


class BuyerTaskAttemptRequest(BaseModel):
    buyer_id: str | None = None
    task_type: str
    model_name: str | None = None
    system_prompt: str
    raw_input_json: dict
    expected_schema_json: dict
    expected_checked_answer: dict


class DatasetUploadRequest(BaseModel):
    buyer_id: str | None = None
    origin_failure_id: str | None = None
    records_json: list[dict]
    output_schema_json: dict
    baseline_agent_config: dict


class RetryOriginalTaskRequest(BaseModel):
    contract_id: str
    failure_id: str
    fresh_input_json: dict | None = None
    buyer_feedback: str | None = Field(default=None, max_length=2000)


def only_correct_buyer(body_buyer_id: str | None, user: CurrentUser):
    if body_buyer_id and body_buyer_id != user.id:
        raise HTTPException(403, "Buyer ID must match authenticated buyer")


@app.get("/health")
async def health():
    return {"ok": True, "environment": "SANDBOX"}


@app.post("/api/skills/register", tags=["Skills"])
async def register_skill(req: SkillCreateRequest,
                         db: AsyncSession = Depends(get_db),
                         seller: CurrentUser = Depends(require_role("seller"))):
    if req.seller_id and req.seller_id != seller.id:
        raise HTTPException(403, "Seller ID must match authenticated seller")
    if req.currency != "USD":
        raise HTTPException(422, "Only USD is supported in the sandbox MVP")
    if req.price_usd != req.price_usd.quantize(Decimal("0.01")):
        raise HTTPException(422, "Price must have at most two decimal places")
    if not isinstance(req.seller_eval_policy, dict):
        raise HTTPException(422, "Invalid seller evaluation policy")
    if int(req.seller_eval_policy.get("min_records", 0)) < 0:
        raise HTTPException(422, "Invalid seller minimum records")
    # VERIFIED_WORK: validate an optional seller-defined price per accepted record.
    if "verified_work_unit_price_usd" in req.seller_eval_policy:
        try:
            unit_price = Decimal(str(req.seller_eval_policy["verified_work_unit_price_usd"]))
        except (ValueError, ArithmeticError, TypeError) as exc:
            raise HTTPException(422, "Invalid verified-work unit price") from exc
        if (not unit_price.is_finite() or unit_price <= 0
                or unit_price != unit_price.quantize(Decimal("0.01"))):
            raise HTTPException(422, "Verified-work unit price must be positive USD cents")
        req.seller_eval_policy["verified_work_unit_price_usd"] = format(unit_price, ".2f")
    content_hash = PackageGuard.validate_structured_skill(req.model_dump())
    if (await db.execute(select(SkillPackage.id).where(
        SkillPackage.content_sha256 == content_hash))).scalar_one_or_none():
        raise HTTPException(409, "This exact skill version is already registered")
    skill = SkillPackage(
        id=req.id or f"skill_{uuid.uuid4().hex}", version=req.version,
        seller_id=seller.id, title=req.title, description=req.description,
        instructions_md=req.instructions_md, examples_json=req.examples_json,
        supported_tasks=req.supported_tasks, price_usd=req.price_usd,
        currency="USD", licence_terms=req.licence_terms,
        seller_eval_policy=req.seller_eval_policy, content_sha256=content_hash,
    )
    db.add(skill)
    await db.commit()
    return {"skill_id": skill.id, "version": skill.version,
            "content_sha256": content_hash,
            "checkout_link": f"/checkout/{skill.id}?version={skill.version}"}


@app.get("/api/checkout/{skill_id}", tags=["Skills"])
async def get_checkout_skill_details(skill_id: str, db: AsyncSession = Depends(get_db)):
    skill = await db.get(SkillPackage, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")
    skill.checkout_visits = (skill.checkout_visits or 0) + 1
    await db.commit()
    return {"skill_id": skill.id, "version": skill.version,
            "seller_id": skill.seller_id, "title": skill.title,
            "description": skill.description, "price_usd": str(skill.price_usd),
            "currency": skill.currency, "content_sha256": skill.content_sha256,
            "seller_eval_policy": skill.seller_eval_policy,
            "licence_terms": skill.licence_terms, "checkout_visits": skill.checkout_visits}


@app.post("/api/buyer/attempt-task", tags=["Buyer"])
async def attempt_buyer_task(req: BuyerTaskAttemptRequest,
                             db: AsyncSession = Depends(get_db),
                             buyer: CurrentUser = Depends(require_role("buyer"))):
    only_correct_buyer(req.buyer_id, buyer)
    model_name = req.model_name or get_settings()["ALLOWED_OLLAMA_MODELS"][0]
    if model_name not in get_settings()["ALLOWED_OLLAMA_MODELS"]:
        raise HTTPException(422, "Model not allowlisted")
    try:
        jsonschema.Draft202012Validator.check_schema(req.expected_schema_json)
        jsonschema.validate(req.expected_checked_answer, req.expected_schema_json)
    except jsonschema.exceptions.SchemaError as exc:
        raise HTTPException(422, f"Invalid output schema: {exc.message}") from exc
    except jsonschema.exceptions.ValidationError as exc:
        raise HTTPException(422, f"Checked answer violates schema: {exc.message}") from exc
    result = await call_local_ollama_fresh_context(
        model_name=model_name, system_prompt=req.system_prompt,
        task_input=req.raw_input_json, output_schema=req.expected_schema_json,
    )
    passed, error = DeterministicVerifier.check_single_output(
        result["output"], req.expected_checked_answer, req.expected_schema_json,
    )
    if passed:
        return {"task_passed": True, "failure_id": None,
                "initial_agent_output": result["output"], "recommended_skill": None}
    skills = (await db.execute(select(SkillPackage))).scalars().all()
    matched = next((s for s in skills if req.task_type in (s.supported_tasks or [])), None)
    failure = BuyerTaskFailure(
        id=f"fail_{uuid.uuid4().hex}", buyer_id=buyer.id,
        task_type=req.task_type, raw_input_json=req.raw_input_json,
        expected_schema_json=req.expected_schema_json,
        checked_answer_json=req.expected_checked_answer,
        initial_agent_output=result["output"], recorded_validation_error=result["error"] or error or "Unknown failure",
        recommended_skill_id=matched.id if matched else None,
    )
    db.add(failure)
    await db.commit()
    return {"task_passed": False, "failure_id": failure.id,
            "initial_agent_output": result["output"],
            "recorded_validation_error": failure.recorded_validation_error,
            "recommended_skill": ({"skill_id": matched.id, "title": matched.title,
                                   "price_usd": str(matched.price_usd),
                                   "checkout_link": f"/checkout/{matched.id}?version={matched.version}"}
                                  if matched else None)}


@app.post("/api/datasets/prepare", tags=["Buyer"])
async def prepare_evaluation_dataset(req: DatasetUploadRequest,
                                     db: AsyncSession = Depends(get_db),
                                     buyer: CurrentUser = Depends(require_role("buyer"))):
    only_correct_buyer(req.buyer_id, buyer)
    if not get_settings()["MIN_EVAL_RECORDS"] <= len(req.records_json) <= 1000:
        raise HTTPException(422, "Evaluation dataset must have a supported number of records")
    if len(json.dumps(req.records_json, ensure_ascii=False)) > 5_000_000:
        raise HTTPException(413, "Evaluation dataset exceeds size limit")
    if not isinstance(req.output_schema_json, dict) or req.output_schema_json.get("type") != "object":
        raise HTTPException(422, "Output must use an object JSON Schema")
    try:
        jsonschema.Draft202012Validator.check_schema(req.output_schema_json)
    except jsonschema.SchemaError as exc:
        raise HTTPException(422, f"Invalid output schema: {exc.message}") from exc
    if not isinstance(req.baseline_agent_config.get("system_prompt"), str):
        raise HTTPException(422, "Baseline configuration requires system_prompt")
    PackageGuard.check_buyer_inputs_for_extraction(
        req.baseline_agent_config["system_prompt"], req.records_json
    )
    for idx, row in enumerate(req.records_json):
        if (not isinstance(row.get("input"), dict)
                or not isinstance(row.get("checked_answer"), dict)
                or not row["checked_answer"]):
            raise HTTPException(422, f"Record {idx} requires input and checked_answer")
        try:
            jsonschema.validate(row["checked_answer"], req.output_schema_json)
        except jsonschema.ValidationError as exc:
            raise HTTPException(422, f"Invalid checked answer for record {idx}: {exc.message}") from exc
    if req.origin_failure_id:
        origin = await db.get(BuyerTaskFailure, req.origin_failure_id)
        if origin is None:
            raise HTTPException(404, "Original task not found")
        require_buyer_owner(buyer, origin.buyer_id)
        if any(row["input"] == origin.raw_input_json for row in req.records_json):
            raise HTTPException(422, "Holdout records must not include the original failed input")
    ds = EvaluationDataset(
        id=f"ds_{uuid.uuid4().hex}", buyer_id=buyer.id,
        origin_failure_id=req.origin_failure_id,
        records_json=req.records_json,
        output_schema_json=req.output_schema_json,
        baseline_agent_config=req.baseline_agent_config,
        dataset_sha256=calculate_terms_hash(req.records_json),
    )
    db.add(ds)
    await db.commit()
    return {"dataset_id": ds.id, "dataset_sha256": ds.dataset_sha256,
            "record_count": len(req.records_json)}


@app.post("/api/worker/run-queued-jobs", tags=["Admin"])
async def run_queued_evaluation_jobs(
    admin: CurrentUser = Depends(require_role("admin")),
):
    """Restricted manual trigger. Normal flow uses `python worker.py` separately."""
    job_id = await claim_next_job()
    if not job_id:
        return {"processed_count": 0, "message": "No queued evaluation jobs"}
    await process_single_job(job_id)
    return {"processed_count": 1, "job_id": job_id}


@app.post("/api/buyer/retry-original-task", tags=["Buyer"])
async def retry_original_task(req: RetryOriginalTaskRequest,
                              db: AsyncSession = Depends(get_db),
                              buyer: CurrentUser = Depends(require_role("buyer"))):
    contract = await db.get(EvaluationContract, req.contract_id)
    failure = await db.get(BuyerTaskFailure, req.failure_id)
    if contract is None or failure is None:
        raise HTTPException(404, "Contract or original task not found")
    require_buyer_owner(buyer, contract.buyer_id)
    require_buyer_owner(buyer, failure.buyer_id)
    # VERIFIED_WORK purchases deliver accepted outputs, not ongoing use of the seller's skill.
    if contract.purchase_mode == PurchaseMode.VERIFIED_WORK:
        raise HTTPException(403, "Verified-work purchases deliver accepted outputs, not the skill")
    if (contract.payment_state != PaymentState.CAPTURE_COMPLETED
            or not contract.receipt_sha256
            or contract.eval_verdict.value != "PASS"):
        raise HTTPException(403, "Skill has not been paid for and unlocked")
    if failure.recommended_skill_id != contract.skill_id:
        raise HTTPException(403, "This skill was not associated with the original task")
    ds = await db.get(EvaluationDataset, contract.dataset_id)
    skill = await db.get(SkillPackage, contract.skill_id)
    if (ds is None or skill is None or ds.buyer_id != buyer.id
            or skill.version != contract.skill_version
            or skill.content_sha256 != contract.skill_content_sha256
            or PackageGuard.validate_structured_skill({
                "version": skill.version, "instructions_md": skill.instructions_md,
                "examples_json": skill.examples_json, "supported_tasks": skill.supported_tasks,
            }) != contract.skill_content_sha256):
        raise HTTPException(409, "Tested skill or dataset changed")
    target = req.fresh_input_json if req.fresh_input_json is not None else failure.raw_input_json
    result = await call_local_ollama_fresh_context(
        model_name=contract.model_name,
        system_prompt=ds.baseline_agent_config["system_prompt"],
        task_input=target, output_schema=failure.expected_schema_json,
        skill_instructions=skill.instructions_md, skill_examples=skill.examples_json,
    )
    if req.fresh_input_json is None and failure.checked_answer_json:
        passed, remaining = DeterministicVerifier.check_single_output(
            result["output"], failure.checked_answer_json, failure.expected_schema_json,
        )
        verified_against_ground_truth = True
    else:
        # Fresh task has no checked answer. Do not mislabel schema validity as correctness.
        passed, remaining, verified_against_ground_truth = None, "No checked answer for new input", False
    failure.post_purchase_output = result["output"]
    failure.post_purchase_passed = passed
    failure.post_purchase_remaining_errors = remaining
    if req.buyer_feedback is not None:
        failure.buyer_feedback = req.buyer_feedback
    await db.commit()
    return {"failure_id": failure.id, "original_error": failure.recorded_validation_error,
            "post_purchase_output": result["output"], "post_purchase_passed": passed,
            "verified_against_ground_truth": verified_against_ground_truth,
            "remaining_errors": remaining}


app.include_router(contracts_router)
app.include_router(payments_router)
app.include_router(analytics_router)
