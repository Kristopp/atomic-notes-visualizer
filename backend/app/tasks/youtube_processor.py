import os
import logging
import asyncio
import json
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.note import Note
from app.services.youtube_audio import download_youtube_audio
from app.services.whisper_transcriber import transcribe_audio_file
from app.services.summarizer import create_atomic_summary
from app.services.processor import process_note_pipeline
from app.services.job_queue import celery_app

logger = logging.getLogger(__name__)

def run_async(coro):
    """Helper to run async coroutines in synchronous Celery task"""
    try:
        # Check if there is already a running loop
        asyncio.get_running_loop()
        # If this succeeds, a loop is running, so we use threadsafe call
        return asyncio.run_coroutine_threadsafe(coro, asyncio.get_event_loop()).result()
    except RuntimeError:
        # No loop running, so we can use asyncio.run
        return asyncio.run(coro)

@celery_app.task(bind=True, name="app.tasks.youtube_processor.process_youtube_video")
def process_youtube_video(self, youtube_url: str, note_id: int) -> Dict[str, Any]:
    """
    Background task for full YouTube -> Atomic Notes pipeline
    """
    db = SessionLocal()
    try:
        # 1. Download audio
        self.update_state(state='PROGRESS', meta={'stage': 'download', 'progress': 5, 'message': 'Downloading audio...'})
        temp_dir = "/tmp/atomic_notes_youtube"
        audio_data = download_youtube_audio(youtube_url, temp_dir)
        
        # Update note metadata
        note = db.query(Note).filter(Note.id == note_id).first()
        if note:
            note.title = audio_data['title']
            existing_metadata = note.note_metadata if isinstance(note.note_metadata, dict) else {}
            new_metadata = {
                **existing_metadata,
                "source": "youtube",
                "video_id": audio_data['video_id'],
                "uploader": audio_data['uploader'],
                "thumbnail": audio_data['thumbnail'],
                "url": youtube_url,
                "duration": audio_data['duration_seconds']
            }
            note.note_metadata = new_metadata
            db.commit()
            
        # 2. Transcribe
        self.update_state(state='PROGRESS', meta={'stage': 'transcribe', 'progress': 15, 'message': 'Transcribing audio with Whisper...'})
        
        def on_transcribe_progress(p):
            self.update_state(state='PROGRESS', meta={'stage': 'transcribe', 'progress': 15 + (p * 0.4), 'message': f'Transcribing... {p}%'})
            
        transcript_data = transcribe_audio_file(audio_data['audio_file'], progress_callback=on_transcribe_progress)
        
        note = db.query(Note).filter(Note.id == note_id).first()
        if note:
            note.content = transcript_data['transcript']
            db.commit()
            
        # 3. Summarize
        self.update_state(state='PROGRESS', meta={'stage': 'summarize', 'progress': 60, 'message': 'Creating atomic summary...'})
        summary_data = create_atomic_summary(transcript_data['transcript'])
        
        note = db.query(Note).filter(Note.id == note_id).first()
        if note:
            existing_metadata = note.note_metadata if isinstance(note.note_metadata, dict) else {}
            new_metadata = {
                **existing_metadata,
                "summary": summary_data['summary'],
                "key_topics": summary_data['key_topics']
            }
            note.note_metadata = new_metadata
            db.commit()
            
        # 4. Process Pipeline (Entity extraction, etc.)
        self.update_state(state='PROGRESS', meta={'stage': 'extract', 'progress': 70, 'message': 'Extracting entities and relationships...'})
        
        # Consume the async generator
        async def consume_pipeline():
            # Refetch note within the async scope to ensure it's still there and avoid closure issues
            inner_db = SessionLocal()
            try:
                inner_note = inner_db.query(Note).filter(Note.id == note_id).first()
                if not inner_note:
                    logger.error(f"Note {note_id} not found during pipeline processing")
                    return

                # Use the summary for extraction as it's more "atomic"
                original_content = inner_note.content
                inner_note.content = summary_data.get('summary', original_content)
                inner_db.commit()
                
                async for progress_json in process_note_pipeline(note_id, inner_db):
                    # Parse SSE format: "data: {...}\n\n"
                    if progress_json.startswith("data: "):
                        clean_json = progress_json.replace("data: ", "").strip()
                        if not clean_json:
                            continue
                            
                        try:
                            data = json.loads(clean_json)
                            p = data.get('progress', 0)
                            msg = data.get('message', 'Processing...')
                            self.update_state(state='PROGRESS', meta={'stage': 'extract', 'progress': 70 + (p * 0.3), 'message': msg})
                        except json.JSONDecodeError as je:
                            logger.warning(f"Failed to parse pipeline progress: {progress_json} - {je}")
                            continue
                    
                # Restore full transcript to content
                inner_note = inner_db.query(Note).filter(Note.id == note_id).first()
                if inner_note:
                    inner_note.content = original_content
                    inner_db.commit()
            finally:
                inner_db.close()

        run_async(consume_pipeline())
        
        # Cleanup
        if os.path.exists(audio_data['audio_file']):
            os.remove(audio_data['audio_file'])
            
        return {'status': 'complete', 'note_id': note_id}
        
    except Exception as e:
        logger.error(f"Error in process_youtube_video task: {str(e)}", exc_info=True)
        # Don't manually update state to FAILURE if we re-raise, 
        # Celery handles it better automatically.
        raise e
    finally:
        db.close()
