"""
Atomic Notes Visualizer - FastAPI Backend
Refactored with Pydantic Settings and Service Layer
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger, get_request_id
from app.core.middleware import RequestIDMiddleware
from app.database import engine

# Configure logging based on settings
setup_logging(level=settings.log_level, use_json=settings.json_logs)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup logic
    logger.info(f"Starting up {settings.app_name}...")
    
    # Verify DB connection
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    yield
    
    # Shutdown logic
    logger.info("Shutting down...")
    await engine.dispose()


# Import routers
from app.api import notes, search, annotations, youtube

app = FastAPI(
    title=settings.app_name,
    description="AI-powered knowledge graph visualization from atomic notes",
    version=settings.app_version,
    lifespan=lifespan,
    debug=settings.debug
)

# Request ID middleware (must be first to ensure all logs have request_id)
app.add_middleware(RequestIDMiddleware)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
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
        "message": settings.app_name,
        "status": "healthy",
        "version": settings.app_version
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    db_status = "connected"
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check DB failed: {e}")
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "pgvector": "enabled",
        "version": settings.app_version
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )
