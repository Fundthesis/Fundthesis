"""Schema Management API endpoint for LLM-driven schema changes."""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.schema_manager import get_schema_manager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

router = APIRouter()


class SchemaChangeRequest(BaseModel):
    """Request body for schema changes."""
    schema_content: str = Field(..., description="The new complete Prisma schema content")
    description: str = Field(..., description="Description of the changes being made")
    auto_push: bool = Field(default=False, description="If True, automatically push changes to database")
    sync_frontend: bool = Field(default=True, description="If True, sync changes to frontend schema")


class RollbackRequest(BaseModel):
    """Request body for rollback operations."""
    backup_id: str = Field(..., description="ID of the backup to restore")


class SchemaChangeResponse(BaseModel):
    """Response from schema change operations."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    backup_id: Optional[str] = None
    rolled_back: bool = False
    validation: Optional[str] = None
    pushed_to_db: bool = False
    synced_to_frontend: bool = False


@router.get("/current")
async def get_current_schema():
    """
    Get the current Prisma schema content.

    Returns the full schema file content for inspection or modification.
    """
    try:
        manager = get_schema_manager()
        result = manager.get_current_schema()

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=404, detail=result.get("error"))

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Schema API] Error getting schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply", response_model=SchemaChangeResponse)
async def apply_schema_change(request: SchemaChangeRequest):
    """
    Apply a schema change with backup and validation.

    This endpoint:
    1. Creates a backup of the current schema
    2. Writes the new schema content
    3. Validates the schema with 'prisma format' and 'prisma validate'
    4. Optionally syncs to frontend schema
    5. Optionally pushes to database with 'prisma db push'
    6. Regenerates Prisma client if push succeeded

    If any step fails, the schema is automatically rolled back to the backup.
    """
    try:
        manager = get_schema_manager()

        result = await manager.apply_schema_change(
            new_schema_content=request.schema_content,
            change_description=request.description,
            auto_push=request.auto_push,
            sync_frontend=request.sync_frontend
        )

        return SchemaChangeResponse(**result)

    except Exception as e:
        logging.error(f"[Schema API] Error applying schema change: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/push")
async def push_schema_to_database():
    """
    Push the current schema to database.

    Runs 'prisma db push' and 'prisma generate' on the current schema
    without making any modifications.
    """
    try:
        manager = get_schema_manager()
        result = await manager.push_current_schema()

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Schema API] Error pushing schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rollback")
async def rollback_schema(request: RollbackRequest):
    """
    Rollback schema to a previous backup.

    Restores both backend and frontend schemas from the specified backup.
    A backup of the current state is created before rolling back.
    """
    try:
        manager = get_schema_manager()
        result = await manager.rollback_to_backup(request.backup_id)

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=404, detail=result.get("error"))

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Schema API] Error rolling back: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backups")
async def list_backups():
    """
    List available schema backups.

    Returns the most recent 20 backups with their IDs and paths.
    """
    try:
        manager = get_schema_manager()
        backups = manager.list_backups()

        return {
            "success": True,
            "backups": backups,
            "count": len(backups)
        }

    except Exception as e:
        logging.error(f"[Schema API] Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_change_history(limit: int = 20):
    """
    Get recent schema change history.

    Returns a log of recent schema changes, rollbacks, and database pushes.
    """
    try:
        manager = get_schema_manager()
        history = manager.get_change_history(limit=limit)

        return {
            "success": True,
            "history": history,
            "count": len(history)
        }

    except Exception as e:
        logging.error(f"[Schema API] Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def schema_service_health():
    """
    Health check for schema management service.

    Verifies that schema files exist and are readable.
    """
    try:
        manager = get_schema_manager()
        result = manager.get_current_schema()

        if result.get("success"):
            return {
                "status": "healthy",
                "schema_exists": True,
                "schema_path": result.get("path")
            }
        else:
            return {
                "status": "degraded",
                "schema_exists": False,
                "error": result.get("error")
            }

    except Exception as e:
        logging.error(f"[Schema API] Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
