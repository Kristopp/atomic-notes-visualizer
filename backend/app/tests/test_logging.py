"""
Test-Driven Development for Logging Infrastructure
Tests for Request ID middleware, error interceptor, and structured logging
"""
import pytest
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


class TestRequestIDMiddleware:
    """Test that Request ID middleware is working correctly"""
    
    def test_request_id_in_response_headers(self):
        """Every API response should include an X-Request-ID header"""
        response = client.get("/")
        
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0
        # Request ID should be a valid UUID-like string or similar
        request_id = response.headers["X-Request-ID"]
        assert isinstance(request_id, str)
        assert len(request_id) >= 8  # Minimum length for a meaningful ID
    
    def test_different_requests_get_different_ids(self):
        """Each request should receive a unique Request ID"""
        response1 = client.get("/")
        response2 = client.get("/")
        
        request_id_1 = response1.headers.get("X-Request-ID")
        request_id_2 = response2.headers.get("X-Request-ID")
        
        assert request_id_1 != request_id_2
    
    def test_request_id_present_on_error_responses(self):
        """Even error responses should include Request ID"""
        # Try to access a non-existent endpoint
        response = client.get("/api/nonexistent")
        
        assert "X-Request-ID" in response.headers


class TestGlobalExceptionHandler:
    """Test that unhandled exceptions are caught and logged properly"""
    
    def test_unhandled_exception_returns_500_with_request_id(self):
        """Unhandled exceptions should return 500 with request_id in response body"""
        # This endpoint will be created as a debug route to intentionally raise an error
        response = client.get("/debug/raise-error")
        
        assert response.status_code == 500
        
        # Response should be JSON
        data = response.json()
        
        # Should contain a generic error message (not exposing internal details)
        assert "detail" in data
        assert data["detail"] == "Internal Server Error"
        
        # Should contain the request_id for tracking
        assert "request_id" in data
        assert len(data["request_id"]) > 0
    
    def test_exception_handler_logs_full_context(self, capsys):
        """Exception handler should log request context (method, path, etc.)"""
        response = client.get("/debug/raise-error")
        
        # Capture the stdout output (where structlog writes)
        captured = capsys.readouterr()
        
        # Check that logs contain the path and error information
        assert "/debug/raise-error" in captured.out
        assert "Unhandled exception" in captured.out or "error" in captured.out.lower()


class TestStructuredLogging:
    """Test that logs are structured and contain necessary context"""
    
    def test_logs_contain_request_id(self, capsys):
        """Logs generated during a request should include the request_id"""
        response = client.get("/")
        request_id = response.headers.get("X-Request-ID")
        
        # Capture stdout where structlog writes
        captured = capsys.readouterr()
        
        # The request_id should appear in the log output
        assert request_id in captured.out, f"Request ID {request_id} not found in logs"
    
    def test_error_logs_are_structured(self, capsys):
        """Error logs should follow a structured format with consistent fields"""
        # Make the request first
        response = client.get("/debug/raise-error")
        
        # Now capture the output
        captured = capsys.readouterr()
        
        # Get request_id from response
        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None, "Request ID should be present in response headers"
        
        # Check that essential fields are in the output
        assert request_id in captured.out
        assert "error" in captured.out.lower() or "exception" in captured.out.lower()
        assert "/debug/raise-error" in captured.out
        assert "ValueError" in captured.out
