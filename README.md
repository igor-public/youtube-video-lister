# YouTube Toolkit - Video Transcript Manager

A comprehensive tool for monitoring YouTube channels, downloading transcripts, and generating AI-powered summaries with keyword focusing.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   cd frontend && npm install
   ```

2. **Start Backend**
   ```bash
   source venv/bin/activate
   cd backend
   python -m uvicorn main:app --host 127.0.0.1 --port 5000
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

4. **Access UI**
   - React UI: http://localhost:3000
   - Vanilla JS UI: http://localhost:5000

## ✨ Features

- ✅ **Multi-Channel Monitoring** - Track multiple YouTube channels
- ✅ **Automatic Transcript Download** - Fetch subtitles and convert to markdown
- ✅ **Keyword Filtering** - Focus on specific topics per channel
- ✅ **AI Summaries** - Generate summaries with LLM (OpenAI, Anthropic, AWS Bedrock)
- ✅ **Real-time Streaming** - Watch summaries generate word-by-word
- ✅ **Split-View UI** - View transcript and summary side-by-side
- ✅ **Read/Unread Tracking** - Track which transcripts you've reviewed
- ✅ **Dual Frontend** - Choose React or Vanilla JS UI
- ✅ **Resizable Panels** - Drag-to-resize sidebar and controls

## 📚 Documentation

### Guides

**Getting Started:**
- [Quick Reference](docs/guides/QUICK_REFERENCE.md) - Essential commands and workflows
- [Usage Guide](docs/guides/USAGE_GUIDE.md) - Complete usage instructions
- [Configuration Guide](docs/guides/CONFIG_GUIDE.md) - Configure channels and settings

**User Interface:**
- [Web UI Guide](docs/guides/WEB_UI_GUIDE.md) - React UI features and usage
- [Dual Frontend Guide](docs/guides/DUAL_FRONTEND_GUIDE.md) - Comparing React vs Vanilla JS

**AI & LLM:**
- [AWS Bedrock Models](docs/guides/AWS_BEDROCK_MODELS.md) - Available Bedrock models
- [Bedrock On-Demand Models](docs/guides/BEDROCK_ON_DEMAND_MODELS.md) - Models supporting on-demand throughput
- [Bedrock OpenAI Models](docs/guides/BEDROCK_OPENAI_MODELS.md) - Using OpenAI models via Bedrock
- [Bedrock Setup](docs/guides/BEDROCK_SETUP.md) - AWS Bedrock configuration
- [Summarization Guide](docs/guides/SUMMARIZATION_GUIDE.md) - AI summary features

**Technical:**
- [Architecture](docs/guides/ARCHITECTURE.md) - System design and component interactions
- [API Documentation](docs/guides/API_DOCUMENTATION.md) - REST API reference
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md) - Common issues and solutions
- [Security](docs/guides/SECURITY.md) - Security best practices
- [Test Connections](docs/guides/TEST_CONNECTIONS.md) - Testing setup
- [Migration Guide](docs/guides/MIGRATION_GUIDE.md) - Upgrading from older versions
- [Optimization Guide](docs/guides/OPTIMIZATION_GUIDE.md) - Performance tuning

### Change Logs & Features

**Recent Updates:**
- [True Streaming Implementation](docs/changes/TRUE_STREAMING_IMPLEMENTATION.md) - Real-time Bedrock streaming
- [Streaming Summary](docs/changes/STREAMING_SUMMARY.md) - Word-by-word summary generation
- [Summary Feature](docs/changes/SUMMARY_FEATURE.md) - AI summarization setup guide
- [LLM Config Persistence](docs/changes/LLM_CONFIG_PERSISTENCE.md) - Configuration saving fixes

**Development:**
- [Vanilla JS Sync](docs/changes/VANILLA_JS_SYNC.md) - Feature parity tracking between UIs
- [Project Summary](docs/changes/PROJECT_SUMMARY.md) - Project overview
- [Setup Complete](docs/changes/SETUP_COMPLETE.md) - Initial setup documentation
- [Git Security Complete](docs/changes/GIT_SECURITY_COMPLETE.md) - Security hardening
- [Node.js Setup](docs/changes/NODEJS_SETUP.md) - Node.js configuration
- [Install FFmpeg](docs/changes/INSTALL_FFMPEG.md) - FFmpeg installation

## 🔧 Technology Stack

**Backend:**
- FastAPI - REST API framework
- Python 3.12 - Runtime
- yt-dlp - YouTube download
- Pydantic - Data validation
- boto3 - AWS Bedrock integration

