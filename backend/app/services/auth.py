import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, Conflict, NotAuthenticated
from app.core.mail import send_email
from app.core.permissions import CUSTOMER
from app.core.security import hash_password, hash_token, new_token, verify_password
from app.models.base import utcnow
from app.models.customers import Customer
from app.models.identity import AuthSession, PasswordResetToken, Tenant, User, UserRole
from app.services import audit
from app.services.tenants import get_role


@dataclass
class IssuedSession:
    user: User
    session_id: uuid.UUID
    token: str
    csrf_token: str


@dataclass
class ClientInfo:
    ip: str | None
    user_agent: str | None


def find_user(db: Session, tenant_id, email: str) -> User | None:
    return db.scalar(select(User).where(User.tenant_id == tenant_id, User.email == email.lower()))


def email_taken(db: Session, tenant_id, email: str) -> bool:
    return find_user(db, tenant_id, email) is not None


def _issue_session(db: Session, user: User, client: ClientInfo) -> IssuedSession:
    settings = get_settings()
    now = utcnow()
    token, csrf_token = new_token(), new_token()
    session = AuthSession(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token_hash=hash_token(token),
        csrf_hash=hash_token(csrf_token),
        expires_at=now + timedelta(hours=settings.session_absolute_hours),
        idle_expires_at=now + timedelta(hours=settings.session_idle_hours),
        ip=client.ip,
        user_agent=(client.user_agent or "")[:500] or None,
    )
    db.add(session)
    db.flush()
    return IssuedSession(user=user, session_id=session.id, token=token, csrf_token=csrf_token)


def revoke_session_token(db: Session, token: str | None) -> None:
    if token:
        db.execute(
            update(AuthSession)
            .where(AuthSession.token_hash == hash_token(token), AuthSession.revoked_at.is_(None))
            .values(revoked_at=utcnow())
        )


def revoke_all_sessions(db: Session, user_id) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


def register_customer(
    db: Session, tenant: Tenant, *, full_name: str, email: str, password: str, client: ClientInfo
) -> IssuedSession:
    """Public sign-up. Always creates a customer account and a new customer profile (D-006)."""
    email = email.lower()
    if email_taken(db, tenant.id, email):
        raise Conflict("An account with this email already exists.", code="email_taken")

    user = User(tenant_id=tenant.id, email=email, full_name=full_name,
                password_hash=hash_password(password))
    user.user_roles.append(UserRole(role=get_role(db, tenant.id, CUSTOMER)))
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:  # concurrent registration with the same email
        db.rollback()
        raise Conflict("An account with this email already exists.", code="email_taken") from exc

    customer = Customer(tenant_id=tenant.id, user_id=user.id, display_name=full_name, email=email)
    db.add(customer)
    db.flush()
    audit.record(db, tenant_id=tenant.id, actor_user_id=user.id, action="auth.register",
                 entity_type="user", entity_id=user.id, data={"customer_id": str(customer.id)},
                 ip=client.ip)
    user.last_login_at = utcnow()
    issued = _issue_session(db, user, client)
    db.commit()
    return issued


def login(
    db: Session, tenant: Tenant, *, email: str, password: str, client: ClientInfo,
    previous_token: str | None,
) -> IssuedSession:
    user = find_user(db, tenant.id, email)
    # verify_password runs even for unknown emails so timing does not reveal accounts
    valid = verify_password(password, user.password_hash if user else None)
    if not user or not valid or not user.is_active:
        if user:
            audit.record(db, tenant_id=tenant.id, actor_user_id=None, action="auth.login_failed",
                         entity_type="user", entity_id=user.id, ip=client.ip)
            db.commit()
        raise NotAuthenticated("Email or password is incorrect.", code="invalid_credentials")

    # Session fixation defence: whatever session the browser had is revoked, a new id is issued
    revoke_session_token(db, previous_token)
    user.last_login_at = utcnow()
    issued = _issue_session(db, user, client)
    audit.record(db, tenant_id=tenant.id, actor_user_id=user.id, action="auth.login",
                 entity_type="user", entity_id=user.id, ip=client.ip)
    db.commit()
    return issued


def logout(db: Session, token: str | None) -> None:
    revoke_session_token(db, token)
    db.commit()


def request_password_reset(db: Session, tenant: Tenant, email: str, client: ClientInfo) -> None:
    """Same outcome whether or not the account exists (no enumeration)."""
    settings = get_settings()
    user = find_user(db, tenant.id, email)
    if user is None or not user.is_active:
        return

    token = new_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=utcnow() + timedelta(minutes=settings.password_reset_minutes),
        )
    )
    audit.record(db, tenant_id=tenant.id, actor_user_id=None, action="auth.reset_requested",
                 entity_type="user", entity_id=user.id, ip=client.ip)
    db.commit()

    link = f"{settings.public_app_url}/reset-password?token={token}"
    send_email(
        user.email,
        "Reset your Brightloop password",
        f"Hello {user.full_name},\n\nUse this link within {settings.password_reset_minutes} "
        f"minutes to choose a new password:\n\n{link}\n\n"
        "If you did not ask for this, you can ignore this email.\n",
    )


def reset_password(db: Session, *, token: str, new_password: str, client: ClientInfo) -> None:
    invalid = AppError("This reset link is invalid or has expired.", code="invalid_reset_token")
    reset = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_token(token))
        .with_for_update()
    )
    now = utcnow()
    if reset is None or reset.used_at is not None or reset.expires_at <= now:
        raise invalid
    user = db.get(User, reset.user_id)
    if user is None or not user.is_active:
        raise invalid

    user.password_hash = hash_password(new_password)
    # Single use: this token and every other outstanding token for the user stop working
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    revoke_all_sessions(db, user.id)
    audit.record(db, tenant_id=user.tenant_id, actor_user_id=user.id, action="auth.password_reset",
                 entity_type="user", entity_id=user.id, ip=client.ip)
    db.commit()
