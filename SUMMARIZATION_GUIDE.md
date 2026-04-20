# AI Summarization Guide

## Overview

The YouTube Toolkit now includes AI-powered summarization of video transcripts with keyword-focused analysis. This feature uses Large Language Models (LLMs) to generate concise summaries that highlight specific topics of interest.

## Features

- **Multiple LLM Providers**: OpenAI, Anthropic Claude, and local models (Ollama)
- **Keyword Tracking**: Configure specific keywords per channel (e.g., BTC, ETH, market trend)
- **Focus Analysis**: Summaries highlight mentions of your configured keywords
- **Automatic Processing**: Batch summarize all transcripts for a channel
- **Smart Caching**: Skips already-summarized transcripts

## Quick Start

### 1. Configure LLM Provider

1. Click **"AI Summarization" → "Configure LLM"**
2. Select your provider:
   - **AWS Bedrock**: Requires AWS credentials (Recommended for Claude)
   - **OpenAI**: Requires OpenAI API key
   - **Anthropic**: Requires Anthropic API key (direct)
   - **Local**: Requires Ollama running locally
3. Enter your credentials:
   - **Bedrock**: AWS Access Key ID, Secret Access Key, Region
   - **Others**: API Key
4. Optionally specify a model (or use default)
5. Click **"Save Configuration"**

### 2. Configure Keywords for Channel

1. Go to **"Configuration"** section
2. Find your channel
3. Click **"Keywords"** button
4. Enter keywords (one per line):
   ```
   BTC
   ETH
   market trend
   inflation
   Federal Reserve
   ```
5. Click **"Save Keywords"**

### 3. Generate Summaries

1. Click the **"Summarize"** button next to the channel
2. Confirm the action (note: this will use your API quota)
3. Monitor progress in the AI Summarization section
4. Summaries are saved in `channel_data/[Channel]/summaries/`

## Supported LLM Providers

### AWS Bedrock (Recommended for Claude)

**Models:**
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (Recommended - Claude 3.5 Sonnet)
- `anthropic.claude-3-opus-20240229-v1:0` (Most capable)
- `anthropic.claude-3-sonnet-20240229-v1:0` (Balanced)
- `anthropic.claude-3-haiku-20240307-v1:0` (Fastest)

**AWS Credentials:**
Requires AWS IAM credentials with Bedrock access:
1. Go to AWS IAM Console
2. Create or use existing IAM user
3. Attach policy: `AmazonBedrockFullAccess`
4. Generate access key

**Configuration:**
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "...",
  "awsRegion": "us-east-1"
}
```

**Pricing:** ~$0.003-0.015 per transcript (same as Anthropic direct)

**Benefits:**
- Use AWS infrastructure
- Integrated with AWS services
- Enterprise-grade security
- Pay through AWS billing
- No separate API key management

### OpenAI

**Models:**
- `gpt-4-turbo-preview` (Recommended)
- `gpt-4`
- `gpt-3.5-turbo` (Faster, cheaper)

**API Key:**
Get from https://platform.openai.com/api-keys

**Configuration:**
```json
{
  "provider": "openai",
  "model": "gpt-4-turbo-preview",
  "apiKey": "sk-..."
}
```

**Pricing:** ~$0.01-0.03 per transcript (depending on length and model)

### Anthropic Claude

**Models:**
- `claude-3-5-sonnet-20241022` (Recommended)
- `claude-3-opus-20240229` (Most capable)
- `claude-3-sonnet-20240229` (Balanced)
- `claude-3-haiku-20240307` (Fastest)

**API Key:**
Get from https://console.anthropic.com/

**Configuration:**
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "apiKey": "sk-ant-..."
}
```

**Pricing:** ~$0.003-0.015 per transcript

### Local (Ollama)

**Models:**
- `llama2`
- `mistral`
- `codellama`

**Setup:**
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start Ollama (runs on localhost:11434)
ollama serve
```

**Configuration:**
```json
{
  "provider": "local",
  "model": "llama2",
  "apiKey": "not-required"
}
```

**Pricing:** Free (runs on your hardware)

## Keyword Configuration

### What Are Keywords?

Keywords are specific topics, terms, or concepts you want the AI to focus on when summarizing. When you configure keywords, the AI will:

1. Look for mentions of these keywords in the transcript
2. Highlight what was said about them
3. Include keyword-specific sections in the summary

### Examples

**Crypto Channel:**
```
BTC
Bitcoin
ETH
Ethereum
altcoins
DeFi
Web3
NFT
```

**Finance Channel:**
```
Federal Reserve
Fed policy
interest rates
inflation
CPI
GDP
unemployment
stock market
```

**Tech Channel:**
```
AI
machine learning
LLM
GPT
Claude
OpenAI
Anthropic
```

**Health Channel:**
```
vaccine
clinical trial
FDA
treatment
symptoms
diagnosis
```

### Best Practices

1. **Be Specific**: Use exact terms as they appear in videos
2. **Include Variations**: Add both "BTC" and "Bitcoin"
3. **5-15 Keywords**: Don't overload (diminishing returns)
4. **Update Regularly**: Adjust based on channel content changes

## Summary Format

Generated summaries include:

```markdown
# Video Title

**Original Video:** [URL]
**Published:** [Date]
**Summary Generated:** [Timestamp]
**LLM Provider:** openai
**Model:** gpt-4-turbo-preview
**Focus Keywords:** BTC, ETH, market trend

---

## Summary
[2-3 paragraph overview of the video content]

## Key Points
- [Main point 1]
- [Main point 2]
- [Main point 3]

