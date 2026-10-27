from fastapi import Header
from pydantic import BaseModel

class CurrentUser(BaseModel):
    id: str

async def get_current_user(
    x_user_id: str | None = Header(default="buyer_acme_ops", alias="X-User-Id")
) -> CurrentUser:
    return CurrentUser(id=x_user_id or "buyer_acme_ops")