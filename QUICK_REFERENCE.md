# Quick Reference - Node.js Server

## Quick Start

```bash
npm install          # Install dependencies
./start_server.sh    # Start server
```

Open: http://localhost:5000

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with auto-reload |
| `npm run prod` | Start in production mode |
| `./start_server.sh` | Start with checks |
| `node server.js` | Direct start |

## Environment Variables

```bash
PORT=5000                          # Server port
HOST=0.0.0.0                       # Server host
NODE_ENV=development               # Environment mode
CONFIG_FILE=channels_config.json   # Config file path
OUTPUT_DIR=channel_data            # Output directory
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/config` | Get configuration |
| POST | `/api/config` | Update configuration |
| GET | `/api/tree` | Get channel tree |
| GET | `/api/transcript/:channel/:filename` | Get transcript |
| POST | `/api/monitor/start` | Start monitoring |
| GET | `/api/monitor/status` | Get monitor status |
| POST | `/api/channels` | Add channel |
| PUT | `/api/channels/:index` | Update channel |
| DELETE | `/api/channels/:index` | Delete channel |
| GET | `/api/stats` | Get statistics |
