#!/bin/bash
# Stop all YouTube Toolkit services

echo "Stopping YouTube Toolkit services..."

# Stop backend
if [ -f /tmp/fastapi.pid ]; then
    BACKEND_PID=$(cat /tmp/fastapi.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✓ Backend stopped (PID: $BACKEND_PID)"
    fi
    rm /tmp/fastapi.pid
fi

# Stop frontend
if [ -f /tmp/react.pid ]; then
    FRONTEND_PID=$(cat /tmp/react.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✓ Frontend stopped (PID: $FRONTEND_PID)"
    fi
    rm /tmp/react.pid
fi

# Kill any remaining processes on ports
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "✓ All services stopped"
