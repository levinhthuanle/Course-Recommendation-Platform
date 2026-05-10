"""User models for authentication and authorization."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserPublic(BaseModel):
    """Public user info returned to clients."""

    id: int
    email: EmailStr
    role: str = Field(..., description="User role: 'user' or 'admin'")


class UserCreate(BaseModel):
    """User registration payload."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password too long (max 72 bytes)")
        return value


class UserLogin(BaseModel):
    """User login payload."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password too long (max 72 bytes)")
        return value


class TokenResponse(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class TokenPayload(BaseModel):
    """Token payload after decoding."""

    sub: str
    role: str
    exp: Optional[int] = None
