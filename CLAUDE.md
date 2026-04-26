# YouTube Toolkit - Project Guidelines

## 📁 Documentation Rules

**CRITICAL:** All `.md` files (except `README.md` and `CLAUDE.md`) must go in the `docs/` folder:
**CRITICAL:** When new classes/methods/functions added - write unit tests and execute them before completing the changes every time. 


### Documentation Structure
```
docs/
  INDEX.md              # Main documentation index
  guides/               # User guides and how-to documents
    - QUICK_REFERENCE.md
    - USAGE_GUIDE.md
    - ARCHITECTURE.md
    - SECURITY.md
    - LOGGING.md
    - etc.
  changes/              # Change logs, features, implementations
    - WEBSOCKET_IMPLEMENTATION.md
    - STREAMING_DEBUG_ANALYSIS.md
    - TRUE_STREAMING_IMPLEMENTATION.md
    - etc.
```

### Placement Rules
- **Technical guides** → `docs/guides/`
- **Architecture docs** → `docs/guides/`
- **Change logs & features** → `docs/changes/`
- **Implementation notes** → `docs/changes/`
- **Troubleshooting** → `docs/guides/TROUBLESHOOTING.md`
- **Only in root:** `README.md` and `CLAUDE.md`

### When Creating New .md Files
1. Determine category: guide or change/feature
2. Place in appropriate `docs/` subdirectory
3. Update `docs/INDEX.md` with link and description
4. Use clear, descriptive filenames in CAPS_WITH_UNDERSCORES.md

## Project Overview
YouTube channel monitoring and transcript management system with AI-powered summarization and asset tracking.

**Tech Stack:**
- Backend: FastAPI (v2.0.0, Python 3.12) on port 5000
- Frontend: React 19.2.5 on port 3000 (vanilla JS removed)
- LLM: Multi-provider support (AWS Bedrock, OpenAI, Anthropic)
- Streaming: WebSocket with React flushSync
- Testing: pytest with 300s timeout, unit + integration tests

## Architecture Rules

### Frontend (React 19.2.5)
- **ONLY React frontend** - vanilla JS version removed (static/, templates/)
- Use WebSocket for streaming summaries (not EventSource/SSE)
- Always use `flushSync()` for immediate renders when streaming
- API calls go to `http://localhost:5000/api` or `/api` (proxied)
- WebSocket connects to `ws://localhost:5000/api`
- Search with 300ms debounce, highlights with light green background
- Collapsible sidebar sections for space efficiency
- HighlightMap shows search matches visually in scrollbar area

### Backend (FastAPI v2.0.0)
- FastAPI runs on port 5000
- WebSocket endpoint: `/api/transcript/{channel}/{filename}/summarize/ws`
- SSE endpoint still exists but WebSocket is preferred
- Search endpoint: `/api/tree?search=query` (full-text across titles, content, keywords, summaries)
- Asset Monitor API: `/api/assets` with full CRUD operations
- CORS only allows `http://localhost:3000`
- Never skip hooks or add `--no-verify` flags
- BedrockClient handles Claude Opus 4.7 (no temperature parameter)
- Converse API for unified Bedrock model interface

### Streaming Implementation
- **Critical:** Use `flushSync()` from `react-dom` to bypass React 18 batching
- WebSocket messages have types: `start`, `chunk`, `done`, `error`
- Each chunk should trigger immediate render for visible streaming effect
- Log timing metrics for debugging

## Code Conventions

### Python Backend
- Use async/await for streaming operations
- LLM client abstracts provider details (Bedrock, OpenAI, Anthropic)
- Metadata stored in `transcript_metadata.json`
- Logs go to `logs/` directory with rotation

### React Frontend
- Functional components with hooks
- State management via useState/useEffect
- Custom hook: `useLocalStorage` for persistence
- No class components
- Use `flushSync()` for streaming updates

