"""
AI Parser Service
Handles entity extraction, relationship detection using OpenAI
Uses latest models (as of 2026):
- gpt-5-mini: Fast reasoning model with built-in reasoning capability
- text-embedding-3-small: 5x cheaper than ada-002, better performance
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import HTTPException
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Global client singleton
_openai_client: Optional[OpenAI] = None

def get_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or "your_openai_api_key" in api_key:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key is not configured."
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client

# Model configuration
CHAT_MODEL = "gpt-5-mini"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# Pydantic models for Structured Outputs (Pro pattern)
class EntitySchema(BaseModel):
    name: str = Field(..., description="Clear name of the entity")
    entity_type: str = Field(..., description="Type of entity")
    description: str = Field(..., description="Brief explanation")

class EntityListSchema(BaseModel):
    entities: List[EntitySchema]

class RelationshipSchema(BaseModel):
    source: str
    target: str
    relationship_type: str
    strength: float
    explanation: str

class RelationshipListSchema(BaseModel):
    relationships: List[RelationshipSchema]

# Entity type to color mapping
ENTITY_COLORS = {
    "concept": "#FF70A6",
    "technology": "#FF9770",
    "idea": "#FFD670",
    "person": "#70E0FF",
    "technique": "#A770FF",
    "architecture": "#70FFB9",
    "pattern": "#FF70DD",
    "tool": "#70A7FF",
}


async def extract_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extract entities using GPT-5 mini with Structured Outputs
    """
    try:
        client = get_client()
        # Using the beta parse method for automatic Pydantic validation (if available in client)
        # Or standard completion with json_object
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert at extracting structured information from technical notes. Return a JSON object with an 'entities' array."},
                {"role": "user", "content": f"Extract entities from these notes:\n\n{text}"}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content: return []
        
        data = json.loads(content)
        entities_raw = data.get("entities", [])
        
        entities = []
        for e in entities_raw:
            e_type = e.get("entity_type", "concept").lower()
            entities.append({
                "name": e.get("name", "Unknown"),
                "entity_type": e_type,
                "description": e.get("description", ""),
                "color": ENTITY_COLORS.get(e_type, "#9CA3AF")
            })
            
        logger.info(f"Extracted {len(entities)} entities")
        return entities
        
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        raise


async def detect_relationships(entities: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
    """
    Detect relationships between entities
    """
    entity_names = [e["name"] for e in entities]
    if not entity_names: return []
    
    prompt = f"""Identify meaningful relationships between these entities based on the context.
Entities: {json.dumps(entity_names)}
Context: {text[:1000]}
"""
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert at identifying relationships. Return a JSON object with a 'relationships' array."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content: return []
        
        data = json.loads(content)
        return data.get("relationships", [])
        
    except Exception as e:
        logger.error(f"Relationship detection failed: {e}")
        raise



async def map_entities_to_timestamps(
    entities: List[Dict[str, Any]], 
    transcript_segments: List[Dict[str, Any]]
) -> Dict[str, int]:
    """
    Map entities to their most relevant timestamp in the transcript using GPT-5 mini
    Returns a dictionary mapping entity names to timestamps in seconds
    
    Cost: ~$0.25 per 1M tokens input, $2.00 per 1M tokens output
    Features: Built-in reasoning to understand context and find best match
    """
    if not transcript_segments:
        logger.warning("No transcript segments available for timestamp mapping")
        return {}
    
    # Create a simplified view of segments with timestamps
    segments_for_prompt = []
    for segment in transcript_segments[:50]:  # Limit to first 50 segments to save tokens
        segments_for_prompt.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"][:100]  # Truncate to save tokens
        })
    
    entity_names = [e["name"] for e in entities]
    
    prompt = f"""Given these entities and transcript segments with timestamps, find the best timestamp for each entity.

Entities to find:
{json.dumps(entity_names, indent=2)}

Transcript segments (each has start/end time in seconds and the text):
{json.dumps(segments_for_prompt, indent=2)}

For each entity, find the segment where it's most prominently discussed or first mentioned.
Return the start time in seconds as an integer.

Return ONLY a JSON object with entity names as keys and timestamps (integers) as values, no other text.

JSON Response:
"""
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert at finding relevant timestamps in video transcripts. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        if not response.choices or not response.choices[0].message.content:
            logger.error("Empty response from OpenAI during timestamp mapping")
            return {}
            
        content = response.choices[0].message.content
        logger.info(f"Timestamp mapping response: {content[:200]}...")

        
        data = json.loads(content)
        timestamps = data
        
        logger.info(f"Mapped {len(timestamps)} entities to timestamps using {CHAT_MODEL}")
        return timestamps
        
    except Exception as e:
        logger.error(f"Timestamp mapping failed: {e}")
        return {}


async def generate_embedding(text: str) -> List[float]:
    """
    Generate vector embedding for a single text using text-embedding-3-small
    Returns 1536-dimensional vector (can also use 512 for even lower cost)
    
    Cost: ~$0.02 per 1M tokens (5x cheaper than ada-002)
    Performance: Better than ada-002 on most benchmarks
    """
    try:
        client = get_client()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,  # Using text-embedding-3-small
            input=text,
            dimensions=EMBEDDING_DIMENSIONS  # Can be 512 or 1536
        )
        
        embedding = response.data[0].embedding
        logger.info(f"Generated embedding: {len(embedding)} dimensions using {EMBEDDING_MODEL}")
        return embedding
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate vector embeddings for multiple texts in a single API call (BATCH)
    Returns list of 1536-dimensional vectors, one per input text
    
    Cost: ~$0.02 per 1M tokens (5x cheaper than ada-002)
    Performance: 10-20x faster than sequential calls due to single round-trip
    
    OpenAI API supports up to 2048 inputs in a single batch request
    """
    if not texts:
        return []
    
    try:
        client = get_client()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,  # Using text-embedding-3-small
            input=texts,  # Pass list of strings for batch processing
            dimensions=EMBEDDING_DIMENSIONS  # Can be 512 or 1536
        )
        
        # Extract embeddings in the same order as input texts
        embeddings = [item.embedding for item in response.data]
        logger.info(f"Generated {len(embeddings)} embeddings in batch using {EMBEDDING_MODEL}")
        return embeddings
        
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise
