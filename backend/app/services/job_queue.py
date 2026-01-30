import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Redis URL for Celery
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery
celery_app = Celery(
    "atomic_notes_jobs",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Optional: Configuration for Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes
)
