#!/usr/bin/env python3
"""
Manual Note Deletion Script
Use this to delete a note directly from the database when the API fails
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete, text

# Database URL - change this if needed
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/atomic_notes"


async def delete_note_manually(note_id: int):
    """Delete a note and all related data manually"""
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Step 1: Get entity IDs for this note
            result = await session.execute(
                text("SELECT id FROM entities WHERE note_id = :note_id"),
                {"note_id": note_id}
            )
            entity_ids = [row[0] for row in result.all()]
            
            print(f"Found {len(entity_ids)} entities for note {note_id}")
            
            if entity_ids:
                # Step 2: Delete relationships
                rel_result = await session.execute(
                    text("""
                        DELETE FROM relationships 
                        WHERE source_entity_id = ANY(:entity_ids) 
                        OR target_entity_id = ANY(:entity_ids)
                    """),
                    {"entity_ids": entity_ids}
                )
                print(f"Deleted {rel_result.rowcount} relationships")
                
                # Step 3: Delete entities
                ent_result = await session.execute(
                    text("DELETE FROM entities WHERE note_id = :note_id"),
                    {"note_id": note_id}
                )
                print(f"Deleted {ent_result.rowcount} entities")
            
            # Step 4: Delete the note
            note_result = await session.execute(
                text("DELETE FROM notes WHERE id = :note_id"),
                {"note_id": note_id}
            )
            
            if note_result.rowcount > 0:
                print(f"✓ Note {note_id} deleted successfully")
            else:
                print(f"✗ Note {note_id} not found")
            
            await session.commit()
            
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python delete_note.py <note_id>")
        print("Example: python delete_note.py 9")
        sys.exit(1)
    
    note_id = int(sys.argv[1])
    asyncio.run(delete_note_manually(note_id))
