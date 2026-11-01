"""PayPal SANDBOX purchase lifecycle: authorize, evaluate, capture or void.

No fake PayPal IDs; no client-declared verdicts; irreversible decisions are
persisted before the provider call. Any uncertain outcome remains pending.
"""
import os
import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser, require_role, require_buyer_owner
from config import get_settings
from contracts import calculate_terms_hash
from database import AsyncSessionLocal, get_db
from models import (
    ContractStatus, EvalVerdict, EvaluationContract, EvaluationJob,
    JobStatus, PaymentState, SkillPackage, WebhookEvent,
    PurchaseMode, EvaluationRecordResult, PurchaseIntent, IntentReservation, IntentStatus,
)
from package_guard import PackageGuard

log = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])


def expected_amount(contract: EvaluationContract) -> str:
    amount = Decimal(str(contract.price_usd))
    if contract.currency != "USD" or amount <= 0 or amount != amount.quantize(Decimal("0.01")):
        raise HTTPException(409, "Unsupported or invalid frozen purchase amount")
    return format(amount, ".2f")


# VERIFIED_WORK: the capture is the accepted-work bill, not the authorized maximum.
def capture_amount(contract: EvaluationContract) -> str:
    if contract.purchase_mode != PurchaseMode.VERIFIED_WORK:
        return expected_amount(contract)
    try:
        unit = Decimal(str(contract.unit_price_usd))
        bill = Decimal(str(contract.payable_amount_usd))
        accepted = contract.accepted_record_count
        maximum = contract.max_billable_records
        if (
            not unit.is_finite() or unit <= 0 or unit != unit.quantize(Decimal("0.01"))
            or not isinstance(maximum, int) or maximum <= 0
            or not isinstance(accepted, int) or not (0 < accepted <= maximum)
            or bill != unit * accepted or not bill.is_finite()
            or bill > Decimal(expected_amount(contract))
            or unit * maximum != Decimal(expected_amount(contract))
            or contract.eval_verdict != EvalVerdict.PASS
        ):
            raise ValueError("Verified-work billing does not match the approved maximum")
    except (ValueError, TypeError, ArithmeticError) as exc:
        raise HTTPException(409, "Verified-work payable amount is invalid") from exc
    return format(bill, ".2f")


async def verify_work_bill(db: AsyncSession, c: EvaluationContract) -> None:
    """Check the frozen per-record bill against stored work results before capture/release."""
    if c.purchase_mode != PurchaseMode.VERIFIED_WORK:
        return
    capture_amount(c)  # Validates positive value, agreed unit price, and max authorization.
    rows = (await db.execute(
        select(EvaluationRecordResult.skilled_passed, EvaluationRecordResult.skilled_tokens)
        .where(EvaluationRecordResult.contract_id == c.id)
    )).all()
    if len(rows) != c.max_billable_records:
        raise HTTPException(409, "Verified-work evaluation results are incomplete")
    token_cap = c.scoring_rules_json["max_tokens_per_record"]
    accepted = sum(bool(passed) and 0 <= tokens <= token_cap for passed, tokens in rows)
    if accepted != c.accepted_record_count:
        raise HTTPException(409, "Accepted record count does not match evaluation evidence")


async def paypal_request(method: str, path: str, *, token: str,
                         request_id: str | None = None, body: dict | None = None) -> dict:
    if not path.startswith("/") or path.startswith("//"):
        raise HTTPException(500, "Invalid PayPal API path")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json",
               "Content-Type": "application/json"}
    if request_id:
        headers["PayPal-Request-Id"] = request_id
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.request(method, get_settings()["PAYPAL_BASE_URL"] + path,
                                            headers=headers, json=body)
            response.raise_for_status()
            return response.json() if response.content else {}
    except httpx.HTTPStatusError as exc:
        # Do not leak PayPal details, tokens, headers, or payer information.
        raise HTTPException(502, f"PayPal returned HTTP {exc.response.status_code}; check/reconcile provider state") from exc
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(502, "PayPal response unavailable; reconcile before retrying") from exc


