"""
Atomic Notes Visualizer - FastAPI Backend
Following Test-Driven Agent (TDA) Pattern
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import routers
from app.api import notes, search

app = FastAPI(
    title="Atomic Notes Visualizer API",
    description="AI-powered knowledge graph visualization from atomic notes",
    version="0.1.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(notes.router)
app.include_router(search.router)


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

