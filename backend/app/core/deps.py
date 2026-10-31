import ipaddress
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import timedelta

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import Forbidden, NotAuthenticated, NotFound
from app.core.security import hash_token, tokens_match
from app.models.base import utcnow
from app.models.customers import Customer
from app.models.identity import (
    AuthSession,
    Permission,
    Role,
    Tenant,
    User,
    UserRole,
    role_permissions,
)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Avoid a database write on every request: only extend the idle window when it is this stale
IDLE_REFRESH_SLACK = timedelta(minutes=5)


@dataclass
class Principal:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    session_id: uuid.UUID
    email: str
    full_name: str
    roles: list[str]
    permissions: set[str] = field(default_factory=set)
    customer_id: uuid.UUID | None = None

    def has(self, permission: str) -> bool:
        return permission in self.permissions


def client_ip(request: Request) -> str | None:
    host = request.client.host if request.client else None
    try:
        return str(ipaddress.ip_address(host)) if host else None
    except ValueError:
        return None


def resolve_tenant(request: Request, db: Session = Depends(get_db)) -> Tenant:
    """Tenant for unauthenticated endpoints (decisions.md D-005)."""
    slug = request.headers.get("X-Tenant") or get_settings().default_tenant_slug
    tenant = db.scalar(select(Tenant).where(Tenant.slug == slug, Tenant.is_active))
    if tenant is None:
        raise NotFound("Workspace not found.")
    return tenant


def _permissions_for(db: Session, user_id: uuid.UUID) -> set[str]:
    rows = db.scalars(
        select(Permission.code)
        .join(role_permissions, role_permissions.c.permission_id == Permission.id)
        .join(Role, Role.id == role_permissions.c.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return set(rows)


def optional_principal(request: Request, db: Session = Depends(get_db)) -> Principal | None:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None

    now = utcnow()
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_token(token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
            AuthSession.idle_expires_at > now,
        )
    )
    if session is None or not session.user.is_active:
        return None

    if request.method in UNSAFE_METHODS:
        csrf = request.headers.get("X-CSRF-Token", "")
        if not csrf or not tokens_match(csrf, session.csrf_hash):
            raise Forbidden("Missing or invalid CSRF token.", code="csrf_failed")

    idle_window = timedelta(hours=settings.session_idle_hours)
    if session.idle_expires_at - now < idle_window - IDLE_REFRESH_SLACK:
        session.idle_expires_at = min(now + idle_window, session.expires_at)
        db.commit()

    return build_principal(db, session.user, session.id)


def build_principal(db: Session, user: User, session_id: uuid.UUID) -> Principal:
    customer_id = db.scalar(
        select(Customer.id).where(Customer.user_id == user.id, Customer.tenant_id == user.tenant_id)
    )
    return Principal(
        user_id=user.id,
        tenant_id=user.tenant_id,
        session_id=session_id,
        email=user.email,
        full_name=user.full_name,
        roles=user.roles,
        permissions=_permissions_for(db, user.id),
        customer_id=customer_id,
    )


def current_principal(principal: Principal | None = Depends(optional_principal)) -> Principal:
    if principal is None:
        raise NotAuthenticated("Please sign in.")
    return principal


def require_permission(permission: str) -> Callable[..., Principal]:
    def checker(principal: Principal = Depends(current_principal)) -> Principal:
        if not principal.has(permission):
            raise Forbidden("You do not have permission to do this.")
        return principal

    return checker


def require_customer(principal: Principal = Depends(require_permission("portal.access"))):
    if principal.customer_id is None:
        raise Forbidden("This account has no customer profile.")
    return principal
