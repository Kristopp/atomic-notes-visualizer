#!/bin/bash

# Atomic Notes Visualizer - Startup Script
# Starts both backend (FastAPI) and frontend (Vite) servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Atomic Notes Visualizer - Startup Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Check if Docker is running
echo -e "${YELLOW}[1/5]${NC} Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if PostgreSQL and Redis containers are running
echo -e "${YELLOW}[2/5]${NC} Checking PostgreSQL and Redis databases..."
if ! docker ps | grep -q atomic-notes-db; then
    echo -e "${YELLOW}! Database containers not running. Starting them now...${NC}"
    cd "$SCRIPT_DIR"
    docker compose up -d
    echo -e "${GREEN}✓ Databases started${NC}"
    sleep 2
else
    echo -e "${GREEN}✓ Databases are already running${NC}"
fi

# Check if backend .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}! Warning: Backend .env file not found${NC}"
    echo -e "${YELLOW}  Create $BACKEND_DIR/.env with your OPENAI_API_KEY${NC}"
    echo -e "${YELLOW}  You can copy .env.example and add your key${NC}"
fi

# Start Backend
echo -e "${YELLOW}[3/5]${NC} Starting backend server and Celery worker..."
cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment not found at $BACKEND_DIR/venv${NC}"
    echo -e "${RED}  Please run: cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# Kill any existing backend/celery process
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "celery -A app.tasks.youtube_processor worker" 2>/dev/null || true

# Start backend in background
source venv/bin/activate
nohup uvicorn app.main:app --reload --port 8002 > /tmp/atomic-notes-backend.log 2>&1 &
BACKEND_PID=$!

# Start Celery worker in background
nohup celery -A app.tasks.youtube_processor worker --loglevel=info > /tmp/atomic-notes-celery.log 2>&1 &
CELERY_PID=$!

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}✓ Celery worker started (PID: $CELERY_PID)${NC}"
echo -e "  ${BLUE}→ API running at http://localhost:8002${NC}"
echo -e "  ${BLUE}→ Logs: /tmp/atomic-notes-backend.log${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}[4/5]${NC} Waiting for backend to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:8002/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Backend failed to start. Check logs at /tmp/atomic-notes-backend.log${NC}"
        exit 1
    fi
    sleep 1
done

# Start Frontend
echo -e "${YELLOW}[5/5]${NC} Starting frontend server..."
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ node_modules not found${NC}"
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install
fi

# Kill any existing frontend process
pkill -f "vite" 2>/dev/null || true

# Start frontend in background
nohup npm run dev > /tmp/atomic-notes-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready and detect port
echo "  Waiting for frontend to start..."
sleep 3

# Try to detect the port from logs
FRONTEND_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' /tmp/atomic-notes-frontend.log | head -1)
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT="5173 or 5174"
fi

echo -e "  ${BLUE}→ Frontend running at http://localhost:$FRONTEND_PORT${NC}"
echo -e "  ${BLUE}→ Logs: /tmp/atomic-notes-frontend.log${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🚀 All services started! 🚀           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • Database:  ${GREEN}http://localhost:5432${NC} (PostgreSQL)"
echo -e "  • Backend:   ${GREEN}http://localhost:8002${NC} (FastAPI)"
echo -e "  • Celery:    ${GREEN}Worker Active${NC}"
echo -e "  • Frontend:  ${GREEN}http://localhost:$FRONTEND_PORT${NC} (Vite + React)"
echo ""
echo -e "${BLUE}PIDs:${NC}"
echo -e "  • Backend:   $BACKEND_PID"
echo -e "  • Frontend:  $FRONTEND_PID"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  • Backend:   tail -f /tmp/atomic-notes-backend.log"
echo -e "  • Frontend:  tail -f /tmp/atomic-notes-frontend.log"
echo ""
echo -e "${YELLOW}To stop all services, run:${NC}"
echo -e "  ./stop.sh"
echo ""
echo -e "${BLUE}Open your browser to http://localhost:$FRONTEND_PORT to use the app!${NC}"
echo ""
