# YouTube Toolkit - Usage Guide

## Quick Start Guide

### 1. Initial Setup (One-time)

```bash
# Navigate to project
cd /home/ia52897/git-code/youtube-video-lister

# Activate virtual environment
source venv/bin/activate

# Verify installation
python -c "from youtube_toolkit import ChannelMonitor; print('✓ Installation verified')"
```

### 2. Configure Your Channels

**Option A: Edit Python Script (Simple)**

Edit `monitor_channels.py`:
```python
channels = [
    "https://www.youtube.com/@TechWithTim",
    "https://www.youtube.com/@yourfavoritechannel",
]
```

**Option B: Use JSON Config (Recommended)**

```bash
# Create config file
cp channels_config.example.json channels_config.json

# Edit channels_config.json
nano channels_config.json
```

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

### 3. Run the Monitor

```bash
# Using Python script
python monitor_channels.py

# Using config file
python monitor_with_config.py

# With custom config
python monitor_with_config.py my_channels.json
```

### 4. View Results

```bash
# Check the output structure
ls -R channel_data/

# Read a transcript
cat channel_data/ChannelName/transcripts/2026-04-19_Video_Title.md

# View processing summary
cat channel_data/processing_summary.txt
```

## Common Workflows

### Workflow 1: Daily Content Monitoring

Monitor channels once per day for new content:

```bash
#!/bin/bash
# daily_monitor.sh

cd /home/ia52897/git-code/youtube-video-lister
source venv/bin/activate
python monitor_with_config.py
```

Make it executable and add to cron:
```bash
chmod +x daily_monitor.sh

# Run daily at 9 AM
crontab -e
# Add: 0 9 * * * /home/ia52897/git-code/youtube-video-lister/daily_monitor.sh
```

### Workflow 2: Research Specific Video

```bash
# 1. Get video URL
VIDEO_URL="https://www.youtube.com/watch?v=VIDEO_ID"

# 2. Download subtitle
python src/youtube_toolkit/downloader.py "$VIDEO_URL" en

# 3. Convert to text
python src/youtube_toolkit/converter.py "subtitles/video_title.en.srt"

# 4. View transcript
cat "subtitles/video_title.en.txt"
```

### Workflow 3: Bulk Analysis

```python
# bulk_analysis.py
from youtube_toolkit import ChannelMonitor

channels = [
    "https://www.youtube.com/@channel1",
    "https://www.youtube.com/@channel2",
    "https://www.youtube.com/@channel3",
    # ... add 50+ channels
]

monitor = ChannelMonitor(output_base_dir="bulk_data")
results = monitor.process_multiple_channels(
    channels,
    days_back=30,  # Last 30 days
    languages=['en']
)

# Analyze results
for result in results:
    print(f"{result['channel_name']}: {result['videos_processed']} videos")
```

### Workflow 4: Export for Analysis

```python
# export_transcripts.py
import os
import json
from pathlib import Path

# Collect all transcripts
transcripts = []
for root, dirs, files in os.walk("channel_data"):
    for file in files:
        if file.endswith(".md"):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                transcripts.append({
                    'file': file,
                    'path': path,
                    'content': content
                })

# Export to JSON
with open('transcripts_export.json', 'w') as f:
    json.dump(transcripts, f, indent=2)

print(f"Exported {len(transcripts)} transcripts")
```

## Advanced Usage

### Custom Processing Pipeline

```python
from youtube_toolkit import ChannelMonitor

class CustomMonitor(ChannelMonitor):
    def create_annotated_transcript(self, video, transcript_text, output_path):
        # Add custom processing
        word_count = len(transcript_text.split())
        
        # Custom annotation format
        annotation = f"""# {video['title']}

## Metadata
- URL: {video['url']}
- Published: {video['published_date']}
- Word Count: {word_count}
- Estimated Reading Time: {word_count // 200} minutes

## Keywords
{self.extract_keywords(transcript_text)}

## Transcript
{transcript_text}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(annotation)
    
    def extract_keywords(self, text):
        # Simple keyword extraction
        words = text.lower().split()
        # Add your keyword logic
        return "AI, coding, tutorial"  # Example

# Use custom monitor
monitor = CustomMonitor()
result = monitor.process_channel("https://www.youtube.com/@channel")
```

### Filter Videos by Keywords

