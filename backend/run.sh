#!/bin/bash
# FastAPI Backend Startup Script

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Activate virtual environment if it exists
if [ -d "$PROJECT_ROOT/venv" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
    echo "✓ Virtual environment activated"
fi

# Install dependencies if needed
if [ ! -f "$SCRIPT_DIR/.deps_installed" ]; then
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
    touch "$SCRIPT_DIR/.deps_installed"
fi

# Run FastAPI server
echo "Starting FastAPI backend on port 5000..."
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
