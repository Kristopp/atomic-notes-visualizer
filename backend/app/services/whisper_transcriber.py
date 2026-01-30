import os
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv
from pydub import AudioSegment

load_dotenv()

logger = logging.getLogger(__name__)

def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "your_openai_api_key" in api_key:
        raise ValueError("OpenAI API key is not configured. Please add your OPENAI_API_KEY to the backend/.env file.")
    return OpenAI(api_key=api_key)

def transcribe_audio_file(
    audio_file_path: str, 
    language: Optional[str] = "en",
    progress_callback = None
) -> Dict[str, Any]:
    """
    Transcribe audio file using OpenAI Whisper API
    
    Handles files larger than 25MB by splitting them into chunks.
    """
    client = get_client()
    
    file_size_mb = os.path.getsize(audio_file_path) / (1024 * 1024)
    
    if file_size_mb <= 25:
        if progress_callback:
            progress_callback(10)
            
        with open(audio_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language=language
            )
            
        if progress_callback:
            progress_callback(100)
            
        return {
            "transcript": transcript.text,
            "language": language or "en"
        }
    else:
        # Handle large files (> 25MB)
        logger.info(f"File {audio_file_path} is large ({file_size_mb:.2f}MB), splitting into chunks")
        audio = AudioSegment.from_file(audio_file_path)
        
        # Whisper suggests chunks of ~20-25MB. 
        # For audio, 25MB is roughly 20-30 minutes depending on bitrate.
        # We'll split into 10-minute chunks to be safe.
        ten_minutes = 10 * 60 * 1000 # pydub works in milliseconds
        chunks = [audio[i:i + ten_minutes] for i in range(0, len(audio), ten_minutes)]
        
        full_transcript = ""
        for i, chunk in enumerate(chunks):
            chunk_path = f"{audio_file_path}_chunk_{i}.mp3"
            chunk.export(chunk_path, format="mp3")
            
            if progress_callback:
                progress_callback(10 + (i / len(chunks)) * 80)
                
            with open(chunk_path, "rb") as chunk_file:
                chunk_transcript = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=chunk_file,
                    language=language
                )
                full_transcript += chunk_transcript.text + " "
            
            os.remove(chunk_path)
            
        if progress_callback:
            progress_callback(100)
            
        return {
            "transcript": full_transcript.strip(),
            "language": language or "en"
        }
