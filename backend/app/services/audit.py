import uuid

from sqlalchemy import select, tuple_
from sqlalchemy.orm import Session

from app.models.identity import AuditLog
from app.schemas.common import decode_cursor, encode_cursor


def record(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    data: dict | None = None,
    ip: str | None = None,
) -> None:
    """Adds an audit row to the caller's transaction. Never pass secrets in `data`."""
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            data=data or {},
            ip=ip,
        )
    )


def list_entries(
    db: Session, tenant_id: uuid.UUID, *, cursor: str | None, limit: int
) -> tuple[list[AuditLog], str | None]:
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
    if cursor:
        created_at, row_id = decode_cursor(cursor)
        query = query.where(tuple_(AuditLog.created_at, AuditLog.id) < tuple_(created_at, row_id))
    rows = list(
        db.scalars(query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit + 1))
    )
    next_cursor = encode_cursor(rows[limit - 1].created_at, rows[limit - 1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor
