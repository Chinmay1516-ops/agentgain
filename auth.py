"""Restricted single-buyer/seller/admin sandbox authentication.

Use long, random Bearer tokens in .env. This is ONLY a limited demonstration
mechanism; use an identity provider and persistent user accounts before public launch.
The old X-User-Id header is deliberately NOT accepted.
"""
from dataclasses import dataclass
from hmac import compare_digest
from typing import Callable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    role: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Bearer authorization is required")
    settings = get_settings()
    choices = (
        ("buyer", settings["BUYER_ID"], settings["BUYER_TOKEN"]),
        ("seller", settings["SELLER_ID"], settings["SELLER_TOKEN"]),
        ("admin", settings["ADMIN_ID"], settings["ADMIN_TOKEN"]),
    )
    if (any(not user_id or len(token) < 32 for _, user_id, token in choices)
            or len({token for _, _, token in choices}) != len(choices)):
        raise HTTPException(503, "Demo identities and distinct strong tokens are not configured")
    for role, user_id, token in choices:
        if compare_digest(credentials.credentials, token):
            return CurrentUser(id=user_id, role=role)
    raise HTTPException(401, "Invalid access token")


def require_role(*allowed_roles: str) -> Callable:
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dependency


def require_buyer_owner(user: CurrentUser, buyer_id: str) -> None:
    if user.role != "buyer" or user.id != buyer_id:
        raise HTTPException(403, "You cannot access another buyer's records")
