"""FastAPI application entry point."""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import db
from app.api import routes, news, stocks, insights

app = FastAPI(title="FundThesis API")

# Database lifecycle
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.router)
app.include_router(news.router, prefix="/api")
app.include_router(stocks.router, prefix="/api")
app.include_router(insights.router, prefix="/api")

# Include education routes for Education Track features
try:
    from app.api.education import router as education_router
    app.include_router(education_router, prefix="/api")
except ImportError as e:
    print(f"Warning: education routes not available. Education Track features may not work. Error: {e}")

# Include RAG routes for AI Coach
try:
    from app.api.rag import router as rag_router
    app.include_router(rag_router, prefix="/api")
except ImportError as e:
    print(f"Warning: RAG routes not available. AI Coach RAG features may not work. Error: {e}")

@app.get("/")
def read_root():
    return {"Welcome to fundthesis"}
