#!/bin/bash
# Log viewer utility for YouTube Toolkit

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_help() {
    echo "YouTube Toolkit Log Viewer"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -a, --all          Show all logs (backend + uvicorn + react)"
    echo "  -b, --backend      Show backend application logs"
    echo "  -u, --uvicorn      Show uvicorn access logs"
    echo "  -r, --react        Show React frontend logs"
    echo "  -s, --stream       Show streaming/Bedrock logs only"
    echo "  -e, --errors       Show errors only"
    echo "  -f, --follow       Follow logs in real-time"
    echo "  -c, --clean        Clean old logs (keeps current)"
    echo "  -l, --list         List all log files with sizes"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -b -f           Follow backend logs in real-time"
    echo "  $0 -s              Show all streaming-related logs"
    echo "  $0 -e              Show all errors"
    echo ""
}

list_logs() {
    echo -e "${GREEN}Log files in logs/ directory:${NC}"
    echo ""
    if [ -d "logs" ]; then
        ls -lh logs/*.log 2>/dev/null || echo "No log files found"
        echo ""
        echo -e "${YELLOW}Total size:${NC}"
        du -sh logs/ 2>/dev/null || echo "0"
    else
        echo "No logs directory found"
    fi
}

clean_logs() {
    echo -e "${YELLOW}Cleaning old logs...${NC}"
    if [ -d "logs" ]; then
        find logs/ -name "*.log.[0-9]*" -delete
        echo -e "${GREEN}✓ Rotated logs cleaned${NC}"
    fi
}

LOG_DIR="logs"

case "$1" in
    -a|--all)
        echo -e "${GREEN}=== All Logs ===${NC}"
        tail -n 100 "$LOG_DIR"/*.log 2>/dev/null | less
        ;;
    -b|--backend)
        if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
            echo -e "${GREEN}Following backend logs... (Ctrl+C to exit)${NC}"
            tail -f "$LOG_DIR/backend.log"
        else
            tail -n 100 "$LOG_DIR/backend.log" 2>/dev/null | less
        fi
        ;;
    -u|--uvicorn)
        if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
            echo -e "${GREEN}Following uvicorn logs... (Ctrl+C to exit)${NC}"
            tail -f "$LOG_DIR/uvicorn"*.log 2>/dev/null
        else
            tail -n 100 "$LOG_DIR/uvicorn"*.log 2>/dev/null | less
        fi
        ;;
    -r|--react)
        if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
            echo -e "${GREEN}Following React logs... (Ctrl+C to exit)${NC}"
            tail -f "$LOG_DIR/react.log" 2>/dev/null
        else
            tail -n 100 "$LOG_DIR/react.log" 2>/dev/null | less
        fi
        ;;
    -s|--stream)
        echo -e "${GREEN}=== Streaming/Bedrock Logs ===${NC}"
        grep -i "bedrock\|stream\|websocket\|converse" "$LOG_DIR/backend.log" 2>/dev/null | tail -n 100 | less
        ;;
    -e|--errors)
        echo -e "${RED}=== Error Logs ===${NC}"
        grep -i "error\|exception\|critical\|failed" "$LOG_DIR"/*.log 2>/dev/null | tail -n 100 | less
        ;;
    -f|--follow)
        echo -e "${GREEN}Following all logs... (Ctrl+C to exit)${NC}"
        tail -f "$LOG_DIR"/*.log 2>/dev/null
        ;;
    -c|--clean)
        clean_logs
        ;;
    -l|--list)
        list_logs
        ;;
    -h|--help|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
