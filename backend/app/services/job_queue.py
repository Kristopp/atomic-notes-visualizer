import os
from celery import Celery
from celery.signals import after_setup_logger, after_setup_task_logger
from dotenv import load_dotenv

load_dotenv()

# Import centralized logging setup
from app.core.logging_config import setup_logging

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


# Configure Celery to use our centralized logging
@after_setup_logger.connect
def setup_celery_logger(logger, *args, **kwargs):
    """Setup structured logging for Celery workers"""
    import os
    USE_JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    setup_logging(level=LOG_LEVEL, use_json=USE_JSON_LOGS, service_name="celery-worker")


@after_setup_task_logger.connect
def setup_celery_task_logger(logger, *args, **kwargs):
    """Setup structured logging for Celery tasks"""
    import os
    USE_JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    setup_logging(level=LOG_LEVEL, use_json=USE_JSON_LOGS, service_name="celery-task")
