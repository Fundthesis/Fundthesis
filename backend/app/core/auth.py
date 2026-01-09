"""Authentication module for validating Better Auth sessions."""
from datetime import datetime, UTC
from typing import Optional
from dataclasses import dataclass
from prisma import Prisma
import os


@dataclass
class AuthenticatedUser:
    """Represents an authenticated user from Better Auth session."""
    id: str
    email: str
    name: Optional[str] = None
    session_id: str = ""


async def validate_session_token(
    db: Prisma,
    token: str
) -> Optional[AuthenticatedUser]:
    """
    Validate a Better Auth session token by querying the database.

    Better Auth stores sessions in the 'session' table with:
    - token: The session token (unique)
    - userId: Foreign key to user table
    - expiresAt: Session expiration timestamp

    Returns AuthenticatedUser if valid, None otherwise.
    """
    if not token:
        return None

    try:
        if not db.is_connected():
            await db.connect()

        # Query session table - matches Better Auth schema
        session = await db.session.find_first(
            where={
                'token': token,
                'expiresAt': {'gt': datetime.now(UTC)}
            },
            include={'user': True}
        )

        if not session or not session.user:
            return None

        return AuthenticatedUser(
            id=session.user.id,
            email=session.user.email,
            name=session.user.name,
            session_id=session.id
        )
    except Exception as e:
        print(f"Session validation error: {e}")
        return None


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract token from 'Bearer <token>' header."""
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None

    return parts[1]
