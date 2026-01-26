#!/bin/bash

# Atomic Notes Visualizer - Stop Script
# Stops both backend and frontend servers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Atomic Notes Visualizer - Stop Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Stop backend
echo -e "${YELLOW}[1/3]${NC} Stopping backend server..."
if pkill -f "uvicorn app.main:app"; then
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}! Backend was not running${NC}"
fi

# Stop frontend
echo -e "${YELLOW}[2/3]${NC} Stopping frontend server..."
if pkill -f "vite"; then
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}! Frontend was not running${NC}"
fi

# Optionally stop database
echo -e "${YELLOW}[3/3]${NC} PostgreSQL database..."
echo -e "${BLUE}  Database is still running (Docker container)${NC}"
echo -e "${BLUE}  To stop it, run: docker compose down${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         All application services stopped       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}To restart, run:${NC} ./start.sh"
echo ""
