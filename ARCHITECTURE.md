# YouTube Toolkit - System Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                    React Frontend (Port 3000)                      │      │
│  │                                                                     │      │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │      │
│  │  │   Header    │  │   Sidebar    │  │   ContentPanel          │  │      │
│  │  │   (Stats)   │  │   (Tree)     │  │   (Transcript View)     │  │      │
│  │  └─────────────┘  └──────────────┘  └─────────────────────────┘  │      │
│  │                                                                     │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │            ControlsPanel (Right Sidebar)                      │ │      │
│  │  │  ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐  │ │      │
│  │  │  │ MonitorSection │ │ConfigSection │ │   AISection      │  │ │      │
│  │  │  └────────────────┘ └──────────────┘ └──────────────────┘  │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │                                                                     │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │                    StatusBar                                  │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │                                                                     │      │
│  │  Components:                                                        │      │
│  │  • ResizeHandle - drag-to-resize panels                           │      │
│  │  • Modal dialogs (Add/Edit Channel, LLM Config)                   │      │
│  │  • useLocalStorage hook - read/unread tracking                    │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                   │                                           │
│                                   │ HTTP/REST (fetch API)                     │
│                                   ▼                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │              FastAPI Backend (Port 5000)                           │      │
│  │                                                                     │      │
│  │  REST API Endpoints:                                               │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │  Configuration Management                                     │ │      │
│  │  │  • GET  /api/config                                          │ │      │
│  │  │  • GET  /api/channels/{index}                               │ │      │
│  │  │  • POST /api/channels                                        │ │      │
│  │  │  • PUT  /api/channels/{index}                               │ │      │
│  │  │  • DELETE /api/channels/{index}                             │ │      │
│  │  │  • GET  /api/llm                                            │ │      │
│  │  │  • PUT  /api/llm                                            │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │  Content Management                                          │ │      │
│  │  │  • GET /api/tree                                            │ │      │
│  │  │  • GET /api/transcript/{channel}/{filename}                │ │      │
│  │  │  • GET /api/stats                                           │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │  Monitoring & Processing                                     │ │      │
│  │  │  • POST /api/monitor                                        │ │      │
│  │  │  • GET  /api/monitor/status                                │ │      │
│  │  │  • GET  /api/monitor/lastrun                               │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │  ┌──────────────────────────────────────────────────────────────┐ │      │
│  │  │  Metadata Management (NEW)                                   │ │      │
│  │  │  • GET  /api/metadata/transcript/{channel}/{filename}      │ │      │
│  │  │  • POST /api/metadata/transcript/{channel}/{filename}/     │ │      │
│  │  │         keywords                                            │ │      │
│  │  │  • POST /api/metadata/transcript/{channel}/{filename}/     │ │      │
│  │  │         summary                                             │ │      │
│  │  │  • POST /api/metadata/initialize                           │ │      │
│  │  │  • GET  /api/metadata/all                                  │ │      │
│  │  └──────────────────────────────────────────────────────────────┘ │      │
│  │                                                                     │      │
│  │  Backend Modules:                                                  │      │
│  │  ┌────────────────────────────────────────────────────────────┐   │      │
│  │  │  transcript_metadata.py                                     │   │      │
│  │  │  • MetadataStore - JSON database manager                   │   │      │
│  │  │  • TranscriptMetadata - Pydantic model                     │   │      │
│  │  │    - keywords, summary, dates, file info                   │   │      │
│  │  └────────────────────────────────────────────────────────────┘   │      │
│  │                                                                     │      │
│  │  Process Management:                                                │      │
│  │  • subprocess.Popen() - real-time log streaming                   │      │
│  │  • Background tasks - async monitoring                            │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                   │                                           │
│                                   │ File I/O / Process spawn                  │
│                                   ▼                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Configuration Storage                         │        │
│  │                                                                   │        │
│  │  📄 channels_config.json                                         │        │
│  │     {                                                             │        │
│  │       "channels": [                                               │        │
│  │         {                                                         │        │
│  │           "url": "youtube.com/@channel",                         │        │
│  │           "days_back": 7,                                        │        │
│  │           "languages": ["en"],                                   │        │
│  │           "keywords": ["crypto", "bitcoin"]                      │        │
│  │         }                                                         │        │
│  │       ],                                                          │        │
│  │       "llm": {                                                    │        │
│  │         "provider": "anthropic",                                 │        │
│  │         "model": "claude-3-sonnet",                             │        │
│  │         "apiKey": "..."                                          │        │
│  │       }                                                           │        │
│  │     }                                                             │        │
│  └───────────────────────────────────────────────────────────────────┘        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Metadata Database (NEW)                       │        │
│  │                                                                   │        │
│  │  📄 transcript_metadata.json                                     │        │
│  │     {                                                             │        │
│  │       "CoinBureau:2026-04-12_Title.md": {                       │        │
│  │         "channel": "CoinBureau",                                │        │
│  │         "filename": "2026-04-12_Title.md",                      │        │
│  │         "title": "Video Title",                                 │        │
│  │         "date": "2026-04-12",                                   │        │
│  │         "keywords": ["crypto", "bitcoin", "trading"],          │        │
│  │         "keywords_extracted_at": "2026-04-21T14:00:00",        │        │
│  │         "summary": "AI-generated summary...",                   │        │
│  │         "summary_generated_at": "2026-04-21T14:05:00",         │        │
│  │         "summary_model": "claude-3-sonnet",                     │        │
│  │         "size_bytes": 15420                                     │        │
│  │       }                                                          │        │
│  │     }                                                             │        │
│  └───────────────────────────────────────────────────────────────────┘        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    File System Storage                           │        │
│  │                                                                   │        │
│  │  📁 channel_data/                                                │        │
│  │    ├── 📁 ChannelName1/                                         │        │
│  │    │   ├── 📁 transcripts/                                      │        │
│  │    │   │   ├── 📄 2026-04-12_Video_Title.md                    │        │
│  │    │   │   ├── 📄 2026-04-15_Another_Video.md                  │        │
│  │    │   │   └── ...                                              │        │
│  │    │   └── 📁 subtitles/                                        │        │
│  │    │       ├── 📄 video1.en.vtt                                │        │
│  │    │       └── ...                                              │        │
│  │    ├── 📁 ChannelName2/                                         │        │
│  │    │   └── ...                                                  │        │
│  │    └── 📄 processing_summary.txt                               │        │
│  └───────────────────────────────────────────────────────────────────┘        │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCESSING LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Python Worker Scripts                            │        │
│  │                                                                   │        │
│  │  📄 youtube_monitor.py                                           │        │
│  │     • Fetches YouTube channel videos                            │        │
│  │     • Downloads subtitles via yt-dlp                            │        │
│  │     • Converts to markdown transcripts                          │        │
│  │     • Applies keyword filtering                                 │        │
│  │     • Outputs real-time progress logs                           │        │
│  │     • Triggered by: POST /api/monitor                           │        │
│  │     • Runs as: subprocess.Popen() with stdout streaming         │        │
│  └───────────────────────────────────────────────────────────────────┘        │
│                                   │                                           │
│                                   │ Downloads via HTTP                        │
│                                   ▼                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────┐  ┌─────────────────────────────────────┐    │
│  │     YouTube API           │  │      LLM Providers                   │    │
│  │                           │  │                                       │    │
│  │  • Video metadata         │  │  • OpenAI (GPT-4, GPT-3.5)          │    │
│  │  • Subtitle tracks        │  │  • Anthropic (Claude)                │    │
│  │  • Channel information    │  │  • AWS Bedrock                       │    │
│  │                           │  │  • Local models                      │    │
│  │  Accessed via: yt-dlp     │  │                                       │    │
│  └───────────────────────────┘  │  Used for:                           │    │
│                                  │  • Transcript summarization          │    │
│                                  │  • Keyword extraction                │    │
│                                  └─────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Monitoring Flow (Download Transcripts)

