from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import (
    SkillPackage,
    EvaluationContract,
    EvaluationRecordResult,
    BuyerTaskFailure,
    ContractStatus,
    PaymentState,
    EvalVerdict,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & AG Grid Data (Steps 12 & 17)"])


@router.get("/contracts/{contract_id}/evidence")
async def get_buyer_evidence_screen(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Step 12: Returns side-by-side baseline vs skilled record outputs for AG Grid Community."""
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")

    rows = (
        await db.execute(
            select(EvaluationRecordResult)
            .where(EvaluationRecordResult.contract_id == contract_id)
            .order_by(EvaluationRecordResult.record_index)
        )
    ).scalars().all()

    return {
        "contract_id": contract.id,
        "skill_id": contract.skill_id,
        "eval_verdict": contract.eval_verdict.value,
        "verdict_reason": contract.verdict_reason,
        "baseline_accuracy_pct": float(contract.baseline_accuracy_pct or 0),
        "skilled_accuracy_pct": float(contract.skilled_accuracy_pct or 0),
        "net_lift_pct": float(contract.net_lift_pct or 0),
        "improvements_count": contract.improvements_count,
        "regressions_count": contract.regressions_count,
        "payment_state": contract.payment_state.value,
        "ag_grid_rows": [
            {
                "record_index": r.record_index,
                "execution_order": r.execution_order,
                "input_data": r.input_data,
                "checked_answer": r.checked_answer,
                "baseline_output": r.baseline_output,
                "baseline_passed": r.baseline_passed,
                "baseline_error": r.baseline_error,
                "baseline_tokens": r.baseline_tokens,
                "baseline_ms": r.baseline_ms,
                "skilled_output": r.skilled_output,
                "skilled_passed": r.skilled_passed,
                "skilled_error": r.skilled_error,
                "skilled_tokens": r.skilled_tokens,
                "skilled_ms": r.skilled_ms,
                "comparison_status": r.comparison_status.value,
                "diff_summary": r.diff_summary,
            }
            for r in rows
        ],
    }


@router.get("/seller/{skill_id}/outcomes")
async def seller_outcomes(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Step 17: Return evaluation, payment, and post-purchase outcomes for a seller's skill."""
    skill = await db.get(SkillPackage, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")

    contracts = (
        await db.execute(
            select(EvaluationContract)
            .where(EvaluationContract.skill_id == skill_id)
            .order_by(EvaluationContract.created_at.desc())
        )
    ).scalars().all()

    post_purchase_tasks = (
        await db.execute(
            select(BuyerTaskFailure)
            .where(BuyerTaskFailure.recommended_skill_id == skill_id)
            .order_by(BuyerTaskFailure.created_at.desc())
        )
    ).scalars().all()

    return {
        "skill_id": skill_id,
        "environment_notice": "PayPal Sandbox evaluation telemetry — not labelled as proven production revenue.",
        "contract_outcomes": [
            {
                "contract_id": c.id,
                "buyer_id": c.buyer_id,
                "contract_status": c.status.value,
                "eval_verdict": c.eval_verdict.value,
                "net_lift_pct": float(c.net_lift_pct or 0),
                "payment_state": c.payment_state.value,
                "price_usd": float(c.price_usd),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in contracts
        ],
        "post_purchase_task_outcomes": [
            {
                "failure_id": t.id,
                "buyer_id": t.buyer_id,
                "initial_validation_error": t.recorded_validation_error,
                "post_purchase_passed": t.post_purchase_passed,
                "post_purchase_remaining_errors": t.post_purchase_remaining_errors,
                "buyer_feedback": t.buyer_feedback,
            }
            for t in post_purchase_tasks
            if t.post_purchase_passed is not None
        ],
    }


@router.get("/seller/{skill_id}/funnel")
async def seller_transaction_funnel(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Step 17: Return transaction-funnel counts for one seller's skill."""
    skill = await db.get(SkillPackage, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")

    contracts = (
        await db.execute(select(EvaluationContract).where(EvaluationContract.skill_id == skill_id))
    ).scalars().all()

    return {
        "skill_id": skill_id,
        "environment_notice": "Sandbox Trial & Settlement Funnel",
        "funnel": {
            "checkout_visits": skill.checkout_visits or 0,
            "contracts_created": len(contracts),
            "awaiting_approval": sum(1 for c in contracts if c.status == ContractStatus.DRAFT),
            "approved_trials": sum(1 for c in contracts if c.status in (ContractStatus.FROZEN, ContractStatus.COMPLETED)),
            "authorized_payments": sum(
                1 for c in contracts
                if c.payment_state in (PaymentState.AUTHORIZED, PaymentState.CAPTURE_COMPLETED, PaymentState.VOIDED)
            ),
            "passing_evaluations": sum(1 for c in contracts if c.eval_verdict == EvalVerdict.PASS),
            "payments_captured": sum(1 for c in contracts if c.payment_state == PaymentState.CAPTURE_COMPLETED),
            "authorizations_voided": sum(1 for c in contracts if c.payment_state == PaymentState.VOIDED),
        },
    }