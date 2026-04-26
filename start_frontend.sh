#!/bin/bash
# Start the React frontend only.
# The backend can run on a different host/machine — configure via
# frontend/.env.local (see frontend/.env.example for REACT_APP_API_BASE /
# REACT_APP_WS_BASE / REACT_APP_BACKEND_PORT).

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

PORT="${PORT:-3000}"
echo "🚀 Starting React frontend on port $PORT..."
PORT="$PORT" npm start
