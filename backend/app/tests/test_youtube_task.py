import pytest
from unittest.mock import AsyncMock, MagicMock
from app.tasks.youtube_processor import process_youtube_video

class TestYouTubeTask:
    """Test the full background processing task"""
    
    @pytest.fixture
    def mock_services(self, mocker):
        """Mock all external services"""
        # Create async mock for database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()
        
        # Mock the context manager
        mock_async_session_local = mocker.patch('app.tasks.youtube_processor.AsyncSessionLocal')
        mock_async_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_async_session_local.return_value.__aexit__ = AsyncMock(return_value=None)
        
        return {
            'download': mocker.patch('app.tasks.youtube_processor.download_youtube_audio'),
            'transcribe': mocker.patch('app.tasks.youtube_processor.transcribe_audio_file'),
            'summarize': mocker.patch('app.tasks.youtube_processor.create_atomic_summary'),
            'process_pipeline': mocker.patch('app.tasks.youtube_processor.process_note_pipeline'),
            'db_session': mock_async_session_local,
            'session': mock_session,
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
        mock_services['transcribe'].return_value = {
            'transcript': 'Full text...',
            'segments': []
        }
        mock_services['summarize'].return_value = {
            'summary': 'Summary text...',
            'key_topics': ['topic1']
        }
        
        # Mock note object for database queries
        mock_note = MagicMock()
        mock_note.id = 999
        mock_note.title = 'Test'
        mock_note.note_metadata = {}
        mock_note.content = 'content'
        
        # Setup async mock result
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_note
        mock_services['session'].execute.return_value = mock_result
        
        # Mock update_state to avoid Celery/Redis errors during direct call
        mocker.patch.object(process_youtube_video, 'update_state')
        
        # Execute task
        result = process_youtube_video("https://youtube.com/watch?v=test123", 999)
        
        # Verify steps
        assert mock_services['download'].called
        assert mock_services['transcribe'].called
        assert mock_services['summarize'].called
        assert result['status'] == 'complete'
        assert result['note_id'] == 999
