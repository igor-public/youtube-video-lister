# Tests

Tests are split by side of the system so the backend and UI can be worked on
(and tested) independently.

```
tests/
├── backend/          # Python / pytest — API, streaming, RAG, CLI toolkit
└── frontend/         # Node.js — WebSocket smoke test
```

## Backend (`tests/backend/`)

### Unit
- `test_api.py` — FastAPI endpoint tests
- `test_channel_lister.py` — Channel-listing functionality
- `test_converter.py` — Subtitle → text conversion
- `test_downloader.py` — Subtitle downloader

### Integration / streaming
- `test_web_api.py` — Web API integration
- `test_bedrock_streaming.py` — AWS Bedrock streaming
- `test_streaming.py` — Streaming entrypoint (standalone script)
- `test_chat_api.py` — Chat REST + WebSocket
- `test_rag_integration.py` — RAG end-to-end

### Running
```bash
pytest                                # all backend tests (testpaths = tests)
pytest tests/backend/test_api.py
pytest --cov=backend tests/backend/   # with coverage
```

## Frontend (`tests/frontend/`)

- `test_websocket.js` — CLI WebSocket smoke test against a running backend

### Running
```bash
node tests/frontend/test_websocket.js
```

## Configuration
- `pytest.ini` — pytest config (project root)
- `requirements-test.txt` — Python test dependencies (project root)
