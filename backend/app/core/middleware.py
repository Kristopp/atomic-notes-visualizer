"""
Middleware for request tracking and logging
"""
import uuid
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging_config import set_request_id, get_logger

logger = get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates a unique Request ID for each incoming request
    and injects it into the logging context and response headers
    """
    
    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID"):
        super().__init__(app)
        self.header_name = header_name
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        
        # Store it in context for logging
        set_request_id(request_id)
        
        # Track request timing
        start_time = time.time()
        
        # Log the incoming request
        logger.info(
            "Request started",
            method=request.method,
            path=request.url.path,
            request_id=request_id
        )
        
        # Process the request
        response = await call_next(request)
        
        # Calculate request duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Log the response
        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=f"{duration_ms:.2f}",
            request_id=request_id
        )
        
        # Add request ID to response headers
        response.headers[self.header_name] = request_id
        
        return response
