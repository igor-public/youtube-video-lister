# API Documentation

YouTube Toolkit Express Server REST API

## Base URL

```
http://localhost:5000
```

## Endpoints

### Health Check

**GET** `/health`

Check server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-20T10:00:00.000Z",
  "uptime": 123.45
}
```

---

### Configuration

#### Get Configuration

**GET** `/api/config`

Retrieve current configuration.

**Response:**
```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@channelname",
      "days_back": 14,
      "languages": ["en"]
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  }
}
```

#### Update Configuration

**POST** `/api/config`

Update entire configuration.

**Request Body:**
```json
{
  "channels": [...],
  "settings": {...}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

---

### Channel Management

#### Get Channel Tree

**GET** `/api/tree`

Get hierarchical structure of channels and transcripts.

**Response:**
```json
[
  {
    "channel": "ChannelName",
    "transcript_count": 15,
    "transcripts": [
      {
        "filename": "2026-04-20_Video_Title.md",
        "title": "Video Title",
        "date": "2026-04-20",
        "size": 1024,
        "path": "/full/path/to/transcript.md"
      }
    ]
  }
]
```

#### Add Channel

**POST** `/api/channels`

Add a new channel to configuration.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/@channelname",
  "days_back": 7,
  "languages": ["en", "es"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Channel added successfully",
  "channel": {
    "url": "https://www.youtube.com/@channelname",
    "days_back": 7,
    "languages": ["en", "es"]
  }
}
```

#### Update Channel

**PUT** `/api/channels/:index`

Update channel at specified index.

**Parameters:**
- `index` (integer) - Channel index in configuration array

**Request Body:**
```json
{
  "url": "https://www.youtube.com/@channelname",
  "days_back": 14,
  "languages": ["en"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Channel updated successfully"
}
```

#### Delete Channel

**DELETE** `/api/channels/:index`

Delete channel at specified index.

**Parameters:**
- `index` (integer) - Channel index in configuration array

**Response:**
```json
{
  "success": true,
  "message": "Channel deleted successfully",
  "deleted": {
    "url": "https://www.youtube.com/@channelname",
    "days_back": 7,
    "languages": ["en"]
  }
}
```

---

### Transcripts

#### Get Transcript

**GET** `/api/transcript/:channel/:filename`

Retrieve transcript content.

**Parameters:**
- `channel` (string) - Channel name (URL encoded)
- `filename` (string) - Transcript filename (URL encoded)

**Example:**
```
GET /api/transcript/ChannelName/2026-04-20_Video_Title.md
```

**Response:**
```json
{
  "content": "# Video Title\n\n**Video URL:** ...\n\n## Transcript\n\n...",
  "filename": "2026-04-20_Video_Title.md",
  "channel": "ChannelName",
  "size": 1024
}
```

**Error Responses:**
- `403 Forbidden` - Path traversal attempt blocked
- `404 Not Found` - Transcript not found

---

### Monitoring

#### Start Monitoring

**POST** `/api/monitor/start`

Start monitoring process for all configured channels.

**Response:**
```json
{
  "success": true,
  "message": "Monitoring started",
  "channels": 3
}
```

**Error Responses:**
- `400 Bad Request` - Monitoring already in progress or no channels configured

#### Get Monitoring Status

**GET** `/api/monitor/status`

Get current monitoring status.

**Response:**
```json
{
  "running": true,
  "progress": "Processing channel 2/3: @ChannelName",
  "results": null,
  "error": null,
  "lastRun": "2026-04-20T10:00:00.000Z",
  "timestamp": "2026-04-20T10:05:00.000Z"
}
```

**Status Fields:**
- `running` (boolean) - Whether monitoring is currently running
- `progress` (string) - Current progress message
- `results` (array|null) - Monitoring results when complete
- `error` (string|null) - Error message if failed
- `lastRun` (string|null) - ISO timestamp of last completed run
- `timestamp` (string) - Current server timestamp

---

### Statistics

#### Get Statistics

**GET** `/api/stats`

Get aggregate statistics.

**Response:**
```json
{
  "total_channels": 5,
  "total_transcripts": 82,
  "total_size_bytes": 1048576,
  "total_size_kb": 1024.0,
  "total_size_mb": 1.0
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**404 Not Found:**
```json
{
  "error": "Not found",
  "path": "/requested/path"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Error details (development mode only)"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production use.

## Authentication

Currently no authentication required. Add authentication for production deployment.

## CORS

CORS is enabled for all origins. Configure appropriately for production.

---

## Examples

### Using curl

**Get configuration:**
```bash
curl http://localhost:5000/api/config
```

**Add channel:**
```bash
curl -X POST http://localhost:5000/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/@channelname",
    "days_back": 14,
    "languages": ["en"]
  }'
```

**Start monitoring:**
```bash
curl -X POST http://localhost:5000/api/monitor/start
```

**Get transcript:**
```bash
curl "http://localhost:5000/api/transcript/ChannelName/2026-04-20_Video_Title.md"
```

### Using JavaScript fetch

```javascript
// Get statistics
const stats = await fetch('http://localhost:5000/api/stats')
  .then(res => res.json());

// Add channel
const response = await fetch('http://localhost:5000/api/channels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.youtube.com/@channelname',
    days_back: 7,
    languages: ['en']
  })
});

// Start monitoring
await fetch('http://localhost:5000/api/monitor/start', {
  method: 'POST'
});
```

---

## WebSocket Support

Not currently implemented. Consider adding for real-time monitoring updates.

## Versioning

API version: 1.0 (no versioning in URL currently)

Consider implementing versioned endpoints: `/api/v1/...`
