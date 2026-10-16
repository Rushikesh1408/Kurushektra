from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import audit, get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token, hash_password, hash_token, new_refresh_token, verify_password,
)
from app.models import RefreshToken, User
from app.models.base import Role, utcnow
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive datetimes


def _issue(db: Session, response: Response, user: User) -> TokenOut:
    s = get_settings()
    raw, digest = new_refresh_token()
    expires = utcnow() + timedelta(days=s.refresh_token_days)
    db.add(RefreshToken(user_id=user.id, token_hash=digest, expires_at=expires))
    db.commit()
    # httpOnly + SameSite=Strict keeps the refresh token away from scripts and cross-site requests (CSRF).
    response.set_cookie(
        COOKIE, raw, max_age=s.refresh_token_days * 86400, httponly=True, secure=s.cookie_secure,
        samesite="strict", path=COOKIE_PATH,
    )
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=201)
@limiter.limit(lambda: get_settings().login_rate_limit)
def register(request: Request, body: RegisterIn, response: Response, db: Session = Depends(get_db)):
    user = User(
        email=body.email.lower(), full_name=body.full_name.strip(), password_hash=hash_password(body.password),
        role=Role.STUDENT,  # self-registration can only ever create students
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists.")
    audit(db, request, user, "auth.register", "user", user.id)
    return _issue(db, response, user)


@router.post("/login", response_model=TokenOut)
@limiter.limit(lambda: get_settings().login_rate_limit)
def login(request: Request, body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    ok = verify_password(user.password_hash if user else None, body.password)
    if not ok or user is None or not user.is_active:
        audit(db, request, None, "auth.login_failed", details={"email": body.email.lower()[:255]})
        db.commit()
        raise HTTPException(401, "Email or password is incorrect.")
    audit(db, request, user, "auth.login", "user", user.id)
    return _issue(db, response, user)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("30/minute")
def refresh(request: Request, response: Response, db: Session = Depends(get_db),
            refresh_token: str | None = Cookie(default=None)):
    invalid = HTTPException(401, "Session expired. Sign in again.")
    if not refresh_token:
        raise invalid
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token)))
    if row is None:
        raise invalid
    if row.revoked_at is not None:
        # A rotated token was presented again: assume theft and end every session for this user.
        db.execute(update(RefreshToken).where(RefreshToken.user_id == row.user_id, RefreshToken.revoked_at.is_(None))
                   .values(revoked_at=utcnow()))
        audit(db, request, None, "auth.refresh_reuse_detected", "user", row.user_id)
        db.commit()
        raise invalid
    user = db.get(User, row.user_id)
    if _aware(row.expires_at) < utcnow() or user is None or not user.is_active:
        raise invalid
    row.revoked_at = utcnow()  # rotation: each refresh token works once
    return _issue(db, response, user)


@router.post("/logout", status_code=204)
def logout(response: Response, db: Session = Depends(get_db), refresh_token: str | None = Cookie(default=None)):
    if refresh_token:
        row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token)))
        if row and row.revoked_at is None:
            row.revoked_at = utcnow()
            db.commit()
    response.delete_cookie(COOKIE, path=COOKIE_PATH)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
