#!/bin/bash

# Atomic Notes Visualizer - Log Viewer Script
# Shows all logs in real-time or last N lines

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOGS_DIR="$SCRIPT_DIR/logs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "Usage: ./logs.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow logs in real-time (like tail -f)"
    echo "  -b, --backend    Show only backend logs"
    echo "  -F, --frontend   Show only frontend logs"
    echo "  -c, --celery     Show only celery logs"
    echo "  -n, --lines N    Show last N lines (default: 50)"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./logs.sh              # Show last 50 lines of all logs"
    echo "  ./logs.sh -f           # Follow all logs in real-time"
    echo "  ./logs.sh -b -f        # Follow only backend logs"
    echo "  ./logs.sh -n 100       # Show last 100 lines"
}

# Default values
FOLLOW=false
LINES=50
BACKEND=false
FRONTEND=false
CELERY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -b|--backend)
            BACKEND=true
            shift
            ;;
        -F|--frontend)
            FRONTEND=true
            shift
            ;;
        -c|--celery)
            CELERY=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if logs directory exists
if [ ! -d "$LOGS_DIR" ]; then
    echo "No logs directory found at $LOGS_DIR"
    echo "Start the server first with: ./start.sh"
    exit 1
fi

# Determine which logs to show
if [ "$BACKEND" = true ]; then
    LOG_FILES="$LOGS_DIR/backend.log"
    echo -e "${BLUE}Showing backend logs...${NC}"
elif [ "$FRONTEND" = true ]; then
    LOG_FILES="$LOGS_DIR/frontend.log"
    echo -e "${BLUE}Showing frontend logs...${NC}"
elif [ "$CELERY" = true ]; then
    LOG_FILES="$LOGS_DIR/celery.log"
    echo -e "${BLUE}Showing celery logs...${NC}"
else
    LOG_FILES="$LOGS_DIR/*.log"
    echo -e "${GREEN}Showing all logs...${NC}"
fi

# Show logs
if [ "$FOLLOW" = true ]; then
    echo -e "${YELLOW}Following logs (Ctrl+C to exit)...${NC}"
    tail -f $LOG_FILES
else
    echo -e "${YELLOW}Last $LINES lines (use -f to follow):${NC}"
    echo ""
    tail -n $LINES $LOG_FILES
fi
