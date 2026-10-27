import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from auth import get_current_user, CurrentUser
from contracts import calculate_terms_hash
from models import (
    EvaluationContract,
    EvaluationJob,
    SkillPackage,
    WebhookEvent,
    ContractStatus,
    PaymentState,
    JobStatus,
    EvalVerdict,
)

router = APIRouter(prefix="/payments", tags=["Payments (Steps 7, 13, 14, 15)"])


async def paypal_request(method: str, path: str, *, token: str, request_id: str | None = None, body: dict | None = None) -> dict:
    """Make an authenticated async PayPal REST request."""
    settings = get_settings()
    base_url = settings["PAYPAL_BASE_URL"]
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    if request_id:
        headers["PayPal-Request-Id"] = request_id

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.request(
                method,
                f"{base_url}{path}",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            return response.json() if response.content else {}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"PayPal rejected the request (HTTP {exc.response.status_code})",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="PayPal is temporarily unreachable; retry safely",
        )


async def get_paypal_token() -> str | None:
    """Returns PayPal OAuth token, or None if running in local sandbox-mock mode."""
    settings = get_settings()
    client_id = settings.get("PAYPAL_CLIENT_ID")
    secret = settings.get("PAYPAL_SECRET")
    base_url = settings["PAYPAL_BASE_URL"]

    if not client_id or not secret:
        return None

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{base_url}/v1/oauth2/token",
                auth=(client_id, secret),
                headers={"Accept": "application/json"},
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            return response.json()["access_token"]
    except (httpx.HTTPError, KeyError):
        raise HTTPException(502, "Could not authenticate with PayPal")


async def require_approved_contract(db: AsyncSession, contract_id: str) -> EvaluationContract:
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")

    if contract.status not in (ContractStatus.FROZEN, ContractStatus.COMPLETED):
        raise HTTPException(409, "Contract has not been approved and frozen yet")

    if contract.terms_snapshot:
        current_hash = calculate_terms_hash(contract.terms_snapshot)
        if current_hash != contract.contract_sha256 or contract.approved_terms_hash != current_hash:
            raise HTTPException(409, "Approved contract terms failed cryptographic verification")

    return contract


def release_skill_if_eligible(contract: EvaluationContract) -> bool:
    """
    Step 15: Release skill access and issue cryptographic receipt ONLY after
    CAPTURE_COMPLETED and a PASS evaluation verdict.
    """
    if contract.payment_state != PaymentState.CAPTURE_COMPLETED or not contract.paypal_capture_id:
        return False

    if contract.eval_verdict != EvalVerdict.PASS:
        return False

    if not contract.receipt_sha256:
        receipt_payload = (
            f"{contract.id}:{contract.skill_content_sha256}:"
            f"{contract.contract_sha256}:{contract.eval_verdict.value}:{contract.paypal_capture_id}"
        )
        contract.receipt_sha256 = hashlib.sha256(receipt_payload.encode("utf-8")).hexdigest()
        contract.skill_delivered_at = datetime.now(timezone.utc)
        contract.status = ContractStatus.COMPLETED

    return True


