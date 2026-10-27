import hashlib
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import get_current_user, CurrentUser
from models import SkillPackage, EvaluationDataset, EvaluationContract, ContractStatus

router = APIRouter(prefix="/contracts", tags=["Contracts (Step 6)"])


def calculate_terms_hash(terms: dict) -> str:
    """Return a stable SHA-256 fingerprint of fixed contract terms."""
    canonical_json = json.dumps(
        terms,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


class ContractCreateRequest(BaseModel):
    skill_id: str
    dataset_id: str
    model_name: str = "qwen2.5:7b-instruct"
    evaluation_rules: dict[str, Any] = Field(
        default_factory=lambda: {
            "min_records": 3,
            "min_lift_pct": 20.0,
            "max_regressions": 0,
            "max_tokens_per_record": 1500,
        }
    )
    failure_policy: dict[str, Any] = Field(
        default_factory=lambda: {"max_technical_retries": 1}
    )


class ContractApprovalRequest(BaseModel):
    contract_version: int = 1
    terms_hash: str = Field(min_length=64, max_length=64)


def validate_dataset_schema(dataset: EvaluationDataset) -> None:
    schema = dataset.output_schema_json
    if not isinstance(schema, dict) or schema.get("type") != "object":
        raise HTTPException(422, "Dataset output_schema_json must be a valid JSON object schema")
    if not dataset.records_json or len(dataset.records_json) < 3:
        raise HTTPException(422, "Dataset must contain at least 3 checked evaluation records")


def validate_evaluation_settings(skill: SkillPackage, evaluation_rules: dict, dataset: EvaluationDataset) -> None:
    policy = skill.seller_eval_policy or {}
    min_req = int(policy.get("min_records", 3))
    if len(dataset.records_json) < min_req:
        raise HTTPException(
            422,
            f"Dataset has {len(dataset.records_json)} records; seller policy requires at least {min_req}",
        )
    max_tok_policy = int(policy.get("max_tokens_per_record", 4000))
    req_tok = int(evaluation_rules.get("max_tokens_per_record", 1500))
    if req_tok > max_tok_policy:
        raise HTTPException(
            422,
            f"Requested max_tokens_per_record ({req_tok}) exceeds seller policy ({max_tok_policy})",
        )


@router.post("/")
async def create_contract(
    request: ContractCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    skill = await db.get(SkillPackage, request.skill_id)
    if skill is None:
        raise HTTPException(404, "Skill package not found")

    dataset = await db.get(EvaluationDataset, request.dataset_id)
    if dataset is None:
        raise HTTPException(404, "Evaluation dataset not found")

    validate_dataset_schema(dataset)
    validate_evaluation_settings(skill, request.evaluation_rules, dataset)

    if not skill.content_sha256 or not dataset.dataset_sha256:
        raise HTTPException(422, "Skill package hash or dataset hash is missing")

    try:
        price = Decimal(str(skill.price_usd))
    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(422, "Registered skill price is invalid")

    if not price.is_finite() or price <= 0:
        raise HTTPException(422, "Registered skill price must be positive")

    terms = {
        "skill_id": str(skill.id),
        "skill_version": str(skill.version),
        "package_hash": skill.content_sha256,
        "dataset_id": str(dataset.id),
        "dataset_hash": dataset.dataset_sha256,
        "price": format(price, ".2f"),
        "currency": skill.currency or "USD",
        "model_name": request.model_name,
        "evaluation_rules": request.evaluation_rules,
        "failure_policy": request.failure_policy,
        "grader_version": "deterministic_v1",
    }

    terms_hash = calculate_terms_hash(terms)
    contract_id = f"contract_{uuid.uuid4().hex[:10]}"

    contract = EvaluationContract(
        id=contract_id,
        buyer_id=current_user.id,
        skill_id=skill.id,
        skill_version=skill.version,
        skill_content_sha256=skill.content_sha256,
        dataset_id=dataset.id,
        dataset_sha256=dataset.dataset_sha256,
        model_name=request.model_name,
        scoring_rules_json=request.evaluation_rules,
        price_usd=price,
        currency=skill.currency or "USD",
        failure_policy_json=request.failure_policy,
        contract_version=1,
        terms_snapshot=terms,
        contract_sha256=terms_hash,
        approved_terms_hash=None,
        status=ContractStatus.DRAFT,
    )

    db.add(contract)
    await db.commit()
    await db.refresh(contract)

    return {
        "contract_id": contract.id,
        "contract_version": contract.contract_version,
        "terms": contract.terms_snapshot,
        "terms_hash": contract.contract_sha256,
        "status": contract.status.value,
    }


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
):
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")

    return {
        "contract_id": contract.id,
        "contract_version": contract.contract_version,
        "terms": contract.terms_snapshot,
        "terms_hash": contract.contract_sha256,
        "approved_terms_hash": contract.approved_terms_hash,
        "status": contract.status.value,
        "payment_state": contract.payment_state.value,
        "eval_verdict": contract.eval_verdict.value,
    }


@router.post("/{contract_id}/approve")
async def approve_contract(
    contract_id: str,
    request: ContractApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Step 6: Buyer approves contract terms; backend freezes the contract."""
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")

    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(409, f"Contract is already {contract.status.value}")

    if request.contract_version != contract.contract_version:
        raise HTTPException(409, "Contract version has changed")

    calculated_hash = calculate_terms_hash(contract.terms_snapshot)
    if calculated_hash != contract.contract_sha256:
        raise HTTPException(409, "Saved contract terms failed verification")

    if request.terms_hash != contract.contract_sha256:
        raise HTTPException(409, "The reviewed contract hash does not match")

    contract.approved_terms_hash = request.terms_hash
    contract.status = ContractStatus.FROZEN
    contract.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(contract)

    return {
        "contract_id": contract.id,
        "contract_version": contract.contract_version,
        "approved_terms_hash": contract.approved_terms_hash,
        "status": contract.status.value,
    }