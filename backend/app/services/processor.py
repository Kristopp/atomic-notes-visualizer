"""
Note Processor Service
Orchestrates the full AI pipeline: extraction → embedding → relationships
"""
import logging
import json
from typing import AsyncGenerator, List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.note import Note
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.services.ai_parser import extract_entities, detect_relationships, generate_embedding, generate_embeddings_batch, map_entities_to_timestamps

logger = logging.getLogger(__name__)


async def process_note_pipeline(note_id: int, db: Session, transcript_segments: Optional[List[Dict[str, Any]]] = None) -> AsyncGenerator[str, None]:
    """
    Full AI pipeline for processing a note with real-time progress streaming:
    1. Extract entities from note content
    2. Generate embeddings for note and entities
    3. Detect relationships between entities
    4. Map entities to timestamps (if transcript_segments provided)
    5. Save everything to database
    
    Yields Server-Sent Events (SSE) as JSON strings for real-time progress updates
    """
    def send_event(stage: str, message: str, progress: int):
        """Helper to format SSE events"""
        event_data = {"stage": stage, "message": message, "progress": progress}
        return f"data: {json.dumps(event_data)}\n\n"
    
    try:
        # Get note
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            yield send_event("error", f"Note {note_id} not found", 0)
            return
        
        logger.info(f"Processing note {note_id}: {note.title}")
        yield send_event("start", f"Processing: {note.title}", 0)
        
        # Step 1: Extract entities
        logger.info("Step 1: Extracting entities...")
        yield send_event("extracting", "Analyzing text and extracting entities...", 20)
        entities_data = await extract_entities(note.content)
        yield send_event("extracting", f"Found {len(entities_data)} entities", 35)
        
        # Step 2: Generate embeddings in batch (note + all entities)
        logger.info("Step 2: Generating embeddings in batch...")
        yield send_event("embedding", "Generating embeddings for all entities...", 40)
        
        # Prepare all texts for batch embedding
        texts_to_embed = [note.content]  # First item is the note
        entity_texts = []
        
        for entity_data in entities_data:
            entity_text = f"{entity_data['name']} - {entity_data.get('description', '')}"
            entity_texts.append(entity_text)
            texts_to_embed.append(entity_text)
        
        # Generate all embeddings in a single API call (10-20x faster!)
        all_embeddings = await generate_embeddings_batch(texts_to_embed)
        yield send_event("embedding", f"Generated {len(all_embeddings)} embeddings", 55)
        
        # Extract note embedding (first one)
        note.embedding = all_embeddings[0]
        
        # Extract entity embeddings (rest of them)
        entity_embeddings = all_embeddings[1:]
        
        # Step 3.5: Map entities to timestamps (if transcript segments provided)
        entity_timestamps = {}
        if transcript_segments:
            logger.info("Step 3.5: Mapping entities to timestamps...")
            yield send_event("timestamps", "Mapping entities to transcript timestamps...", 58)
            entity_timestamps = await map_entities_to_timestamps(entities_data, transcript_segments)
            yield send_event("timestamps", f"Mapped {len(entity_timestamps)} entities to timestamps", 60)
        
        # Step 4: Save entities with pre-generated embeddings
        logger.info("Step 4: Saving entities to database...")
        yield send_event("saving", "Saving entities to database...", 62)
        saved_entities = []
        entity_map = {}  # Map names to IDs for relationship creation
        
        for idx, entity_data in enumerate(entities_data):
            # Get timestamp for this entity if available
            entity_timestamp = entity_timestamps.get(entity_data["name"])
            
            # Create entity with pre-generated embedding and timestamp
            entity = Entity(
                note_id=note_id,
                name=entity_data["name"],
                entity_type=entity_data.get("entity_type", "concept"),
                description=entity_data.get("description"),
                color=entity_data.get("color", "#9CA3AF"),
                embedding=entity_embeddings[idx],
                timestamp=entity_timestamp
            )
            
            db.add(entity)
            db.flush()  # Get ID without committing
            
            saved_entities.append(entity)
            entity_map[entity.name] = entity.id
        
        yield send_event("saving", f"Saved {len(saved_entities)} entities", 70)
        
        # Step 5: Detect relationships
        logger.info("Step 5: Detecting relationships...")
        yield send_event("relationships", "Analyzing relationships between entities...", 75)
        relationships_data = await detect_relationships(entities_data, note.content)
        yield send_event("relationships", f"Found {len(relationships_data)} relationships", 85)
        
        # Step 5: Save relationships
        logger.info("Step 5: Saving relationships...")
        yield send_event("saving", "Saving relationships to database...", 90)
        saved_relationships = []
        
        for rel_data in relationships_data:
            source_name = rel_data.get("source")
            target_name = rel_data.get("target")
            
            # Skip if entities not found
            if source_name not in entity_map or target_name not in entity_map:
                logger.warning(f"Skipping relationship: {source_name} -> {target_name} (entities not found)")
                continue
            
            relationship = Relationship(
                source_entity_id=entity_map[source_name],
                target_entity_id=entity_map[target_name],
                relationship_type=rel_data.get("relationship_type", "related_to"),
                strength=rel_data.get("strength", 0.5),
                ai_explanation=rel_data.get("explanation")
            )
            
            db.add(relationship)
            saved_relationships.append(relationship)
        
        # Commit everything
        db.commit()
        
        logger.info(f"✅ Processing complete: {len(saved_entities)} entities, {len(saved_relationships)} relationships")
        yield send_event("complete", f"Processing complete! {len(saved_entities)} entities, {len(saved_relationships)} relationships", 100)
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        yield send_event("error", f"Processing failed: {str(e)}", 0)
        db.rollback()
        raise
