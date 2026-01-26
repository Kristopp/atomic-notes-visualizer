#!/bin/bash
# Development server startup script

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
