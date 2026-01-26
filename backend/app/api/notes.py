"""
Notes API Router
Handles note upload and processing
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship

router = APIRouter(prefix="/api/notes", tags=["notes"])
logger = logging.getLogger(__name__)


@router.post("/upload")
async def upload_note(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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
    db.commit()
    db.refresh(note)
    
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
    db: Session = Depends(get_db)
):
    """
    Trigger AI pipeline to extract entities and relationships with real-time streaming
    Returns Server-Sent Events (SSE) for live progress updates
    """
    # Import here to avoid circular dependency
    from app.services.processor import process_note_pipeline
    
    # Get note
    note = db.query(Note).filter(Note.id == note_id).first()
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
    db: Session = Depends(get_db)
):
    """
    Get graph data for visualization
    Returns nodes (entities) and edges (relationships)
    """
    # Get note
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get all entities for this note
    entities = db.query(Entity).filter(Entity.note_id == note_id).all()
    
    # Get all relationships between these entities
    entity_ids = [e.id for e in entities]
    relationships = db.query(Relationship).filter(
        Relationship.source_entity_id.in_(entity_ids),
        Relationship.target_entity_id.in_(entity_ids)
    ).all()
    
    # Format response for frontend (D3.js compatible)
    return {
        "entities": [
            {
                "id": e.id,
                "name": e.name,
                "type": e.entity_type,  # Frontend expects 'type'
                "description": e.description,
                "color": e.color
            }
            for e in entities
        ],
        "relationships": [
            {
                "id": r.id,
                "source_entity_id": r.source_entity_id,
                "target_entity_id": r.target_entity_id,
                "type": r.relationship_type,  # Frontend expects 'type'
                "strength": r.strength,
                "explanation": r.ai_explanation  # Frontend expects 'explanation'
            }
            for r in relationships
        ]
    }


@router.get("/")
async def list_notes(db: Session = Depends(get_db)):
    """List all notes"""
    notes = db.query(Note).all()
    return {
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "created_at": n.created_at,
                "entity_count": len(n.entities) if hasattr(n, 'entities') else 0
            }
            for n in notes
        ]
    }


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a note and all associated entities and relationships
    """
    # Get note
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_title = note.title
    
    # Get all entities for this note
    entities = db.query(Entity).filter(Entity.note_id == note_id).all()
    entity_ids = [e.id for e in entities]
    
    # Delete relationships first (foreign key constraint)
    if entity_ids:
        db.query(Relationship).filter(
            Relationship.source_entity_id.in_(entity_ids) | 
            Relationship.target_entity_id.in_(entity_ids)
        ).delete(synchronize_session=False)
    
    # Delete entities
    db.query(Entity).filter(Entity.note_id == note_id).delete()
    
    # Delete note
    db.delete(note)
    db.commit()
    
    logger.info(f"Note deleted: {note_id} - {note_title}")
    
    return {
        "note_id": note_id,
        "title": note_title,
        "status": "deleted",
        "message": f"Note '{note_title}' and all associated data deleted successfully"
    }
