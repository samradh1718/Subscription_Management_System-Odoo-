from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Principal, require_permission
from app.schemas.common import Page
from app.schemas.customers import AuditOut
from app.services import audit as audit_service

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=Page[AuditOut])
def list_audit(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("audit.read")),
):
    items, next_cursor = audit_service.list_entries(
        db, principal.tenant_id, cursor=cursor, limit=limit
    )
    return Page(items=items, next_cursor=next_cursor)
