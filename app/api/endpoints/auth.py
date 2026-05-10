"""Authentication endpoints for JWT login and registration."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import create_access_token, get_auth_service, get_current_user
from app.core.config import Settings, get_settings
from app.models.user import TokenResponse, UserCreate, UserLogin, UserPublic
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=TokenResponse, summary="Register new user")
def register_user(
    payload: UserCreate,
    settings: Settings = Depends(get_settings),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    password_len = len(payload.password.encode("utf-8"))
    logger.info(f"Register attempt password length: {password_len} bytes")
    if password_len > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too long (max 72 bytes)")

    existing = auth_service.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        user = auth_service.create_user(email=payload.email, password=payload.password, role="user")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_access_token(subject=str(user.id), role=user.role, settings=settings)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse, summary="Login with email and password")
def login_user(
    payload: UserLogin,
    settings: Settings = Depends(get_settings),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    password_len = len(payload.password.encode("utf-8"))
    if password_len > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too long (max 72 bytes)")

    user = auth_service.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id), role=user.role, settings=settings)
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserPublic, summary="Get current user")
def get_me(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user
