# YouTube Toolkit - Project Guidelines

## 📁 Documentation Rules

**CRITICAL:** All `.md` files (except `README.md` and `CLAUDE.md`) must go in the `docs/` folder:

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
YouTube channel monitoring and transcript management system with AI-powered summarization.

**Tech Stack:**
- Backend: FastAPI (Python 3.12) on port 5000
- Frontend: React 18 on port 3000 (vanilla JS removed)
- LLM: AWS Bedrock (Anthropic Claude models)
- Streaming: WebSocket with React flushSync

## Architecture Rules

### Frontend
- **ONLY React frontend** - vanilla JS version removed (static/, templates/)
- Use WebSocket for streaming summaries (not EventSource/SSE)
- Always use `flushSync()` for immediate renders when streaming
- API calls go to `http://localhost:5000/api` or `/api` (proxied)
- WebSocket connects to `ws://localhost:5000/api`

### Backend
- FastAPI runs on port 5000
- WebSocket endpoint: `/api/transcript/{channel}/{filename}/summarize/ws`
- SSE endpoint still exists but WebSocket is preferred
- CORS only allows `http://localhost:3000`
- Never skip hooks or add `--no-verify` flags

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
  main.py              # FastAPI app
  llm_client.py        # LLM abstraction
  transcript_metadata.py  # Metadata management
frontend/src/
  App.js              # Main app logic
  components/         # React components
  hooks/              # Custom hooks
channel_data/         # Downloaded transcripts
logs/                 # Application logs
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
5. Optional: Run `node test_websocket.js` for CLI test

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
3. Run `node test_websocket.js` to test endpoint directly
4. Verify `flushSync()` is wrapping state updates
5. Check Network tab → WS for message flow

### Updating Dependencies
- Backend: `pip install -r requirements.txt` + `pip install -r backend/requirements.txt`
- Frontend: `cd frontend && npm install`

## Environment

### Ports
- 5000: Backend API
- 3000: React frontend

### Configuration Files
- `channels_config.json` - Channel monitoring config (gitignored, contains AWS keys)
- `transcript_metadata.json` - Transcript metadata database
- `.env` - Environment variables (gitignored)

### Logs
- `logs/backend.log` - Backend application logs (rotated, 50MB limit)
- `logs/uvicorn.log` - uvicorn access logs
- Browser console - Frontend streaming logs

## LLM Configuration

### Supported Providers
- AWS Bedrock (primary) - True async streaming
- OpenAI - Simulated streaming
- Anthropic - Direct API

### Bedrock Streaming
- Uses `aioboto3` for async operations
- Converse Stream API for unified model interface
- Chunks arrive every ~50ms
- Backend logs show event timing

## Documentation

### User-Facing
- `README.md` - Overview and quick start
- `docs/` - Detailed guides (gitignored)

### Technical
- `STREAMING_DEBUG_ANALYSIS.md` - Root cause analysis
- `WEBSOCKET_IMPLEMENTATION.md` - Technical details
- `IMPLEMENTATION_SUMMARY.md` - User-friendly summary

### Testing
- `test_websocket.js` - WebSocket CLI test script
- `test_bedrock_streaming.py` - Backend streaming test

## Git Practices

### Committing
- Only commit when explicitly asked
- Include Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
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
4. Test with `node test_websocket.js`

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

- Is this a vanilla JS change? (Don't - it's removed)
- Does this need streaming? (Use WebSocket + flushSync)
- Is this destructive? (Ask user first)
- Should this be committed? (Only if user asked)
- Will this work with React 18 batching? (Use flushSync)

## Project Status

**Version:** 2.0.0  
**Status:** Production Ready ✅  
**Last Major Change:** WebSocket streaming implementation (2026-04-24)  
**Active Development:** Streaming improvements, UX enhancements
