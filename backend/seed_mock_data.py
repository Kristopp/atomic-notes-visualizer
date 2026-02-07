"""
Seed script to populate database with mock entities and relationships for testing.
Run this to test the graph visualization without needing OpenAI API.
"""
import sys
import asyncio
from pathlib import Path
from sqlalchemy import select
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal, engine
from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship
import numpy as np


def create_mock_embedding(dim=1536):
    """Create a random mock embedding vector."""
    return np.random.randn(dim).tolist()


async def seed_mock_data():
    """Create mock entities and relationships for note_id=1."""
    async with AsyncSessionLocal() as db:
        try:
            # Check if note_id=1 exists
            result = await db.execute(select(Note).where(Note.id == 1))
            note = result.scalar_one_or_none()
            if not note:
                print("Note with id=1 not found. Please upload a note first.")
                return
            
            # Check if already has entities
            count_res = await db.execute(select(Entity).where(Entity.note_id == 1))
            existing = len(count_res.scalars().all())
            if existing > 0:
                print(f"Note 1 already has {existing} entities. Skipping seed.")
                return
            
            print(f"Seeding mock data for note: {note.title}")
            
            # Create entities based on React Hooks content
            entities_data = [
                {"name": "useState", "entity_type": "technology", "description": "React Hook for managing component state", "color": "#FF9770"},
                {"name": "useEffect", "entity_type": "technology", "description": "React Hook for side effects", "color": "#FF9770"},
                {"name": "Component State", "entity_type": "concept", "description": "Local state management in React", "color": "#FF70A6"},
                {"name": "Side Effects", "entity_type": "concept", "description": "Operations that interact with outside world", "color": "#FF70A6"},
                {"name": "Dependency Array", "entity_type": "technique", "description": "Array controlling when effects run", "color": "#A770FF"},
                {"name": "React", "entity_type": "technology", "description": "JavaScript library for building UIs", "color": "#FF9770"},
                {"name": "Functional Components", "entity_type": "architecture", "description": "Modern React component pattern", "color": "#70FFB9"},
                {"name": "Re-rendering", "entity_type": "concept", "description": "Process of updating component output", "color": "#FF70A6"},
            ]
            
            entities = []
            for data in entities_data:
                entity = Entity(
                    note_id=1,
                    name=data["name"],
                    entity_type=data["entity_type"],
                    description=data["description"],
                    color=data["color"],
                    embedding=create_mock_embedding()
                )
                db.add(entity)
                entities.append(entity)
            
            await db.flush()  # Get entity IDs
            
            print(f"Created {len(entities)} entities")
            
            # Create relationships
            relationships_data = [
                # useState relationships
                (0, 2, "enables", 0.95, "useState Hook enables Component State management"),
                (0, 5, "part_of", 0.90, "useState is part of React"),
                (0, 6, "used_in", 0.85, "useState used in Functional Components"),
                
                # useEffect relationships
                (1, 3, "handles", 0.95, "useEffect handles Side Effects"),
                (1, 4, "requires", 0.90, "useEffect requires Dependency Array"),
                (1, 5, "part_of", 0.90, "useEffect is part of React"),
                (1, 6, "used_in", 0.85, "useEffect used in Functional Components"),
                
                # State and re-rendering
                (2, 7, "triggers", 0.90, "Component State changes trigger Re-rendering"),
                
                # React and components
                (5, 6, "supports", 0.95, "React supports Functional Components"),
                
                # Effects and re-rendering
                (3, 7, "can_trigger", 0.70, "Side Effects can trigger Re-rendering"),
            ]
            
            for source_idx, target_idx, rel_type, strength, explanation in relationships_data:
                relationship = Relationship(
                    source_entity_id=entities[source_idx].id,
                    target_entity_id=entities[target_idx].id,
                    relationship_type=rel_type,
                    strength=strength,
                    ai_explanation=explanation
                )
                db.add(relationship)
            
            print(f"Created {len(relationships_data)} relationships")
            
            await db.commit()
            print("✅ Mock data seeded successfully!")
            print(f"View graph at: http://localhost:8002/api/notes/1/graph")
            
        except Exception as e:
            print(f"❌ Error seeding data: {e}")
            await db.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_mock_data())



if __name__ == "__main__":
    seed_mock_data()
