"""
Vector search service for semantic similarity using pgvector

This service enables semantic search across entities and notes using
OpenAI embeddings and PostgreSQL's pgvector extension for cosine similarity.

For testing without API key: Uses mock embeddings (deterministic or random)
For production: Uses real OpenAI text-embedding-3-small embeddings
"""
import logging
import hashlib
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from app.models.entity import Entity
from app.models.note import Note

logger = logging.getLogger(__name__)

# Embedding configuration
EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small default


def generate_mock_embedding(text: str, deterministic: bool = True) -> List[float]:
    """
    Generate a mock 1536-dimensional embedding for testing without API calls
    
    Args:
        text: Input text to create embedding for
        deterministic: If True, same text always produces same embedding (hash-based)
                      If False, generates random embedding
    
    Returns:
        List of 1536 floats (normalized to unit length for cosine similarity)
    """
    import numpy as np
    
    if deterministic:
        # Hash-based deterministic embedding (same text = same vector)
        hash_digest = hashlib.sha256(text.encode()).digest()
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
    db: Session,
    query_text: str,
    limit: int = 10,
    min_similarity: float = 0.5,
    use_mock: bool = True
) -> List[Tuple[Entity, float]]:
    """
    Semantic search for entities using vector similarity
    
    Args:
        db: Database session
        query_text: Search query text
        limit: Maximum number of results
        min_similarity: Minimum cosine similarity threshold (0.0 to 1.0)
        use_mock: If True, use mock embeddings (for testing without API key)
    
    Returns:
        List of (Entity, similarity_score) tuples, ordered by similarity desc
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
        # <=> is cosine distance (0 = identical, 2 = opposite)
        # Similarity = 1 - (distance / 2)
        # Convert list to vector string format: '[1.0, 2.0, ...]'
        query_embedding_str = str(query_embedding)
        
        query = text("""
            SELECT 
                id, 
                note_id,
                name,
                entity_type,
                description,
                color,
                embedding,
                1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
            FROM entities
            WHERE embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:query_embedding AS vector)
            LIMIT :limit
        """)
        
        result = db.execute(
            query,
            {
                "query_embedding": query_embedding_str,  # pgvector needs string format
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        # Convert results to Entity objects with similarity scores
        matches = []
        for row in result:
            entity = db.query(Entity).filter(Entity.id == row.id).first()
            if entity:
                matches.append((entity, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} entities with similarity >= {min_similarity}")
        return matches
        
    except Exception as e:
        logger.error(f"Vector search error: {str(e)}")
        raise


async def search_notes_by_similarity(
    db: Session,
    query_text: str,
    limit: int = 5,
    min_similarity: float = 0.5,
    use_mock: bool = True
) -> List[Tuple[Note, float]]:
    """
    Semantic search for notes using vector similarity
    
    Args:
        db: Database session
        query_text: Search query text
        limit: Maximum number of results
        min_similarity: Minimum cosine similarity threshold (0.0 to 1.0)
        use_mock: If True, use mock embeddings (for testing without API key)
    
    Returns:
        List of (Note, similarity_score) tuples, ordered by similarity desc
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
        
        # pgvector cosine similarity search
        query_embedding_str = str(query_embedding)
        
        query = text("""
            SELECT 
                id,
                title,
                content,
                embedding,
                created_at,
                updated_at,
                source_file,
                metadata,
                1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
            FROM notes
            WHERE embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:query_embedding AS vector)
            LIMIT :limit
        """)
        
        result = db.execute(
            query,
            {
                "query_embedding": query_embedding_str,  # pgvector needs string format
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        # Convert results to Note objects with similarity scores
        matches = []
        for row in result:
            note = db.query(Note).filter(Note.id == row.id).first()
            if note:
                matches.append((note, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} notes with similarity >= {min_similarity}")
        return matches
        
    except Exception as e:
        logger.error(f"Note vector search error: {str(e)}")
        raise


async def find_related_entities(
    db: Session,
    entity_id: int,
    limit: int = 5,
    min_similarity: float = 0.6
) -> List[Tuple[Entity, float]]:
    """
    Find entities similar to a given entity using vector similarity
    
    Args:
        db: Database session
        entity_id: Source entity ID
        limit: Maximum number of related entities
        min_similarity: Minimum similarity threshold
    
    Returns:
        List of (Entity, similarity_score) tuples
    """
    try:
        # Get source entity
        source_entity = db.query(Entity).filter(Entity.id == entity_id).first()
        if not source_entity or not source_entity.embedding:
            logger.warning(f"Entity {entity_id} not found or has no embedding")
            return []
        
        # Find similar entities (excluding self)
        source_embedding_str = str(source_entity.embedding)
        
        query = text("""
            SELECT 
                id,
                note_id,
                name,
                entity_type,
                description,
                color,
                embedding,
                1 - (embedding <=> CAST(:source_embedding AS vector)) AS similarity
            FROM entities
            WHERE id != :entity_id
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:source_embedding AS vector)) >= :min_similarity
            ORDER BY embedding <=> CAST(:source_embedding AS vector)
            LIMIT :limit
        """)
        
        result = db.execute(
            query,
            {
                "source_embedding": source_embedding_str,  # pgvector needs string format
                "entity_id": entity_id,
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        matches = []
        for row in result:
            entity = db.query(Entity).filter(Entity.id == row.id).first()
            if entity:
                matches.append((entity, float(row.similarity)))
        
        logger.info(f"Found {len(matches)} entities related to '{source_entity.name}'")
        return matches
        
    except Exception as e:
        logger.error(f"Related entities search error: {str(e)}")
        raise
