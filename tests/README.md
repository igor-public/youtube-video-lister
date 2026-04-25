# Tests

This directory contains all test files for the YouTube Toolkit project.

## Test Files

### Unit Tests
- `test_api.py` - FastAPI endpoint tests
- `test_channel_lister.py` - Channel listing functionality tests
- `test_converter.py` - Converter tests
- `test_downloader.py` - Downloader tests

### Integration Tests
- `test_web_api.py` - Web API integration tests
- `test_bedrock_streaming.py` - AWS Bedrock streaming tests
- `test_streaming.py` - General streaming functionality tests
- `test_websocket.js` - WebSocket client tests (Node.js)

## Running Tests

### Python Tests
```bash
# Run all Python tests
pytest

# Run specific test file
pytest tests/test_api.py

# Run with coverage
pytest --cov=backend tests/
```

### JavaScript Tests
```bash
# Run WebSocket test
node tests/test_websocket.js
```

## Test Configuration

- `pytest.ini` - Pytest configuration in project root
- `requirements-test.txt` - Test dependencies
