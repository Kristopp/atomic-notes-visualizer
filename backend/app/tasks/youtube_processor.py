import os
import asyncio
import json
from typing import Dict, Any
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.note import Note
from app.services.youtube_audio import download_youtube_audio
from app.services.whisper_transcriber import transcribe_audio_file
from app.services.summarizer import create_atomic_summary
from app.services.processor import process_note_pipeline
from app.services.job_queue import celery_app
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def _process_youtube_video_async(self, youtube_url: str, note_id: int) -> Dict[str, Any]:
    """
    Internal async logic for YouTube processing
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Download audio
            self.update_state(state='PROGRESS', meta={'stage': 'download', 'progress': 5, 'message': 'Downloading audio...'})
            temp_dir = "/tmp/atomic_notes_youtube"
            audio_data = download_youtube_audio(youtube_url, temp_dir)
            
            # Update note metadata
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalar_one_or_none()
            
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
                await db.commit()
                
            # 2. Transcribe
            self.update_state(state='PROGRESS', meta={'stage': 'transcribe', 'progress': 15, 'message': 'Transcribing audio with Whisper...'})
            
            def on_transcribe_progress(p):
                self.update_state(state='PROGRESS', meta={'stage': 'transcribe', 'progress': 15 + (p * 0.4), 'message': f'Transcribing... {p}%'})
                
            transcript_data = transcribe_audio_file(audio_data['audio_file'], progress_callback=on_transcribe_progress)
            
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalar_one_or_none()
            if note:
                note.content = transcript_data['transcript']
                existing_metadata = note.note_metadata if isinstance(note.note_metadata, dict) else {}
                note.note_metadata = {
                    **existing_metadata,
                    "transcript_segments": transcript_data.get('segments', [])
                }
                await db.commit()
                
            # 3. Summarize
            self.update_state(state='PROGRESS', meta={'stage': 'summarize', 'progress': 60, 'message': 'Creating atomic summary...'})
            summary_data = create_atomic_summary(transcript_data['transcript'])
            
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalar_one_or_none()
            if note:
                existing_metadata = note.note_metadata if isinstance(note.note_metadata, dict) else {}
                new_metadata = {
                    **existing_metadata,
                    "summary": summary_data['summary'],
                    "key_topics": summary_data['key_topics']
                }
                note.note_metadata = new_metadata
                await db.commit()
                
            # 4. Process Pipeline (Entity extraction, etc.)
            self.update_state(state='PROGRESS', meta={'stage': 'extract', 'progress': 70, 'message': 'Extracting entities and relationships...'})
            
            transcript_segments = transcript_data.get('segments', [])
            
            # Use the summary for extraction as it's more "atomic"
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalar_one_or_none()
            if note:
                original_content = note.content
                note.content = summary_data.get('summary', original_content)
                await db.commit()
                
                # Pass transcript segments to pipeline for timestamp mapping
                async for progress_json in process_note_pipeline(note_id, db, transcript_segments):
                    if progress_json.startswith("data: "):
                        clean_json = progress_json.replace("data: ", "").strip()
                        if not clean_json: continue
                        try:
                            data = json.loads(clean_json)
                            p = data.get('progress', 0)
                            msg = data.get('message', 'Processing...')
                            self.update_state(state='PROGRESS', meta={'stage': 'extract', 'progress': 70 + (p * 0.3), 'message': msg})
                        except json.JSONDecodeError:
                            continue
                
                # Restore full transcript to content
                result = await db.execute(select(Note).where(Note.id == note_id))
                note = result.scalar_one_or_none()
                if note:
                    note.content = original_content
                    await db.commit()
            
            # Cleanup
            if os.path.exists(audio_data['audio_file']):
                os.remove(audio_data['audio_file'])
                
            return {'status': 'complete', 'note_id': note_id}
            
        except Exception as e:
            logger.error(f"Error in _process_youtube_video_async: {str(e)}", exc_info=True)
            await db.rollback()
            raise e

@celery_app.task(bind=True, name="app.tasks.youtube_processor.process_youtube_video")
def process_youtube_video(self, youtube_url: str, note_id: int) -> Dict[str, Any]:
    """
    Background task for full YouTube -> Atomic Notes pipeline
    """
    return asyncio.run(_process_youtube_video_async(self, youtube_url, note_id))

