#!/bin/bash

# Atomic Notes Visualizer - Status Script
# Check status of all services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Atomic Notes Visualizer - Status Check      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check Docker
echo -e "${YELLOW}Docker:${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Running${NC}"
else
    echo -e "  ${RED}✗ Not running${NC}"
fi

# Check PostgreSQL
echo -e "${YELLOW}PostgreSQL (Docker):${NC}"
if docker ps | grep -q atomic-notes-db; then
    CONTAINER_STATUS=$(docker ps --filter "name=atomic-notes-db" --format "{{.Status}}")
    echo -e "  ${GREEN}✓ Running${NC} - $CONTAINER_STATUS"
    echo -e "  ${BLUE}→ Port: 5432${NC}"
else
    echo -e "  ${RED}✗ Not running${NC}"
fi

# Check Backend
echo -e "${YELLOW}Backend (FastAPI):${NC}"
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    BACKEND_PID=$(pgrep -f "uvicorn app.main:app")
    echo -e "  ${GREEN}✓ Running${NC} (PID: $BACKEND_PID)"
    
    # Test if backend is responding
    if curl -s http://localhost:8002/ > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Responding at http://localhost:8002${NC}"
    else
        echo -e "  ${YELLOW}! Process running but not responding${NC}"
    fi
else
    echo -e "  ${RED}✗ Not running${NC}"
fi

# Check Frontend
echo -e "${YELLOW}Frontend (Vite):${NC}"
if pgrep -f "vite" > /dev/null; then
    FRONTEND_PID=$(pgrep -f "vite")
    echo -e "  ${GREEN}✓ Running${NC} (PID: $FRONTEND_PID)"
    
    # Try to detect port
    if [ -f /tmp/atomic-notes-frontend.log ]; then
        FRONTEND_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' /tmp/atomic-notes-frontend.log | head -1)
        if [ -n "$FRONTEND_PORT" ]; then
            echo -e "  ${BLUE}→ http://localhost:$FRONTEND_PORT${NC}"
        fi
    fi
else
    echo -e "  ${RED}✗ Not running${NC}"
fi

# Check .env file
echo -e "${YELLOW}Configuration:${NC}"
if [ -f "backend/.env" ]; then
    echo -e "  ${GREEN}✓ .env file exists${NC}"
    if grep -q "OPENAI_API_KEY=sk-" backend/.env 2>/dev/null; then
        echo -e "  ${GREEN}✓ OpenAI API key configured${NC}"
    else
        echo -e "  ${YELLOW}! OpenAI API key not set${NC}"
    fi
else
    echo -e "  ${YELLOW}! .env file not found${NC}"
fi

echo ""
echo -e "${BLUE}Log files:${NC}"
if [ -f /tmp/atomic-notes-backend.log ]; then
    BACKEND_LOG_SIZE=$(du -h /tmp/atomic-notes-backend.log | cut -f1)
    echo -e "  • Backend:  /tmp/atomic-notes-backend.log (${BACKEND_LOG_SIZE})"
else
    echo -e "  • Backend:  ${YELLOW}No log file${NC}"
fi

if [ -f /tmp/atomic-notes-frontend.log ]; then
    FRONTEND_LOG_SIZE=$(du -h /tmp/atomic-notes-frontend.log | cut -f1)
    echo -e "  • Frontend: /tmp/atomic-notes-frontend.log (${FRONTEND_LOG_SIZE})"
else
    echo -e "  • Frontend: ${YELLOW}No log file${NC}"
fi

echo ""
echo -e "${BLUE}Database:${NC}"
if docker ps | grep -q atomic-notes-db; then
    # Try to connect and get note count
    NOTE_COUNT=$(docker exec atomic-notes-db psql -U postgres -d atomic_notes -t -c "SELECT COUNT(*) FROM notes;" 2>/dev/null | xargs)
    if [ -n "$NOTE_COUNT" ]; then
        echo -e "  • Notes in database: ${GREEN}$NOTE_COUNT${NC}"
    fi
    
    ENTITY_COUNT=$(docker exec atomic-notes-db psql -U postgres -d atomic_notes -t -c "SELECT COUNT(*) FROM entities;" 2>/dev/null | xargs)
    if [ -n "$ENTITY_COUNT" ]; then
        echo -e "  • Entities in database: ${GREEN}$ENTITY_COUNT${NC}"
    fi
fi

echo ""
