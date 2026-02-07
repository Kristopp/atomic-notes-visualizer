"""
Search API Router
Semantic search via vector embeddings using pgvector cosine similarity
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Annotated
import logging

from app.database import get_db
from app.models.entity import Entity
from app.services.vector_search import search_entities_by_similarity, search_notes_by_similarity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])

# Using Annotated for cleaner dependency injection
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/")
async def semantic_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Number of results"),
    min_similarity: float = Query(0.5, ge=0.0, le=1.0, description="Minimum similarity threshold"),
    search_type: str = Query("entities", description="Search type: 'entities' or 'notes'"),
    use_mock: bool = Query(True, description="Use mock embeddings (true) or real OpenAI embeddings (false)"),
    db: DatabaseDep = None
):
    """
    Semantic search using vector embeddings and pgvector cosine similarity
    
    Args:
        q: Search query text
        limit: Maximum number of results (default: 10)
        min_similarity: Minimum cosine similarity threshold 0.0-1.0 (default: 0.5)
        search_type: Search in 'entities' or 'notes' (default: 'entities')
        use_mock: Use mock embeddings for testing without API key (default: true)
    
    Returns:
        JSON with query, results (with similarity scores), and count
    """
    try:
        if search_type == "notes":
            # Search notes by vector similarity
            matches = await search_notes_by_similarity(
                db=db,
                query_text=q,
                limit=limit,
                min_similarity=min_similarity,
                use_mock=use_mock
            )
            
            results = [
                {
                    "id": note.id,
                    "title": note.title,
                    "content": note.content[:200] + "..." if note.content and len(note.content) > 200 else (note.content or ""),
                    "similarity": round(similarity, 3),
                    "created_at": note.created_at.isoformat() if note.created_at else None
                }
                for note, similarity in matches
            ]
            
        else:
            # Search entities by vector similarity (default)
            matches = await search_entities_by_similarity(
                db=db,
                query_text=q,
                limit=limit,
                min_similarity=min_similarity,
                use_mock=use_mock
            )
            
            results = [
                {
                    "id": entity.id,
                    "name": entity.name,
                    "entity_type": entity.entity_type,
                    "description": entity.description,
                    "color": entity.color,
                    "note_id": entity.note_id,
                    "similarity": round(similarity, 3)
                }
                for entity, similarity in matches
            ]
        
        logger.info(f"Vector search for '{q}' returned {len(results)} results")
        
        return {
            "query": q,
            "search_type": search_type,
            "use_mock": use_mock,
            "min_similarity": min_similarity,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        # Fallback to basic text search if vector search fails
        logger.warning("Falling back to text-based search")
        
        from sqlalchemy import or_, select
        query = select(Entity).filter(
            or_(Entity.name.ilike(f"%{q}%"), Entity.description.ilike(f"%{q}%"))
        ).limit(limit)
        
        result = await db.execute(query)
        entities = result.scalars().all()
        
        return {
            "query": q,
            "search_type": "fallback_text",
            "error": str(e),
            "results": [
                {
                    "id": e.id,
                    "name": e.name,
                    "entity_type": e.entity_type,
                    "description": e.description,
                    "note_id": e.note_id,
                    "similarity": None
                }
                for e in entities
            ],
            "count": len(entities)
        }