async def get_paypal_token() -> str:
    settings = get_settings()
    client_id, secret = settings["PAYPAL_CLIENT_ID"], settings["PAYPAL_SECRET"]
    if not client_id or not secret:
        raise HTTPException(503, "PayPal SANDBOX credentials are not configured")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(settings["PAYPAL_BASE_URL"] + "/v1/oauth2/token",
                                     auth=(client_id, secret),
                                     headers={"Accept": "application/json"},
                                     data={"grant_type": "client_credentials"})
            resp.raise_for_status()
            token = resp.json().get("access_token")
            if not isinstance(token, str) or not token:
                raise ValueError("Missing provider token")
            return token
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        raise HTTPException(502, "Cannot authenticate with PayPal SANDBOX") from exc


def ensure_approved(contract: EvaluationContract):
    if contract.status not in (ContractStatus.FROZEN, ContractStatus.COMPLETED):
        raise HTTPException(409, "Buyer has not approved this purchase contract")
    if (not isinstance(contract.terms_snapshot, dict)
            or calculate_terms_hash(contract.terms_snapshot) != contract.contract_sha256
            or contract.approved_terms_hash != contract.contract_sha256):
        raise HTTPException(409, "Approved purchase terms were changed")
    terms = contract.terms_snapshot
    if (terms.get("price") != expected_amount(contract)
            or terms.get("currency") != contract.currency
            or terms.get("skill_id") != contract.skill_id
            or terms.get("buyer_id") != contract.buyer_id
            or terms.get("skill_version") != contract.skill_version
            or terms.get("package_hash") != contract.skill_content_sha256
            or terms.get("dataset_id") != contract.dataset_id
            or terms.get("dataset_hash") != contract.dataset_sha256
            or terms.get("model_name") != contract.model_name
            or terms.get("evaluation_rules") != contract.scoring_rules_json
            or terms.get("failure_policy") != contract.failure_policy_json):
        raise HTTPException(409, "Frozen purchase terms do not match the record")
    # VERIFIED_WORK: only the approved per-record price may determine the later bill.
    if contract.purchase_mode == PurchaseMode.VERIFIED_WORK:
        if (terms.get("purchase_mode") != PurchaseMode.VERIFIED_WORK.value
                or contract.unit_price_usd is None
                or terms.get("unit_price_usd") != format(contract.unit_price_usd, ".2f")
                or terms.get("max_billable_records") != contract.max_billable_records
                or terms.get("billing_rule") != "accepted_skilled_records_only"
                or contract.max_billable_records is None
                or contract.unit_price_usd * contract.max_billable_records != contract.price_usd):
            raise HTTPException(409, "Frozen verified-work billing terms do not match the contract")


async def _owned_contract(db: AsyncSession, contract_id: str, buyer: CurrentUser) -> EvaluationContract:
    c = await db.get(EvaluationContract, contract_id)
    if c is None:
        raise HTTPException(404, "Contract not found")
    require_buyer_owner(buyer, c.buyer_id)
    ensure_approved(c)
    return c


# ONEINTENT: Require a buyer-approved, active reservation for new checkout.
async def require_intent_reservation(db: AsyncSession, c: EvaluationContract) -> None:
    if not c.intent_id:
        raise HTTPException(409, "OneIntent purchase reservation is required")

    intent = await db.get(PurchaseIntent, c.intent_id)
    reservation = (await db.execute(
        select(IntentReservation).where(IntentReservation.intent_id == c.intent_id)
    )).scalar_one_or_none()

    terms = c.terms_snapshot
    if (
        intent is None or reservation is None
        or intent.buyer_id != c.buyer_id
        or intent.status != IntentStatus.RESERVED
        or intent.decision not in ("PROCEED", "BUY_BOTH")
        or reservation.buyer_id != c.buyer_id
        or reservation.contract_id != c.id
        or reservation.status != "ACTIVE"
        or not isinstance(terms, dict)
        or terms.get("intent_id") != intent.id
        or terms.get("intent_scope_key") != intent.scope_key
        or terms.get("intent_purpose") != intent.purpose
        or terms.get("requesting_agent_id") != intent.requesting_agent_id
    ):
        raise HTTPException(409, "OneIntent reservation is missing or does not match the approved contract")