## Keyword Mentions
**BTC**: [What was said about Bitcoin]
**ETH**: [What was said about Ethereum]

## Quotes
[Notable quotes from the video]

---

*Generated by YouTube Toolkit using openai/gpt-4-turbo-preview*
*Tokens used: 1234*
```

## File Organization

```
channel_data/
├── ChannelName/
│   ├── transcripts/
│   │   ├── 2026-04-20_Video_Title.md
│   │   └── 2026-04-19_Another_Video.md
│   └── summaries/
│       ├── 2026-04-20_Video_Title_summary.md
│       └── 2026-04-19_Another_Video_summary.md
```

## Cost Estimation

### Per Transcript

| Provider | Model | Average Cost |
|----------|-------|--------------|
| OpenAI | GPT-4 Turbo | $0.01 - $0.03 |
| OpenAI | GPT-3.5 Turbo | $0.001 - $0.003 |
| Anthropic | Claude 3.5 Sonnet | $0.003 - $0.015 |
| Anthropic | Claude 3 Haiku | $0.001 - $0.003 |
| Local | Llama2 | Free |

### For 100 Transcripts

| Provider | Estimated Cost |
|----------|----------------|
| GPT-4 Turbo | $1 - $3 |
| GPT-3.5 Turbo | $0.10 - $0.30 |
| Claude 3.5 Sonnet | $0.30 - $1.50 |
| Claude 3 Haiku | $0.10 - $0.30 |
| Local LLM | Free |

## API Configuration

### Environment Variables

```bash
# Optional: Set LLM provider via environment
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview
LLM_API_KEY=sk-...

# For local LLM
LOCAL_LLM_HOST=localhost
LOCAL_LLM_PORT=11434
```

### Configuration File

Stored in `channels_config.json`:

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@channel",
      "days_back": 14,
      "languages": ["en"],
      "keywords": ["BTC", "ETH", "DeFi"]
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "apiKey": "sk-..."
  }
}
```

## Workflow Examples

### Daily Crypto News Summary

1. Add crypto news channels
2. Configure keywords: `BTC, ETH, market trend, regulation`
3. Run monitoring daily
4. Run summarization daily
5. Read summaries to catch up on news

### Weekly Market Analysis

1. Add financial analysis channels
2. Configure keywords: `inflation, Fed, interest rates, recession`
3. Monitor weekly
4. Summarize all new transcripts
5. Review keyword mentions section

### Research & Learning

1. Add educational channels
2. Configure keywords based on research topic
3. Monitor for new content
4. Summarize to extract key insights
5. Use summaries as research notes

## API Endpoints

### Get LLM Configuration

```bash
GET /api/llm/config
```

Response:
```json
{
  "provider": "openai",
  "model": "gpt-4-turbo-preview",
  "hasApiKey": true
}
```

### Update LLM Configuration

```bash
POST /api/llm/config
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4-turbo-preview",
  "apiKey": "sk-..."
}
```

### Get Channel Keywords

```bash
GET /api/channels/0/keywords
```

Response:
```json
{
  "keywords": ["BTC", "ETH", "market trend"]
}
```

### Update Channel Keywords

```bash
PUT /api/channels/0/keywords
Content-Type: application/json

{
  "keywords": ["BTC", "ETH", "DeFi"]
}
```

### Start Summarization

```bash
POST /api/channels/ChannelName/summarize
```

### Get Summarization Status

```bash
GET /api/summarize/status
```

Response:
```json
{
  "running": true,
  "progress": "Processing 5/10: video_title.md",
  "total": 10,
  "completed": 4,
  "error": null,
  "timestamp": "2026-04-20T10:00:00Z"
}
```

## Troubleshooting

### API Key Errors

**Error:** `LLM API key not configured`

**Solution:** Configure API key in LLM settings

### Rate Limiting

**Error:** `Rate limit exceeded`

**Solutions:**
- Use GPT-3.5 Turbo instead of GPT-4 (higher rate limits)
- Add delays between requests
- Upgrade API tier with provider

### Cost Control

**Strategies:**
1. Use GPT-3.5 Turbo or Claude Haiku for most summaries
2. Reserve GPT-4 or Claude Opus for important videos
3. Use local models when possible
4. Set up cost alerts in provider dashboard

### Quality Issues

**Problem:** Summaries missing keyword mentions

**Solutions:**
- Use more specific keywords
- Add keyword variations
- Try different models (GPT-4 vs Claude)
- Include context in keyword names

### Local LLM Not Working

**Problem:** Cannot connect to Ollama

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Verify model is pulled
ollama list
ollama pull llama2
```

## Security & Privacy

### API Key Storage

- API keys stored in `channels_config.json`
- Never transmitted to frontend (only `hasApiKey` boolean)
- Never logged or exposed in error messages

### Data Privacy

- Transcripts sent to LLM provider API
- No data stored by YouTube Toolkit beyond summaries
- Use local LLM for complete privacy

### Best Practices

1. **Use environment variables** for API keys in production
2. **Rotate API keys** regularly
3. **Monitor API usage** in provider dashboard
4. **Use local LLM** for sensitive content
5. **Review provider terms** for data retention policies

## Future Enhancements

Planned features:
- [ ] Batch summarization with progress bar
- [ ] Custom prompt templates
- [ ] Summary comparison (different models)
- [ ] Multi-video synthesis summaries
- [ ] Automatic keyword extraction
- [ ] Scheduled summarization
- [ ] Email/Slack notifications with summaries
- [ ] RAG (Retrieval-Augmented Generation) for queries

---

**Need Help?** See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details or [README.md](README.md) for general usage.
