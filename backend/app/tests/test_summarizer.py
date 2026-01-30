import pytest
import json
from app.services.summarizer import create_atomic_summary

class TestAtomicSummarization:
    """Test GPT summarization for atomic notes"""
    
    @pytest.fixture
    def mock_openai_client(self, mocker):
        """Mock OpenAI client"""
        mock_client = mocker.MagicMock()
        mocker.patch('app.services.summarizer.get_client', return_value=mock_client)
        return mock_client
    
    @pytest.fixture
    def sample_transcript(self):
        """Sample video transcript"""
        return """
        In this video, I'll explain React Hooks. React Hooks are functions
        that let you use state and other React features in functional components.
        The most common hooks are useState and useEffect. useState lets you
        add state to functional components, while useEffect handles side effects.
        """
    
    def test_create_summary_from_transcript(self, mock_openai_client, sample_transcript):
        """Should create concise summary optimized for entity extraction"""
        mock_response = {
            'summary': 'React Hooks enable state management in functional components',
            'key_topics': ['React Hooks', 'useState', 'useEffect', 'state management']
        }
        
        # Mock chat completion response
        mock_completion = mock_openai_client.chat.completions.create.return_value
        mock_completion.choices[0].message.content = json.dumps(mock_response)
        
        result = create_atomic_summary(sample_transcript)
        
        assert result['summary'] == 'React Hooks enable state management in functional components'
        assert 'useState' in result['key_topics']
    
    def test_summary_handles_api_errors(self, mock_openai_client, sample_transcript):
        """Should handle OpenAI API errors gracefully"""
        mock_openai_client.chat.completions.create.side_effect = Exception("API error")
        
        with pytest.raises(Exception, match="API error"):
            create_atomic_summary(sample_transcript)
