"""
Search API Router
Semantic search via vector embeddings
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.entity import Entity

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
async def semantic_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Number of results"),
    db: Session = Depends(get_db)
):
    """
    Semantic search for entities using vector embeddings
    """
    # TODO: Implement vector search using pgvector
    # 1. Generate embedding for query
    # 2. Use cosine similarity to find matches
    # 3. Return top N results
    
    # For now, return basic text search
    entities = db.query(Entity).filter(
        Entity.name.ilike(f"%{q}%") | Entity.description.ilike(f"%{q}%")
    ).limit(limit).all()
    
    return {
        "query": q,
        "results": [
            {
                "id": e.id,
                "name": e.name,
                "entity_type": e.entity_type,
                "description": e.description,
                "note_id": e.note_id
            }
            for e in entities
        ],
        "count": len(entities)
    }
