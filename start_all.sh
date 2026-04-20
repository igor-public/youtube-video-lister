#!/bin/bash
# Start all services for YouTube Toolkit

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         YouTube Toolkit - Starting All Services           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

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
uvicorn main:app --host 0.0.0.0 --port 5000 --reload &> /tmp/fastapi.log &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/fastapi.pid
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✓ Backend started successfully (PID: $BACKEND_PID)"
else
    echo "✗ Backend failed to start. Check /tmp/fastapi.log"
    exit 1
fi

# Start React frontend
echo ""
echo "🚀 Starting React frontend on port 3000..."
cd "$SCRIPT_DIR/frontend"
PORT=3000 npm start &> /tmp/react.log &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/react.pid
cd "$SCRIPT_DIR"

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✓ All services started!"
echo ""
echo "  🌐 Vanilla JS UI:     http://localhost:5000"
echo "  ⚛️  React UI:          http://localhost:3000"
echo "  📚 API Docs (Swagger): http://localhost:5000/api/docs"
echo "  📖 API Docs (ReDoc):   http://localhost:5000/api/redoc"
echo ""
echo "  Backend PID:  $BACKEND_PID (logs: /tmp/fastapi.log)"
echo "  Frontend PID: $FRONTEND_PID (logs: /tmp/react.log)"
echo ""
echo "  To stop all services, run: ./stop_all.sh"
echo ""
echo "════════════════════════════════════════════════════════════"
