"""
AI Parser Service
Handles entity extraction, relationship detection using OpenAI
Uses latest models (as of 2026):
- gpt-5-mini: Fast reasoning model with built-in reasoning capability
- text-embedding-3-small: 5x cheaper than ada-002, better performance
"""
import os
import json
import logging
from typing import List, Dict, Any
from fastapi import HTTPException
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize OpenAI client
def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "your_openai_api_key" in api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured. Please add your OPENAI_API_KEY to the backend/.env file."
        )
    return OpenAI(api_key=api_key)

# Model configuration - using latest models
CHAT_MODEL = "gpt-5-mini"  # $0.25/1M input, $2.00/1M output (with reasoning!)
EMBEDDING_MODEL = "text-embedding-3-small"  # $0.020/1M tokens
EMBEDDING_DIMENSIONS = 1536  # Can use 512 or 1536 dimensions

# Entity type to color mapping (vibrant pastel palette)
ENTITY_COLORS = {
    "concept": "#FF70A6",      # Pink
    "technology": "#FF9770",   # Orange
    "idea": "#FFD670",         # Yellow
    "person": "#70E0FF",       # Cyan
    "technique": "#A770FF",    # Purple
    "architecture": "#70FFB9", # Green
    "pattern": "#FF70DD",      # Magenta
    "tool": "#70A7FF",         # Blue
}


async def extract_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extract entities from text using GPT-5 mini
    Returns list of entities with name, type, and description
    
    Cost: ~$0.25 per 1M tokens input, $2.00 per 1M tokens output
    Features: Built-in reasoning for better entity detection
    """
    prompt = f"""Analyze the following technical notes and extract key concepts, technologies, and ideas.
    
For each entity, provide:
- name: Clear, concise name (2-4 words max)
- entity_type: One of: concept, technology, idea, person, technique, architecture, pattern, tool
- description: Brief explanation (1-2 sentences)

Return ONLY a JSON array of entities, no other text.

Notes:
{text}

JSON Response:
"""
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,  # Using gpt-5-mini with reasoning
            messages=[
                {"role": "system", "content": "You are an expert at extracting structured information from technical notes. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        logger.info(f"OpenAI response: {content[:200]}...")
        
        # Parse JSON response
        data = json.loads(content)
        
        # Handle different response formats
        entities = data.get("entities", data.get("items", []))
        
        # Assign colors based on entity type
        for entity in entities:
            entity_type = entity.get("entity_type", "concept")
            entity["color"] = ENTITY_COLORS.get(entity_type, "#9CA3AF")  # Default gray
        
        logger.info(f"Extracted {len(entities)} entities using {CHAT_MODEL}")
        return entities
        
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        raise


async def detect_relationships(entities: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
    """
    Detect relationships between entities using GPT-5 mini
    Returns list of relationships with source, target, type, and strength
    
    Cost: ~$0.25 per 1M tokens input, $2.00 per 1M tokens output
    Features: Built-in reasoning for better relationship inference
    """
    entity_names = [e["name"] for e in entities]
    
    prompt = f"""Given these extracted entities from technical notes, identify meaningful relationships between them.

Entities:
{json.dumps(entity_names, indent=2)}

Original Text Context:
{text[:1500]}  

For each relationship, provide:
- source: Entity name (must exactly match one from the list)
- target: Entity name (must exactly match one from the list)
- relationship_type: One of: related_to, prerequisite, implements, enables, uses, extends, example_of
- strength: Confidence score 0.0-1.0 (how strong the relationship is)
- explanation: Brief reason for the relationship (1 sentence)

Return ONLY a JSON object with a "relationships" array, no other text.

JSON Response:
"""
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,  # Using gpt-5-mini with reasoning
            messages=[
                {"role": "system", "content": "You are an expert at identifying relationships between concepts. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        logger.info(f"Relationship detection response: {content[:200]}...")
        
        data = json.loads(content)
        relationships = data.get("relationships", [])
        
        logger.info(f"Detected {len(relationships)} relationships using {CHAT_MODEL}")
        return relationships
        
    except Exception as e:
        logger.error(f"Relationship detection failed: {e}")
        raise


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
