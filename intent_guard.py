import hashlib
import os
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from auth import CurrentUser, require_role, require_buyer_owner
from database import get_db
from intent_agent import (IntentAgentError,index_intent,search_similar_intents,review_purchase_overlap,)
from models import (PurchaseIntent,IntentReservation,IntentStatus,EvaluationContract,ContractStatus,)

router = APIRouter(prefix="/intents", tags=["OneIntent"])

ACTIVE_STATUSES = (
    IntentStatus.PENDING_REVIEW,
    IntentStatus.CLEARED,
    IntentStatus.RESERVED,
    IntentStatus.COMPLETED,
)


class IntentCreateRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=64)
    requesting_agent_id: str = Field(min_length=1, max_length=64)
    purpose: str = Field(min_length=5, max_length=500)
    scope_key: str = Field(min_length=1, max_length=200)
    scope_metadata_json: dict = Field(default_factory=dict)


class IntentDecisionRequest(BaseModel):
    action: Literal[
        "PROCEED", "BUY_BOTH", "CONTINUE_EXISTING", "CANCEL_NEW"
    ]
    existing_intent_id: str | None = None


class ReserveRequest(BaseModel):
    contract_id: str


def require_oneintent_enabled():
    if False:
        raise HTTPException(503, "OneIntent is not enabled")


async def lock_buyer(db: AsyncSession, buyer_id: str):
    """Serialize this buyer's purchase requests using PostgreSQL."""

    key = int.from_bytes(
        hashlib.sha256(buyer_id.encode()).digest()[:8],
        byteorder="big",
        signed=True,
    )

    await db.execute(
        text("SELECT pg_advisory_xact_lock(:key)"),
        {"key": key},
    )


async def get_owned_intent(
    db: AsyncSession,
    intent_id: str,
    user: CurrentUser,):
    intent = await db.get(PurchaseIntent, intent_id)

    if intent is None:
        raise HTTPException(404, "Purchase intent not found")

    require_buyer_owner(user, intent.buyer_id)
    return intent


async def find_other_intents(db: AsyncSession, intent):
    result = await db.execute(
        select(PurchaseIntent)
        .where(
            PurchaseIntent.buyer_id == intent.buyer_id,
            PurchaseIntent.id != intent.id,
            PurchaseIntent.status.in_(ACTIVE_STATUSES),
        )
        .order_by(PurchaseIntent.created_at.desc())
        .limit(26)
    )

    rows = result.scalars().all()

    if len(rows) > 25:
        raise HTTPException(
            409,
            "Too many purchases for automatic review; manual review needed",)

    return rows


def reservation_key_for(intent):
    """Same confirmed scope gets the same key unless buyer approves both."""

    extra = intent.id if intent.decision == "BUY_BOTH" else ""

    value = f"{intent.buyer_id}|{intent.scope_key}|{extra}"

    return hashlib.sha256(value.encode()).hexdigest()


@router.post("")
async def create_intent(
    request: IntentCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    require_oneintent_enabled()
    await lock_buyer(db, user.id)

    scope = request.scope_key.strip().lower()

    existing = (
        await db.execute(
            select(PurchaseIntent).where(
                PurchaseIntent.buyer_id == user.id,
                PurchaseIntent.request_id == request.request_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        if (
            existing.purpose != request.purpose
            or existing.scope_key != scope
            or existing.requesting_agent_id != request.requesting_agent_id
        ):
            raise HTTPException(409, "Request ID already used")

        return {
            "intent_id": existing.id,
            "status": existing.status.value,
        }

    intent = PurchaseIntent(
        id=f"intent_{uuid.uuid4().hex}",
        buyer_id=user.id,
        request_id=request.request_id,
        requesting_agent_id=request.requesting_agent_id,
        purpose=request.purpose,
        scope_key=scope,
        scope_metadata_json=request.scope_metadata_json,
        status=IntentStatus.PENDING_REVIEW,
    )

    db.add(intent)
    await db.commit()

    return {
        "intent_id": intent.id,
        "status": intent.status.value,
    }


@router.post("/{intent_id}/check")
async def check_overlap(
    intent_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    require_oneintent_enabled()
    await lock_buyer(db, user.id)

    intent = await get_owned_intent(db, intent_id, user)

    if intent.status not in (IntentStatus.PENDING_REVIEW, IntentStatus.CLEARED):
        raise HTTPException(
            409,
            f"Intent is {intent.status.value}; only pending or cleared "
            "unreserved intents can be checked",
        )

    existing_reservation = (
        await db.execute(
            select(IntentReservation).where(
                IntentReservation.intent_id == intent.id
            )
        )
    ).scalar_one_or_none()
    if existing_reservation is not None:
        raise HTTPException(409, "Intent has a reservation; it cannot be rechecked")

    candidates = await find_other_intents(db, intent)

    # A new check requires a new buyer decision, even if no overlaps are found.
    intent.status = IntentStatus.PENDING_REVIEW
    intent.decision = None
    intent.overlap_results_json = {}

    try:
        await index_intent(intent)

        search_ids = await search_similar_intents(
            user.id,
            intent.purpose,
            intent.scope_key,
        )

        candidates.sort(
            key=lambda item: (
                item.id not in search_ids,
                search_ids.index(item.id) if item.id in search_ids else 100,
            )
        )

        matches = await review_purchase_overlap(intent, candidates)

    except IntentAgentError as exc:
        # Persist invalidation so a failed recheck cannot reuse old clearance.
        await db.commit()
        raise HTTPException(503, str(exc)) from exc

    found_ids = {item["intent_id"] for item in matches}

    # Exact-scope overlap is checked independently of the AI.
    for candidate in candidates:
        if (
            candidate.scope_key == intent.scope_key
            and candidate.id not in found_ids
        ):
            matches.append({
                "intent_id": candidate.id,
                "reason": "Same exact purchase scope",
            })

    intent.overlap_results_json = {
        "reviewed_ids": [item.id for item in candidates],
        "overlaps": matches,
    }

    await db.commit()

    return {
        "intent_id": intent.id,
        "overlaps": matches,
        "requires_buyer_decision": bool(matches),
    }


@router.post("/{intent_id}/resolve")
async def resolve_overlap(
    intent_id: str,
    request: IntentDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    require_oneintent_enabled()
    await lock_buyer(db, user.id)

    intent = await get_owned_intent(db, intent_id, user)
    review = intent.overlap_results_json

    if intent.status != IntentStatus.PENDING_REVIEW:
        raise HTTPException(
            409,
            f"Intent is already {intent.status.value}; decision cannot be "
            "submitted again. Use GET /intents/{intent_id} to view its status",
        )

    if not review:
        raise HTTPException(409, "Check overlaps first")

    candidates = await find_other_intents(db, intent)

    if set(review["reviewed_ids"]) != {c.id for c in candidates}:
        raise HTTPException(409, "Purchase list changed; review again")

    overlaps = {item["intent_id"] for item in review["overlaps"]}

    if request.action == "PROCEED" and overlaps:
        raise HTTPException(
            409,
            "Potential overlap exists; choose another decision",
        )

    if request.action == "BUY_BOTH" and not overlaps:
        raise HTTPException(409, "No overlap requires buy-both approval")

    if request.action == "CONTINUE_EXISTING":
        existing = next(
            (c for c in candidates if c.id == request.existing_intent_id),
            None,
        )

        if (
            existing is None
            or existing.id not in overlaps
            or existing.status not in (
                IntentStatus.RESERVED,
                IntentStatus.COMPLETED,
            )
        ):
            raise HTTPException(
                409,
                "Choose an existing reserved or completed purchase",
            )

    intent.decision = request.action

    if request.action in ("CANCEL_NEW", "CONTINUE_EXISTING"):
        intent.status = IntentStatus.CANCELLED
    else:
        intent.status = IntentStatus.CLEARED

    await db.commit()

    return {
        "intent_id": intent.id,
        "status": intent.status.value,
        "action": intent.decision,
        "existing_intent_id": (
            request.existing_intent_id
            if request.action == "CONTINUE_EXISTING"
            else None
        ),
    }


@router.post("/{intent_id}/reserve")
async def reserve_intent(
    intent_id: str,
    request: ReserveRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    require_oneintent_enabled()
    await lock_buyer(db, user.id)

    intent = await get_owned_intent(db, intent_id, user)

    contract = await db.get(
        EvaluationContract,
        request.contract_id,
    )

    if (
        contract is None
        or contract.buyer_id != user.id
        or contract.intent_id != intent.id
    ):
        raise HTTPException(403, "Contract is not linked to this intent")

    if contract.status != ContractStatus.FROZEN:
        raise HTTPException(409, "Approve the contract first")

    existing = (
        await db.execute(
            select(IntentReservation).where(
                IntentReservation.intent_id == intent.id
            )
        )
    ).scalar_one_or_none()

    if existing:
        if (
            existing.contract_id == contract.id
            and existing.status == "ACTIVE"
        ):
            return {
                "reservation_id": existing.id,
                "status": existing.status,
            }

        raise HTTPException(409, "Intent already reserved")

    if intent.status != IntentStatus.CLEARED:
        raise HTTPException(409, "Buyer must clear the intent first")

    candidates = await find_other_intents(db, intent)

    if (
        set(intent.overlap_results_json["reviewed_ids"])
        != {c.id for c in candidates}
    ):
        raise HTTPException(
            409,
            "Purchase list changed; call /intents/{intent_id}/check, "
            "submit a new decision with /resolve, then retry /reserve",
        )

    reservation = IntentReservation(
        id=f"res_{uuid.uuid4().hex}",
        intent_id=intent.id,
        buyer_id=user.id,
        reservation_key=reservation_key_for(intent),
        contract_id=contract.id,
        status="ACTIVE",
    )

    db.add(reservation)
    intent.status = IntentStatus.RESERVED

    try:
        await db.commit()

    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            409,
            "An existing purchase already covers this intent",
        ) from exc

    return {
        "reservation_id": reservation.id,
        "status": reservation.status,
    }


@router.get("")
async def list_buyer_intents(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    """Buyer-only metadata for OneIntent dashboard; no private skill contents."""
    require_oneintent_enabled()
    intents = (await db.execute(
        select(PurchaseIntent)
        .where(PurchaseIntent.buyer_id == user.id)
        .order_by(PurchaseIntent.created_at.desc())
        .limit(200)
    )).scalars().all()
    intent_ids = [row.id for row in intents]
    linked_contracts = {}
    if intent_ids:
        linked_contracts = dict((await db.execute(
            select(EvaluationContract.intent_id, EvaluationContract.id)
            .where(EvaluationContract.buyer_id == user.id)
            .where(EvaluationContract.intent_id.in_(intent_ids))
        )).all())
    return {"intents": [
        {
            "intent_id": row.id,
            "request_id": row.request_id,
            "requesting_agent_id": row.requesting_agent_id,
            "purpose": row.purpose,
            "scope_key": row.scope_key,
            "scope_metadata_json": row.scope_metadata_json or {},
            "status": row.status.value,
            "decision": row.decision,
            "overlap_review": row.overlap_results_json or {},
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "contract_id": linked_contracts.get(row.id),
        } for row in intents
    ]}


@router.get("/{intent_id}")
async def get_intent(
    intent_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("buyer")),
):
    require_oneintent_enabled()

    intent = await get_owned_intent(db, intent_id, user)

    return {
        "intent_id": intent.id,
        "purpose": intent.purpose,
        "scope_key": intent.scope_key,
        "status": intent.status.value,
        "decision": intent.decision,
        "overlap_review": intent.overlap_results_json,
    }
