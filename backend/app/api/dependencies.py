"""FastAPI dependencies for authentication and rate limiting."""
from typing import Optional
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.database import db
from app.core.auth import AuthenticatedUser, validate_session_token
from app.core.rate_limiter import rate_limiter

# Optional bearer token - doesn't fail if missing
optional_bearer = HTTPBearer(auto_error=False)


async def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    # Check X-Forwarded-For header (common for proxies/load balancers)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take first IP in chain
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    # Fall back to direct client
    if request.client:
        return request.client.host
    return "unknown"


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer)
) -> Optional[AuthenticatedUser]:
    """
    Get authenticated user if valid token provided, None otherwise.
    Does not raise exceptions - for optional auth endpoints.
    """
    if not credentials:
        return None

    return await validate_session_token(db, credentials.credentials)


async def get_current_user(
    user: Optional[AuthenticatedUser] = Depends(get_optional_user)
) -> AuthenticatedUser:
    """
    Require authenticated user - raises 401 if not authenticated.
    Use as dependency for protected endpoints.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


async def check_rate_limit(
    request: Request,
    response: Response,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user)
):
    """
    Rate limiting dependency.
    - Guests: 30 req/min
    - Authenticated: Unlimited

    Adds rate limit headers to response.
    """
    client_ip = await get_client_ip(request)
    is_authenticated = user is not None

    allowed, retry_after, limit, remaining = await rate_limiter.check_rate_limit(
        client_ip,
        is_authenticated
    )

    # Add rate limit headers for guests
    if not is_authenticated:
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0"
            }
        )
