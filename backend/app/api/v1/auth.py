from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import (
    Principal,
    build_principal,
    client_ip,
    current_principal,
    resolve_tenant,
)
from app.core.rate_limit import limiter
from app.models.identity import Tenant
from app.schemas.auth import (
    AuthOut,
    ForgotPasswordIn,
    LoginIn,
    MeOut,
    MessageOut,
    RegisterIn,
    ResetPasswordIn,
)
from app.services import auth as auth_service
from app.services.auth import ClientInfo, IssuedSession

router = APIRouter(prefix="/auth", tags=["auth"])


def _client(request: Request) -> ClientInfo:
    return ClientInfo(ip=client_ip(request), user_agent=request.headers.get("user-agent"))


def _limit(request: Request, action: str, email: str | None = None) -> None:
    settings = get_settings()
    keys = [f"{action}:ip:{client_ip(request) or 'unknown'}"]
    if email:
        keys.append(f"{action}:email:{email.lower()}")
    for key in keys:
        limiter.hit(key, settings.auth_rate_limit, settings.auth_rate_window_seconds)


def _set_session_cookies(response: Response, issued: IssuedSession) -> None:
    settings = get_settings()
    max_age = settings.session_absolute_hours * 3600
    response.set_cookie(
        settings.session_cookie_name, issued.token, max_age=max_age, httponly=True,
        secure=settings.cookie_secure, samesite="lax", path="/",
    )
    # Readable by the SPA so it can echo it in X-CSRF-Token (double-submit, decisions.md D-004)
    response.set_cookie(
        settings.csrf_cookie_name, issued.csrf_token, max_age=max_age, httponly=False,
        secure=settings.cookie_secure, samesite="lax", path="/",
    )


def _clear_session_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


def _me(principal: Principal) -> MeOut:
    return MeOut(
        id=principal.user_id,
        email=principal.email,
        full_name=principal.full_name,
        roles=principal.roles,
        permissions=sorted(principal.permissions),
        customer_id=principal.customer_id,
        tenant_id=principal.tenant_id,
    )


def _auth_out(db: Session, issued: IssuedSession) -> AuthOut:
    principal = build_principal(db, issued.user, issued.session_id)
    return AuthOut(user=_me(principal), csrf_token=issued.csrf_token)


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(resolve_tenant),
):
    _limit(request, "register")
    issued = auth_service.register_customer(
        db, tenant, full_name=body.full_name, email=body.email, password=body.password,
        client=_client(request),
    )
    _set_session_cookies(response, issued)
    return _auth_out(db, issued)


@router.post("/login", response_model=AuthOut)
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(resolve_tenant),
):
    _limit(request, "login", body.email)
    issued = auth_service.login(
        db, tenant, email=body.email, password=body.password, client=_client(request),
        previous_token=request.cookies.get(get_settings().session_cookie_name),
    )
    _set_session_cookies(response, issued)
    return _auth_out(db, issued)


@router.post("/logout", response_model=MessageOut)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: Principal = Depends(current_principal),  # also enforces CSRF
):
    auth_service.logout(db, request.cookies.get(get_settings().session_cookie_name))
    _clear_session_cookies(response)
    return MessageOut(message="Signed out.")


@router.post("/logout-all", response_model=MessageOut)
def logout_all(
    response: Response,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    auth_service.revoke_all_sessions(db, principal.user_id)
    db.commit()
    _clear_session_cookies(response)
    return MessageOut(message="Signed out on every device.")


@router.get("/me", response_model=MeOut)
def me(principal: Principal = Depends(current_principal)):
    return _me(principal)


@router.post("/forgot-password", response_model=MessageOut, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    body: ForgotPasswordIn,
    request: Request,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(resolve_tenant),
):
    _limit(request, "forgot", body.email)
    auth_service.request_password_reset(db, tenant, body.email, _client(request))
    return MessageOut(
        message="If an account exists for that email, a reset link is on its way."
    )


@router.post("/reset-password", response_model=MessageOut)
def reset_password(body: ResetPasswordIn, request: Request, db: Session = Depends(get_db)):
    _limit(request, "reset")
    auth_service.reset_password(
        db, token=body.token, new_password=body.password, client=_client(request)
    )
    return MessageOut(message="Password updated. Please sign in with your new password.")
