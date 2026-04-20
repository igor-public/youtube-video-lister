# Web UI Guide

## Overview

The YouTube Toolkit Web UI provides a visual interface for managing channels, monitoring videos, and viewing transcripts.

## Features

### 📁 Tree View
- Browse channels and transcripts in a hierarchical tree
- Click on any transcript to view its content
- See transcript counts and file sizes
- Expandable/collapsible channel folders

### ⚡ Monitor Channels
- Start monitoring with one click
- Real-time progress updates
- Automatic refresh after completion
- Background processing

### ⚙️ Configuration Management
- Add new channels with custom settings
- Edit existing channel configurations
- Delete channels
- Set per-channel lookback periods
- Configure subtitle languages

### 📊 Statistics Dashboard
- Total channels count
- Total transcripts count
- Total storage used

## Starting the Web UI

### Quick Start

```bash
./start_server.sh
```

Then open http://localhost:5000 in your browser.

### Manual Start

```bash
npm start
# or
node server.js
```

## Usage Guide

### 1. Adding a Channel

1. Click **"➕ Add Channel"** button
2. Enter the YouTube channel URL
3. Set **Days Back** (how many days to look back)
4. Set **Languages** (comma-separated, e.g., `en,es`)
5. Click **"Add Channel"**

**Example:**
```
URL: https://www.youtube.com/@CoinBureauTrading
Days Back: 30
Languages: en
```

### 2. Editing a Channel

1. Click the **✏️ Edit** button on any channel
2. Modify the settings
3. Click **"Save Changes"**

### 3. Deleting a Channel

1. Click the **🗑️ Delete** button on any channel
2. Confirm the deletion

### 4. Monitoring Channels

1. Configure your channels (if not already done)
2. Click **"▶️ Start Monitoring"**
3. Watch the progress in real-time
4. Wait for completion

**Note:** The monitor button will be disabled during processing.

### 5. Viewing Transcripts

1. Expand a channel in the tree view (left sidebar)
2. Click on any transcript
3. Read the content in the center panel

### 6. Sorting Transcripts

1. Click the **"📅 ↓ Newest"** button in the sidebar
2. Toggle between:
   - **📅 ↓ Newest** - Shows newest transcripts first (default)
   - **📅 ↑ Oldest** - Shows oldest transcripts first
3. Sort order persists across all channels
4. Button color changes to indicate sort mode:
   - Purple (📅 ↓ Newest) - Descending order
   - Green (📅 ↑ Oldest) - Ascending order

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        Header & Stats                       │
├─────────────┬──────────────────────┬─────────────────────────┤
│   Tree      │     Transcript       │      Controls          │
│   View      │     Content          │                        │
│             │                      │  • Monitor Button      │
│ 📁 Channel1 │  # Video Title       │  • Add Channel         │
│   📄 Vid 1  │                      │  • Channel List        │
│   📄 Vid 2  │  Transcript text...  │    - Edit/Delete       │
│ 📁 Channel2 │                      │                        │
│   📄 Vid 3  │                      │                        │
└─────────────┴──────────────────────┴─────────────────────────┘
```

## Configuration

The web UI uses the same `channels_config.json` as the CLI tools.

**Format:**
```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@ChannelName",
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

Changes made in the web UI are immediately saved to this file.

## API Endpoints

The web UI exposes a REST API:

### GET /api/config
Get current configuration

### POST /api/config
Update configuration

### GET /api/tree
Get channel tree structure

### GET /api/transcript/:channel/:filename
Get transcript content

### POST /api/monitor/start
Start monitoring process

### GET /api/monitor/status
Get monitoring status

### POST /api/channels
Add new channel

### PUT /api/channels/:index
Update channel

### DELETE /api/channels/:index
Delete channel

### GET /api/stats
Get statistics

## Common Workflows

### Daily Monitoring Workflow

1. Open web UI: http://localhost:5000
2. Check stats to see current state
3. Click "Start Monitoring"
4. Wait for completion
5. Browse new transcripts in tree view

### Adding Multiple Channels

1. Click "Add Channel" for first channel
2. Configure and save
3. Repeat for additional channels
4. Click "Start Monitoring" to process all

### Research Workflow

1. Add channel with large `days_back` (e.g., 90)
2. Start monitoring
3. Once complete, browse all transcripts
4. Click on any transcript to read
5. Content appears in center panel

## Tips & Tricks

### Optimize Days Back

- **Daily updates**: 2-3 days
- **Weekly updates**: 7-10 days
- **Monthly reviews**: 30-45 days
- **Research/archives**: 60-90 days

### Monitoring Best Practices

1. **Don't close browser** during monitoring
2. **Check progress** in status box
3. **Wait for "Completed"** message
4. **Refresh manually** if needed with 🔄 button

### Performance

- Monitor runs in background thread
- UI remains responsive during processing
- Progress updates every 2 seconds
- Auto-refresh after completion

## Troubleshooting

### Port Already in Use

**Error:** `Address already in use`

**Solution:** Change port when starting:
```bash
PORT=5001 node server.js
```

### Cannot Connect

**Problem:** Can't access http://localhost:5000

**Solutions:**
1. Check if server is running
2. Try http://127.0.0.1:5000
3. Check firewall settings

### Monitoring Stuck

**Problem:** Monitor status shows "running" but no progress

**Solutions:**
1. Check console output in terminal
2. Refresh browser
3. Restart web UI

### Config Not Saving

**Problem:** Changes don't persist

**Solutions:**
1. Check file permissions on channels_config.json
2. Verify JSON syntax
3. Check browser console for errors

## Keyboard Shortcuts

- `Ctrl+R` - Refresh page
- `Esc` - Close modal dialogs
- `Ctrl+C` - Stop server (in terminal)

## Security Notes

### Production Use

**⚠️ This UI is for local use only.**

For production deployment:

1. **Add authentication**
2. **Use HTTPS**
3. **Set debug=False**
4. **Use production WSGI server** (gunicorn, uwsgi)
5. **Add rate limiting**
6. **Validate all inputs**

### Access Control

Currently, the UI is accessible to anyone who can reach port 5000 on your machine.

**Restrict access:**
Edit server.js to bind to localhost only:
```javascript
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});
```

## Advanced Usage

### Custom Port

Start with custom port:
```bash
PORT=8080 node server.js
```

### Different Config File

Set environment variable:
```bash
export CONFIG_FILE="my_config.json"
node server.js
```

### Background Mode

Run in background:
```bash
nohup node server.js &
```

Check logs:
```bash
tail -f nohup.out
```

## Browser Compatibility

**Tested and supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features used:**
- Fetch API
- CSS Grid
- ES6 JavaScript
- Modern CSS

## Screenshots

### Dashboard View
```
📺 YouTube Toolkit
Channels: 3  Transcripts: 45  Size: 2.5 MB
```

### Tree View
```
📁 CoinBureauTrading (8)
  📄 2026-04-17_How_to_Use_Trendlines...
  📄 2026-04-14_Proof_That_BTC...
📁 DataDash (3)
  📄 2026-04-16_Bitcoin_Surprise...
```

### Monitor Progress
```
⚡ Monitor Channels
▶️ Start Monitoring

Status: Processing channel 2/3: @DataDash
```

## Future Enhancements

Planned features:
- [ ] Search functionality
- [ ] Filter by date range
- [ ] Export transcripts
- [ ] Batch operations
- [ ] Dark mode
- [ ] Scheduled monitoring
- [ ] Email notifications

---

**Need help?** See README.md or open an issue on GitHub.