# ONEINTENT: Follow only confirmed PayPal outcomes; uncertain outcomes stay reserved.
async def finalize_intent_reservation(db: AsyncSession, c: EvaluationContract, paid: bool) -> None:
    if not c.intent_id:
        return  # Historical purchases are unaffected.

    intent = await db.get(PurchaseIntent, c.intent_id)
    reservation = (await db.execute(
        select(IntentReservation).where(IntentReservation.intent_id == c.intent_id)
    )).scalar_one_or_none()
    if (
        intent is None or reservation is None
        or intent.buyer_id != c.buyer_id
        or reservation.contract_id != c.id
        or reservation.buyer_id != c.buyer_id
    ):
        raise HTTPException(409, "OneIntent reservation does not match this purchase")

    reservation_status = "COMPLETED" if paid else "RELEASED"
    intent_status = IntentStatus.COMPLETED if paid else IntentStatus.RELEASED
    if reservation.status == reservation_status and intent.status == intent_status:
        return
    if reservation.status != "ACTIVE" or intent.status != IntentStatus.RESERVED:
        raise HTTPException(409, "OneIntent reservation cannot make this transition")

    reservation.status = reservation_status
    intent.status = intent_status


async def _request_key(db: AsyncSession, contract_id: str, column) -> str:
    new_key = str(uuid.uuid4())
    await db.execute(update(EvaluationContract).where(
        EvaluationContract.id == contract_id, column.is_(None),
    ).values({column.key: new_key}))
    await db.commit()
    c = await db.get(EvaluationContract, contract_id)
    await db.refresh(c)
    return getattr(c, column.key)


def _release_receipt(c: EvaluationContract):
    if (c.payment_state == PaymentState.CAPTURE_COMPLETED
            and c.eval_verdict == EvalVerdict.PASS and c.paypal_capture_id):
        if not c.receipt_sha256:
            receipt = (f"{c.id}|{c.skill_content_sha256}|{c.contract_sha256}|"
                       f"{c.paypal_capture_id}|"
                       f"{capture_amount(c) if c.purchase_mode == PurchaseMode.VERIFIED_WORK else c.price_usd}|"
                       f"{c.currency}")
            c.receipt_sha256 = hashlib.sha256(receipt.encode("utf-8")).hexdigest()
            c.skill_delivered_at = datetime.now(timezone.utc)
            c.status = ContractStatus.COMPLETED


