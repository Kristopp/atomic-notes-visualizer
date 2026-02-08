"""
Notes API Router - Refactored with Service Layer and Pydantic Schemas
"""
from typing import Annotated, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.services.note_service import NoteService, get_note_service
from app.schemas import (
    NoteListResponse, NoteResponse, NoteUploadResponse,
    GraphDataResponse, ErrorResponse
)

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.post(
    "/upload",
    response_model=NoteUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def upload_note(
    file: Annotated[UploadFile, File(description="Text file (.txt or .md) containing atomic notes")],
    topic_id: Optional[int] = None,
    service: NoteService = Depends(get_note_service)
):
    """
    Upload a text file containing atomic notes
    Accepts .txt or .md files
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(('.txt', '.md')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt and .md files are supported"
        )
    
    # Read file content
    content = await file.read()
    text = content.decode('utf-8')
    
    # Use service layer to create note
    return await service.upload_file(file.filename, text, topic_id)


@router.post(
    "/{note_id}/process",
    responses={
        404: {"model": ErrorResponse, "description": "Note not found"},
        500: {"model": ErrorResponse, "description": "Processing failed"}
    }
)
async def process_note(
    note_id: int,
    service: NoteService = Depends(get_note_service)
):
    """
    Trigger AI pipeline to extract entities and relationships with real-time streaming
    Returns Server-Sent Events (SSE) for live progress updates
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Import here to avoid circular dependency
    from app.services.processor import process_note_pipeline
    
    # Verify note exists
    note = await service.get_note_by_id(note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    try:
        # Return streaming response with SSE
        return StreamingResponse(
            process_note_pipeline(note_id, service.db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )


@router.get(
    "/{note_id}/graph",
    response_model=GraphDataResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Note not found"}
    }
)
async def get_note_graph(
    note_id: int,
    service: NoteService = Depends(get_note_service)
):
    """
    Get graph data for visualization
    Returns nodes (entities) and edges (relationships)
    """
    graph_data = await service.get_note_graph(note_id)
    
    if graph_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    return graph_data


@router.get(
    "/",
    response_model=NoteListResponse
)
async def list_notes(
    service: NoteService = Depends(get_note_service)
):
    """
    List all notes with entity counts
    Optimized query with no N+1 problem
    """
    notes = await service.list_notes()
    return NoteListResponse(notes=notes)


@router.get(
    "/{note_id}",
    response_model=NoteResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Note not found"}
    }
)
async def get_note(
    note_id: int,
    service: NoteService = Depends(get_note_service)
):
    """Get single note details"""
    note = await service.get_note_by_id(note_id)
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    return note


@router.delete(
    "/{note_id}",
    responses={
        404: {"model": ErrorResponse, "description": "Note not found"},
        200: {"description": "Note deleted successfully"}
    }
)
async def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service)
):
    """
    Delete a note and all associated entities and relationships
    """
    result = await service.delete_note(note_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    note_id, note_title = result
    
    return {
        "note_id": note_id,
        "title": note_title,
        "status": "deleted",
        "message": f"Note '{note_title}' and all associated data deleted successfully"
    }
