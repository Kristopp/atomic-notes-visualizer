import pytest
from app.tasks.youtube_processor import process_youtube_video

class TestYouTubeTask:
    """Test the full background processing task"""
    
    @pytest.fixture
    def mock_services(self, mocker):
        """Mock all external services"""
        return {
            'download': mocker.patch('app.tasks.youtube_processor.download_youtube_audio'),
            'transcribe': mocker.patch('app.tasks.youtube_processor.transcribe_audio_file'),
            'summarize': mocker.patch('app.tasks.youtube_processor.create_atomic_summary'),
            'process_pipeline': mocker.patch('app.tasks.youtube_processor.process_note_pipeline'),
            'db_session': mocker.patch('app.tasks.youtube_processor.SessionLocal'),
            'os_remove': mocker.patch('os.remove')
        }
    
    def test_process_youtube_video_success(self, mock_services, mocker):
        """Should execute all steps successfully"""
        # Configure mocks
        mock_services['download'].return_value = {
            'audio_file': 'test.mp3',
            'title': 'Test Video',
            'video_id': 'test123',
            'uploader': 'Test Channel',
            'thumbnail': 'https://...',
            'duration_seconds': 120
        }
        mock_services['transcribe'].return_value = {'transcript': 'Full text...'}
        mock_services['summarize'].return_value = {
            'summary': 'Summary text...',
            'key_topics': ['topic1']
        }
        
        # Mock update_state to avoid Celery/Redis errors during direct call
        mocker.patch.object(process_youtube_video, 'update_state')
        
        # Mock SessionLocal and its context manager
        mock_db = mock_services['db_session'].return_value
        mock_db.query.return_value.filter.return_value.first.return_value = mocker.MagicMock()
        
        # Execute task (manually)
        result = process_youtube_video("https://youtube.com/watch?v=test123", 999)
        
        # Verify steps
        assert mock_services['download'].called
        assert mock_services['transcribe'].called
        assert mock_services['summarize'].called
        assert mock_services['process_pipeline'].called
        assert result['status'] == 'complete'
