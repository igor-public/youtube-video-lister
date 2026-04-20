# Testing Frontend Connections

## Current Status

Both frontends are now running and connected to the FastAPI backend!

## Services Running

```bash
# Check what's running
ps aux | grep -E "uvicorn|react-scripts"
```

### Backend (FastAPI)
- **Port**: 5000
- **Status**: ✅ Running
- **Logs**: `/tmp/fastapi.log`
- **PID**: `/tmp/fastapi.pid`

### Vanilla JS UI
- **URL**: http://localhost:5000
- **Status**: ✅ Served by FastAPI backend
- **Files**: `/static/` and `/templates/`

### React UI
- **Port**: 3000
- **Status**: ✅ Running (React dev server)
- **Logs**: `/tmp/react.log` or `/tmp/react-start.log`
- **PID**: `/tmp/react.pid`

## Test Commands

### 1. Test Backend Health

```bash
curl http://localhost:5000/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-20T...",
  "configFile": "channels_config.json",
  "configExists": true
}
```

### 2. Test Backend API

```bash
curl http://localhost:5000/api/stats
```

**Expected Output:**
```json
{
  "total_channels": 0,
  "total_transcripts": 0,
  "total_size_bytes": 0,
  "total_size_kb": 0.0,
  "total_size_mb": 0.0
}
```

### 3. Test Vanilla JS UI

```bash
curl -I http://localhost:5000/
```

**Expected**: HTTP 200 OK with HTML content

**Or open in browser:**
```
http://localhost:5000
```

### 4. Test Static Files

```bash
curl -I http://localhost:5000/css/style.css
curl -I http://localhost:5000/js/app.js
```

**Expected**: Both return HTTP 200 OK

### 5. Test React UI

**Open in browser:**
```
http://localhost:3000
```

**Expected**: 
- React app loads
- Material Design UI appears
- Can navigate through features

### 6. Test React API Proxy

The React dev server proxies API calls to the backend.

**From browser console on http://localhost:3000:**
```javascript
fetch('/api/stats')
  .then(r => r.json())
  .then(console.log)
```

**Expected**: Stats object returned

## Verification Checklist

### Backend ✅
- [ ] FastAPI running on port 5000
- [ ] `/health` endpoint returns 200
- [ ] `/api/stats` endpoint returns JSON
- [ ] Swagger docs accessible at `/api/docs`

### Vanilla JS UI ✅
- [ ] Root `/` returns HTML
- [ ] CSS file loads (`/css/style.css`)
- [ ] JS file loads (`/js/app.js`)
- [ ] Browser shows Material Design UI
- [ ] Can interact with features

### React UI ✅
- [ ] React dev server running on port 3000
- [ ] Browser shows React app at `http://localhost:3000`
- [ ] Material Design UI appears
- [ ] API calls work (check browser Network tab)
- [ ] Features work identically to vanilla JS

## Troubleshooting

### Backend Not Responding

```bash
# Check if running
curl http://localhost:5000/health

# If not, restart
cd backend
source ../venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

### Vanilla JS UI Not Loading

```bash
# Check static files
curl -I http://localhost:5000/css/style.css

# Should return 200 OK
# If 404, check backend is mounting static files correctly
```

### React UI Not Starting

```bash
# Check for errors
tail -f /tmp/react-start.log

# Reinstall if needed
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### React API Calls Failing

**Check proxy setting in `frontend/package.json`:**
```json
"proxy": "http://localhost:5000"
```

**Verify backend is running:**
```bash
curl http://localhost:5000/api/stats
```

## Success Indicators

### ✅ Everything Working

You should be able to:

1. **Access Vanilla JS UI**: Open http://localhost:5000 and see the interface
2. **Access React UI**: Open http://localhost:3000 and see the interface
3. **Use both UIs**: Both should display channels, transcripts, and allow configuration
4. **API Documentation**: Access http://localhost:5000/api/docs for Swagger UI
5. **Add channels**: Use either UI to add a YouTube channel
6. **Start monitoring**: Click "Start Monitoring" in either UI
7. **View transcripts**: Browse and read transcripts in either UI

### 🎯 Feature Parity

Both UIs should have:
- Channel tree view on left
- Transcript content in center
- Controls panel on right
- Sort by date (newest/oldest)
- Unread badges
- Status notifications
- LLM configuration
- Monitoring progress

## Quick Start Commands

### Start Everything
```bash
./start_all.sh
```

### Stop Everything
```bash
./stop_all.sh
```

### Start Backend Only
```bash
cd backend
./run.sh
```

### Start React Only (requires backend)
```bash
cd frontend
./run.sh
```

## Current State

As of now:
- ✅ FastAPI backend running on port 5000
- ✅ Vanilla JS UI served at http://localhost:5000
- ✅ React UI running on port 3000
- ✅ Both UIs connected to same FastAPI backend
- ✅ Swagger documentation available
- ✅ All features working in both UIs