@router.post("/{contract_id}/order")
async def create_paypal_order(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Step 7a: Create/reuse a PayPal Order with AUTHORIZE intent for a frozen contract."""
    contract = await require_approved_contract(db, contract_id)
    amount = Decimal(str(contract.price_usd))
    currency = contract.currency or "USD"

    if amount <= 0:
        raise HTTPException(422, "Contract price must be positive")

    if contract.paypal_order_id:
        return {
            "contract_id": contract.id,
            "paypal_order_id": contract.paypal_order_id,
            "payment_state": contract.payment_state.value,
        }

    if not contract.create_request_id:
        contract.create_request_id = str(uuid.uuid4())
        await db.commit()

    token = await get_paypal_token()
    if token:
        order = await paypal_request(
            "POST",
            "/v2/checkout/orders",
            token=token,
            request_id=contract.create_request_id,
            body={
                "intent": "AUTHORIZE",
                "purchase_units": [{
                    "reference_id": str(contract.id),
                    "custom_id": str(contract.id),
                    "invoice_id": f"AG-{contract.id}",
                    "amount": {
                        "currency_code": currency,
                        "value": format(amount, ".2f"),
                    },
                }],
            },
        )
        paypal_order_id = order["id"]
        approval_url = next(
            (link["href"] for link in order.get("links", []) if link.get("rel") == "approve"),
            None,
        )
    else:
        # Local Sandbox simulation when PAYPAL_CLIENT_ID is not yet configured in .env
        paypal_order_id = f"PAYPAL-ORD-{uuid.uuid4().hex[:10].upper()}"
        approval_url = f"https://www.sandbox.paypal.com/checkoutnow?token={paypal_order_id}"

    contract.paypal_order_id = paypal_order_id
    contract.payment_state = PaymentState.ORDER_CREATED
    await db.commit()

    return {
        "contract_id": contract.id,
        "paypal_order_id": contract.paypal_order_id,
        "approval_url": approval_url,
        "payment_state": contract.payment_state.value,
    }


@router.post("/{contract_id}/authorize")
async def authorize_paypal_order(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Step 7b & Step 8: Confirm PayPal AUTHORIZE and immediately enqueue the durable
    EvaluationJob for Developer 1's isolated worker.
    """
    contract = await require_approved_contract(db, contract_id)

    if not contract.paypal_order_id:
        raise HTTPException(409, "PayPal order has not been created yet")

    if contract.paypal_authorization_id:
        return {
            "contract_id": contract.id,
            "authorization_id": contract.paypal_authorization_id,
            "payment_state": contract.payment_state.value,
            "ui_message": "Authorized — evaluation pending.",
        }

    if not contract.authorize_request_id:
        contract.authorize_request_id = str(uuid.uuid4())
        await db.commit()

    token = await get_paypal_token()
    if token:
        result = await paypal_request(
            "POST",
            f"/v2/checkout/orders/{contract.paypal_order_id}/authorize",
            token=token,
            request_id=contract.authorize_request_id,
            body={},
        )
        authorizations = []
        for unit in result.get("purchase_units", []):
            authorizations.extend(unit.get("payments", {}).get("authorizations", []))
        if not authorizations:
            raise HTTPException(502, "PayPal returned no authorization")

        authorization = authorizations[0]
        authorized_amount = authorization.get("amount", {})
        if (
            authorized_amount.get("currency_code") != (contract.currency or "USD")
            or authorized_amount.get("value") != format(Decimal(str(contract.price_usd)), ".2f")
        ):
            raise HTTPException(409, "PayPal authorization amount does not match frozen contract")
        auth_id = authorization["id"]
    else:
        auth_id = f"PAYPAL-AUTH-{uuid.uuid4().hex[:10].upper()}"

    contract.paypal_authorization_id = auth_id
    contract.payment_state = PaymentState.AUTHORIZED

    # STEP 8 HAND-OFF: Automatically enqueue EvaluationJob for Dev 1's isolated worker
    existing_job = (
        await db.execute(select(EvaluationJob).where(EvaluationJob.contract_id == contract.id))
    ).scalar_one_or_none()

    if existing_job is None:
        job = EvaluationJob(
            id=f"job_{uuid.uuid4().hex[:10]}",
            contract_id=contract.id,
            status=JobStatus.QUEUED,
        )
        db.add(job)
    else:
        job = existing_job

    await db.commit()

    return {
        "contract_id": contract.id,
        "authorization_id": contract.paypal_authorization_id,
        "payment_state": contract.payment_state.value,
        "evaluation_job_id": job.id,
        "evaluation_job_status": job.status.value,
        "ui_message": "Authorized — evaluation pending.",
    }


@router.post("/{contract_id}/settle")
async def settle_payment_by_verdict(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Step 13: Conditional PayPal Capture or Cancellation based on recorded Step 11 Verdict:
    - PASS -> Capture approved authorization and unlock tested skill receipt (Step 15)
    - FAIL or INCONCLUSIVE -> Void uncaptured authorization
    """
    contract = await require_approved_contract(db, contract_id)

    if not contract.paypal_authorization_id:
        raise HTTPException(409, "Payment has not been authorized yet")

    if contract.eval_verdict == EvalVerdict.PENDING:
        raise HTTPException(409, "Evaluation is still pending; cannot settle payment yet")

    token = await get_paypal_token()

    # CASE 1: Evaluation Passed -> Capture Payment
    if contract.eval_verdict == EvalVerdict.PASS:
        if contract.payment_state == PaymentState.CAPTURE_COMPLETED:
            return {
                "contract_id": contract.id,
                "action": "CAPTURE",
                "capture_id": contract.paypal_capture_id,
                "payment_state": contract.payment_state.value,
                "receipt_sha256": contract.receipt_sha256,
            }

        if not contract.capture_request_id:
            contract.capture_request_id = str(uuid.uuid4())
            await db.commit()

        if token:
            result = await paypal_request(
                "POST",
                f"/v2/payments/authorizations/{contract.paypal_authorization_id}/capture",
                token=token,
                request_id=contract.capture_request_id,
                body={"final_capture": True},
            )
            if result.get("status") != "COMPLETED":
                raise HTTPException(409, "PayPal capture is not completed")
            capture_id = result["id"]
        else:
            capture_id = f"PAYPAL-CAP-{uuid.uuid4().hex[:10].upper()}"

        contract.paypal_capture_id = capture_id
        contract.payment_state = PaymentState.CAPTURE_COMPLETED
        release_skill_if_eligible(contract)
        await db.commit()

        return {
            "contract_id": contract.id,
            "verdict": contract.eval_verdict.value,
            "action": "CAPTURE_COMPLETED",
            "capture_id": contract.paypal_capture_id,
            "payment_state": contract.payment_state.value,
            "receipt_sha256": contract.receipt_sha256,
        }

    # CASE 2: Evaluation Failed, Inconclusive, or Unresolved Tech Error -> Void Authorization
    if contract.payment_state == PaymentState.VOIDED:
        return {
            "contract_id": contract.id,
            "verdict": contract.eval_verdict.value,
            "action": "VOIDED",
            "payment_state": contract.payment_state.value,
        }

    if not contract.void_request_id:
        contract.void_request_id = str(uuid.uuid4())
        await db.commit()

    if token:
        await paypal_request(
            "POST",
            f"/v2/payments/authorizations/{contract.paypal_authorization_id}/void",
            token=token,
            request_id=contract.void_request_id,
            body={},
        )

    contract.payment_state = PaymentState.VOIDED
    await db.commit()

    return {
        "contract_id": contract.id,
        "verdict": contract.eval_verdict.value,
        "action": "AUTHORIZATION_VOIDED",
        "payment_state": contract.payment_state.value,
    }


@router.get("/{contract_id}/receipt")
async def get_tested_skill_and_receipt(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 15: Tested Skill Delivery and Receipt.
    Unlocks the exact tested skill package ONLY after CAPTURE_COMPLETED.
    """
    contract = await db.get(EvaluationContract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")

    if contract.payment_state != PaymentState.CAPTURE_COMPLETED or contract.eval_verdict != EvalVerdict.PASS:
        raise HTTPException(
            403,
            f"Skill access locked. Requires CAPTURE_COMPLETED and PASS verdict (Current: {contract.payment_state.value}, {contract.eval_verdict.value})",
        )

    skill = await db.get(SkillPackage, contract.skill_id)
    return {
        "receipt_sha256": contract.receipt_sha256,
        "contract_id": contract.id,
        "contract_sha256": contract.contract_sha256,
        "skill_id": skill.id,
        "skill_version": skill.version,
        "skill_content_sha256": contract.skill_content_sha256,
        "eval_verdict": contract.eval_verdict.value,
        "net_lift_pct": float(contract.net_lift_pct or 0),
        "paypal_order_id": contract.paypal_order_id,
        "paypal_authorization_id": contract.paypal_authorization_id,
        "paypal_capture_id": contract.paypal_capture_id,
        "delivered_skill_package": {
            "title": skill.title,
            "instructions_md": skill.instructions_md,
            "examples_json": skill.examples_json,
            "licence_terms": skill.licence_terms,
        },
    }


@router.post("/webhook")
async def paypal_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Step 14: Verify PayPal webhook signature and update payment state machine idempotently."""
    settings = get_settings()
    webhook_id = settings.get("PAYPAL_WEBHOOK_ID")
    if not webhook_id:
        raise HTTPException(503, "PayPal webhook ID is not configured")

    event = await request.json()
    headers = request.headers

    verification_payload = {
        "auth_algo": headers.get("paypal-auth-algo"),
        "cert_url": headers.get("paypal-cert-url"),
        "transmission_id": headers.get("paypal-transmission-id"),
        "transmission_sig": headers.get("paypal-transmission-sig"),
        "transmission_time": headers.get("paypal-transmission-time"),
        "webhook_id": webhook_id,
        "webhook_event": event,
    }

    if not all([
        verification_payload["auth_algo"],
        verification_payload["cert_url"],
        verification_payload["transmission_id"],
        verification_payload["transmission_sig"],
        verification_payload["transmission_time"],
        event.get("id"),
        event.get("event_type"),
    ]):
        raise HTTPException(400, "Incomplete webhook data")

    token = await get_paypal_token()
    if token:
        verification = await paypal_request(
            "POST",
            "/v1/notifications/verify-webhook-signature",
            token=token,
            body=verification_payload,
        )
        if verification.get("verification_status") != "SUCCESS":
            raise HTTPException(400, "Invalid PayPal webhook signature")

    existing_event = await db.get(WebhookEvent, event["id"])
    if existing_event:
        return {"received": True, "duplicate": True}

    db.add(WebhookEvent(
        event_id=event["id"],
        event_type=event["event_type"],
        status="received",
    ))

    if event["event_type"] == "PAYMENT.CAPTURE.COMPLETED":
        resource = event.get("resource", {})
        related = resource.get("supplementary_data", {}).get("related_ids", {})
        order_id = related.get("order_id")
        capture_id = resource.get("id")

        stmt = select(EvaluationContract).where(
            (EvaluationContract.paypal_capture_id == capture_id)
            | (EvaluationContract.paypal_order_id == order_id)
        )
        contract = (await db.execute(stmt)).scalar_one_or_none()
        if contract is not None:
            amount = resource.get("amount", {})
            if (
                amount.get("currency_code") == (contract.currency or "USD")
                and amount.get("value") == format(Decimal(str(contract.price_usd)), ".2f")
                and resource.get("status") == "COMPLETED"
            ):
                contract.paypal_capture_id = capture_id
                contract.payment_state = PaymentState.CAPTURE_COMPLETED
                release_skill_if_eligible(contract)

    await db.commit()
    return {"received": True}