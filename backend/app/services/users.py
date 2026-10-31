import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import Principal
from app.core.errors import AppError, Conflict, NotFound
from app.core.permissions import STAFF
from app.core.security import hash_password
from app.models.identity import Role, User, UserRole
from app.services import audit
from app.services.auth import email_taken, revoke_all_sessions
from app.services.tenants import get_role


def list_users(db: Session, tenant_id: uuid.UUID, role: str | None) -> list[User]:
    query = select(User).where(User.tenant_id == tenant_id)
    if role:
        query = query.join(UserRole, UserRole.user_id == User.id).join(Role).where(Role.code == role)
    return list(db.scalars(query.order_by(User.created_at.desc()).limit(500)))


def create_staff(
    db: Session, actor: Principal, *, full_name: str, email: str, password: str, ip: str | None
) -> User:
    """The new account gets the staff role and nothing else - never admin."""
    email = email.lower()
    if email_taken(db, actor.tenant_id, email):
        raise Conflict("An account with this email already exists.", code="email_taken")

    user = User(tenant_id=actor.tenant_id, email=email, full_name=full_name.strip(),
                password_hash=hash_password(password))
    user.user_roles.append(UserRole(role=get_role(db, actor.tenant_id, STAFF),
                                    granted_by=actor.user_id))
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise Conflict("An account with this email already exists.", code="email_taken") from exc
    audit.record(db, tenant_id=actor.tenant_id, actor_user_id=actor.user_id,
                 action="users.create_staff", entity_type="user", entity_id=user.id,
                 data={"email": email}, ip=ip)
    db.commit()
    return user


def set_active(
    db: Session, actor: Principal, user_id: uuid.UUID, *, active: bool, ip: str | None
) -> User:
    user = db.scalar(select(User).where(User.id == user_id, User.tenant_id == actor.tenant_id))
    if user is None:
        raise NotFound("User not found.")
    if user.id == actor.user_id:
        raise AppError("You cannot change your own account status.", code="self_change")

    user.is_active = active
    if not active:
        revoke_all_sessions(db, user.id)
    audit.record(db, tenant_id=actor.tenant_id, actor_user_id=actor.user_id,
                 action="users.activate" if active else "users.deactivate",
                 entity_type="user", entity_id=user.id, ip=ip)
    db.commit()
    return user
