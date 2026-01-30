import pytest
from app.services.youtube_audio import extract_video_id, download_youtube_audio

class TestYouTubeURLValidation:
    """Test YouTube URL parsing and validation"""
    
    def test_valid_watch_url(self):
        """Should parse standard watch URL"""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_valid_short_url(self):
        """Should parse youtu.be short URL"""
        url = "https://youtu.be/dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_valid_embed_url(self):
        """Should parse embed URL"""
        url = "https://www.youtube.com/embed/dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_invalid_url_raises_error(self):
        """Should raise ValueError for non-YouTube URLs"""
        with pytest.raises(ValueError, match="Invalid YouTube URL"):
            extract_video_id("https://vimeo.com/123456")
    
    def test_malformed_url_raises_error(self):
        """Should raise ValueError for malformed URLs"""
        with pytest.raises(ValueError):
            extract_video_id("not-a-url")

class TestYouTubeAudioDownload:
    """Test audio download functionality"""
    
    @pytest.fixture
    def mock_yt_dlp(self, mocker):
        """Mock yt-dlp to avoid actual downloads"""
        return mocker.patch('yt_dlp.YoutubeDL')
    
    def test_download_returns_audio_path(self, mock_yt_dlp, tmp_path):
        """Should download audio and return file path"""
        # Mock yt-dlp response
        mock_instance = mock_yt_dlp.return_value.__enter__.return_value
        mock_instance.extract_info.return_value = {
            'id': 'test123',
            'title': 'Test Video',
            'duration': 180,
            'uploader': 'Test Channel',
            'thumbnail': 'https://example.com/thumb.jpg',
            'ext': 'mp3'
        }
        
        # Ensure we return a fake filename
        mock_instance.prepare_filename.return_value = str(tmp_path / "test123.mp3")
        
        result = download_youtube_audio("https://youtube.com/watch?v=test123", str(tmp_path))
        
        assert result['video_id'] == 'test123'
        assert result['title'] == 'Test Video'
        assert result['duration_seconds'] == 180
        assert result['audio_file'].endswith('.mp3')
    
    def test_download_handles_unavailable_video(self, mock_yt_dlp):
        """Should raise error for unavailable videos"""
        mock_instance = mock_yt_dlp.return_value.__enter__.return_value
        mock_instance.extract_info.side_effect = Exception("Video unavailable")
        
        with pytest.raises(Exception, match="Video unavailable"):
            download_youtube_audio("https://youtube.com/watch?v=deleted", "/tmp")
