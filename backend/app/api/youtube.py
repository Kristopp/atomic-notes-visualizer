from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from celery.result import AsyncResult
from celery.result import AsyncResult
from typing import Annotated, Optional
import logging

from app.database import get_db
from app.services.youtube_audio import extract_video_id
from app.services.job_queue import celery_app
from app.tasks.youtube_processor import process_youtube_video
from app.models.note import Note

router = APIRouter(prefix="/api/youtube", tags=["youtube"])
logger = logging.getLogger(__name__)

# Using Annotated for cleaner dependency injection
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]

class YouTubeRequest(BaseModel):
    url: str
    topic_id: Optional[int] = None


@router.post("/process")
async def start_youtube_processing(
    request: YouTubeRequest,
    db: DatabaseDep = None
):
    """
    Start background job to process YouTube video
    """
    try:
        # Validate URL
        extract_video_id(request.url)
        
        # Create Note placeholder
        new_note = Note(
            title=f"YouTube Video: {request.url}",
            content="Processing in progress...",
            note_metadata={"source": "youtube", "url": request.url},
            topic_id=request.topic_id
        )
        db.add(new_note)
        await db.commit()
        await db.refresh(new_note)
        
        # Start background task (Celery is still sync-ish in how it's called, that's fine)
        task = process_youtube_video.delay(request.url, new_note.id)
        
        return {
            "job_id": task.id,
            "note_id": new_note.id,
            "status": "queued"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting YouTube processing: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get real-time job progress
    """
    try:
        result = AsyncResult(job_id, app=celery_app)
        
        status_map = {
            "PENDING": "queued",
            "PROGRESS": "processing",
            "SUCCESS": "completed",
            "FAILURE": "failed"
        }
        
        # Accessing result.state can raise ValueError if meta is malformed
        try:
            state = result.state
        except Exception as e:
            logger.error(f"Error accessing task state for {job_id}: {str(e)}")
            return {
                "job_id": job_id,
                "status": "failed",
                "progress": 0,
                "stage": "error",
                "message": f"Error retrieving status: {str(e)}"
            }

        status = status_map.get(state, "unknown")
        
        response = {
            "job_id": job_id,
            "status": status,
            "progress": 0,
            "stage": "starting",
            "message": "Initializing..."
        }
        
        if state == "PROGRESS":
            info = result.info
            response.update({
                "progress": info.get("progress", 0),
                "stage": info.get("stage", "processing"),
                "message": info.get("message", "Processing...")
            })
        elif state == "SUCCESS":
            response.update({
                "progress": 100,
                "stage": "complete",
                "message": "Processing complete!"
            })
            # Try to get note_id from result if available
            if isinstance(result.result, dict):
                response["note_id"] = result.result.get("note_id")
        elif state == "FAILURE":
            # Safely handle failure info
            err_msg = "Unknown error"
            try:
                err_msg = str(result.result)
            except:
                pass
            response.update({
                "status": "failed",
                "message": f"Error: {err_msg}"
            })
            
        return response
    except Exception as e:
        logger.error(f"Unexpected error in get_job_status for {job_id}: {str(e)}")
        return {
            "job_id": job_id,
            "status": "failed",
            "progress": 0,
            "stage": "error",
            "message": f"Unexpected error: {str(e)}"
        }
