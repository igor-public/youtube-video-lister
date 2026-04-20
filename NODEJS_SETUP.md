# Node.js Server Setup

The YouTube Toolkit uses an Express (Node.js) web server for the UI.

## Quick Start with Node.js

### 1. Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version  # Should be v18.x or higher
npm --version
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing
- `nodemon` - Development auto-reload (optional)

### 3. Start the Server

**Production:**
```bash
npm start
# or
./start_server.sh
```

**Development (with auto-reload):**
```bash
npm run dev
```

### 4. Access the UI

Open your browser to:
```
http://localhost:5000
```

## Server Details

### Port Configuration

Default port: `5000`

To change the port:
```bash
PORT=8080 node server.js
```

### File Structure

```
youtube-video-lister/
├── server.js              # Node.js/Express server
├── package.json          # Node.js dependencies
├── start_server.sh       # Server start script
├── static/               # Frontend files
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── templates/
│   └── index.html        # HTML template
└── channels_config.json  # Configuration (shared)
```

## API Endpoints

The Node.js server provides a RESTful API:

- `GET /` - Serve index.html
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration
- `GET /api/tree` - Get channel tree
- `GET /api/transcript/:channel/:filename` - Get transcript content
- `POST /api/monitor/start` - Start monitoring
- `GET /api/monitor/status` - Get monitoring status
- `POST /api/channels` - Add channel
- `PUT /api/channels/:index` - Update channel
- `DELETE /api/channels/:index` - Delete channel
- `GET /api/stats` - Get statistics

## Key Features

### Node.js Server Advantages

1. **Async/Await**: Modern asynchronous code
2. **Single Language**: JavaScript on both frontend and backend
3. **NPM Ecosystem**: Access to vast package ecosystem
4. **Performance**: V8 JavaScript engine optimization
5. **Easy Deployment**: Simple to deploy to Node.js hosting platforms

### Implementation Details

- **Express.js**: Minimalist web framework
- **CORS**: Enabled for API access
- **Static Files**: Served from `/static` directory
- **Python Integration**: Spawns Python processes for monitoring
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Path traversal prevention in file access

## Monitoring Process

The Node.js server spawns Python processes to run the monitoring:

```javascript
const pythonProcess = spawn('python', ['monitor_with_config.py']);
```

This allows the Node.js server to handle web requests while Python handles the YouTube API and transcript processing.

## Technical Details

| Feature | Value |
|---------|-------|
| Language | JavaScript (Node.js) |
| Framework | Express |
| Async Model | Native Async/Await |
| Start Command | `./start_server.sh` or `npm start` |
| Port | 5000 (configurable) |
| Dependencies | package.json |
| Install | `npm install` |

## Troubleshooting

### Node.js Not Found

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=8080 node server.js
```

### Dependencies Not Installed

```bash
npm install
```

### Python Not Found

The server needs Python for monitoring. Ensure Python is available:

```bash
python --version
# or
python3 --version
```

### Monitoring Not Working

Check that:
1. Python virtual environment is activated (if used)
2. Python dependencies are installed: `pip install -r requirements.txt`
3. `monitor_with_config.py` exists and is executable
4. `channels_config.json` has valid channel configurations

## Development

### Hot Reload

Use nodemon for development:

```bash
npm install -g nodemon
npm run dev
```

Changes to `server.js` will automatically reload the server.

### Debugging

Enable debug logging:

```javascript
// In server.js, add:
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
```

### Testing

Test the API endpoints:

```bash
# Get stats
curl http://localhost:5000/api/stats

# Get tree
curl http://localhost:5000/api/tree

# Get config
curl http://localhost:5000/api/config
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name youtube-toolkit

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
```

## Configuration Files

The server uses:
- Configuration file: `channels_config.json`
- Static files: `static/` (CSS, JavaScript)
- Templates: `templates/` (HTML)
- Data directory: `channel_data/`

## Support

For issues or questions:
- Check the main README.md
- Review server.js for implementation details
- Check console logs for error messages
