import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Principal, client_ip, require_permission
from app.schemas.users import StaffCreateIn, UserOut
from app.services import users as users_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: Literal["admin", "staff", "customer"] | None = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("users.read")),
):
    return users_service.list_users(db, principal.tenant_id, role)


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    body: StaffCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("users.create_staff")),
):
    return users_service.create_staff(
        db, principal, full_name=body.full_name, email=body.email, password=body.password,
        ip=client_ip(request),
    )


@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate(
    user_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("users.manage")),
):
    return users_service.set_active(db, principal, user_id, active=False, ip=client_ip(request))


@router.post("/{user_id}/activate", response_model=UserOut)
def activate(
    user_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("users.manage")),
):
    return users_service.set_active(db, principal, user_id, active=True, ip=client_ip(request))
