#!/bin/bash
# Development server startup script with proper logging

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Create logs directory if it doesn't exist
mkdir -p logs

echo "=========================================="
echo "Starting Atomic Notes API Server"
echo "Logs will be written to: logs/app.log"
echo "=========================================="

# Start FastAPI server with uvicorn logging
# --log-level debug will show all SQL queries and debug info
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8002 \
    --reload \
    --log-level debug \
    --access-log \
    --use-colors
