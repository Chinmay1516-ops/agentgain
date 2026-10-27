"""Steps 5–6: validate, freeze, and approve buyer-specific evaluation contracts."""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import jsonschema
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser, require_role, require_buyer_owner
from config import get_settings
from database import get_db
from models import ContractStatus, EvaluationContract, EvaluationDataset, SkillPackage

router = APIRouter(prefix="/contracts", tags=["Contracts"])


def calculate_terms_hash(terms: dict) -> str:
    encoded = json.dumps(
        terms, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class EvaluationRules(BaseModel):
    min_records: int = Field(default_factory=lambda: get_settings()["MIN_EVAL_RECORDS"], ge=10, le=1000)
    min_lift_pct: float = Field(default=20.0, ge=0.0, le=100.0)  # percentage points
    min_skilled_accuracy_pct: float = Field(default=80.0, ge=0.0, le=100.0)
    max_regressions: int = Field(default=0, ge=0, le=1000)
    max_tokens_per_record: int = Field(default=1500, ge=1, le=8192)
    require_significance: bool = True
    significance_alpha: float = Field(default=0.05, gt=0.0, le=0.1)
    model_config = {"extra": "forbid"}


class FailurePolicy(BaseModel):
    # No automatic reruns in this safe MVP. Avoid selective reruns that inflate results.
    max_technical_retries: int = Field(default=0, ge=0, le=0)
    model_config = {"extra": "forbid"}


class ContractCreateRequest(BaseModel):
    skill_id: str = Field(min_length=1)
    dataset_id: str = Field(min_length=1)
    model_name: str | None = None
    evaluation_rules: EvaluationRules = Field(default_factory=EvaluationRules)
    failure_policy: FailurePolicy = Field(default_factory=FailurePolicy)
    model_config = {"extra": "forbid"}


class ContractApprovalRequest(BaseModel):
    contract_version: int = Field(ge=1)
    terms_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


def validate_dataset_schema(ds: EvaluationDataset, min_records: int):
    if not isinstance(ds.output_schema_json, dict) or ds.output_schema_json.get("type") != "object":
        raise HTTPException(422, "Dataset must have an object JSON Schema")
    try:
        jsonschema.Draft202012Validator.check_schema(ds.output_schema_json)
    except jsonschema.SchemaError as exc:
        raise HTTPException(422, f"Invalid output JSON Schema: {exc.message}") from exc
    if not isinstance(ds.baseline_agent_config, dict) or not isinstance(ds.baseline_agent_config.get("system_prompt"), str):
        raise HTTPException(422, "Baseline configuration requires system_prompt")
    if not isinstance(ds.records_json, list) or len(ds.records_json) < min_records:
        raise HTTPException(422, f"At least {min_records} checked records are required")
    for idx, row in enumerate(ds.records_json):
        if not isinstance(row, dict) or not isinstance(row.get("input"), dict) or not isinstance(row.get("checked_answer"), dict) or not row["checked_answer"]:
            raise HTTPException(422, f"Record {idx} requires input and nonempty checked_answer objects")
        try:
            jsonschema.validate(row["checked_answer"], ds.output_schema_json)
        except jsonschema.ValidationError as exc:
            raise HTTPException(422, f"Invalid checked answer in record {idx}: {exc.message}") from exc
    if calculate_terms_hash(ds.records_json) != ds.dataset_sha256:
        raise HTTPException(409, "Dataset records no longer match their recorded hash")


@router.post("/")
async def create_contract(
    request: ContractCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("buyer")),
):
    settings = get_settings()
    skill = await db.get(SkillPackage, request.skill_id)
    ds = await db.get(EvaluationDataset, request.dataset_id)
    if skill is None or ds is None:
        raise HTTPException(404, "Skill or dataset not found")
    require_buyer_owner(current_user, ds.buyer_id)
    if skill.seller_id != settings["SELLER_ID"]:
        raise HTTPException(403, "Only the configured demo merchant's skills are supported")
    if not skill.content_sha256:
        raise HTTPException(422, "Skill is missing package fingerprint")

    rules = request.evaluation_rules.model_dump()
    min_required = max(settings["MIN_EVAL_RECORDS"], rules["min_records"])
    rules["min_records"] = min_required
    validate_dataset_schema(ds, min_required)

    policy = skill.seller_eval_policy or {}
    if not isinstance(policy, dict):
        raise HTTPException(422, "Seller evaluation policy is invalid")
    try:
        policy_min = int(policy.get("min_records", 0))
        policy_max_tokens = int(policy.get("max_tokens_per_record", 8192))
    except (TypeError, ValueError) as exc:
        raise HTTPException(422, "Seller evaluation policy has invalid numeric limits") from exc
    if len(ds.records_json) < max(min_required, policy_min):
        raise HTTPException(422, "Dataset does not meet seller's minimum test size")
    if rules["max_tokens_per_record"] > policy_max_tokens:
        raise HTTPException(422, "Requested token cap exceeds seller policy")
    model_name = request.model_name or settings["ALLOWED_OLLAMA_MODELS"][0]
    if model_name not in settings["ALLOWED_OLLAMA_MODELS"]:
        raise HTTPException(422, "The selected model is not on the local allowlist")

    if skill.currency != "USD":
        raise HTTPException(422, "This single-merchant MVP accepts only USD sandbox purchases")
    try:
        price = Decimal(str(skill.price_usd))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(422, "Skill price is invalid")
    if not price.is_finite() or price <= 0 or price != price.quantize(Decimal("0.01")):
        raise HTTPException(422, "Skill price must be a positive two-decimal USD amount")

    terms = {
        "skill_id": skill.id,
        "skill_version": skill.version,
        "package_hash": skill.content_sha256,
        "seller_id": skill.seller_id,
        "buyer_id": current_user.id,
        "dataset_id": ds.id,
        "dataset_hash": ds.dataset_sha256,
        "dataset_schema_hash": calculate_terms_hash(ds.output_schema_json),
        "baseline_configuration_hash": calculate_terms_hash(ds.baseline_agent_config),
        "price": format(price, ".2f"),
        "currency": "USD",
        "model_name": model_name,
        "evaluation_rules": rules,
        "failure_policy": request.failure_policy.model_dump(),
        "grader_version": "deterministic_v2",
        "licence_hash": hashlib.sha256(skill.licence_terms.encode("utf-8")).hexdigest(),
    }
    contract = EvaluationContract(
        id=f"contract_{uuid.uuid4().hex}", buyer_id=current_user.id,
        skill_id=skill.id, skill_version=skill.version,
        skill_content_sha256=skill.content_sha256,
        dataset_id=ds.id, dataset_sha256=ds.dataset_sha256,
        model_name=model_name, scoring_rules_json=rules,
        failure_policy_json=request.failure_policy.model_dump(),
        price_usd=price, currency="USD", contract_version=1,
        terms_snapshot=terms, contract_sha256=calculate_terms_hash(terms),
        status=ContractStatus.DRAFT,
    )
    db.add(contract)
    await db.commit()
    return {"contract_id": contract.id, "contract_version": 1,
            "terms": terms, "terms_hash": contract.contract_sha256, "status": contract.status.value}


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("buyer")),
):
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")
    require_buyer_owner(current_user, contract.buyer_id)
    return {"contract_id": contract.id, "contract_version": contract.contract_version,
            "terms": contract.terms_snapshot, "terms_hash": contract.contract_sha256,
            "approved_terms_hash": contract.approved_terms_hash,
            "status": contract.status.value, "payment_state": contract.payment_state.value,
            "eval_verdict": contract.eval_verdict.value}


