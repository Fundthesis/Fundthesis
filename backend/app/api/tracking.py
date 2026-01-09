"""User interaction tracking API endpoint."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from services.user_context_service import get_user_context_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

router = APIRouter()


class TrackInteractionRequest(BaseModel):
    """Request body for tracking interactions."""
    userId: str
    contentType: str  # 'article', 'module', 'coach_query'
    contentId: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/interaction")
async def track_interaction(request: TrackInteractionRequest):
    """
    Track a user interaction with content.
    
    This endpoint is called by the frontend to log user interactions
    (articles viewed, modules accessed, coach queries) for personalized
    RAG context.
    """
    try:
        context_service = get_user_context_service()
        
        success = await context_service.track_interaction(
            user_id=request.userId,
            content_type=request.contentType,
            content_id=request.contentId,
            metadata=request.metadata
        )
        
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to track interaction")
            
    except Exception as e:
        logging.error(f"[Tracking API] Error tracking interaction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def tracking_health():
    """
    Health check endpoint for user interaction tracking.

    Returns the status of the tracking service and database connectivity.
    """
    try:
        context_service = get_user_context_service()
        health = await context_service.health_check()

        if health['status'] == 'healthy':
            return health
        else:
            raise HTTPException(status_code=503, detail=health)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Tracking API] Health check error: {e}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})

