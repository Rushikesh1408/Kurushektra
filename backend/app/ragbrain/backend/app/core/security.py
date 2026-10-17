"""
Authentication and authorization utilities.
Supports JWT (standalone demo) and external identity integration modes.

Security principles:
- Passwords are hashed with bcrypt; never stored in plaintext.
- JWTs are signed with HS256; secret is read from environment only.
- Auth mode 'dev_bypass_UNSAFE' is blocked in production by config validator.
- All token errors return generic 401 without leaking internals.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import AuthMode, get_settings
from app.core.logging import get_logger
from app.models.models import User, UserRole

logger = get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain[:72].encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT utilities
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, role: str, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.jwt_refresh_token_expire_days
    )
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on any failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

class CurrentUserContext:
    """Resolved identity from JWT or external header."""
    def __init__(self, user_id: str, role: UserRole, email: str, external_id: Optional[str] = None):
        self.user_id = user_id
        self.role = role
        self.email = email
        self.external_id = external_id

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_instructor(self) -> bool:
        return self.role in (UserRole.INSTRUCTOR, UserRole.ADMIN)

    @property
    def is_student(self) -> bool:
        return self.role == UserRole.STUDENT


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUserContext:
    """
    FastAPI dependency that resolves the current user from the request.
    Mode is determined by AUTH_MODE setting.
    """
    settings = get_settings()

    if settings.auth_mode == AuthMode.DEV_BYPASS_UNSAFE:
        # Only allowed in development; blocked in production by config validator
        logger.warning("dev_bypass_auth_used — UNSAFE, development only")
        return CurrentUserContext(
            user_id="dev-bypass-user-id",
            role=UserRole.ADMIN,
            email="dev@dev.local",
        )

    if settings.auth_mode == AuthMode.EXTERNAL:
        # Integration mode: trust headers set by the upstream Code Arena gateway
        user_id = request.headers.get("X-AI-Brain-User-ID")
        role_str = request.headers.get("X-AI-Brain-User-Role", "student")
        email = request.headers.get("X-AI-Brain-User-Email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-AI-Brain-User-ID header",
            )
        try:
            role = UserRole(role_str.lower())
        except ValueError:
            role = UserRole.STUDENT
        return CurrentUserContext(user_id=user_id, role=role, email=email)

    # Default: JWT mode
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    return CurrentUserContext(
        user_id=payload["sub"],
        role=UserRole(payload.get("role", "student")),
        email=payload.get("email", ""),
    )


async def require_instructor(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_instructor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor role required")
    return current_user


async def require_admin(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


def assert_owns_resource(current_user: CurrentUserContext, resource_owner_id: str) -> None:
    """Raise 403 if the current user does not own the resource and is not admin/instructor."""
    if current_user.user_id == resource_owner_id:
        return
    if current_user.is_instructor:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this resource",
    )