### File Organization
```
backend/
  main.py                  # FastAPI app with WebSocket + REST APIs
  llm_client.py            # LLM abstraction (OpenAI, Anthropic, Bedrock)
  transcript_metadata.py   # Metadata management
  config.py                # Configuration management (Pydantic models)
  prompts.py               # Centralized LLM prompt templates
  logging_config.py        # Colored logging with rotation
  validators.py            # Input validation utilities
  exceptions.py            # Custom exceptions
frontend/src/
  App.js                   # Main app logic
  components/              # React components
    - Sidebar.js           # Channel tree with search
    - ContentPanel.js      # Transcript/summary display
    - ControlsPanel.js     # Collapsible control sections
    - AssetMonitorSection.js # Asset tracking UI
    - HighlightMap.js      # Search result visualization
    - CollapsibleSection.js # Reusable collapsible container
    - LLMConfigModal.js    # LLM configuration form
  hooks/                   # Custom hooks (useLocalStorage)
  utils/                   # Utilities (highlightText)
channel_data/              # Downloaded transcripts
logs/                      # Application logs (50MB rotation, 10 backups)
tests/
  backend/                 # Python / pytest suite
  frontend/                # Node.js WebSocket smoke test
docs/                      # Documentation
  guides/                  # Technical guides
  changes/                 # Change logs and features
```

## Development Workflow

### Starting Services
```bash
# Backend (port 5000)
./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 5000

# Frontend (port 3000)
cd frontend && npm start
```

### Making Changes
1. Backend changes: Edit Python files, uvicorn auto-reloads
2. Frontend changes: Edit React files, webpack hot-reloads
3. Always test streaming after changes

### Testing Streaming
1. Open http://localhost:3000
2. Select transcript → Click "Summarize"
3. Verify word-by-word streaming (not all-at-once)
4. Check browser console for WebSocket logs
5. Optional: Run `node tests/frontend/test_websocket.js` for CLI test

### Running Tests
```bash
# Run all Python tests
pytest

# Run specific test file
pytest tests/backend/test_api.py

# Run with coverage
pytest --cov=backend tests/

# Run WebSocket test
node tests/frontend/test_websocket.js
```

## Important Don'ts

### Never Do These:
- ❌ Don't add vanilla JS frontend code (removed permanently)
- ❌ Don't use EventSource for new streaming features (use WebSocket)
- ❌ Don't create git commits without being asked
- ❌ Don't run force push, reset --hard, or destructive git commands
- ❌ Don't skip git hooks with --no-verify
- ❌ Don't use `setState` without `flushSync` for streaming
- ❌ Don't modify .gitignore to track `channels_config.json` (contains secrets)

### Always Do These:
- ✅ Use WebSocket for real-time streaming
- ✅ Wrap streaming state updates in `flushSync()`
- ✅ Check browser console and backend logs when debugging
- ✅ Test streaming behavior after UI changes
- ✅ Preserve detailed logging for debugging
- ✅ Ask before destructive operations

## Common Tasks

### Adding a New Feature
1. Check if backend endpoint exists first
2. Implement frontend React component
3. Use WebSocket if real-time updates needed
4. Add logging for debugging
5. Test in browser

### Debugging Streaming Issues
1. Check browser console for WebSocket logs
2. Check `logs/backend.log` for Bedrock streaming events
3. Run `node tests/frontend/test_websocket.js` to test endpoint directly
4. Verify `flushSync()` is wrapping state updates
5. Check Network tab → WS for message flow

### Using Search Feature
1. Type query in search box (above sort buttons in sidebar)
2. 300ms debounce - results appear automatically
3. Searches: titles, transcript content, keywords, summaries
4. Light green highlights show matches
5. HighlightMap (vertical bar on right) shows match positions
6. Clear search to see all transcripts again

### Updating Dependencies
- Backend: `pip install -r requirements.txt` + `pip install -r backend/requirements.txt`
- Frontend: `cd frontend && npm install`

## Environment

### Ports
- 5000: Backend API
- 3000: React frontend

### Configuration Files
- `channels_config.json` - Channel monitoring config + asset monitor data (gitignored, contains AWS keys)
- `transcript_metadata.json` - Transcript metadata database
- `.env` - Environment variables (gitignored)
- `pytest.ini` - Test configuration (300s timeout, markers for unit/integration/slow/api/security)

### Logs
- `logs/backend.log` - Backend application logs (rotated, 50MB limit)
- `logs/uvicorn.log` - uvicorn access logs
- Browser console - Frontend streaming logs

## LLM Configuration

### Supported Providers
- **AWS Bedrock** (primary) - True async streaming via Converse API
- **OpenAI** - ChatCompletion API with simulated streaming
- **Anthropic** - Direct Messages API