@router.post("/{contract_id}/approve")
async def approve_contract(
    contract_id: str,
    request: ContractApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("buyer")),
):
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")
    require_buyer_owner(current_user, contract.buyer_id)
    if request.contract_version != contract.contract_version:
        raise HTTPException(409, "Contract version does not match")
    expected_hash = calculate_terms_hash(contract.terms_snapshot)
    if expected_hash != contract.contract_sha256 or request.terms_hash != expected_hash:
        raise HTTPException(409, "Contract terms changed since review")
    if contract.status == ContractStatus.FROZEN and contract.approved_terms_hash == expected_hash:
        return {"contract_id": contract_id, "approved_terms_hash": expected_hash, "status": "FROZEN"}
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(409, "This contract cannot be approved")

    result = await db.execute(
        update(EvaluationContract).where(
            EvaluationContract.id == contract.id,
            EvaluationContract.buyer_id == current_user.id,
            EvaluationContract.status == ContractStatus.DRAFT,
            EvaluationContract.contract_sha256 == expected_hash,
        ).values(status=ContractStatus.FROZEN,
                 approved_terms_hash=expected_hash, approved_at=datetime.now(timezone.utc))
    )
    if result.rowcount != 1:
        await db.rollback()
        raise HTTPException(409, "Contract was approved or changed by another request")
    await db.commit()
    return {"contract_id": contract_id, "contract_version": contract.contract_version,
            "approved_terms_hash": expected_hash, "status": "FROZEN"}
