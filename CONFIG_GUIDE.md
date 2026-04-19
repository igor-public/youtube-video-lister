# Configuration Guide

## Channel Configuration Formats

The toolkit supports two configuration formats for maximum flexibility:

### Format 1: Simple (Backward Compatible)

```json
{
  "channels": [
    "https://www.youtube.com/@TechWithTim",
    "https://www.youtube.com/@channelname2"
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  }
}
```

**Use when:** All channels use the same settings.

---

### Format 2: Per-Channel Settings (Recommended)

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@CoinBureauTrading",
      "days_back": 30,
      "languages": ["en"]
    },
    {
      "url": "https://www.youtube.com/@DataDash",
      "days_back": 7,
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

**Use when:** Different channels need different lookback periods.

---

### Format 3: Mixed (Both Formats)

```json
{
  "channels": [
    "https://www.youtube.com/@SimpleChannel",
    {
      "url": "https://www.youtube.com/@AdvancedChannel",
      "days_back": 14,
      "languages": ["en", "es"]
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  }
}
```

**Use when:** Most channels use defaults, but some need custom settings.

---

## Configuration Options

### Per-Channel Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | **Required** | YouTube channel URL |
| `days_back` | integer | `default_days_back` | How many days to look back |
| `languages` | array | `default_languages` | Subtitle languages to download |

### Global Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default_days_back` | integer | 7 | Default lookback period |
| `default_languages` | array | `["en"]` | Default subtitle languages |
| `output_directory` | string | `"channel_data"` | Output base directory |

---

## Common Use Cases

### 1. Daily News Channels (Short Lookback)

```json
{
  "url": "https://www.youtube.com/@DailyNewsChannel",
  "days_back": 3,
  "languages": ["en"]
}
```

**Why:** News becomes outdated quickly. Check last 3 days only.

---

### 2. Weekly Content Creators

```json
{
  "url": "https://www.youtube.com/@WeeklyTechReview",
  "days_back": 7,
  "languages": ["en"]
}
```

**Why:** Weekly uploads mean 7 days captures all new content.

---

### 3. Monthly Deep Dives

```json
{
  "url": "https://www.youtube.com/@MonthlyAnalysis",
  "days_back": 30,
  "languages": ["en"]
}
```

**Why:** Infrequent but detailed content requires longer lookback.

---

### 4. Multi-Language Channels

```json
{
  "url": "https://www.youtube.com/@GlobalChannel",
  "days_back": 14,
  "languages": ["en", "es", "fr"]
}
```

**Why:** Download subtitles in multiple languages for translation.

---

### 5. High-Frequency Trading Analysis

```json
{
  "url": "https://www.youtube.com/@DayTrader",
  "days_back": 1,
  "languages": ["en"]
}
```

**Why:** Daily market updates need immediate processing.

---

## Real-World Example

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@CoinBureauTrading",
      "days_back": 30,
      "languages": ["en"],
      "note": "Monthly crypto market analysis"
    },
    {
      "url": "https://www.youtube.com/@DataDash",
      "days_back": 7,
      "languages": ["en"],
      "note": "Weekly crypto news"
    },
    {
      "url": "https://www.youtube.com/@CryptoDaily",
      "days_back": 2,
      "languages": ["en"],
      "note": "Daily market updates"
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "crypto_channels"
  }
}
```

**Result:**
- CoinBureauTrading: Checks last 30 days
- DataDash: Checks last 7 days
- CryptoDaily: Checks last 2 days

---

## Tips & Best Practices

### 1. Optimize Lookback Periods

**Too short:**
- May miss videos if you don't run frequently
- Risk: Missing content

**Too long:**
- Wastes API quota checking old videos
- Slower processing times

**Sweet spot:**
- Daily run: 2-3 days lookback
- Weekly run: 10-14 days lookback
- Monthly run: 45-60 days lookback

---

### 2. Language Selection

**Single language:**
```json
"languages": ["en"]
```

**Multiple languages:**
```json
"languages": ["en", "es", "fr"]
```

**Note:** More languages = more files per video.

---

### 3. Directory Organization

**By content type:**
```json
{
  "settings": {
    "output_directory": "crypto_channels"
  }
}
```

**By update frequency:**
```json
{
  "settings": {
    "output_directory": "daily_updates"
  }
}
```

---

## Migration Guide

### Upgrading from Simple to Per-Channel Format

**Old format:**
```json
{
  "channels": [
    "https://www.youtube.com/@channel1",
    "https://www.youtube.com/@channel2"
  ],
  "settings": {
    "days_back": 14,
    "languages": ["en"]
  }
}
```

**New format:**
```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@channel1",
      "days_back": 30
    },
    {
      "url": "https://www.youtube.com/@channel2",
      "days_back": 7
    }
  ],
  "settings": {
    "default_days_back": 14,
    "default_languages": ["en"]
  }
}
```

**Note:** Old format still works! No breaking changes.

---

## Validation

### Required Fields

Each channel **must** have:
- `url` (if using object format)

### Optional Fields

- `days_back` - Falls back to `default_days_back`
- `languages` - Falls back to `default_languages`

### Invalid Examples

❌ Missing URL:
```json
{
  "days_back": 7
}
```

❌ Invalid days_back:
```json
{
  "url": "...",
  "days_back": "seven"
}
```

✅ Valid:
```json
{
  "url": "...",
  "days_back": 7
}
```

---

## Testing Your Configuration

```bash
# Test with dry run (check config without processing)
python -c "
import json
with open('channels_config.json') as f:
    config = json.load(f)
    print(f'Channels: {len(config[\"channels\"])}')
    for ch in config['channels']:
        if isinstance(ch, dict):
            print(f'  - {ch[\"url\"]}: {ch.get(\"days_back\", \"default\")} days')
        else:
            print(f'  - {ch}: default days')
"
```

---

## Examples

See example configurations:
- `channels_config.example.json` - Basic example
- `channels_config_advanced.example.json` - Advanced with multiple channels

---

## Summary

✅ **Simple format:** Same settings for all channels  
✅ **Per-channel format:** Custom settings per channel  
✅ **Mixed format:** Combine both approaches  
✅ **Backward compatible:** Old configs still work  

Choose the format that best fits your monitoring needs!
