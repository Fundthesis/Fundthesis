"""FastAPI application entry point with authentication and rate limiting."""
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add backend to path
backend_path = Path(__file__).parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import db
from app.core.config import settings
from app.api import routes, news, stocks, insights, sentiment, users, sandboxes
from app.api.dependencies import check_rate_limit, get_optional_user
from app.models.auth import AuthStatusResponse, UserResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Database lifecycle management."""
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(title="FundThesis API", lifespan=lifespan)

# CORS middleware - uses origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)

# Include routers with rate limiting dependency
app.include_router(
    routes.router,
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    news.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    stocks.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    insights.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    sentiment.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    users.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)
app.include_router(
    sandboxes.router,
    prefix="/api",
    dependencies=[Depends(check_rate_limit)]
)

# Include education routes for Education Track features
try:
    from app.api.education import router as education_router
    app.include_router(
        education_router,
        prefix="/api",
        dependencies=[Depends(check_rate_limit)]
    )
except ImportError as e:
    print(f"Warning: education routes not available. Error: {e}")


# Include RAG routes for AI Coach
try:
    from app.api.rag import router as rag_router
    app.include_router(rag_router, prefix="/api")
except ImportError as e:
    print(f"Warning: RAG routes not available. AI Coach RAG features may not work. Error: {e}")

# Include tracking routes for user interaction tracking
try:
    from app.api.tracking import router as tracking_router
    app.include_router(tracking_router, prefix="/api/tracking")
except ImportError as e:
    print(f"Warning: Tracking routes not available. User interaction tracking may not work. Error: {e}")

# Include schema management routes for LLM-driven schema changes
try:
    from app.api.schema import router as schema_router
    app.include_router(schema_router, prefix="/api/schema")
except ImportError as e:
    print(f"Warning: Schema management routes not available. LLM schema management may not work. Error: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to FundThesis API"}


@app.get("/api/auth/status", response_model=AuthStatusResponse)
async def auth_status(user=Depends(get_optional_user)):
    """
    Check authentication status.
    Returns authenticated=true with user info if valid token provided,
    otherwise authenticated=false.
    """
    if user:
        return AuthStatusResponse(
            authenticated=True,
            user=UserResponse(id=user.id, email=user.email, name=user.name)
        )
    return AuthStatusResponse(authenticated=False, user=None)
