import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import password_problems


def _check_password(value: str) -> str:
    problems = password_problems(value)
    if problems:
        raise ValueError("Password needs " + ", ".join(problems) + ".")
    return value


class NewPassword(BaseModel):
    password: str = Field(max_length=200)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return _check_password(value)


class RegisterIn(NewPassword):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter your full name.")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(NewPassword):
    token: str = Field(min_length=20, max_length=200)


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    roles: list[str]
    permissions: list[str]
    customer_id: uuid.UUID | None
    tenant_id: uuid.UUID


class AuthOut(BaseModel):
    user: MeOut
    csrf_token: str


class MessageOut(BaseModel):
    message: str
