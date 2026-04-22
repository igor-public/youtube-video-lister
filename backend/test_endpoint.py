#!/usr/bin/env python3
"""Minimal streaming test endpoint"""

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json
import time

app = FastAPI()

@app.get("/test/stream")
async def test_stream():
    """Test streaming without any LLM - just count to 10"""
    async def generate():
        for i in range(1, 11):
            timestamp = int((time.time() * 1000)) % 100000
            yield f"data: {json.dumps({'num': i, 'time': timestamp})}\n\n"
            await asyncio.sleep(0.5)  # 500ms between chunks
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001)
