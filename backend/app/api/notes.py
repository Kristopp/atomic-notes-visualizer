"""
Notes API Router
Handles note upload and processing
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Annotated
import logging

from app.database import get_db
from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship

router = APIRouter(prefix="/api/notes", tags=["notes"])
logger = logging.getLogger(__name__)

# Using Annotated for cleaner dependency injection
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


@router.post("/upload")
async def upload_note(
    file: UploadFile = File(...),
    db: DatabaseDep = None
):
    """
    Upload a text file containing atomic notes
    Accepts .txt or .md files
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(('.txt', '.md')):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .md files are supported"
        )
    
    # Read file content
    content = await file.read()
    text = content.decode('utf-8')
    
    # Create note record
    note = Note(
        title=file.filename,
        content=text,
        source_file=file.filename
    )
    
    db.add(note)
    await db.commit()
    await db.refresh(note)
    
    logger.info(f"Note uploaded: {note.id} - {file.filename}")
    
    return {
        "note_id": note.id,
        "title": note.title,
        "content_length": len(text),
        "status": "uploaded",
        "message": "Note uploaded successfully. Call /process to extract entities."
    }


@router.post("/{note_id}/process")
async def process_note(
    note_id: int,
    db: DatabaseDep = None
):
    """
    Trigger AI pipeline to extract entities and relationships with real-time streaming
    Returns Server-Sent Events (SSE) for live progress updates
    """
    # Import here to avoid circular dependency
    from app.services.processor import process_note_pipeline
    
    # Get note
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    try:
        # Return streaming response with SSE
        return StreamingResponse(
            process_note_pipeline(note_id, db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )


@router.get("/{note_id}/graph")
async def get_note_graph(
    note_id: int,
    db: DatabaseDep = None
):
    """
    Get graph data for visualization
    Returns nodes (entities) and edges (relationships)
    """
    # Get note
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get all entities for this note
    entities_result = await db.execute(select(Entity).where(Entity.note_id == note_id))
    entities = entities_result.scalars().all()
    
    # Get all relationships between these entities
    entity_ids = [e.id for e in entities]
    relationships = []
    if entity_ids:
        rel_result = await db.execute(
            select(Relationship).where(
                Relationship.source_entity_id.in_(entity_ids),
                Relationship.target_entity_id.in_(entity_ids)
            )
        )
        relationships = rel_result.scalars().all()
    
    # Format response for frontend (D3.js compatible)
    return {
        "entities": [
            {
                "id": e.id,
                "name": e.name,
                "type": e.entity_type,
                "description": e.description,
                "color": e.color,
                "timestamp": e.timestamp
            }
            for e in entities
        ],
        "relationships": [
            {
                "id": r.id,
                "source_entity_id": r.source_entity_id,
                "target_entity_id": r.target_entity_id,
                "type": r.relationship_type,
                "strength": r.strength,
                "explanation": r.ai_explanation
            }
            for r in relationships
        ]
    }


@router.get("/")
async def list_notes(db: DatabaseDep = None):
    """List all notes"""
    result = await db.execute(select(Note))
    notes_list = result.scalars().all()
    
    # Pre-fetch entity counts to avoid N+1 (Pro optimization)
    # For now, we'll keep it simple but async-safe
    
    notes_data = []
    for n in notes_list:
        # We need to manually count if relationship isn't loaded
        ent_count_res = await db.execute(select(Entity).where(Entity.note_id == n.id))
        ent_count = len(ent_count_res.scalars().all())
        
        notes_data.append({
            "id": n.id,
            "title": n.title,
            "created_at": n.created_at,
            "entity_count": ent_count,
            "note_metadata": n.note_metadata
        })
        
    return {"notes": notes_data}


@router.get("/{note_id}")
async def get_note(
    note_id: int,
    db: DatabaseDep = None
):
    """Get single note details"""
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "source_file": note.source_file,
        "note_metadata": note.note_metadata
    }


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: DatabaseDep = None
):
    """
    Delete a note and all associated entities and relationships
    """
    # Get note
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_title = note.title
    
    # Get all entities for this note
    entities_result = await db.execute(select(Entity).where(Entity.note_id == note_id))
    entities = entities_result.scalars().all()
    entity_ids = [e.id for e in entities]
    
    # Delete relationships first
    if entity_ids:
        await db.execute(
            delete(Relationship).where(
                Relationship.source_entity_id.in_(entity_ids) | 
                Relationship.target_entity_id.in_(entity_ids)
            )
        )
    
    # Delete entities
    await db.execute(delete(Entity).where(Entity.note_id == note_id))
    
    # Delete note
    await db.delete(note)
    await db.commit()
    
    logger.info(f"Note deleted: {note_id} - {note_title}")
    
    return {
        "note_id": note_id,
        "title": note_title,
        "status": "deleted",
        "message": f"Note '{note_title}' and all associated data deleted successfully"
    }

