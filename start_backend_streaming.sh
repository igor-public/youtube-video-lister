#!/bin/bash
# Start backend optimized for streaming

cd "$(dirname "$0")"

# Kill existing gunicorn/uvicorn
pkill -9 -f "gunicorn.*5000"
pkill -9 -f "uvicorn.*5000"

sleep 2

# Start uvicorn directly (better for streaming than gunicorn)
./venv/bin/uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 5000 \
    --timeout-keep-alive 300 \
    --log-level info \
    --no-access-log

# If you prefer gunicorn, use this instead (WITHOUT --preload):
# ./venv/bin/gunicorn backend.main:app \
#     -k uvicorn.workers.UvicornWorker \
#     --bind 0.0.0.0:5000 \
#     --timeout 300 \
#     --keep-alive 300 \
#     --log-level info
