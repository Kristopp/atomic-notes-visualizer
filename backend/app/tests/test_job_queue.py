import pytest
from app.services.job_queue import celery_app

class TestJobQueue:
    """Test Celery task queue setup"""
    
    def test_celery_app_configured(self):
        """Should have Celery app properly configured"""
        assert celery_app is not None
        # Default in code is redis://localhost:6379/0
        assert "redis" in celery_app.conf.broker_url
