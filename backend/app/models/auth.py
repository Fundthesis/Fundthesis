"""Pydantic models for authentication responses."""
from typing import Optional
from pydantic import BaseModel


class UserResponse(BaseModel):
    """User information returned in API responses."""
    id: str
    email: str
    name: Optional[str] = None


class AuthStatusResponse(BaseModel):
    """Response for auth status check endpoint."""
    authenticated: bool
    user: Optional[UserResponse] = None
