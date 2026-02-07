"""
Note Service Layer
Handles all business logic for notes with optimized database queries
"""
from typing import List, Optional, Tuple
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
import logging

from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.schemas import (
    NoteCreate, NoteUpdate, NoteResponse, NoteListItem,
    GraphNode, GraphEdge, GraphDataResponse, NoteUploadResponse
)

logger = logging.getLogger(__name__)


class NoteService:
    """Service class for note operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_note(self, note_data: NoteCreate) -> Note:
        """Create a new note"""
        note = Note(
            title=note_data.title,
            content=note_data.content,
            source_file=note_data.source_file
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note
    
    async def get_note_by_id(self, note_id: int) -> Optional[Note]:
        """Get a note by ID"""
        result = await self.db.execute(
            select(Note).where(Note.id == note_id)
        )
        return result.scalar_one_or_none()
    
    async def list_notes(self) -> List[NoteListItem]:
        """
        List all notes with entity counts (N+1 fix)
        Uses a single query with subquery for counts
        """
        # Subquery to count entities per note
        entity_count_subq = (
            select(
                Entity.note_id.label("note_id"),
                func.count(Entity.id).label("entity_count")
            )
            .group_by(Entity.note_id)
            .subquery()
        )
        
        # Main query with joined count
        query = (
            select(
                Note,
                func.coalesce(entity_count_subq.c.entity_count, 0).label("entity_count")
            )
            .outerjoin(
                entity_count_subq,
                Note.id == entity_count_subq.c.note_id
            )
            .order_by(Note.created_at.desc())
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        notes_data = []
        for note, entity_count in rows:
            notes_data.append(NoteListItem(
                id=note.id,
                title=note.title,
                created_at=note.created_at,
                entity_count=entity_count,
                note_metadata=note.note_metadata
            ))
        
        return notes_data
    
    async def update_note(self, note_id: int, note_update: NoteUpdate) -> Optional[Note]:
        """Update a note"""
        note = await self.get_note_by_id(note_id)
        if not note:
            return None
        
        update_data = note_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)
        
        await self.db.commit()
        await self.db.refresh(note)
        return note
    
    async def delete_note(self, note_id: int) -> Optional[Tuple[int, str]]:
        """
        Delete a note and all associated entities/relationships
        Returns (note_id, title) if successful, None if not found
        """
        note = await self.get_note_by_id(note_id)
        if not note:
            return None
        
        note_title = note.title
        
        # Get all entity IDs for this note
        entity_result = await self.db.execute(
            select(Entity.id).where(Entity.note_id == note_id)
        )
        entity_ids = [row[0] for row in entity_result.all()]
        
        # Delete relationships in batch
        if entity_ids:
            await self.db.execute(
                delete(Relationship).where(
                    Relationship.source_entity_id.in_(entity_ids) |
                    Relationship.target_entity_id.in_(entity_ids)
                )
            )
            
            # Delete entities in batch
            await self.db.execute(
                delete(Entity).where(Entity.note_id == note_id)
            )
        
        # Delete note
        await self.db.delete(note)
        await self.db.commit()
        
        return note_id, note_title
    
    async def get_note_graph(self, note_id: int) -> Optional[GraphDataResponse]:
        """
        Get graph data for a note (entities and relationships)
        Uses optimized queries to fetch all data at once
        """
        # Check note exists
        note = await self.get_note_by_id(note_id)
        if not note:
            return None
        
        # Fetch all entities for this note
        entities_result = await self.db.execute(
            select(Entity).where(Entity.note_id == note_id)
        )
        entities = entities_result.scalars().all()
        
        if not entities:
            return GraphDataResponse(entities=[], relationships=[])
        
        entity_ids = [e.id for e in entities]
        
        # Fetch all relationships between these entities in one query
        rel_result = await self.db.execute(
            select(Relationship).where(
                Relationship.source_entity_id.in_(entity_ids),
                Relationship.target_entity_id.in_(entity_ids)
            )
        )
        relationships = rel_result.scalars().all()
        
        # Build response
        graph_nodes = [
            GraphNode(
                id=e.id,
                name=e.name,
                type=e.entity_type,
                description=e.description,
                color=e.color,
                timestamp=e.timestamp
            )
            for e in entities
        ]
        
        graph_edges = [
            GraphEdge(
                id=r.id,
                source_entity_id=r.source_entity_id,
                target_entity_id=r.target_entity_id,
                type=r.relationship_type,
                strength=r.strength,
                explanation=r.ai_explanation
            )
            for r in relationships
        ]
        
        return GraphDataResponse(
            entities=graph_nodes,
            relationships=graph_edges
        )
    
    async def upload_file(self, filename: str, content: str) -> NoteUploadResponse:
        """Upload and create a note from file content"""
        note = Note(
            title=filename,
            content=content,
            source_file=filename
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        
        logger.info(f"Note uploaded: {note.id} - {filename}")
        
        return NoteUploadResponse(
            note_id=note.id,
            title=note.title,
            content_length=len(content),
            status="uploaded",
            message="Note uploaded successfully. Call /process to extract entities."
        )


# Dependency injection helper
from app.database import get_db
from fastapi import Depends

async def get_note_service(db: AsyncSession = Depends(get_db)) -> NoteService:
    """FastAPI dependency for NoteService"""
    return NoteService(db)
