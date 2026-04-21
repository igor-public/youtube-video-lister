# Vanilla JS UI - Feature Sync Log

This document tracks features implemented in the React UI that need to be synced to the Vanilla JS UI when requested.

## Current Feature Parity (as of 2026-04-21)

Both UIs have the following features implemented:
- ✅ Real-time monitoring logs display
- ✅ Collapsible/expandable channel lists
- ✅ Resizable left sidebar (tree view)
- ✅ Resizable right panel (controls)
- ✅ Summary/Keywords buttons per channel
- ✅ Transcript loading with read/unread tracking
- ✅ Sort order toggle (newest/oldest)
- ✅ Channel management (add/edit/delete)
- ✅ LLM configuration
- ✅ Status bar notifications

## Future Features to Sync

Features added to React UI after 2026-04-21 will be listed here:

### 2026-04-21: Manual Keywords Entry & AI Summarization (PENDING SYNC)

**Backend Changes:**
- Created `backend/llm_client.py` - Unified LLM client supporting OpenAI, Anthropic, AWS Bedrock
- Added API endpoints:
  - `POST /api/transcript/{channel}/{filename}/summarize` - Generate summary focused on transcript keywords
  - `POST /api/transcript/{channel}/{filename}/extract-keywords` - Extract keywords using AI (deprecated, not used in UI)
  - `POST /api/metadata/transcript/{channel}/{filename}/keywords` - Save user-entered keywords
- Summary generation prioritizes transcript-specific keywords, falls back to channel keywords
- Metadata automatically stored in `transcript_metadata.json`

**Frontend Changes (React):**
- Created `KeywordsModal.js` component:
  - Modal dialog with textarea for comma-separated keywords
  - Shows transcript title
  - Pre-fills existing keywords for editing
  - Ctrl+Enter to save
  - Help text: "These keywords will be used to focus the AI summary"

- Sidebar.js:
  - Keywords button opens modal for manual entry (NOT AI extraction)
  - `handleOpenKeywordsModal()` - opens modal with existing keywords
  - `handleSaveKeywords()` - saves to metadata via API
  - `handleSummarize()` - checks for keywords, shows warning if none exist
  - Confirmation dialog shows keywords that will be focused on
  - Keywords button shows count: "Keywords (5)"
  - Summary button shows checkmark: "✓ Summary"
  - Status messages indicate keywords used for focus

**User Flow:**
1. User clicks "Keywords" on transcript → modal opens
2. User types keywords (comma-separated): "bitcoin, regulation, market analysis"
3. Clicks "Save Keywords" → stored in metadata
4. User clicks "Summarize" → confirmation shows keywords to focus on
5. AI generates summary emphasizing those specific keywords
6. Summary stored with "✓ Summary" badge

**Key Behavior:**
- Keywords are MANUALLY entered by user (not AI-extracted)
- Summary uses transcript's keywords (if set), else channel's keywords (fallback)
- Each transcript can have its own unique keywords
- Keywords guide the LLM to focus on relevant topics

**Dependencies:**
- `openai` package (for OpenAI provider)
- `anthropic` package (for Anthropic/Claude provider)
- `boto3` package (for AWS Bedrock provider)

---

### 2026-04-21: Split-View Summary Display (PENDING SYNC)

**Backend Changes:**
- Modified `llm_client.py` - all providers now support two summary modes:
  - **With keywords**: 3-4 paragraph narrative focused on specified keywords
  - **Without keywords**: Brief overview + max 10 bullet points covering key topics
- Summary format adapts based on whether transcript has keywords

**Frontend Changes (React):**
- Modified `ContentPanel.js`:
  - Added split-view layout when summary exists
  - Top section: Original transcript (scrollable, 60% height)
  - Bottom section: AI summary (scrollable, 40% height, light gray background)
  - Split-header shows "Transcript" and "AI Summary" titles
  - Keywords tag displays: "Focused on: bitcoin, regulation, SEC"
  - Non-split view when no summary exists (full height transcript)

- Modified `App.js`:
  - Added `summary` and `summaryKeywords` state
  - `loadTranscript()` now also loads metadata/summary if available
  - Added `loadSummary()` function to refresh summary data
  - Passes summary props to ContentPanel

- Modified `Sidebar.js`:
  - Click "✓ Summary" button on already-summarized transcript → loads split view
  - After generating new summary → automatically loads it in split view
  - Status message shows keywords used for focus

**CSS Changes:**
- Added `.split-view` - flex column container
- Added `.split-transcript` and `.split-summary` sections
- `.split-header` - section titles with keyword tag
- `.summary-view` - summary content area with styling
- `.summary-keywords-tag` - green badge showing focused keywords

**User Experience:**
1. Generate summary (with or without keywords)
2. Middle panel automatically splits:
   - **Top**: Original transcript (full scrollable)
   - **Bottom**: AI summary (scrollable, shows keywords if used)
3. Click "✓ Summary" again to reload/view existing summary
4. Switch to different transcript → summary clears
5. Come back → summary reloads automatically

**Summary Formats:**
- **With keywords**: "This video discusses [keyword] in depth. The main points about [keyword] include... Regarding [keyword], the speaker notes..."
- **No keywords**: "Overview: Brief 1-2 sentence summary. Key Points: • Point 1 • Point 2 • Point 3 ..."

---

*Note: Vanilla JS UI is frozen. Only update when explicitly requested.*
