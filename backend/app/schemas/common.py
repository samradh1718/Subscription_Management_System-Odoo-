import base64
import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from app.core.errors import AppError

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    next_cursor: str | None


def encode_cursor(created_at: datetime, row_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{row_id}".encode()
    return base64.urlsafe_b64encode(raw).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        created, row_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return datetime.fromisoformat(created), uuid.UUID(row_id)
    except (ValueError, UnicodeDecodeError) as exc:
        raise AppError("Invalid cursor.", code="invalid_cursor") from exc
