from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import PERMISSIONS, ROLE_GRANTS
from app.models.identity import Permission, Role, Tenant


def ensure_permissions(db: Session) -> dict[str, Permission]:
    existing = {p.code: p for p in db.scalars(select(Permission))}
    for code, description in PERMISSIONS.items():
        if code not in existing:
            existing[code] = Permission(code=code, description=description)
            db.add(existing[code])
        else:
            existing[code].description = description
    db.flush()
    return existing


def ensure_tenant(db: Session, slug: str, name: str, timezone: str = "Asia/Kolkata") -> Tenant:
    """Creates the tenant if missing and syncs its system roles to ROLE_GRANTS. Idempotent."""
    tenant = db.scalar(select(Tenant).where(Tenant.slug == slug))
    if tenant is None:
        tenant = Tenant(slug=slug, name=name, timezone=timezone)
        db.add(tenant)
        db.flush()

    permissions = ensure_permissions(db)
    roles = {r.code: r for r in db.scalars(select(Role).where(Role.tenant_id == tenant.id))}
    for code, (role_name, granted) in ROLE_GRANTS.items():
        role = roles.get(code)
        if role is None:
            role = Role(tenant_id=tenant.id, code=code, name=role_name, is_system=True)
            db.add(role)
        role.permissions = [permissions[c] for c in sorted(granted)]
    db.flush()
    return tenant


def get_role(db: Session, tenant_id, code: str) -> Role:
    return db.scalars(select(Role).where(Role.tenant_id == tenant_id, Role.code == code)).one()
