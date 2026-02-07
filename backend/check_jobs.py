#!/usr/bin/env python3
"""
Quick script to check recent YouTube processing jobs and their status
"""
import sys
sys.path.insert(0, '/home/krist/git/atomic-notes-visualizer/backend')

from app.database import SessionLocal
from app.models.note import Note
from sqlalchemy import desc

def check_recent_jobs(limit=10):
    """Check recent YouTube processing jobs"""
    db = SessionLocal()
    try:
        # Get recent notes with YouTube metadata
        notes = db.query(Note).filter(
            Note.note_metadata.isnot(None)
        ).order_by(desc(Note.created_at)).limit(limit).all()
        
        if not notes:
            print("No YouTube processing jobs found in database.")
            return
        
        print(f"\n{'='*100}")
        print(f"Recent YouTube Processing Jobs (Last {limit})")
        print(f"{'='*100}\n")
        
        for note in notes:
            metadata = note.note_metadata or {}
            
            print(f"📝 Note ID: {note.id}")
            print(f"   Title: {note.title or 'Untitled'}")
            print(f"   Created: {note.created_at}")
            print(f"   Content Length: {len(note.content) if note.content else 0} chars")
            
            if metadata:
                print(f"   Metadata:")
                for key, value in metadata.items():
                    if key == 'error':
                        print(f"      ❌ ERROR: {value}")
                    elif key == 'transcript':
                        print(f"      ✅ Transcript: {len(str(value))} chars")
                    else:
                        print(f"      {key}: {value}")
            
            print()
        
        print(f"{'='*100}\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    check_recent_jobs()
