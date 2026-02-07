"""
Atomic Notes Visualizer - FastAPI Backend
Following Test-Driven Agent (TDA) Pattern
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import logging setup
from app.core.logging_config import setup_logging, get_logger, get_request_id
from app.core.middleware import RequestIDMiddleware

# Configure logging based on environment
USE_JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
setup_logging(level=LOG_LEVEL, use_json=USE_JSON_LOGS)

logger = get_logger(__name__)

# Import routers
from app.api import notes, search, annotations, youtube

app = FastAPI(
    title="Atomic Notes Visualizer API",
    description="AI-powered knowledge graph visualization from atomic notes",
    version="0.1.0"
)

# Request ID middleware (must be first to ensure all logs have request_id)
app.add_middleware(RequestIDMiddleware)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled exceptions, log them with full context,
    and return a clean error response with request_id for tracking
    """
    request_id = get_request_id()
    
    logger.error(
        "Unhandled exception",
        method=request.method,
        path=str(request.url.path),
        error=str(exc),
        error_type=type(exc).__name__,
        request_id=request_id,
        exc_info=exc
    )
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "request_id": request_id
        }
    )
    
    # Add the request ID header to the error response
    response.headers["X-Request-ID"] = request_id if request_id else "unknown"
    
    return response


# Debug endpoint to test error handling (can be removed in production)
@app.get("/debug/raise-error")
async def debug_raise_error():
    """Intentionally raise an error for testing the exception handler"""
    raise ValueError("This is a test error to verify exception handling")


# Include routers
app.include_router(notes.router)
app.include_router(search.router)
app.include_router(annotations.router)
app.include_router(youtube.router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Atomic Notes Visualizer API",
        "status": "healthy",
        "version": "0.1.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
        "pgvector": "enabled"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

