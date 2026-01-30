import os
import json
import logging
from typing import Dict, Any, List
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "your_openai_api_key" in api_key:
        raise ValueError("OpenAI API key is not configured. Please add your OPENAI_API_KEY to the backend/.env file.")
    return OpenAI(api_key=api_key)

CHAT_MODEL = "gpt-5-mini"

def create_atomic_summary(transcript: str) -> Dict[str, Any]:
    """
    Create an intelligent summary of the transcript optimized for atomic notes.
    """
    client = get_client()
    
    prompt = f"""
    You are an expert at creating atomic notes and knowledge graphs. 
    Analyze the following video transcript and create a structured summary.
    
    Transcript:
    {transcript[:15000]} # Limit transcript size to avoid token issues
    
    Your task:
    1. Create a concise summary (2-3 paragraphs) that captures the main arguments.
    2. Identify key topics/entities mentioned in the video.
    
    Return the result in JSON format:
    {{
        "summary": "The main summary text...",
        "key_topics": ["Topic 1", "Topic 2", ...]
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes video transcripts into atomic notes."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
        
    except Exception as e:
        logger.error(f"Error creating summary: {str(e)}")
        raise e
