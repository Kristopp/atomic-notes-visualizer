"""
Annotations API Router
User annotations/notes on entities
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Annotated
from datetime import datetime

from app.database import get_db
from app.models.annotation import Annotation
from app.models.entity import Entity

router = APIRouter(prefix="/api/annotations", tags=["annotations"])

# Using Annotated for cleaner dependency injection
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


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
    db: DatabaseDep = None
):
    """
    Create a new annotation for an entity
    """
    # Verify entity exists
    entity_result = await db.execute(select(Entity).where(Entity.id == annotation.entity_id))
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {annotation.entity_id} not found")
    
    # Create annotation
    db_annotation = Annotation(
        entity_id=annotation.entity_id,
        user_note=annotation.user_note
    )
    
    db.add(db_annotation)
    await db.commit()
    await db.refresh(db_annotation)
    
    return db_annotation


@router.get("/entity/{entity_id}", response_model=List[AnnotationResponse])
async def get_entity_annotations(
    entity_id: int,
    db: DatabaseDep = None
):
    """
    Get all annotations for a specific entity
    """
    # Verify entity exists
    entity_result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    
    # Get annotations
    result = await db.execute(
        select(Annotation)
        .where(Annotation.entity_id == entity_id)
        .order_by(desc(Annotation.created_at))
    )
    annotations = result.scalars().all()
    
    return annotations


@router.get("/{annotation_id}", response_model=AnnotationResponse)
async def get_annotation(
    annotation_id: int,
    db: DatabaseDep = None
):
    """
    Get a specific annotation by ID
    """
    result = await db.execute(select(Annotation).where(Annotation.id == annotation_id))
    annotation = result.scalar_one_or_none()
    
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    return annotation


@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: int,
    db: DatabaseDep = None
):
    """
    Delete an annotation
    """
    result = await db.execute(select(Annotation).where(Annotation.id == annotation_id))
    annotation = result.scalar_one_or_none()
    
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    await db.delete(annotation)
    await db.commit()
    
    return {"message": f"Annotation {annotation_id} deleted successfully"}


@router.put("/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int,
    user_note: str,
    db: DatabaseDep = None
):
    """
    Update an annotation's note content
    """
    result = await db.execute(select(Annotation).where(Annotation.id == annotation_id))
    annotation = result.scalar_one_or_none()
    
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    annotation.user_note = user_note
    await db.commit()
    await db.refresh(annotation)
    
    return annotation