```
User clicks "Start Monitoring"
         │
         ▼
  POST /api/monitor
         │
         ▼
  FastAPI spawns youtube_monitor.py
         │
         ▼
  youtube_monitor.py
    • Reads channels_config.json
    • For each channel:
      - Fetches video list (yt-dlp)
      - Downloads subtitles
      - Converts to markdown
      - Saves to channel_data/
    • Streams logs via stdout
         │
         ▼
  FastAPI captures stdout (Popen.readline)
    • Stores in monitoring_status["logs"]
         │
         ▼
  Frontend polls GET /api/monitor/status
    • Updates MonitoringLogs component
    • Displays real-time progress
         │
         ▼
  On completion:
    • Updates lastRun timestamp
    • Refreshes tree view
    • Initializes metadata for new transcripts
```

### 2. Metadata Flow (Keywords & Summaries)

```
User clicks "Keywords" button
         │
         ▼
  Extract keywords (TODO: implement LLM call)
         │
         ▼
  POST /api/metadata/transcript/{channel}/{filename}/keywords
    • Updates transcript_metadata.json
    • Sets keywords array
    • Sets keywords_extracted_at timestamp
         │
         ▼
  Frontend refreshes tree
    • Displays keyword count badge
    • Shows keywords in tooltip
         │
         ▼
User clicks "Summarize" button
         │
         ▼
  Generate summary (TODO: implement LLM call)
         │
         ▼
  POST /api/metadata/transcript/{channel}/{filename}/summary
    • Updates transcript_metadata.json
    • Sets summary text
    • Sets summary_generated_at timestamp
    • Sets summary_model name
         │
         ▼
  Frontend refreshes tree
    • Shows "✓ Summary" badge
    • Button changes to view mode
```

