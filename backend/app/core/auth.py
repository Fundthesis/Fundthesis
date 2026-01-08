"""Authentication module for validating Better Auth sessions."""
from datetime import datetime, UTC
from typing import Optional
from dataclasses import dataclass
from prisma import Prisma
import json, os

# #region agent log
DEBUG_LOG_PATH = "/Users/alibenrami/Documents/projects/Fundthesis/.cursor/debug.log"
def _debug_log(hyp_id, location, message, data=None):
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps({"hypothesisId": hyp_id, "location": location, "message": message, "data": data or {}, "timestamp": int(datetime.now(UTC).timestamp() * 1000), "sessionId": "debug-session"}) + "\n")
    except: pass
# #endregion


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
    # #region agent log
    _debug_log("H1", "auth.py:validate_session_token:entry", "Function called", {"token_present": bool(token), "token_preview": token[:20] if token else None, "db_connected": db.is_connected() if db else False})
    # #endregion
    
    if not token:
        return None

    try:
        if not db.is_connected():
            await db.connect()
        
        # #region agent log
        _debug_log("H2", "auth.py:validate_session_token:pre_query", "About to query session table", {"db_url_host": os.environ.get("DATABASE_URL", "")[:50] if os.environ.get("DATABASE_URL") else "NOT_SET"})
        # #endregion

        # Query session table - matches Better Auth schema
        session = await db.session.find_first(
            where={
                'token': token,
                'expiresAt': {'gt': datetime.now(UTC)}
            },
            include={'user': True}
        )
        
        # #region agent log
        _debug_log("H3", "auth.py:validate_session_token:post_query", "Query succeeded", {"session_found": session is not None})
        # #endregion

        if not session or not session.user:
            return None

        return AuthenticatedUser(
            id=session.user.id,
            email=session.user.email,
            name=session.user.name,
            session_id=session.id
        )
    except Exception as e:
        # #region agent log
        _debug_log("H1_H2", "auth.py:validate_session_token:error", "Query failed with exception", {"error_type": type(e).__name__, "error_message": str(e)})
        # #endregion
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
