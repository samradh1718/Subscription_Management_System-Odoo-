import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.auth import NewPassword


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    roles: list[str]
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class StaffCreateIn(NewPassword):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