### 3. Transcript Viewing Flow

```
User clicks transcript in sidebar
         │
         ▼
  GET /api/transcript/{channel}/{filename}
    • Reads from channel_data/{channel}/transcripts/
    • Returns markdown content
         │
         ▼
  Frontend receives content
    • Renders in ContentPanel
    • Marks as read in localStorage
    • Updates unread badge count
         │
         ▼
  Optional: Load metadata
    • GET /api/metadata/transcript/{channel}/{filename}
    • Display keywords and summary if available
```

## Component Interactions

```
┌─────────────┐
│   Sidebar   │──┐
└─────────────┘  │
                  │ loadTranscript()
┌─────────────┐  │
│ContentPanel │◄─┘
└─────────────┘

┌─────────────┐
│ControlsPanel│
└─────────────┘
      │
      ├──────┐
      │      │
      ▼      ▼
┌──────────┐ ┌──────────┐
│ Monitor  │ │  Config  │
│ Section  │ │ Section  │
└──────────┘ └──────────┘

React State Flow:
    App.js (parent)
      │
      ├── stats
      ├── tree
      ├── config
      ├── selectedTranscript
      ├── transcriptContent
      ├── readTranscripts (localStorage)
      │
      └── Passes down as props + callbacks
```

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Functional components** with hooks (useState, useEffect, useRef, useMemo)
- **Fetch API** - HTTP requests
- **localStorage** - read/unread tracking
- **CSS3** - Material Design inspired styling
- **ResizeObserver** pattern - resizable panels

### Backend
- **FastAPI** - REST API framework
- **Uvicorn** - ASGI server
- **Pydantic** - data validation
- **Python 3.12** - runtime
- **subprocess** - process management
- **asyncio** - async operations

### Data Storage
- **JSON files** - configuration and metadata
- **Markdown files** - transcript storage
- **File system** - organized by channel

### External Tools
- **yt-dlp** - YouTube download
- **LLM APIs** - AI processing (future)

## Key Features

1. **Real-time Monitoring**
   - Live log streaming from Python subprocess
   - Progress updates every 50 lines
   - Non-blocking async operations

2. **Metadata System**
   - Centralized transcript metadata database
   - Keywords and summaries storage
   - Timestamps for tracking updates

3. **Resizable UI**
   - Drag-to-resize sidebar and controls panel
   - Min/max width constraints (180-600px)
   - Persistent during session

4. **Read/Unread Tracking**
   - localStorage persistence
   - Visual indicators (opacity, badges)
   - Per-user, per-browser

5. **Collapsible Navigation**
   - Expandable channel trees
   - Expandable config items
   - State management per item

## Future Enhancements

1. **LLM Integration**
   - Implement keyword extraction API call
   - Implement summarization API call
   - Support multiple LLM providers

2. **Search & Filter**
   - Full-text search across transcripts
   - Filter by keywords
   - Date range filters

3. **Export Features**
   - Export summaries
   - Bulk operations
   - PDF generation

4. **Database Migration**
   - Consider SQLite for better querying
   - Index optimization
   - Backup/restore functionality