**Frontend:**
- React 18 - UI framework
- Vanilla JavaScript - Alternative UI
- Material Design - UI styling
- EventSource - Server-sent events for streaming

**Storage:**
- JSON files - Configuration and metadata
- Markdown files - Transcript storage
- File system - Organized by channel

**AI/LLM:**
- AWS Bedrock - Primary LLM provider
- Anthropic Claude - AI models
- OpenAI GPT - Alternative models
- Real-time streaming - Native Bedrock streaming

## 📁 Project Structure

```
youtube-video-lister/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── llm_client.py        # LLM provider abstraction
│   └── transcript_metadata.py # Metadata management
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   └── hooks/           # Custom hooks
│   └── public/
├── static/                  # Vanilla JS UI
│   ├── css/
│   └── js/
├── templates/               # HTML templates
├── channel_data/            # Downloaded transcripts
├── docs/
│   ├── guides/             # User guides
│   └── changes/            # Change logs
├── channels_config.json    # Channel configuration
├── transcript_metadata.json # Transcript metadata database
└── README.md               # This file
```

## 🎯 Typical Workflow

1. **Add Channels** - Configure YouTube channels to monitor
2. **Set Keywords** - Define topics of interest per channel
3. **Run Monitoring** - Download transcripts for recent videos
4. **Add Keywords** - Set keywords for individual transcripts
5. **Generate Summaries** - Use AI to summarize transcripts
6. **Review** - Read transcripts and summaries in split view

## 🔑 Configuration

### Channels (`channels_config.json`)

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@ChannelName",
      "days_back": 7,
      "languages": ["en"],
      "keywords": ["topic1", "topic2"]
    }
  ],
  "llm": {
    "provider": "bedrock",
    "model": "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "...",
    "awsRegion": "eu-central-1"
  }
}
```

### Metadata (`transcript_metadata.json`)

Automatically managed. Stores:
- Keywords per transcript
- AI-generated summaries
- Timestamps
- Model information

## 🤖 AI Summarization

**Supported Providers:**
- AWS Bedrock (Anthropic Claude)
- AWS Bedrock (OpenAI GPT)
- Direct Anthropic API
- Direct OpenAI API

**Features:**
- Real-time streaming (word-by-word generation)
- Keyword-focused summaries
- Automatic bullet points (when no keywords)
- Split-view display
- Persistent storage

**Streaming Support:**
- ✅ Anthropic models: True Bedrock streaming
- ⚠️ OpenAI models: Character-by-character simulation

## 🛠️ Development

### Backend Development
```bash
source venv/bin/activate
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 5000
```

### Frontend Development
```bash
cd frontend
npm start  # React dev server on port 3000
```

### API Documentation
- Swagger UI: http://localhost:5000/api/docs
- ReDoc: http://localhost:5000/api/redoc

## 📊 API Endpoints

**Channels:**
- `GET /api/config` - Get configuration
- `POST /api/channels` - Add channel
- `PUT /api/channels/{index}` - Update channel
- `DELETE /api/channels/{index}` - Delete channel

**Transcripts:**
- `GET /api/tree` - Get channel tree
- `GET /api/transcript/{channel}/{filename}` - Get transcript
- `GET /api/stats` - Get statistics

**AI/LLM:**
- `GET /api/transcript/{channel}/{filename}/summarize/stream` - Stream summary generation
- `POST /api/transcript/{channel}/{filename}/summarize` - Generate summary (non-streaming)
- `POST /api/metadata/transcript/{channel}/{filename}/keywords` - Save keywords

**Monitoring:**
- `POST /api/monitor/start` - Start monitoring
- `GET /api/monitor/status` - Get status

See [API Documentation](docs/guides/API_DOCUMENTATION.md) for complete reference.

## 🐛 Troubleshooting

**Common Issues:**

1. **LLM not configured** → Configure in UI: Right panel → "Configure LLM"
2. **Streaming not working** → Check Bedrock model supports streaming
3. **Transcripts not loading** → Check file paths in `channels_config.json`
4. **Backend not starting** → Verify virtual environment activated

See [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md) for detailed solutions.

## 📝 License

This project is private and not licensed for public use.

## 🤝 Contributing

This is a personal project. If you have suggestions or find issues, please document them.

## 📮 Support

For issues or questions:
1. Check [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
2. Review [Documentation](docs/guides/)
3. Check backend logs: `/tmp/uvicorn*.log`

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)

---

**Version**: 2.0.0  
**Last Updated**: 2026-04-21  
**Status**: Production Ready ✅
