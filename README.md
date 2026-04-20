# YouTube Toolkit

A modern web application for monitoring YouTube channels, downloading transcripts, and generating AI-powered summaries.

## Architecture

This project uses a **separated backend-frontend architecture**:

- **Backend**: FastAPI (Python) REST API
- **Frontend**: React (JavaScript) Single Page Application

```
youtube-video-lister/
├── backend/           # FastAPI backend
│   ├── main.py       # API server
│   ├── requirements.txt
│   └── run.sh        # Startup script
├── frontend/         # React frontend
│   ├── src/          # React components
│   ├── public/       # Static assets
│   ├── package.json
│   └── run.sh        # Startup script
├── venv/             # Python virtual environment
└── channels_config.json  # Configuration
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+ (only for React UI)
- ffmpeg (for video processing)

### Option 1: Start Everything at Once (Recommended)

```bash
# Create virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies (first time only)
pip install -r requirements.txt
cd backend && pip install -r requirements.txt && cd ..

# Start all services
./start_all.sh
```

This will start:
- **FastAPI Backend**: http://localhost:5000
- **Vanilla JS UI**: http://localhost:5000 (served by backend)
- **React UI**: http://localhost:3000
- **API Docs**: http://localhost:5000/api/docs

To stop everything:
```bash
./stop_all.sh
```

### Option 2: Start Services Individually

**1. Install Backend Dependencies**

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt
cd backend
pip install -r requirements.txt
cd ..
```

**2. Start Backend Server**

```bash
cd backend
./run.sh
# Or manually:
# uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

The backend will start at **http://localhost:5000**

API Documentation available at:
- Swagger UI: **http://localhost:5000/api/docs**
- ReDoc: **http://localhost:5000/api/redoc**

**3. Use Vanilla JS UI (No Extra Setup)**

Simply open **http://localhost:5000** in your browser.

The vanilla JS UI is served directly by the FastAPI backend.

**4. OR Use React UI (New Terminal)**

```bash
# Install frontend dependencies (first time only)
cd frontend
npm install

# Start React dev server
./run.sh
# Or manually:
# npm start
```

The React UI will start at **http://localhost:3000**

## Choose Your Frontend

Both frontends connect to the same FastAPI backend and offer identical functionality:

| Feature | Vanilla JS (Port 5000) | React (Port 3000) |
|---------|------------------------|-------------------|
| Setup | ✅ None (pre-installed) | npm install required |
| Dependencies | ✅ Zero | Node.js + React |
| Load Time | ✅ Instant | ~2-3 seconds |
| Hot Reload | ❌ Manual refresh | ✅ Automatic |
| Modern UI | ✅ Material Design | ✅ Material Design |
| Features | ✅ All features | ✅ All features |
| API Calls | ✅ Same backend | ✅ Same backend |

**Recommendation**: Use **Vanilla JS** for quick access, **React** for development.

## API Documentation

### Interactive API Docs (Swagger)

Visit **http://localhost:5000/api/docs** for full interactive API documentation with:
- ✅ Try-it-out feature for all endpoints
- ✅ Request/response schemas
- ✅ Authentication details
- ✅ Example payloads
- ✅ Response codes and error handling

### Main API Endpoints

#### Configuration
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration

#### Channels
- `GET /api/tree` - Get channel tree structure
- `POST /api/channels` - Add new channel
- `PUT /api/channels/{index}` - Update channel
- `DELETE /api/channels/{index}` - Delete channel
- `GET /api/channels/{index}/keywords` - Get channel keywords
- `PUT /api/channels/{index}/keywords` - Update keywords

#### Transcripts
- `GET /api/transcript/{channel}/{filename}` - Get transcript content

#### Monitoring
- `POST /api/monitor/start` - Start monitoring
- `GET /api/monitor/status` - Get monitoring status

#### LLM Configuration
- `GET /api/llm/config` - Get LLM config
- `POST /api/llm/config` - Update LLM config

#### Statistics
- `GET /api/stats` - Get system statistics
- `GET /health` - Health check

## Features

### Channel Management
- Add/edit/delete YouTube channels
- Configure monitoring settings per channel
- Set days to look back
- Specify subtitle languages
- Add filter keywords

### Transcript Monitoring
- Automatic transcript downloading
- Progress tracking
- Error handling
- Background processing

### AI Summarization
- Multi-provider LLM support:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - AWS Bedrock
  - Local models
- Keyword-focused summaries
- Batch processing

### UI Features
- Material Design interface
- Expandable channel tree
- Unread transcript badges
- Sort by date (newest/oldest)
- Real-time status notifications
- Responsive layout

## Configuration

### Channel Configuration

Edit `channels_config.json`:

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@ChannelName",
      "days_back": 14,
      "languages": ["en"],
      "keywords": ["AI", "machine learning"],
      "note": "Weekly review"
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "your-api-key"
  }
}
```

### LLM Configuration

Configure via UI or directly in `channels_config.json`:

**OpenAI:**
```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "sk-..."
  }
}
```

**Anthropic:**
```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-opus-20240229",
    "apiKey": "sk-ant-..."
  }
}
```

**AWS Bedrock:**
```json
{
  "llm": {
    "provider": "bedrock",
    "model": "anthropic.claude-opus-4-7",
    "awsAccessKeyId": "AKIA...",
    "awsSecretAccessKey": "...",
    "awsRegion": "us-east-1"
  }
}
```

## Development

### Backend Development

```bash
cd backend
# Install dev dependencies
pip install fastapi uvicorn[standard]

# Run with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

### Frontend Development

```bash
cd frontend
# The React dev server proxies API calls to localhost:5000
npm start
```

### Project Structure

**Backend:**
```
backend/
├── main.py           # FastAPI application
├── requirements.txt  # Python dependencies
└── run.sh           # Startup script
```

**Frontend:**
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/   # React components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── ContentPanel.js
│   │   ├── ControlsPanel.js
│   │   └── ...
│   ├── hooks/        # Custom hooks
│   │   └── useLocalStorage.js
│   ├── App.js        # Main app component
│   ├── index.js      # Entry point
│   └── index.css     # Styles
├── package.json
└── run.sh
```

## Deployment

### Production Build

**Backend:**
```bash
cd backend
pip install -r requirements.txt
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build/ directory with nginx or similar
```

### Environment Variables

```bash
export CONFIG_FILE=channels_config.json
export OUTPUT_DIR=channel_data
export PORT=5000
```

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (needs 3.8+)
- Activate venv: `source venv/bin/activate`
- Install dependencies: `pip install -r backend/requirements.txt`

### Frontend won't connect to backend
- Ensure backend is running on port 5000
- Check `proxy` setting in `frontend/package.json`
- Clear browser cache

### Transcripts not downloading
- Install ffmpeg: `sudo apt install ffmpeg` (Linux) or `brew install ffmpeg` (Mac)
- Check YouTube URL is valid
- Verify days_back setting

### API Documentation
- Swagger UI: http://localhost:5000/api/docs
- Try endpoints directly from the docs
- Check request/response formats

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both backend and frontend
5. Submit a pull request

## Support

- API Documentation: http://localhost:5000/api/docs
- GitHub Issues: [Report bugs or request features]
