"""
Add mock embeddings to existing entities for vector search testing
Run this script to enable semantic search without OpenAI API calls
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.entity import Entity
from app.models.note import Note
from app.services.vector_search import generate_mock_embedding
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_mock_embeddings_to_entities():
    """Add mock embeddings to all entities that don't have them"""
    db = SessionLocal()
    try:
        # Get entities without embeddings
        entities = db.query(Entity).filter(Entity.embedding == None).all()
        
        if not entities:
            logger.info("All entities already have embeddings!")
            return
        
        logger.info(f"Adding mock embeddings to {len(entities)} entities...")
        
        for entity in entities:
            # Generate deterministic mock embedding based on entity name + description
            text = f"{entity.name} {entity.description or ''}"
            embedding = generate_mock_embedding(text, deterministic=True)
            entity.embedding = embedding
        
        db.commit()
        logger.info(f"✅ Successfully added mock embeddings to {len(entities)} entities")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def add_mock_embeddings_to_notes():
    """Add mock embeddings to all notes that don't have them"""
    db = SessionLocal()
    try:
        # Get notes without embeddings
        notes = db.query(Note).filter(Note.embedding == None).all()
        
        if not notes:
            logger.info("All notes already have embeddings!")
            return
        
        logger.info(f"Adding mock embeddings to {len(notes)} notes...")
        
        for note in notes:
            # Generate deterministic mock embedding based on note content
            text = f"{note.title} {note.content[:500]}"  # Use first 500 chars
            embedding = generate_mock_embedding(text, deterministic=True)
            note.embedding = embedding
        
        db.commit()
        logger.info(f"✅ Successfully added mock embeddings to {len(notes)} notes")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 Adding mock embeddings to database...")
    add_mock_embeddings_to_entities()
    add_mock_embeddings_to_notes()
    print("✨ Done! Vector search is now ready to use.")
