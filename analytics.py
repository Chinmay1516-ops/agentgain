"""Read-only AG Grid evidence and seller statistics with mandatory access and anti-theft checks."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser, require_role, require_buyer_owner
from database import get_db
from models import (
    SkillPackage, EvaluationContract, EvaluationRecordResult,
    ContractStatus, PaymentState, EvalVerdict, PurchaseMode,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & AG Grid"])


@router.get("/contracts/{contract_id}/evidence")
async def get_buyer_evidence_screen(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    c = await db.get(EvaluationContract, contract_id)
    if c is None:
        raise HTTPException(404, "Contract not found")
    require_buyer_owner(user, c.buyer_id)
    rows = (
        await db.execute(
            select(EvaluationRecordResult)
            .where(EvaluationRecordResult.contract_id == contract_id)
            .order_by(EvaluationRecordResult.record_index)
        )
    ).scalars().all()

    # ANTI-THEFT GATE: A buyer can NEVER see skilled_output or skilled_error
    # during a failed trial or before PayPal capture is confirmed.
    # Before payment, they only see blind verification proof (boolean pass/fail, lift, tokens, ms).
    is_paid_and_unlocked = (
        c.payment_state == PaymentState.CAPTURE_COMPLETED
        and c.eval_verdict == EvalVerdict.PASS
        and bool(c.paypal_capture_id)
        and bool(c.receipt_sha256)
    )
    token_cap = int((c.scoring_rules_json or {}).get("max_tokens_per_record", 1500))

    ag_grid_rows = []
    for r in rows:
        if c.purchase_mode == PurchaseMode.VERIFIED_WORK:
            # VERIFIED_WORK: Only reveal outputs for accepted records after payment capture
            can_reveal_output = (
                is_paid_and_unlocked
                and r.skilled_passed
                and r.skilled_tokens <= token_cap
            )
            can_reveal_error = False  # Never leak rejected work or verifier value diffs
        else:
            # FULL_SKILL: Only reveal skilled outputs/errors after the full skill is paid & captured
            can_reveal_output = is_paid_and_unlocked
            can_reveal_error = is_paid_and_unlocked

        ag_grid_rows.append({
            "record_index": r.record_index,
            "execution_order": r.execution_order,
            "input_data": r.input_data,
            "checked_answer": r.checked_answer,
            "baseline_output": r.baseline_output,
            "baseline_passed": r.baseline_passed,
            "baseline_error": r.baseline_error,
            "baseline_tokens": r.baseline_tokens,
            "baseline_ms": r.baseline_ms,
            "skilled_output": r.skilled_output if can_reveal_output else None,
            "skilled_passed": r.skilled_passed,
            "skilled_error": r.skilled_error if can_reveal_error else None,
            "skilled_tokens": r.skilled_tokens,
            "skilled_ms": r.skilled_ms,
            "comparison_status": r.comparison_status.value,
            "diff_summary": r.diff_summary,
        })

    return {
        "contract_id": c.id,
        "skill_id": c.skill_id,
        "purchase_mode": c.purchase_mode.value,
        "evidence_protection_mode": "UNLOCKED_POST_CAPTURE" if is_paid_and_unlocked else "BLIND_VERIFICATION_PRE_CAPTURE",
        "accepted_record_count": (
            c.accepted_record_count if c.purchase_mode == PurchaseMode.VERIFIED_WORK else None
        ),
        "authorized_maximum_usd": (
            str(c.price_usd) if c.purchase_mode == PurchaseMode.VERIFIED_WORK else None
        ),
        "payable_amount_usd": (
            str(c.payable_amount_usd)
            if c.purchase_mode == PurchaseMode.VERIFIED_WORK and c.payable_amount_usd is not None
            else None
        ),
        "eval_verdict": c.eval_verdict.value,
        "verdict_reason": c.verdict_reason,
        "baseline_accuracy_pct": float(c.baseline_accuracy_pct) if c.baseline_accuracy_pct is not None else None,
        "skilled_accuracy_pct": float(c.skilled_accuracy_pct) if c.skilled_accuracy_pct is not None else None,
        "net_lift_pct": float(c.net_lift_pct) if c.net_lift_pct is not None else None,
        "improvements_count": c.improvements_count,
        "regressions_count": c.regressions_count,
        "payment_state": c.payment_state.value,
        "ag_grid_rows": ag_grid_rows,
    }


async def seller_skill_or_404(db: AsyncSession, skill_id: str, user: CurrentUser) -> SkillPackage:
    skill = await db.get(SkillPackage, skill_id)
    if skill is None:
        raise HTTPException(404, "Skill not found")
    if skill.seller_id != user.id:
        raise HTTPException(403, "You do not own this skill")
    return skill


@router.get("/seller/{skill_id}/outcomes")
async def seller_outcomes(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("seller")),
):
    await seller_skill_or_404(db, skill_id, user)
    contracts = (
        await db.execute(
            select(EvaluationContract)
            .where(EvaluationContract.skill_id == skill_id)
            .order_by(EvaluationContract.created_at.desc())
        )
    ).scalars().all()
    # Deliberately do NOT disclose buyer identities, private cases, answers or raw feedback.
    return {
        "skill_id": skill_id,
        "environment_notice": "PayPal SANDBOX; demonstration transactions are not revenue",
        "contract_outcomes": [
            {
                "contract_id": c.id,
                "contract_status": c.status.value,
                "eval_verdict": c.eval_verdict.value,
                "net_lift_pct": float(c.net_lift_pct) if c.net_lift_pct is not None else None,
                "payment_state": c.payment_state.value,
                "price_usd": str(c.price_usd),
                "purchase_mode": c.purchase_mode.value,
                "accepted_record_count": (
                    c.accepted_record_count if c.purchase_mode == PurchaseMode.VERIFIED_WORK else None
                ),
                "payable_amount_usd": (
                    str(c.payable_amount_usd)
                    if c.purchase_mode == PurchaseMode.VERIFIED_WORK and c.payable_amount_usd is not None
                    else None
                ),
                "captured_amount_usd": (
                    (
                        str(c.payable_amount_usd)
                        if c.purchase_mode == PurchaseMode.VERIFIED_WORK
                        else str(c.price_usd)
                    )
                    if c.payment_state == PaymentState.CAPTURE_COMPLETED
                    else None
                ),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in contracts
        ],
    }


@router.get("/seller/{skill_id}/funnel")
async def seller_transaction_funnel(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("seller")),
):
    skill = await seller_skill_or_404(db, skill_id, user)
    contracts = (
        await db.execute(select(EvaluationContract).where(EvaluationContract.skill_id == skill_id))
    ).scalars().all()
    return {
        "skill_id": skill_id,
        "environment_notice": "SANDBOX trial funnel; no proven live revenue",
        "funnel": {
            "checkout_visits": skill.checkout_visits or 0,
            "contracts_created": len(contracts),
            "awaiting_approval": sum(c.status == ContractStatus.DRAFT for c in contracts),
            "approved_trials": sum(
                c.status in (ContractStatus.FROZEN, ContractStatus.COMPLETED) for c in contracts
            ),
            "authorized_payments": sum(bool(c.paypal_authorization_id) for c in contracts),
            "passing_evaluations": sum(c.eval_verdict == EvalVerdict.PASS for c in contracts),
            "payments_captured": sum(c.payment_state == PaymentState.CAPTURE_COMPLETED for c in contracts),
            "authorizations_voided": sum(c.payment_state == PaymentState.VOIDED for c in contracts),
        },
    }