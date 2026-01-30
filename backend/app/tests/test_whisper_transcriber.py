import pytest
from app.services.whisper_transcriber import transcribe_audio_file

class TestWhisperTranscription:
    """Test Whisper API integration"""
    
    @pytest.fixture
    def mock_openai_client(self, mocker):
        """Mock OpenAI client returned by get_client"""
        mock_client = mocker.MagicMock()
        mocker.patch('app.services.whisper_transcriber.get_client', return_value=mock_client)
        return mock_client
    
    def test_transcribe_small_audio_file(self, mock_openai_client, tmp_path):
        """Should transcribe audio file"""
        # Create dummy audio file
        audio_file = tmp_path / "test.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        # Mock OpenAI response
        mock_openai_client.audio.transcriptions.create.return_value.text = "This is a test transcript"
        
        result = transcribe_audio_file(str(audio_file))
        
        assert result['transcript'] == "This is a test transcript"
        assert result['language'] == 'en'
    
    def test_transcribe_with_language_hint(self, mock_openai_client, tmp_path):
        """Should pass language parameter to Whisper"""
        audio_file = tmp_path / "spanish.mp3"
        audio_file.write_bytes(b"audio data")
        
        mock_openai_client.audio.transcriptions.create.return_value.text = "Hola"
        
        transcribe_audio_file(str(audio_file), language="es")
        
        # Check call arguments
        call_args = mock_openai_client.audio.transcriptions.create.call_args
        assert call_args[1]['language'] == 'es'
    
    def test_transcribe_handles_api_errors(self, mock_openai_client, tmp_path):
        """Should handle OpenAI API errors gracefully"""
        audio_file = tmp_path / "test.mp3"
        audio_file.write_bytes(b"data")
        
        mock_openai_client.audio.transcriptions.create.side_effect = Exception("API rate limit exceeded")
        
        with pytest.raises(Exception, match="API rate limit"):
            transcribe_audio_file(str(audio_file))
