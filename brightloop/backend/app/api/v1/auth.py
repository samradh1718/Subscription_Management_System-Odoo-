from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_password_hash, verify_password, generate_session_token
from app.schemas.auth import UserRegister, UserLogin, SessionResponse
from app.models.identity import User, Tenant, Session as DBSession

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email.ilike(user_data.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    tenant = Tenant(name=user_data.tenant_name)
    db.add(tenant)
    db.flush() # Get tenant.id
    
    new_user = User(
        tenant_id=tenant.id,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role="admin" # First user of a tenant is admin
    )
    db.add(new_user)
    db.commit()
    return {"message": "Tenant and Admin user created successfully"}

@router.post("/login", response_model=SessionResponse)
def login(response: Response, user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(user_data.email)).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = generate_session_token()
    expires = datetime.now(timezone.utc) + timedelta(days=1)
    
    db_session = DBSession(id=session_token, user_id=user.id, expires_at=expires)
    db.add(db_session)
    db.commit()
    
    response.set_cookie(
        key="session_id",
        value=session_token,
        httponly=True,
        secure=True, 
        samesite="lax",
        expires=expires
    )
    return {"message": "Login successful", "role": user.role}

@router.post("/logout")
def logout(response: Response, session_id: str, db: Session = Depends(get_db)):
    db.query(DBSession).filter(DBSession.id == session_id).delete()
    db.commit()
    response.delete_cookie(key="session_id")
    return {"message": "Logged out successfully"}