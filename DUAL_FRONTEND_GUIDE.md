# Dual Frontend Architecture Guide

## Overview

The YouTube Toolkit now supports **two independent frontends** that both connect to the same FastAPI backend:

1. **Vanilla JS UI** (Port 5000) - Classic HTML/CSS/JavaScript
2. **React UI** (Port 3000) - Modern React Single Page Application

Both frontends are **fully functional** and offer **identical features**.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Port 5000)              │
│  • REST API endpoints                                       │
│  • Swagger/OpenAPI documentation                            │
│  • Serves static files for Vanilla JS UI                   │
│  • CORS enabled for React UI                                │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                ┌─────────────┴──────────────┐
                │                            │
┌───────────────▼──────────┐  ┌──────────────▼──────────────┐
│   Vanilla JS Frontend    │  │      React Frontend         │
│   (http://localhost:5000)│  │  (http://localhost:3000)    │
│                          │  │                             │
│  • Served by FastAPI     │  │  • Separate dev server      │
│  • /static/css/          │  │  • /frontend/src/           │
│  • /static/js/           │  │  • npm start                │
│  • /templates/           │  │  • Hot reload enabled       │
└──────────────────────────┘  └─────────────────────────────┘
```

## Quick Comparison

| Aspect | Vanilla JS | React |
|--------|-----------|-------|
| **URL** | http://localhost:5000 | http://localhost:3000 |
| **Setup Time** | 0 seconds | ~30 seconds (npm install) |
| **Dependencies** | None | Node.js + npm packages |
| **Load Time** | < 100ms | ~2-3 seconds |
| **Hot Reload** | No (manual refresh) | Yes (automatic) |
| **Dev Tools** | Browser DevTools | React DevTools |
| **Component Architecture** | Global functions | React components |
| **State Management** | Global variables | React hooks |
| **Best For** | Production, quick access | Development, debugging |

## Starting Both UIs

### Easy Way: Start Everything

```bash
./start_all.sh
```

This starts:
- ✅ FastAPI backend on port 5000
- ✅ Vanilla JS UI on port 5000 (same as backend)
- ✅ React UI on port 3000

### Manual Way

**Terminal 1 - Backend:**
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 2 - React UI (optional):**
```bash
cd frontend
npm start
```

**Vanilla JS UI:** Automatically available at http://localhost:5000

## Features Available in Both UIs

### ✅ Identical Functionality

Both UIs support:

- 📁 **Channel Management**
  - Add/edit/delete channels
  - Configure days_back, languages, keywords
  - View channel metadata

- 📄 **Transcript Viewing**
  - Expandable tree view
  - Sort by date (newest/oldest)
  - Read transcripts in-browser
  - Unread badges

- ⚙️ **Configuration**
  - LLM provider setup (OpenAI, Anthropic, Bedrock)
  - API key management
  - Settings management

- 🔄 **Monitoring**
  - Start/stop monitoring
  - Real-time progress updates
  - Status notifications

- 📊 **Statistics**
  - Channel count
  - Transcript count
  - Total storage size

## API Endpoints Used by Both UIs

Both frontends make the same API calls to FastAPI:

```javascript
// Configuration
GET    /api/config
POST   /api/config

// Channel Tree
GET    /api/tree

// Transcripts
GET    /api/transcript/:channel/:filename

// Channel Management
POST   /api/channels
PUT    /api/channels/:index
DELETE /api/channels/:index
GET    /api/channels/:index/keywords
PUT    /api/channels/:index/keywords

// Monitoring
POST   /api/monitor/start
GET    /api/monitor/status

// LLM Configuration
GET    /api/llm/config
POST   /api/llm/config

// Statistics
GET    /api/stats
GET    /health
```

## Implementation Details

### Vanilla JS Frontend

**Location:** `/static/` and `/templates/`

**Files:**
```
static/
├── css/
│   └── style.css         # Material Design styles
└── js/
    └── app.js            # Main application logic

templates/
└── index.html            # Main HTML file
```

**How it works:**
1. FastAPI mounts `/static/` directory
2. Root endpoint (`/`) serves `templates/index.html`
3. HTML loads CSS/JS from `/css/` and `/js/`
4. JavaScript makes fetch() calls to `/api/*` endpoints

**API Calls:**
```javascript
// Example from static/js/app.js
async function loadConfig() {
    const response = await fetch('/api/config');
    const data = await response.json();
    return data;
}
```

### React Frontend

**Location:** `/frontend/`

**Structure:**
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/       # React components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── ContentPanel.js
│   │   └── ...
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── App.js
│   ├── index.js
│   └── index.css
└── package.json          # Dependencies
```

**How it works:**
1. React dev server runs on port 3000
2. `package.json` has `"proxy": "http://localhost:5000"`
3. API calls to `/api/*` are proxied to backend
4. Components use hooks for state management

**API Calls:**
```javascript
// Example from frontend/src/App.js
const loadConfig = async () => {
    const response = await fetch('/api/config');
    const data = await response.json();
    setConfig(data);
};
```

## Backend Configuration

The FastAPI backend serves both UIs:

```python
# backend/main.py

# Mount static files for vanilla JS
app.mount("/css", StaticFiles(directory="../static/css"), name="css")
app.mount("/js", StaticFiles(directory="../static/js"), name="js")

# Serve vanilla JS UI at root
@app.get("/")
async def root():
    return FileResponse("../templates/index.html")

# CORS for React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Development Workflow

### Working on Backend

Changes to backend affect **both UIs** immediately:

```bash
cd backend
# Edit main.py
# FastAPI hot reloads automatically with --reload flag
```

Both frontends will see the changes instantly.

### Working on Vanilla JS

Changes to vanilla JS require manual refresh:

```bash
# Edit static/js/app.js or static/css/style.css
# Refresh browser at http://localhost:5000
```

### Working on React

Changes to React hot reload automatically:

```bash
cd frontend
# Edit src/components/Sidebar.js
# Browser auto-refreshes at http://localhost:3000
```

## Testing Both UIs

### Health Check

**Vanilla JS:**
```bash
curl http://localhost:5000/health
```

**React (proxied):**
```bash
curl http://localhost:3000/api/health
# Gets proxied to http://localhost:5000/api/health
```

### API Documentation

Access Swagger UI (works with both frontends):
```
http://localhost:5000/api/docs
```

### Browser DevTools

**Vanilla JS:**
- Network tab shows direct calls to `/api/*`
- No component hierarchy

**React:**
- Network tab shows calls to `/api/*` (proxied)
- React DevTools shows component tree
- Can inspect hooks and state

## Troubleshooting

### Vanilla JS UI Not Loading

**Problem:** HTML loads but no styles

**Solution:**
```bash
# Check static files are mounted
curl -I http://localhost:5000/css/style.css
# Should return 200 OK

# Check backend logs
tail -f /tmp/fastapi.log
```

**Problem:** API calls fail (404)

**Solution:**
```bash
# Verify backend is running
curl http://localhost:5000/health

# Check CORS in browser console
# Should not see CORS errors for same-origin requests
```

### React UI Not Loading

**Problem:** "Proxy error" in console

**Solution:**
```bash
# Ensure backend is running first
curl http://localhost:5000/health

# Check proxy setting in package.json
grep proxy frontend/package.json
# Should show: "proxy": "http://localhost:5000"
```

**Problem:** npm start fails

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Port Conflicts

**Problem:** Port 5000 or 3000 already in use

**Solution:**
```bash
# Kill processes on ports
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Or use stop script
./stop_all.sh
```

## Which UI Should I Use?

### Use Vanilla JS When:

- ✅ You want instant access (no npm install)
- ✅ You're deploying to production
- ✅ You don't need hot reload
- ✅ You prefer simple HTML/CSS/JS
- ✅ You want minimal dependencies

### Use React When:

- ✅ You're actively developing features
- ✅ You want hot reload for faster iteration
- ✅ You prefer component-based architecture
- ✅ You use React DevTools
- ✅ You're adding complex state management

### Use Both When:

- ✅ Testing cross-browser compatibility
- ✅ Comparing performance
- ✅ Ensuring API works with different clients
- ✅ Demonstrating dual frontend support

## Deployment

### Production Deployment

For production, serve **only** the vanilla JS UI:

```bash
# Start only backend (serves vanilla UI)
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```

Access at: http://your-domain:5000

### Build React for Production

To deploy React UI separately:

```bash
cd frontend
npm run build
# Serve the build/ directory with nginx
```

## Summary

✅ **Two frontends, one backend**
✅ **Identical features in both UIs**
✅ **Vanilla JS: Zero setup, instant access**
✅ **React: Modern dev experience, hot reload**
✅ **FastAPI: Single source of truth**
✅ **Swagger docs: Interactive API testing**

Choose the UI that fits your workflow!
