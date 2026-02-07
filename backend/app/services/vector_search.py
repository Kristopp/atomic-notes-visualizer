"""
Vector search service for semantic similarity using pgvector

This service enables semantic search across entities and notes using
OpenAI embeddings and PostgreSQL's pgvector extension for cosine similarity.

For testing without API key: Uses mock embeddings (deterministic or random)
For production: Uses real OpenAI text-embedding-3-small embeddings
"""
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
import logging
import hashlib

from app.models.entity import Entity
from app.models.note import Note

logger = logging.getLogger(__name__)

# Embedding configuration
EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small default


def generate_mock_embedding(text_input: str, deterministic: bool = True) -> List[float]:
    """
    Generate a mock 1536-dimensional embedding for testing without API calls
    """
    import numpy as np
    
    if deterministic:
        # Hash-based deterministic embedding (same text = same vector)
        hash_digest = hashlib.sha256(text_input.encode()).digest()
        # Use hash to seed random generator for reproducibility
        seed = int.from_bytes(hash_digest[:4], 'little')
        rng = np.random.RandomState(seed)
        vector = rng.randn(EMBEDDING_DIMENSIONS)
    else:
        # Pure random embedding
        vector = np.random.randn(EMBEDDING_DIMENSIONS)
    
    # Normalize to unit length (required for cosine similarity)
    norm = np.linalg.norm(vector)
    normalized = (vector / norm).tolist()
    
    return normalized


async def search_entities_by_similarity(
    db: AsyncSession,
    query_text: str,
    limit: int = 10,
    min_similarity: float = 0.5,
    use_mock: bool = True
) -> List[Tuple[Entity, float]]:
    """
    Semantic search for entities using vector similarity
    """
    try:
        # Generate query embedding
        if use_mock:
            query_embedding = generate_mock_embedding(query_text, deterministic=True)
            logger.info(f"Using mock embedding for query: '{query_text[:50]}...'")
        else:
            # Import here to avoid circular dependency
            from app.services.ai_parser import generate_embeddings_batch
            embeddings = await generate_embeddings_batch([query_text])
            query_embedding = embeddings[0]
            logger.info(f"Using real OpenAI embedding for query: '{query_text[:50]}...'")
        
        # pgvector cosine similarity search using <=> operator
        query_embedding_str = str(query_embedding)
        
        query = text("""
            SELECT 
                id, 
                1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
            FROM entities
            WHERE embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:query_embedding AS vector)
            LIMIT :limit
        """)
        
        result = await db.execute(
            query,
            {
                "query_embedding": query_embedding_str,
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        rows = result.all()
        matches = []
        for row in rows:
            # Fetch the entity object
            ent_res = await db.execute(select(Entity).where(Entity.id == row.id))
            entity = ent_res.scalar_one_or_none()
            if entity:
                matches.append((entity, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} entities with similarity >= {min_similarity}")
        return matches
        
    except Exception as e:
        logger.error(f"Vector search error: {str(e)}")
        raise


async def search_notes_by_similarity(
    db: AsyncSession,
    query_text: str,
    limit: int = 5,
    min_similarity: float = 0.5,
    use_mock: bool = True
) -> List[Tuple[Note, float]]:
    """
    Semantic search for notes using vector similarity
    """
    try:
        # Generate query embedding
        if use_mock:
            query_embedding = generate_mock_embedding(query_text, deterministic=True)
            logger.info(f"Using mock embedding for note search: '{query_text[:50]}...'")
        else:
            from app.services.ai_parser import generate_embeddings_batch
            embeddings = await generate_embeddings_batch([query_text])
            query_embedding = embeddings[0]
            logger.info(f"Using real OpenAI embedding for note search: '{query_text[:50]}...'")
        
        query_embedding_str = str(query_embedding)
        
        query = text("""
            SELECT 
                id,
                1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
            FROM notes
            WHERE embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:query_embedding AS vector)
            LIMIT :limit
        """)
        
        result = await db.execute(
            query,
            {
                "query_embedding": query_embedding_str,
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        rows = result.all()
        matches = []
        for row in rows:
            note_res = await db.execute(select(Note).where(Note.id == row.id))
            note = note_res.scalar_one_or_none()
            if note:
                matches.append((note, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} notes with similarity >= {min_similarity}")
        return matches
        
    except Exception as e:
        logger.error(f"Note vector search error: {str(e)}")
        raise


async def find_related_entities(
    db: AsyncSession,
    entity_id: int,
    limit: int = 5,
    min_similarity: float = 0.6
) -> List[Tuple[Entity, float]]:
    """
    Find entities similar to a given entity using vector similarity
    """
    try:
        # Get source entity
        source_res = await db.execute(select(Entity).where(Entity.id == entity_id))
        source_entity = source_res.scalar_one_or_none()
        
        if not source_entity or source_entity.embedding is None:
            logger.warning(f"Entity {entity_id} not found or has no embedding")
            return []
        
        # Find similar entities (excluding self)
        source_embedding_str = str(source_entity.embedding)
        
        query = text("""
            SELECT 
                id,
                1 - (embedding <=> CAST(:source_embedding AS vector)) AS similarity
            FROM entities
            WHERE id != :entity_id
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:source_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:source_embedding AS vector)
            LIMIT :limit
        """)
        
        result = await db.execute(
            query,
            {
                "source_embedding": source_embedding_str,
                "entity_id": entity_id,
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        rows = result.all()
        matches = []
        for row in rows:
            ent_res = await db.execute(select(Entity).where(Entity.id == row.id))
            entity = ent_res.scalar_one_or_none()
            if entity:
                matches.append((entity, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} entities related to '{source_entity.name}'")
        return matches
        
    except Exception as e:
        logger.error(f"Related entities search error: {str(e)}")
        raise

