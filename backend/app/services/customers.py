import uuid

from sqlalchemy import or_, select, tuple_
from sqlalchemy.orm import Session

from app.core.deps import Principal
from app.core.errors import NotFound
from app.models.customers import Customer, CustomerAddress
from app.schemas.common import decode_cursor, encode_cursor
from app.schemas.customers import AddressIn, CustomerCreateIn, CustomerSelfUpdateIn, CustomerUpdateIn
from app.services import audit


def list_customers(
    db: Session, tenant_id: uuid.UUID, *, q: str | None, cursor: str | None, limit: int
) -> tuple[list[Customer], str | None]:
    query = select(Customer).where(Customer.tenant_id == tenant_id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Customer.display_name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.company.ilike(pattern),
            )
        )
    if cursor:
        created_at, row_id = decode_cursor(cursor)
        query = query.where(tuple_(Customer.created_at, Customer.id) < tuple_(created_at, row_id))
    rows = list(
        db.scalars(query.order_by(Customer.created_at.desc(), Customer.id.desc()).limit(limit + 1))
    )
    next_cursor = encode_cursor(rows[limit - 1].created_at, rows[limit - 1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor


def get_customer(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    # Tenant filter in the query: another tenant's id is indistinguishable from a missing one
    customer = db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    if customer is None:
        raise NotFound("Customer not found.")
    return customer


def _replace_addresses(customer: Customer, addresses: list[AddressIn]) -> None:
    customer.addresses = [
        CustomerAddress(tenant_id=customer.tenant_id, **address.model_dump())
        for address in addresses
    ]


def create_customer(
    db: Session, actor: Principal, data: CustomerCreateIn, ip: str | None
) -> Customer:
    customer = Customer(
        tenant_id=actor.tenant_id,
        **data.model_dump(exclude={"addresses", "email"}),
        email=data.email.lower(),
    )
    _replace_addresses(customer, data.addresses)
    db.add(customer)
    db.flush()
    audit.record(db, tenant_id=actor.tenant_id, actor_user_id=actor.user_id,
                 action="customers.create", entity_type="customer", entity_id=customer.id, ip=ip)
    db.commit()
    return customer


def update_customer(
    db: Session,
    actor: Principal,
    customer: Customer,
    data: CustomerUpdateIn | CustomerSelfUpdateIn,
    ip: str | None,
) -> Customer:
    changes = data.model_dump(exclude_unset=True, exclude={"addresses"})
    if "email" in changes and changes["email"]:
        changes["email"] = changes["email"].lower()
    for field, value in changes.items():
        if value is not None or field not in {"display_name", "email"}:
            setattr(customer, field, value)
    if data.addresses is not None:
        _replace_addresses(customer, data.addresses)
        changes["addresses"] = len(data.addresses)
    audit.record(db, tenant_id=actor.tenant_id, actor_user_id=actor.user_id,
                 action="customers.update", entity_type="customer", entity_id=customer.id,
                 data={"fields": sorted(changes)}, ip=ip)
    db.commit()
    db.refresh(customer)
    return customer
