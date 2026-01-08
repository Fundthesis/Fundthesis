"""General API routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/home")
def ping():
    return {"message": "pong"}


@router.get("/dashboard")
def read_dashboard():
    return {"Welcome to dashboard"}


@router.get("/roulette")
def gamble():
    return {"Put your life savings into NMAX"}

