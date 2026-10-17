"""
API Router — Authentication
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/register  (development mode only)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    CurrentUserContext,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., max_length=255)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate with email and password.
    Only available in JWT auth mode (standalone demo).
    """
    settings = get_settings()
    if settings.auth_mode.value != "jwt":
        raise HTTPException(
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            detail="Login endpoint is only available in JWT auth mode",
        )

    result = await db.execute(
        select(User).where(User.email == request.email.lower(), User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        email=user.email,
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user. Available in development mode only.
    In production, use the host application's identity system.
    """
    settings = get_settings()
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",  # Don't reveal the endpoint exists in production
        )

    existing = await db.execute(select(User).where(User.email == request.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=request.email.lower(),
        display_name=request.display_name,
        password_hash=hash_password(request.password),
        role=UserRole.STUDENT,
    )
    db.add(user)
    await db.flush()
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's profile."""
    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        created_at=user.created_at,
    )