```python
from youtube_toolkit import YouTubeChannelLister

lister = YouTubeChannelLister()
videos = lister.get_channel_videos("https://www.youtube.com/@channel")

# Filter by keywords in title
keywords = ['python', 'tutorial', 'beginner']
filtered = [
    v for v in videos 
    if any(kw.lower() in v['title'].lower() for kw in keywords)
]

print(f"Found {len(filtered)} videos matching keywords")
```

### Process Specific Date Range

```python
from datetime import datetime
from youtube_toolkit import ChannelMonitor

monitor = ChannelMonitor()

# Get videos
videos = monitor.lister.get_channel_videos("https://www.youtube.com/@channel")

# Filter by date range
start_date = datetime(2026, 4, 1)
end_date = datetime(2026, 4, 19)

date_filtered = [
    v for v in videos
    if start_date <= datetime.strptime(v['published_at'], '%Y-%m-%dT%H:%M:%SZ') <= end_date
]

print(f"Videos in date range: {len(date_filtered)}")
```

## Tips & Best Practices

### 1. API Quota Management

YouTube Data API has daily quotas. Monitor usage:

```python
# Track API calls
api_calls = 0

def track_api_call(func):
    def wrapper(*args, **kwargs):
        global api_calls
        api_calls += 1
        return func(*args, **kwargs)
    return wrapper

# Apply to your functions
```

### 2. Error Handling

```python
from youtube_toolkit import ChannelMonitor

monitor = ChannelMonitor()

try:
    result = monitor.process_channel(
        "https://www.youtube.com/@channel",
        days_back=7
    )
    
    if result['errors']:
        print(f"Processed with {len(result['errors'])} errors")
        for error in result['errors']:
            print(f"  - {error['video']}: {error['error']}")
            
except Exception as e:
    print(f"Fatal error: {e}")
```

### 3. Incremental Processing

Track processed videos to avoid re-processing:

```python
import json
from pathlib import Path

processed_file = Path("processed_videos.json")

# Load processed videos
if processed_file.exists():
    with open(processed_file, 'r') as f:
        processed = set(json.load(f))
else:
    processed = set()

# Process only new videos
for video in videos:
    if video['video_id'] not in processed:
        # Process video
        process_video(video)
        processed.add(video['video_id'])

# Save updated list
with open(processed_file, 'w') as f:
    json.dump(list(processed), f)
```

### 4. Organize by Topic

```python
import os
from youtube_toolkit import ChannelMonitor

# Create topic-based structure
topics = {
    'python': ['@python_channel1', '@python_channel2'],
    'web_dev': ['@webdev_channel1', '@webdev_channel2'],
    'ai': ['@ai_channel1', '@ai_channel2']
}

for topic, channels in topics.items():
    monitor = ChannelMonitor(output_base_dir=f"topics/{topic}")
    
    channel_urls = [f"https://www.youtube.com/{ch}" for ch in channels]
    results = monitor.process_multiple_channels(channel_urls)
    
    print(f"Topic '{topic}': {sum(r['videos_processed'] for r in results)} videos")
```

## Troubleshooting

### Issue: "No subtitles available"
**Solution**: Not all videos have subtitles. The tool skips these automatically.

### Issue: API quota exceeded
**Solution**: 
- Wait 24 hours for quota reset
- Reduce `max_results` in video fetching
- Process fewer channels per day

### Issue: Download timeouts
**Solution**:
```python
# Add timeout handling
import time

for video in videos:
    try:
        download_subtitle(video)
    except TimeoutError:
        time.sleep(60)  # Wait 1 minute
        download_subtitle(video)  # Retry
```

### Issue: Character encoding errors
**Solution**: Already handled with `encoding='utf-8'` in all file operations.

## Performance Optimization

```python
# Process channels in parallel
from concurrent.futures import ThreadPoolExecutor

def process_channel_wrapper(channel_url):
    monitor = ChannelMonitor()
    return monitor.process_channel(channel_url)

channels = ["url1", "url2", "url3"]

with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(process_channel_wrapper, channels))
```

## Next Steps

1. **Analyze Transcripts**: Use NLP libraries to extract insights
2. **Build Database**: Store transcripts in SQLite/PostgreSQL
3. **Create Dashboard**: Visualize channel activity
4. **Set Up Alerts**: Get notified of new videos matching keywords
5. **Export Reports**: Generate weekly/monthly content reports

## Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- Project repository: [Add your repo URL]

---

For more help, see README.md or open an issue on GitHub.
