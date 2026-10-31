import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Principal, client_ip, require_customer, require_permission
from app.schemas.common import Page
from app.schemas.customers import (
    CustomerCreateIn,
    CustomerOut,
    CustomerSelfUpdateIn,
    CustomerUpdateIn,
)
from app.services import customers as customers_service

router = APIRouter(prefix="/customers", tags=["customers"])


# /me routes are declared before /{customer_id} so "me" is never parsed as an id
@router.get("/me", response_model=CustomerOut)
def my_profile(db: Session = Depends(get_db), principal: Principal = Depends(require_customer)):
    return customers_service.get_customer(db, principal.tenant_id, principal.customer_id)


@router.patch("/me", response_model=CustomerOut)
def update_my_profile(
    body: CustomerSelfUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_customer),
):
    customer = customers_service.get_customer(db, principal.tenant_id, principal.customer_id)
    return customers_service.update_customer(db, principal, customer, body, client_ip(request))


@router.get("", response_model=Page[CustomerOut])
def list_customers(
    q: str | None = Query(default=None, max_length=100),
    cursor: str | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("customers.read")),
):
    items, next_cursor = customers_service.list_customers(
        db, principal.tenant_id, q=q, cursor=cursor, limit=limit
    )
    return Page(items=items, next_cursor=next_cursor)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("customers.write")),
):
    return customers_service.create_customer(db, principal, body, client_ip(request))


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("customers.read")),
):
    return customers_service.get_customer(db, principal.tenant_id, customer_id)


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permission("customers.write")),
):
    customer = customers_service.get_customer(db, principal.tenant_id, customer_id)
    return customers_service.update_customer(db, principal, customer, body, client_ip(request))
