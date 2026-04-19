# YouTube Toolkit

A comprehensive Python toolkit for monitoring YouTube channels, downloading video subtitles, and extracting clean video transcripts.

## Features

### 🔍 Channel Monitoring
- Monitor multiple YouTube channels automatically
- Filter videos from the last N days (default: 7 days)
- Organize output by channel in separate folders
- Create annotated transcripts with metadata

### 📺 Video Listing
- List all videos from any YouTube channel
- Support for multiple channel URL formats (@handle, /channel/, /c/, /user/)
- Get video titles, publication dates, URLs, and descriptions

### 📥 Subtitle Downloading
- Download subtitles from any YouTube video
- Support for multiple languages
- Both manual and auto-generated subtitles
- Multiple formats (SRT, VTT, JSON3)

### 📄 Text Conversion
- Convert SRT subtitles to clean, readable text
- Smart paragraph detection based on timing
- Remove overlapping and duplicate content
- Perfect for video scripts, interviews, and monologues

## Installation

### Prerequisites
- Python 3.8+
- YouTube Data API key (for channel listing)

### Setup

1. Clone the repository:
```bash
cd /home/ia52897/git-code
git clone <your-repo-url> youtube-video-lister
cd youtube-video-lister
```

2. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure API key:
```bash
cp .env.example .env
# Edit .env and add your YouTube API key
```

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Copy the API key to your `.env` file

## Quick Start

### Monitor Channels (Recommended)

The easiest way to use this toolkit is with the channel monitor:

```bash
# Monitor a single channel
python monitor_channels.py
```

Edit `monitor_channels.py` to add your channels:

```python
channels = [
    "https://www.youtube.com/@TechWithTim",
    "https://www.youtube.com/@yourchannel",
]
```

Or use a configuration file:

```bash
# Create config from example
cp channels_config.example.json channels_config.json

# Edit channels_config.json to add your channels
# Then run:
python monitor_with_config.py
```

**Output Structure:**
```
channel_data/
├── ChannelName1/
│   ├── subtitles/
│   │   └── video_title.en.srt
│   └── transcripts/
│       └── 2026-04-19_Video_Title.md
├── ChannelName2/
│   ├── subtitles/
│   └── transcripts/
└── processing_summary.txt
```

### Individual Tools

**List Channel Videos:**
```bash
python src/youtube_toolkit/channel_lister.py "https://www.youtube.com/@channelname" 10
```

**Download Subtitles:**
```bash
# List available subtitles
python src/youtube_toolkit/downloader.py "VIDEO_URL" --list

# Download English subtitles
python src/youtube_toolkit/downloader.py "VIDEO_URL" en

# Download multiple languages
python src/youtube_toolkit/downloader.py "VIDEO_URL" en,es,fr
```

**Convert to Text:**
```bash
# Convert single file
python src/youtube_toolkit/converter.py "subtitles/video.en.srt"

# Convert entire directory
python src/youtube_toolkit/converter.py "subtitles/" "transcripts/"

# Try to detect speakers (for interviews)
python src/youtube_toolkit/converter.py "subtitles/video.en.srt" --speakers
```

## Python API Usage

```python
from youtube_toolkit import ChannelMonitor

# Initialize monitor
monitor = ChannelMonitor(output_base_dir="channel_data")

# Process a single channel
result = monitor.process_channel(
    channel_url="https://www.youtube.com/@channelname",
    days_back=7,
    languages=['en']
)

# Process multiple channels
channels = [
    "https://www.youtube.com/@channel1",
    "https://www.youtube.com/@channel2",
]
results = monitor.process_multiple_channels(channels, days_back=7)

# Generate summary report
summary = monitor.generate_summary_report(results)
print(summary)
```

### Individual Components

```python
from youtube_toolkit import YouTubeChannelLister, SubtitleDownloader, SubtitleToText

# List videos
lister = YouTubeChannelLister()
videos = lister.get_channel_videos("https://www.youtube.com/@channelname")

# Download subtitles
downloader = SubtitleDownloader(output_dir="subtitles")
result = downloader.download_subtitles("VIDEO_ID", languages=['en'])

# Convert to text
converter = SubtitleToText()
text = converter.convert_file("subtitles/video.en.srt", "output.txt")
```

## Configuration

### channels_config.json

```json
{
  "channels": [
    "https://www.youtube.com/@TechWithTim",
    "https://www.youtube.com/@channelname2"
  ],
  "settings": {
    "days_back": 7,
    "languages": ["en"],
    "output_directory": "channel_data"
  }
}
```

### Environment Variables (.env)

```bash
YOUTUBE_API_KEY=your_api_key_here
```

## Output Format

### Annotated Transcript (.md)

Each transcript is saved as a Markdown file with metadata:

```markdown
# Video Title

**Video URL:** https://www.youtube.com/watch?v=VIDEO_ID
**Video ID:** VIDEO_ID
**Published:** 2026-04-19 12:36:24
**Channel:** Channel Name

---

## Transcript

[Clean, readable transcript text with proper paragraphs...]

---

*Generated by YouTube Toolkit on 2026-04-19 17:03:42*
```

## Use Cases

1. **Content Research**: Monitor competitor or inspiration channels
2. **Content Repurposing**: Extract transcripts for blog posts or articles
3. **SEO Analysis**: Analyze video content and keywords
4. **Accessibility**: Create text versions of video content
5. **Translation**: Extract transcripts for translation workflows
6. **Archive**: Build a searchable archive of video content

## Project Structure

```
youtube-video-lister/
├── src/
│   └── youtube_toolkit/
│       ├── __init__.py
│       ├── channel_lister.py    # List channel videos
│       ├── downloader.py         # Download subtitles
│       ├── converter.py          # Convert to text
│       ├── monitor.py            # Monitor channels
│       └── cli.py                # CLI commands
├── tests/
│   ├── test_channel_lister.py
│   ├── test_downloader.py
│   └── test_converter.py
├── examples/
│   └── example_workflow.py
├── channel_data/                 # Output directory
├── monitor_channels.py           # Main monitoring script
├── monitor_with_config.py        # Config-based monitoring
├── channels_config.example.json  # Config template
├── requirements.txt
├── setup.py
├── pyproject.toml
└── README.md
```

## Automation

### Scheduled Monitoring with Cron

Monitor channels daily:

```bash
# Edit crontab
crontab -e

# Add line to run daily at 9 AM
0 9 * * * cd /home/ia52897/git-code/youtube-video-lister && source venv/bin/activate && python monitor_with_config.py
```

## Troubleshooting

### JavaScript Runtime Warning
If you see warnings about JavaScript runtime, install Node.js or ignore them (functionality still works).

### No Subtitles Available
Some videos don't have subtitles. The tool will skip these and continue with other videos.

### API Quota Limits
YouTube Data API has daily quotas. Each video listing request costs units. Monitor your usage in Google Cloud Console.

### Rate Limiting
If processing many videos, consider adding delays between requests to avoid rate limits.

## Contributing

Contributions welcome! Areas for improvement:
- Better speaker detection for interviews
- Support for more subtitle formats
- Parallel processing for faster downloads
- Better error handling and retry logic

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with [yt-dlp](https://github.com/yt-dlp/yt-dlp) for subtitle downloading
- Uses YouTube Data API v3 for channel data
- Inspired by the need for automated content monitoring

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review example scripts in `examples/`
3. Open an issue on GitHub

---

**Made with ❤️ for content creators and researchers**
