"""
Topic Service Layer
Handles business logic for topics
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.topic import Topic
from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.schemas.topic import TopicCreate, TopicUpdate, TopicResponse
from app.schemas import GraphDataResponse, GraphNode, GraphEdge

class TopicService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_topic(self, topic_data: TopicCreate) -> Topic:
        topic = Topic(
            name=topic_data.name,
            description=topic_data.description,
            emoji=topic_data.emoji
        )
        self.db.add(topic)
        await self.db.commit()
        await self.db.refresh(topic)
        return topic
    
    async def get_topic(self, topic_id: int) -> Optional[Topic]:
        result = await self.db.execute(
            select(Topic).where(Topic.id == topic_id)
        )
        return result.scalar_one_or_none()
    
    async def list_topics(self) -> List[Topic]:
        result = await self.db.execute(
            select(Topic).order_by(Topic.created_at.desc())
        )
        return result.scalars().all()
    
    async def get_topic_graph(self, topic_id: int) -> Optional[GraphDataResponse]:
        """
        Get graph data for all notes in a topic
        """
        # Get all notes in this topic
        notes_result = await self.db.execute(
            select(Note.id).where(Note.topic_id == topic_id)
        )
        note_ids = [row[0] for row in notes_result.all()]
        
        if not note_ids:
            return GraphDataResponse(entities=[], relationships=[])
            
        # Get entities for these notes
        entities_result = await self.db.execute(
            select(Entity).where(Entity.note_id.in_(note_ids))
        )
        entities = entities_result.scalars().all()
        
        if not entities:
            return GraphDataResponse(entities=[], relationships=[])
            
        entity_ids = [e.id for e in entities]
        
        # Get relationships between these entities
        rel_result = await self.db.execute(
            select(Relationship).where(
                Relationship.source_entity_id.in_(entity_ids),
                Relationship.target_entity_id.in_(entity_ids)
            )
        )
        relationships = rel_result.scalars().all()
        
        # Build response (Reuse logic from NoteService, ideally should be a utility)
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

# Dependency
from app.database import get_db
from fastapi import Depends

async def get_topic_service(db: AsyncSession = Depends(get_db)) -> TopicService:
    return TopicService(db)
