"""User profile and settings API endpoints."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional, Dict, Any
import traceback

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.dependencies import get_current_user
from app.core.auth import AuthenticatedUser
from app.core.database import db

router = APIRouter()


@router.get("/users/me")
async def get_current_user_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Get current user profile information."""
    try:
        # Fetch user from database
        db_user = await db.user.find_unique(
            where={"id": user.id},
            select={
                "id": True,
                "name": True,
                "email": True,
                "image": True,
                "createdAt": True,
                "updatedAt": True,
            }
        )
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email,
            "avatar": db_user.image,
            "createdAt": db_user.createdAt.isoformat() if db_user.createdAt else None,
            "updatedAt": db_user.updatedAt.isoformat() if db_user.updatedAt else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching user profile: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/me")
async def update_user_profile(
    name: Optional[str] = None,
    bio: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Update user profile information."""
    try:
        update_data: Dict[str, Any] = {}
        
        if name is not None:
            update_data["name"] = name
        
        # Note: bio would need to be added to User model schema
        # For now, we'll skip it
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updated_user = await db.user.update(
            where={"id": user.id},
            data=update_data,
            select={
                "id": True,
                "name": True,
                "email": True,
                "image": True,
            }
        )
        
        return {
            "id": updated_user.id,
            "name": updated_user.name,
            "email": updated_user.email,
            "avatar": updated_user.image,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating user profile: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Upload user avatar image."""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (max 5MB)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
        
        # TODO: Upload to cloud storage (S3, Cloudinary, etc.)
        # For now, we'll store the image URL in the database
        # In production, you would:
        # 1. Upload to cloud storage
        # 2. Get the public URL
        # 3. Store URL in database
        
        # Placeholder: Store as base64 or return a placeholder URL
        # In a real implementation, upload to storage and get URL
        avatar_url = f"/avatars/{user.id}/{file.filename}"
        
        await db.user.update(
            where={"id": user.id},
            data={"image": avatar_url}
        )
        
        return {
            "avatar": avatar_url,
            "message": "Avatar uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading avatar: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/me/settings")
async def get_user_settings(user: AuthenticatedUser = Depends(get_current_user)):
    """Get user preferences and settings."""
    try:
        # TODO: Fetch from User preferences field (JSON)
        # For now, return default settings
        return {
            "theme": "light",
            "language": "en",
            "currency": "USD",
            "dateFormat": "MM/DD/YYYY",
            "emailNotifications": True,
            "newsAlerts": True,
            "alertFrequency": "daily",
        }
    except Exception as e:
        print(f"❌ Error fetching user settings: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/me/settings")
async def update_user_settings(
    settings: Dict[str, Any],
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Update user preferences and settings."""
    try:
        # TODO: Store in User preferences field (JSON)
        # For now, just return success
        return {
            "message": "Settings updated successfully",
            "settings": settings
        }
    except Exception as e:
        print(f"❌ Error updating user settings: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

