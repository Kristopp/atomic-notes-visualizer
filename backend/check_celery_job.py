#!/usr/bin/env python3
"""
Check YouTube Processing Job Status
Shows detailed status and error information for YouTube processing tasks
"""
import sys
import os
sys.path.insert(0, '/home/krist/git/atomic-notes-visualizer/backend')

from celery.result import AsyncResult
from app.services.job_queue import celery_app
from app.database import SessionLocal
from app.models.note import Note
from sqlalchemy import desc
import json


def get_job_status(job_id):
    """Get detailed status of a Celery job"""
    result = AsyncResult(job_id, app=celery_app)
    
    print(f"\n{'='*80}")
    print(f"Job ID: {job_id}")
    print(f"{'='*80}\n")
    print(f"Status: {result.state}")
    
    if result.state == 'PENDING':
        print("  → Job is waiting to be processed")
    elif result.state == 'STARTED':
        print("  → Job is currently running")
    elif result.state == 'SUCCESS':
        print("  → Job completed successfully")
        if result.result:
            print(f"  Result: {result.result}")
    elif result.state == 'FAILURE':
        print("  → Job failed!")
        if result.info:
            print(f"\n  Error Type: {type(result.info).__name__}")
            print(f"  Error Message: {str(result.info)}")
            if hasattr(result.info, '__traceback__'):
                import traceback
                print(f"\n  Traceback:")
                traceback.print_exception(type(result.info), result.info, result.info.__traceback__)
    elif result.state == 'PROGRESS':
        print("  → Job in progress")
        if result.info:
            print(f"  Progress Info: {json.dumps(result.info, indent=2)}")
    
    print(f"\n{'='*80}\n")


def find_recent_jobs_with_ids():
    """Find recent YouTube jobs and show their Celery task IDs"""
    db = SessionLocal()
    try:
        notes = db.query(Note).filter(
            Note.note_metadata.isnot(None)
        ).order_by(desc(Note.created_at)).limit(5).all()
        
        print(f"\n{'='*80}")
        print("Recent YouTube Jobs")
        print(f"{'='*80}\n")
        
        for note in notes:
            metadata = note.note_metadata or {}
            job_id = metadata.get('celery_task_id')
            
            print(f"📝 Note #{note.id}: {note.title}")
            print(f"   Created: {note.created_at}")
            print(f"   URL: {metadata.get('url', 'N/A')}")
            
            if job_id:
                print(f"   Celery Job ID: {job_id}")
                print(f"   Check status: python check_celery_job.py {job_id}")
            else:
                print(f"   ⚠️  No Celery job ID found")
            
            if 'error' in metadata:
                print(f"   ❌ Error: {metadata['error']}")
            
            print()
        
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Check specific job ID
        job_id = sys.argv[1]
        get_job_status(job_id)
    else:
        # Show recent jobs
        find_recent_jobs_with_ids()
        print("\nUsage: python check_celery_job.py <job_id>")
        print("       to check status of a specific job\n")