@router.post("/{contract_id}/order")
async def create_paypal_order(
    contract_id: str, db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    c = await _owned_contract(db, contract_id, user)
    if c.payment_state != PaymentState.UNINITIALIZED and not c.paypal_order_id:
        raise HTTPException(409, "Order is in an inconsistent state")
    if c.paypal_order_id:
        token = await get_paypal_token()
        stored = await paypal_request("GET", f"/v2/checkout/orders/{c.paypal_order_id}", token=token)
        link = next((a.get("href") for a in stored.get("links", [])
                     if a.get("rel") in ("approve", "payer-action")), None)
        return {"contract_id": c.id, "paypal_order_id": c.paypal_order_id,
                "approval_url": link, "payment_state": c.payment_state.value}
    if c.intent_id or get_settings()["ONEINTENT_ENABLED"]:
        await require_intent_reservation(db, c)
    token = await get_paypal_token()
    key = await _request_key(db, c.id, EvaluationContract.create_request_id)
    result = await paypal_request("POST", "/v2/checkout/orders", token=token,
                                  request_id=key, body={
        "intent": "AUTHORIZE",
"payment_source": {
    "paypal": {
        "experience_context": {
            "brand_name": "AgentGain",
            "user_action": "PAY_NOW",
            "shipping_preference": "NO_SHIPPING",
            "return_url": os.getenv("PUBLIC_APP_URL", "http://127.0.0.1:8000").rstrip("/") + f"/app/integration.html?contract_id={c.id}&paypal_return=1",
            "cancel_url": os.getenv("PUBLIC_APP_URL", "http://127.0.0.1:8000").rstrip("/") + f"/app/integration.html?contract_id={c.id}&paypal_cancel=1"
        }
    }
},
        "purchase_units": [{
            "reference_id": c.id, "custom_id": c.id, "invoice_id": f"AG-{c.id}",
            "amount": {"currency_code": c.currency, "value": expected_amount(c)},
        }],
    })
    order_id = result.get("id")
    if not isinstance(order_id, str) or not order_id:
        raise HTTPException(502, "PayPal did not return a valid order ID")
    # A conditional update must not overwrite an independently created order.
    result_update = await db.execute(update(EvaluationContract).where(
        EvaluationContract.id == c.id,
        EvaluationContract.payment_state == PaymentState.UNINITIALIZED,
        EvaluationContract.paypal_order_id.is_(None),
    ).values(paypal_order_id=order_id, payment_state=PaymentState.ORDER_CREATED))
    if result_update.rowcount != 1:
        await db.rollback()
        raise HTTPException(409, "Checkout state changed; retrieve the existing order")
    await db.commit()
    approval_url = next((link.get("href") for link in result.get("links", [])
                         if link.get("rel") in ("approve", "payer-action")), None)
    return {"contract_id": c.id, "paypal_order_id": order_id,
            "approval_url": approval_url, "payment_state": PaymentState.ORDER_CREATED.value}


@router.post("/{contract_id}/authorize")
async def authorize_paypal_order(
    contract_id: str, db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    c = await _owned_contract(db, contract_id, user)
    if c.payment_state == PaymentState.AUTHORIZED and c.paypal_authorization_id:
        return {"authorization_id": c.paypal_authorization_id, "payment_state": "AUTHORIZED"}
    if c.payment_state != PaymentState.ORDER_CREATED or not c.paypal_order_id:
        raise HTTPException(409, "No buyer-approved order ready for authorization")
    if c.intent_id:
        await require_intent_reservation(db, c)
    token = await get_paypal_token()
    key = await _request_key(db, c.id, EvaluationContract.authorize_request_id)
    result = await paypal_request("POST", f"/v2/checkout/orders/{c.paypal_order_id}/authorize",
                                  token=token, request_id=key, body={})
    auths = [a for unit in result.get("purchase_units", [])
             for a in unit.get("payments", {}).get("authorizations", [])]
    if len(auths) != 1:
        raise HTTPException(502, "Expected exactly one PayPal authorization")
    auth = auths[0]
    if (not auth.get("id") or auth.get("status") != "CREATED"
            or auth.get("amount", {}).get("value") != expected_amount(c)
            or auth.get("amount", {}).get("currency_code") != c.currency):
        raise HTTPException(409, "PayPal authorization did not match the frozen contract")
    changed = await db.execute(update(EvaluationContract).where(
        EvaluationContract.id == c.id,
        EvaluationContract.payment_state == PaymentState.ORDER_CREATED,
        EvaluationContract.paypal_authorization_id.is_(None),
    ).values(paypal_authorization_id=auth["id"], payment_state=PaymentState.AUTHORIZED))
    if changed.rowcount != 1:
        await db.rollback()
        raise HTTPException(409, "Authorization state changed concurrently")
    job = (await db.execute(select(EvaluationJob)
           .where(EvaluationJob.contract_id == c.id))).scalar_one_or_none()
    if job is None:
        db.add(EvaluationJob(id=f"job_{uuid.uuid4().hex}",
                             contract_id=c.id, status=JobStatus.QUEUED))
    await db.commit()
    return {"contract_id": c.id, "authorization_id": auth["id"],
            "payment_state": "AUTHORIZED", "ui_message": "Authorized — evaluation queued"}


async def _capture_success(db: AsyncSession, c: EvaluationContract, cap: dict):
    if not cap.get("id") or cap.get("status") != "COMPLETED":
        return False
    if (cap.get("amount", {}).get("currency_code") != c.currency
            or cap.get("amount", {}).get("value") != capture_amount(c)):
        return False
    await verify_work_bill(db, c)
    changed = await db.execute(update(EvaluationContract).where(
        EvaluationContract.id == c.id,
        EvaluationContract.payment_state.in_([PaymentState.CAPTURE_PENDING, PaymentState.CAPTURE_COMPLETED]),
        EvaluationContract.eval_verdict == EvalVerdict.PASS,
        or_(EvaluationContract.paypal_capture_id.is_(None),
            EvaluationContract.paypal_capture_id == cap["id"]),
    ).values(paypal_capture_id=cap["id"], payment_state=PaymentState.CAPTURE_COMPLETED))
    if changed.rowcount != 1:
        await db.rollback()
        return False
    await db.refresh(c)
    _release_receipt(c)
    await finalize_intent_reservation(db, c, paid=True)
    await db.commit()
    return True


async def settle_contract(db: AsyncSession, contract_id: str) -> dict:
    """Internal controller only. A browser cannot submit PASS or choose capture."""
    c = await db.get(EvaluationContract, contract_id)
    if c is None:
        raise HTTPException(404, "Contract not found")
    ensure_approved(c)
    if c.payment_state in (PaymentState.CAPTURE_COMPLETED, PaymentState.VOIDED):
        return {"payment_state": c.payment_state.value}
    if c.payment_state in (PaymentState.CAPTURE_PENDING, PaymentState.VOID_PENDING):
        return {"payment_state": c.payment_state.value, "message": "Pending; reconcile"}
    if c.payment_state != PaymentState.AUTHORIZED or not c.paypal_authorization_id:
        raise HTTPException(409, "Payment has not been authorized")
    if c.intent_id:
        await require_intent_reservation(db, c)
    job = (await db.execute(select(EvaluationJob).where(EvaluationJob.contract_id == c.id))).scalar_one_or_none()
    if not job or job.status != JobStatus.COMPLETED or c.eval_verdict == EvalVerdict.PENDING:
        raise HTTPException(409, "Evaluation has not finished")

    capture = c.eval_verdict == EvalVerdict.PASS
    if capture and c.purchase_mode == PurchaseMode.VERIFIED_WORK:
        await verify_work_bill(db, c)
    pending = PaymentState.CAPTURE_PENDING if capture else PaymentState.VOID_PENDING
    key_name = "capture_request_id" if capture else "void_request_id"
    request_id = str(uuid.uuid4())
    token = await get_paypal_token()  # Do not lock a payment without PayPal credentials.
    claim = await db.execute(update(EvaluationContract).where(
        EvaluationContract.id == c.id,
        EvaluationContract.payment_state == PaymentState.AUTHORIZED,
        getattr(EvaluationContract, key_name).is_(None),
    ).values(**{key_name: request_id, "payment_state": pending}))
    if claim.rowcount != 1:
        await db.rollback()
        return {"payment_state": "PENDING", "message": "Another controller started this operation"}
    await db.commit()  # Durable intent/idempotency key BEFORE contacting PayPal.

    if capture:
        body = {"final_capture": True}
        if c.purchase_mode == PurchaseMode.VERIFIED_WORK:
            body["amount"] = {"currency_code": c.currency, "value": capture_amount(c)}
        result = await paypal_request("POST", f"/v2/payments/authorizations/{c.paypal_authorization_id}/capture",
                                       token=token, request_id=request_id, body=body)
        await db.refresh(c)
        ok = await _capture_success(db, c, result)
        return {"payment_state": "CAPTURE_COMPLETED" if ok else "CAPTURE_PENDING"}

    result = await paypal_request("POST", f"/v2/payments/authorizations/{c.paypal_authorization_id}/void",
                                  token=token, request_id=request_id, body={})
    # PayPal may return 204 empty body. Confirm authoritative status via GET.
    auth = await paypal_request("GET", f"/v2/payments/authorizations/{c.paypal_authorization_id}", token=token)
    if auth.get("status") == "VOIDED":
        changed = await db.execute(update(EvaluationContract).where(
            EvaluationContract.id == c.id,
            EvaluationContract.payment_state == PaymentState.VOID_PENDING,
        ).values(payment_state=PaymentState.VOIDED))
        if changed.rowcount == 1:
            await finalize_intent_reservation(db, c, paid=False)
        await db.commit()
        if changed.rowcount == 1:
            return {"payment_state": "VOIDED"}
    return {"payment_state": "VOID_PENDING", "message": "Provider void not yet confirmed"}


async def reconcile_contract(db: AsyncSession, contract_id: str) -> dict:
    c = await db.get(EvaluationContract, contract_id)
    if not c:
        raise HTTPException(404, "Contract not found")
    ensure_approved(c)
    if c.payment_state not in (PaymentState.CAPTURE_PENDING, PaymentState.VOID_PENDING):
        return {"payment_state": c.payment_state.value}
    token = await get_paypal_token()
    if c.payment_state == PaymentState.VOID_PENDING:
        auth = await paypal_request("GET", f"/v2/payments/authorizations/{c.paypal_authorization_id}", token=token)
        if auth.get("status") == "VOIDED":
            changed = await db.execute(update(EvaluationContract).where(
                EvaluationContract.id == c.id, EvaluationContract.payment_state == PaymentState.VOID_PENDING,
            ).values(payment_state=PaymentState.VOIDED))
            if changed.rowcount == 1:
                await finalize_intent_reservation(db, c, paid=False)
            await db.commit()
            return {"payment_state": "VOIDED"}
        if auth.get("status") == "CREATED" and c.void_request_id:
            # The original request may have timed out. Retry the SAME logical
            # void operation with the SAME idempotency key, never a new key.
            await paypal_request("POST",
                f"/v2/payments/authorizations/{c.paypal_authorization_id}/void",
                token=token, request_id=c.void_request_id, body={})
            auth = await paypal_request("GET",
                f"/v2/payments/authorizations/{c.paypal_authorization_id}", token=token)
            if auth.get("status") == "VOIDED":
                changed = await db.execute(update(EvaluationContract).where(
                    EvaluationContract.id == c.id,
                    EvaluationContract.payment_state == PaymentState.VOID_PENDING,
                ).values(payment_state=PaymentState.VOIDED))
                if changed.rowcount == 1:
                    await finalize_intent_reservation(db, c, paid=False)
                await db.commit()
                return {"payment_state": "VOIDED"}
        return {"payment_state": "VOID_PENDING", "provider_status": auth.get("status")}

    # Inspect the original order: PayPal links the capture to this exact purchase.
    order = await paypal_request("GET", f"/v2/checkout/orders/{c.paypal_order_id}", token=token)
    if order.get("id") != c.paypal_order_id:
        return {"payment_state": "CAPTURE_PENDING", "message": "Order mismatch"}
    for unit in order.get("purchase_units", []):
        if unit.get("reference_id") != c.id:
            continue
        for cap in unit.get("payments", {}).get("captures", []):
            if await _capture_success(db, c, cap):
                return {"payment_state": "CAPTURE_COMPLETED", "capture_id": cap["id"]}
    return {"payment_state": "CAPTURE_PENDING", "message": "Provider outcome not confirmed"}


@router.get("/{contract_id}/status")
async def payment_status(contract_id: str,
                         db: AsyncSession = Depends(get_db),
                         user: CurrentUser = Depends(require_role("buyer"))):
    c = await _owned_contract(db, contract_id, user)
    return {"payment_state": c.payment_state.value, "eval_verdict": c.eval_verdict.value,
            "paypal_order_id": c.paypal_order_id, "capture_id": c.paypal_capture_id}


@router.post("/{contract_id}/settle")
async def admin_settle(contract_id: str,
                       db: AsyncSession = Depends(get_db),
                       user: CurrentUser = Depends(require_role("admin"))):
    return await settle_contract(db, contract_id)


@router.post("/{contract_id}/reconcile")
async def admin_reconcile(contract_id: str,
                          db: AsyncSession = Depends(get_db),
                          user: CurrentUser = Depends(require_role("admin"))):
    return await reconcile_contract(db, contract_id)


@router.get("/{contract_id}/receipt")
async def get_tested_skill_and_receipt(contract_id: str,
                                       db: AsyncSession = Depends(get_db),
                                       user: CurrentUser = Depends(require_role("buyer"))):
    c = await _owned_contract(db, contract_id, user)
    if c.payment_state != PaymentState.CAPTURE_COMPLETED or c.eval_verdict != EvalVerdict.PASS:
        raise HTTPException(403, "Confirmed completed capture and passing evaluation are required")
    if not c.paypal_capture_id or not c.receipt_sha256:
        raise HTTPException(409, "Payment receipt is not ready")
    skill = await db.get(SkillPackage, c.skill_id)
    if (skill is None or skill.version != c.skill_version
            or skill.content_sha256 != c.skill_content_sha256
            or PackageGuard.validate_structured_skill({
                "version": skill.version, "instructions_md": skill.instructions_md,
                "examples_json": skill.examples_json, "supported_tasks": skill.supported_tasks,
            }) != c.skill_content_sha256):
        raise HTTPException(409, "Skill does not match the tested package")
    if c.purchase_mode == PurchaseMode.VERIFIED_WORK:
        await verify_work_bill(db, c)
        token_cap = c.scoring_rules_json["max_tokens_per_record"]
        rows = (await db.execute(
            select(EvaluationRecordResult)
            .where(EvaluationRecordResult.contract_id == c.id,
                   EvaluationRecordResult.skilled_passed.is_(True),
                   EvaluationRecordResult.skilled_tokens <= token_cap)
            .order_by(EvaluationRecordResult.record_index)
        )).scalars().all()
        return {
            "receipt_sha256": c.receipt_sha256,
            "contract_id": c.id,
            "contract_sha256": c.contract_sha256,
            "purchase_mode": PurchaseMode.VERIFIED_WORK.value,
            "authorized_maximum_usd": expected_amount(c),
            "captured_amount_usd": capture_amount(c),
            "accepted_record_count": c.accepted_record_count,
            "paypal_capture_id": c.paypal_capture_id,
            # Do not deliver the seller's private instructions or examples.
            "accepted_outputs": [
                {"record_index": row.record_index, "output": row.skilled_output}
                for row in rows
            ],
        }
    return {"receipt_sha256": c.receipt_sha256, "contract_id": c.id,
            "contract_sha256": c.contract_sha256,
            "skill_id": skill.id, "skill_version": skill.version,
            "skill_content_sha256": c.skill_content_sha256,
            "eval_verdict": c.eval_verdict.value,
            "net_lift_pct": float(c.net_lift_pct) if c.net_lift_pct is not None else None,
            "paypal_order_id": c.paypal_order_id,
            "paypal_authorization_id": c.paypal_authorization_id,
            "paypal_capture_id": c.paypal_capture_id,
            "delivered_skill_package": {
                "title": skill.title, "instructions_md": skill.instructions_md,
                "examples_json": skill.examples_json, "licence_terms": skill.licence_terms,
            }}


@router.post("/webhook")
async def paypal_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    webhook_id = get_settings()["PAYPAL_WEBHOOK_ID"]
    if not webhook_id:
        raise HTTPException(503, "PayPal webhook ID is missing")
    raw_body = await request.body()
    if len(raw_body) > 262144:
        raise HTTPException(413, "Webhook payload too large")
    try:
        event = await request.json()
    except ValueError:
        raise HTTPException(400, "Webhook JSON is invalid")
    if not isinstance(event, dict) or not event.get("id") or not event.get("event_type"):
        raise HTTPException(400, "Webhook event is incomplete")
    verification = {
        "auth_algo": request.headers.get("paypal-auth-algo"),
        "cert_url": request.headers.get("paypal-cert-url"),
        "transmission_id": request.headers.get("paypal-transmission-id"),
        "transmission_sig": request.headers.get("paypal-transmission-sig"),
        "transmission_time": request.headers.get("paypal-transmission-time"),
        "webhook_id": webhook_id, "webhook_event": event,
    }
    if any(not value for value in verification.values()):
        raise HTTPException(400, "Missing PayPal webhook verification fields")
    token = await get_paypal_token()
    result = await paypal_request("POST", "/v1/notifications/verify-webhook-signature",
                                  token=token, body=verification)
    if result.get("verification_status") != "SUCCESS":
        raise HTTPException(400, "Invalid PayPal webhook signature")
    if await db.get(WebhookEvent, event["id"]):
        return {"received": True, "duplicate": True}
    db.add(WebhookEvent(event_id=event["id"], event_type=event["event_type"], status="verified"))
    await db.commit()
    # A signed webhook is a hint, NOT permission to mark a buyer as paid.
    # Reconciliation fetches provider state and validates the agreed amount/order.
    return {"received": True}


async def payment_controller_cycle():
    """One bounded pass. Safe to repeat, uses atomic payment-state claims."""
    from worker import expire_overdue_jobs
    await expire_overdue_jobs()
    async with AsyncSessionLocal() as db:
        ids = (await db.execute(select(EvaluationContract.id).join(
            EvaluationJob, EvaluationJob.contract_id == EvaluationContract.id,
        ).where(EvaluationContract.payment_state == PaymentState.AUTHORIZED,
                EvaluationJob.status == JobStatus.COMPLETED,
                EvaluationContract.eval_verdict != EvalVerdict.PENDING))).scalars().all()
    for contract_id in ids:
        try:
            async with AsyncSessionLocal() as db:
                await settle_contract(db, contract_id)
        except Exception:
            log.exception("Settlement requires attention for contract %s", contract_id)
    async with AsyncSessionLocal() as db:
        pending = (await db.execute(select(EvaluationContract.id).where(
            EvaluationContract.payment_state.in_([PaymentState.CAPTURE_PENDING, PaymentState.VOID_PENDING])
        ))).scalars().all()
    for contract_id in pending:
        try:
            async with AsyncSessionLocal() as db:
                await reconcile_contract(db, contract_id)
        except Exception:
            log.exception("Reconciliation requires attention for contract %s", contract_id)


async def payment_controller_loop():
    while True:
        try:
            await payment_controller_cycle()
        except Exception:
            log.exception("Payment controller cycle failed; will retry")
        await asyncio.sleep(get_settings()["PAYMENT_POLL_SECONDS"])
