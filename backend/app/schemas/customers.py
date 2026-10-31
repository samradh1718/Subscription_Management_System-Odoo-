import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

BusinessSize = Literal["solo", "2-10", "11-50", "51-200", "201-1000", "1000+"]


class AddressIn(BaseModel):
    kind: Literal["billing", "shipping"] = "billing"
    line1: str = Field(min_length=1, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str = Field(default="IN", min_length=2, max_length=2)
    is_default: bool = False


class AddressOut(AddressIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class CustomerBase(BaseModel):
    phone: str | None = Field(default=None, max_length=40)
    company: str | None = Field(default=None, max_length=200)
    industry: str | None = Field(default=None, max_length=100)
    business_size: BusinessSize | None = None


class CustomerCreateIn(CustomerBase):
    display_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    addresses: list[AddressIn] = Field(default_factory=list, max_length=10)


class CustomerUpdateIn(CustomerBase):
    """Staff edit. Fields left out are unchanged."""

    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    addresses: list[AddressIn] | None = Field(default=None, max_length=10)


class CustomerSelfUpdateIn(CustomerBase):
    """Customer editing their own profile. Email is the login identity and is not editable here."""

    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    addresses: list[AddressIn] | None = Field(default=None, max_length=10)


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    email: str
    has_login: bool
    is_demo: bool
    created_at: datetime
    addresses: list[AddressOut]


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: uuid.UUID | None
    data: dict
    created_at: datetime
