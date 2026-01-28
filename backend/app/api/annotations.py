"""
Annotations API Router
User annotations/notes on entities
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.annotation import Annotation
from app.models.entity import Entity

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


# Pydantic models for request/response
class AnnotationCreate(BaseModel):
    entity_id: int
    user_note: str


class AnnotationResponse(BaseModel):
    id: int
    entity_id: int
    user_note: str
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=AnnotationResponse)
async def create_annotation(
    annotation: AnnotationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new annotation for an entity
    """
    # Verify entity exists
    entity = db.query(Entity).filter(Entity.id == annotation.entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {annotation.entity_id} not found")
    
    # Create annotation
    db_annotation = Annotation(
        entity_id=annotation.entity_id,
        user_note=annotation.user_note
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation


@router.get("/entity/{entity_id}", response_model=List[AnnotationResponse])
async def get_entity_annotations(
    entity_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all annotations for a specific entity
    """
    # Verify entity exists
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    
    # Get annotations
    annotations = db.query(Annotation).filter(
        Annotation.entity_id == entity_id
    ).order_by(Annotation.created_at.desc()).all()
    
    return annotations


@router.get("/{annotation_id}", response_model=AnnotationResponse)
async def get_annotation(
    annotation_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific annotation by ID
    """
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    return annotation


@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an annotation
    """
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    db.delete(annotation)
    db.commit()
    
    return {"message": f"Annotation {annotation_id} deleted successfully"}


@router.put("/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int,
    user_note: str,
    db: Session = Depends(get_db)
):
    """
    Update an annotation's note content
    """
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    annotation.user_note = user_note
    db.commit()
    db.refresh(annotation)
    
    return annotation
