# AI Summary Feature - User Guide

## Overview

The YouTube Toolkit now includes AI-powered summarization with keyword focusing. You can add custom keywords to any transcript and generate summaries that emphasize those specific topics.

## Setup

### 1. Configure LLM Provider

Before using the summary feature, you must configure an LLM provider:

1. Open the React UI at http://localhost:3000
2. In the right panel, click **"Configure LLM"**
3. Choose your provider:
   - **OpenAI** (GPT-4, GPT-3.5-turbo)
   - **Anthropic** (Claude 3 Sonnet/Opus/Haiku)
   - **AWS Bedrock** (Claude via AWS)

4. Enter your API credentials:
   - OpenAI: API Key
   - Anthropic: API Key
   - Bedrock: AWS Access Key, Secret Key, Region

### 2. Installed Packages

The following Python packages are now installed:
- `anthropic` - For Claude API
- `openai` - For OpenAI API
- `boto3` - For AWS Bedrock

## How to Use

### Add Keywords to a Transcript

1. Navigate to a transcript in the left sidebar
2. Click the **"Keywords"** button
3. Enter comma-separated keywords (e.g., "bitcoin, regulation, SEC, market analysis")
4. Click **"Save Keywords"** or press Ctrl+Enter
5. The button updates to show: "Keywords (4)"

**Why add keywords?**
- Keywords focus the AI summary on specific topics
- Great for filtering relevant information from long videos
- Each transcript can have unique keywords

### Generate a Summary

1. Click the **"Summarize"** button next to a transcript
2. Wait for the AI to generate the summary (5-15 seconds)
3. The middle panel automatically splits into two sections:
   - **Top**: Original transcript (scrollable)
   - **Bottom**: AI summary (scrollable)

### Summary Formats

**With Keywords** (recommended):
- 3-4 paragraph narrative
- Focuses specifically on your keywords
- Example: If keywords are "regulation, SEC", the summary emphasizes regulatory discussion

**Without Keywords**:
- Brief 1-2 sentence overview
- Maximum 10 bullet points covering key topics
- Good for getting a quick overview

### View Existing Summaries

1. Transcripts with summaries show **"✓ Summary"** button
2. Click it to load the transcript and summary in split view
3. No API call needed - reads from local database

## Features

### Split-View Display

When a summary exists:
- **Top Section (60%)**: Original transcript
  - Full markdown formatting
  - Scrollable independently
  
- **Bottom Section (40%)**: AI Summary
  - Light gray background
  - Header shows: "AI Summary"
  - Keywords badge: "Focused on: bitcoin, regulation, SEC"
  - Scrollable independently

### Persistent Storage

- Summaries stored in `transcript_metadata.json`
- Keywords stored with each transcript
- Summaries persist across sessions
- Metadata includes:
  - Summary text
  - Keywords used
  - Timestamp
  - LLM model used

## Cost Considerations

- Summary generation uses your LLM provider's API
- Approximate costs (as of 2026):
  - OpenAI GPT-4: ~$0.01-0.03 per summary
  - Anthropic Claude Sonnet: ~$0.003-0.015 per summary
  - AWS Bedrock: Similar to Anthropic pricing

**Tips to reduce costs:**
- Use keywords to focus summaries (more efficient)
- Generate summaries only for important transcripts
- Consider using cheaper models (GPT-3.5, Claude Haiku)

## Troubleshooting

### "LLM not configured" Error
- Click "Configure LLM" in right panel
- Enter valid API credentials
- Save configuration

### "Failed to generate summary: [provider] package not installed"
- Run: `pip install anthropic openai boto3`
- Restart backend

### Summary Not Showing
- Check that transcript is selected (highlighted in sidebar)
- Click "✓ Summary" button to reload
- Check browser console for errors

### Keywords Not Saving
- Ensure you clicked "Save Keywords" (not just closed modal)
- Check status bar for success message
- Refresh tree view if needed

## API Endpoints

For developers:

- `POST /api/transcript/{channel}/{filename}/summarize` - Generate summary
- `POST /api/metadata/transcript/{channel}/{filename}/keywords` - Save keywords
- `GET /api/metadata/transcript/{channel}/{filename}` - Get metadata

## Files Changed

- `backend/llm_client.py` - LLM provider abstraction
- `backend/main.py` - Summary API endpoints
- `frontend/src/components/ContentPanel.js` - Split view
- `frontend/src/components/Sidebar.js` - Keywords & summary buttons
- `frontend/src/components/KeywordsModal.js` - Keyword entry dialog
- `transcript_metadata.json` - Metadata storage

## Example Workflow

1. **Monitor crypto channels** with keywords: "bitcoin, regulation, ETF"
2. **Download transcripts** for past 7 days
3. **Add keywords** to relevant videos:
   - "Bitcoin ETF approval" → keywords: "ETF, SEC, approval"
   - "Market analysis" → keywords: "price, analysis, trend"
4. **Generate summaries** → Get focused insights
5. **Review split view** → Original + Summary side-by-side

## Privacy & Security

- API keys stored in `channels_config.json` (local file)
- Transcript content sent to your chosen LLM provider
- No data sent to third parties beyond your LLM provider
- Summaries stored locally in `transcript_metadata.json`

## Future Enhancements

Planned features:
- [ ] Bulk summarization (all transcripts in channel)
- [ ] Export summaries to PDF/Markdown
- [ ] Summary comparison across videos
- [ ] Automated keyword extraction (AI-powered)
- [ ] Custom prompt templates
- [ ] Summary quality ratings
