#!/bin/bash
# Start all services for YouTube Toolkit

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         YouTube Toolkit - Starting All Services           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "✗ Warning: Virtual environment not found. Run: python3 -m venv venv"
fi

# Install backend dependencies if needed
if [ ! -f "backend/.deps_installed" ]; then
    echo ""
    echo "📦 Installing backend dependencies..."
    cd backend
    pip install -q -r requirements.txt
    touch .deps_installed
    cd ..
    echo "✓ Backend dependencies installed"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✓ Frontend dependencies installed"
fi

# Start backend
echo ""
echo "🚀 Starting FastAPI backend on port 5000..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 5000 --reload --log-level debug 2>&1 | tee ../logs/uvicorn-all.log &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/fastapi.pid
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✓ Backend started successfully (PID: $BACKEND_PID)"
else
    echo "✗ Backend failed to start. Check logs/uvicorn-all.log and logs/backend.log"
    exit 1
fi

# Start React frontend
echo ""
echo "🚀 Starting React frontend on port 3000..."
cd "$SCRIPT_DIR/frontend"
PORT=3000 npm start 2>&1 | tee ../logs/react.log &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/react.pid
cd "$SCRIPT_DIR"

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✓ All services started!"
echo ""
echo "  ⚛️  React UI:          http://localhost:3000"
echo "  🔌 Backend API:       http://localhost:5000"
echo "  📚 API Docs (Swagger): http://localhost:5000/api/docs"
echo "  📖 API Docs (ReDoc):   http://localhost:5000/api/redoc"
echo ""
echo "  📋 Logs:"
echo "     Application:  logs/backend.log"
echo "     Uvicorn:      logs/uvicorn-all.log"
echo "     React:        logs/react.log"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  To stop all services, run: ./stop_all.sh"
echo "  To view logs: tail -f logs/backend.log"
echo ""
echo "════════════════════════════════════════════════════════════"
