#!/bin/bash
# Start backend optimized for streaming

cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Kill existing gunicorn/uvicorn
pkill -9 -f "gunicorn.*5000"
pkill -9 -f "uvicorn.*5000"

sleep 2

# Load project env (AWS_BEARER_TOKEN_BEDROCK, AWS_REGION, ...) so uvicorn's
# child process sees them and aioboto3 can authenticate against Bedrock.
if [ -f .env ]; then
    set -a
    . ./.env
    set +a
    echo "✓ Loaded .env"
fi

echo "Starting backend with logging to logs/uvicorn.log..."
echo "View logs with: tail -f logs/uvicorn.log"

# Start uvicorn directly (better for streaming than gunicorn)
# Application logs go to logs/backend.log (configured in main.py)
# Uvicorn access logs go to logs/uvicorn.log
./venv/bin/uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 5000 \
    --timeout-keep-alive 300 \
    --log-level debug \
    --access-log 2>&1 | tee logs/uvicorn.log

# If you prefer gunicorn, use this instead (WITHOUT --preload):
# ./venv/bin/gunicorn backend.main:app \
#     -k uvicorn.workers.UvicornWorker \
#     --bind 0.0.0.0:5000 \
#     --timeout 300 \
#     --keep-alive 300 \
#     --log-level info