### Bedrock Streaming
- Uses `aioboto3` for async operations
- Converse Stream API for unified model interface
- Chunks arrive every ~50ms
- Backend logs show event timing
- **Claude Opus 4.7 Support**: Automatically excludes deprecated `temperature` parameter
- Model detection: checks if model ID contains "claude-opus-4-7"

### LLM Client Methods
- `generate_summary()` - Non-streaming summary generation
- `generate_summary_stream()` - Sync streaming (boto3)
- `generate_summary_stream_async()` - Async streaming (aioboto3)
- `extract_keywords()` - Keyword extraction from transcripts

## Asset Monitor Feature

### Purpose
Track trading assets (crypto, commodities, stocks, indices, forex) for investment intelligence gathered from YouTube transcripts.

### Asset Categories
- **Cryptocurrency** (₿) - Bitcoin, Ethereum, etc.
- **Commodity** (🛢️) - Gold, Silver, Oil, etc.
- **Stock** (📈) - Individual stocks
- **Index** (📊) - S&P 500, etc.
- **Forex** (💱) - Currency pairs
- **Other** (💼) - Miscellaneous assets

### Supported Price Sources
- Manual Entry
- CoinMarketCap (crypto)
- CoinGecko (crypto)
- Yahoo Finance (stocks, commodities)
- TradingView (all markets)
- Alpha Vantage (stocks, forex, crypto)
- Finnhub (real-time data)

### API Endpoints
- `GET /api/assets` - List all monitored assets
- `POST /api/assets` - Add new asset
- `PUT /api/assets/{asset_id}` - Update asset
- `DELETE /api/assets/{asset_id}` - Delete asset

### Data Storage
Assets stored in `channels_config.json` under `assets` array with fields:
- `id` (UUID), `name`, `symbol`, `source`, `category`, `notes`

### UI Location
Right sidebar → "Asset Monitor" collapsible section (collapsed by default)

## Documentation

### User-Facing
- `README.md` - Overview and quick start
- `docs/` - Detailed guides (gitignored)

### Technical
- `STREAMING_DEBUG_ANALYSIS.md` - Root cause analysis
- `WEBSOCKET_IMPLEMENTATION.md` - Technical details
- `IMPLEMENTATION_SUMMARY.md` - User-friendly summary

### Testing
- `tests/frontend/test_websocket.js` - WebSocket CLI test script
- `tests/backend/test_bedrock_streaming.py` - Backend streaming test

## Git Practices

### Committing
- Only commit when explicitly asked
- Write clear commit messages explaining "why" not "what"
- Never use --no-verify or skip hooks

### Branching
- Main branch: `main`
- Create feature branches for major changes
- Never force push to main

## Security

### Sensitive Files (Never Commit)
- `channels_config.json` - Contains AWS credentials
- `.env` - Environment variables
- `transcript_metadata.json` - Can be large
- `logs/*.log` - Log files

### API Keys
- AWS credentials in config file
- Never log or expose API keys
- Use environment variables when possible

## Performance

### Streaming Performance
- ~50ms between chunks is optimal
- `flushSync()` increases render frequency but necessary for UX
- Monitor console for timing metrics
- Consider throttling if chunks < 10ms apart

### Memory
- Transcript metadata can grow large
- Log rotation prevents disk fill (50MB limit, 10 backups)
- Clean old transcripts periodically

## Troubleshooting

### Streaming Not Working
1. Check `flushSync()` is being used
2. Verify WebSocket connection in Network tab
3. Check backend logs for Bedrock events
4. Test with `node tests/frontend/test_websocket.js`

### Frontend Won't Start
1. Kill existing process: `pkill -9 -f react-scripts`
2. Clear cache: `rm -rf node_modules/.cache`
3. Reinstall: `npm install`

### Backend Errors
1. Check `logs/backend.log`
2. Verify AWS credentials in config
3. Check Bedrock model availability
4. Test endpoint: `curl http://localhost:5000/health`

## Questions to Ask Before Acting

- Does this need streaming? (Use WebSocket + flushSync)
- Is this destructive? (Ask user first)
- Will this work with React 18 batching? (Use flushSync)

## Project Status

**Version:** 2.0.0  
**Status:** Production Ready ✅  
**Last Major Change:** WebSocket streaming implementation (2026-04-24)  
**Active Development:** Streaming improvements, UX enhancements
