import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestYouTubeAPI:
    """Test YouTube API endpoints"""
    
    def test_start_youtube_processing_invalid_url(self):
        """Should return 400 for invalid YouTube URL"""
        response = client.post(
            "/api/youtube/process",
            json={"url": "https://vimeo.com/123"}
        )
        assert response.status_code == 400
        assert "Invalid YouTube URL" in response.json()["detail"]
    
    def test_start_youtube_processing_valid_url(self, mocker):
        """Should return 200 and job info for valid URL"""
        # Mock the Celery task delay
        mock_task = mocker.patch('app.api.youtube.process_youtube_video.delay')
        mock_task.return_value.id = "test-job-id"
        
        response = client.post(
            "/api/youtube/process",
            json={"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}
        )
        
        assert response.status_code == 200
        assert response.json()["job_id"] == "test-job-id"
        assert response.json()["status"] == "queued"
    
    def test_get_job_status(self, mocker):
        """Should return job status"""
        # Mock Celery AsyncResult
        mock_result = mocker.patch('app.api.youtube.AsyncResult')
        mock_result.return_value.state = "PROGRESS"
        mock_result.return_value.info = {
            "stage": "transcribe",
            "progress": 35,
            "message": "Transcribing audio..."
        }
        
        response = client.get("/api/youtube/status/test-job-id")
        
        assert response.status_code == 200
        assert response.json()["status"] == "processing"
        assert response.json()["progress"] == 35
        assert response.json()["stage"] == "transcribe"
