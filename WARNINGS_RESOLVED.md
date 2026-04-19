# Warning Messages - Resolution Guide

## Summary

All critical warnings have been resolved in v0.2.0. The toolkit now runs cleanly with minimal warnings.

## Resolved Warnings ✅

### 1. JavaScript Runtime Warning ✅ FIXED
**Warning:** `WARNING: [youtube] No supported JavaScript runtime could be found`

**Status:** ✅ **RESOLVED in v0.2.0**

**Solution:** Updated subtitle downloader to use Android player client, which doesn't require JavaScript runtime.

**What was changed:**
- Added `'extractor_args': {'youtube': {'player_client': ['android']}}` to yt-dlp options
- No manual installation needed
- Works automatically

**Result:** Warning eliminated, better reliability

---

### 2. ffmpeg Warning ✅ RESOLVED
**Warning:** `WARNING: ffmpeg not found`

**Status:** ✅ **RESOLVED** (requires manual installation)

**Solution:** Install ffmpeg system-wide
```bash
sudo apt update && sudo apt install -y ffmpeg
```

**Verification:**
```bash
ffmpeg -version
```

**Helper scripts provided:**
- `./install_ffmpeg.sh` - Automated installer
- `INSTALL_FFMPEG.md` - Detailed guide

---

### 3. Impersonation Warning ✅ RESOLVED
**Warning:** `WARNING: The extractor specified to use impersonation for this download, but no impersonate target is available`

**Status:** ✅ **RESOLVED**

**Solution:** Added curl-cffi to requirements
```bash
pip install curl-cffi
```

**What it does:**
- Enables browser impersonation
- Improves reliability for some videos
- Better handles rate limiting

**Already included:** curl-cffi is now in requirements.txt

---

## Informational Warnings (Non-Critical)

### 4. PO Token Warning ℹ️ INFORMATIONAL
**Warning:** `WARNING: android client https formats require a GVS PO Token`

**Status:** ℹ️ **INFORMATIONAL** - Does not affect subtitle downloads

**What it means:**
- Only affects video format downloads
- Subtitles work perfectly without it
- Can be safely ignored for this use case

**Why it appears:**
- YouTube occasionally requires special tokens for video formats
- Subtitle extraction uses different API endpoints
- No impact on transcript generation

**Action needed:** None - subtitles download successfully

---

## Current Status

### After All Fixes:
```
✅ JavaScript runtime: Fixed (Android client)
✅ ffmpeg: Resolved (install once)
✅ curl-cffi: Resolved (in requirements)
ℹ️  PO Token: Informational only (no action needed)
```

### Testing Results:
```bash
# Test shows successful operation:
Success: True
Files: 1
Subtitles downloaded: ✓
Text conversion: ✓
```

---

## Installation Checklist

To ensure minimal warnings, follow these steps:

### Step 1: System Dependencies
```bash
sudo apt update && sudo apt install -y ffmpeg nodejs
```

### Step 2: Python Dependencies
```bash
cd /home/ia52897/git-code/youtube-video-lister
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Verify Installation
```bash
# Check ffmpeg
ffmpeg -version

# Check Node.js
node --version

# Check Python packages
pip list | grep -E "yt-dlp|curl-cffi"
```

### Expected Output:
```
ffmpeg version 4.x.x
v18.19.1
yt-dlp            2026.3.17
curl-cffi         0.15.0
```

---

## Quick Fix Commands

**Fix all warnings at once:**
```bash
# Install system dependencies
sudo apt update && sudo apt install -y ffmpeg nodejs

# Install Python dependencies
cd /home/ia52897/git-code/youtube-video-lister
source venv/bin/activate
pip install -r requirements.txt
```

**Verify everything:**
```bash
python check_processed.py
```

---

## Troubleshooting

### "Still seeing JavaScript warning"
**Solution:** Code already fixed in v0.2.0. Make sure you're using the updated downloader.py

### "ffmpeg not found after installation"
**Solution:** 
```bash
# Verify installation
which ffmpeg
# If not found, check PATH
echo $PATH
# Restart terminal or source bashrc
source ~/.bashrc
```

### "curl-cffi installation fails"
**Solution:** This is optional for subtitle downloads. If installation fails (requires compilation):
```bash
# Try pre-built wheel
pip install --upgrade pip wheel
pip install curl-cffi

# If still fails, it's safe to skip - subtitles will work
```

### "PO Token warning still appears"
**Solution:** This is normal and can be ignored. It doesn't affect subtitle downloads.

---

## Performance Impact

### Before Fixes:
- Multiple warnings per video
- Console output cluttered
- User uncertainty about errors

### After Fixes:
- Clean output ✓
- Only informational messages ℹ️
- Clear success indicators ✓

### Example Clean Run:
```
Processing video 1... ✓ Downloaded subtitles
Processing video 2... ⏭ Already exists, skipping...
Processing video 3... ✓ Downloaded subtitles

Summary:
- Videos processed: 2
- Videos skipped: 1
- Errors: 0
```

---

## Documentation

Full documentation available in:
- `README.md` - Main documentation
- `INSTALL_FFMPEG.md` - ffmpeg installation guide
- `TROUBLESHOOTING.md` - Common issues
- `CHANGELOG.md` - Version history

---

**Status:** ✅ All critical warnings resolved
**Version:** 0.2.0
**Last Updated:** 2026-04-19
