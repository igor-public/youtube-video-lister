# Security Guide

## Protecting Secrets and Configuration

This document outlines security best practices for the YouTube Toolkit project.

## Files Excluded from Git

The following files contain sensitive information and are **automatically excluded** from version control:

### Configuration Files with Secrets

- ✅ `channels_config.json` - Contains API keys, AWS credentials
- ✅ `config.json` - Any other config files
- ✅ `.env` - Environment variables with secrets
- ✅ `*.env` - All environment files
- ✅ `*_config.json` - Pattern-matched config files

### Example Files (NOT Excluded)

These are **safe to commit** as they contain no secrets:
- ✅ `channels_config.example.json` - Template without secrets
- ✅ `channels_config_advanced.example.json` - Advanced template
- ✅ `.env.example` - Environment template

### Other Excluded Items

- ✅ `channel_data/` - Downloaded transcripts and data
- ✅ `*.log` - Log files
- ✅ `/tmp/` - Temporary files
- ✅ `docs/` - Auto-generated documentation
- ✅ `node_modules/` - Node dependencies
- ✅ `venv/` - Python virtual environment

## Configuration File Structure

### channels_config.json (NEVER COMMIT)

This file contains:
- YouTube API keys
- LLM provider API keys
- AWS credentials (for Bedrock)
- Channel URLs and settings

**Example structure:**
```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@ChannelName",
      "days_back": 14,
      "languages": ["en"],
      "keywords": ["topic1", "topic2"]
    }
  ],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  },
  "llm": {
    "provider": "bedrock",
    "model": "anthropic.claude-opus-4-7",
    "awsAccessKeyId": "AKIA...",          // ⚠️ SECRET
    "awsSecretAccessKey": "...",          // ⚠️ SECRET
    "awsRegion": "eu-central-1"
  }
}
```

### .env (NEVER COMMIT)

Contains:
```bash
YOUTUBE_API_KEY=your_secret_key_here      # ⚠️ SECRET
```

## First-Time Setup

### 1. Copy Example Files

```bash
# Copy config template
cp channels_config.example.json channels_config.json

# Copy environment template
cp .env.example .env
```

### 2. Add Your Secrets

Edit the new files and add your actual credentials:

```bash
# Edit config
nano channels_config.json

# Edit environment
nano .env
```

### 3. Verify Exclusion

Check that your files are being ignored:

```bash
git status --ignored | grep channels_config.json
# Should show: !! channels_config.json

git check-ignore channels_config.json
# Should return: channels_config.json
```

## Accidentally Committed Secrets?

If you accidentally committed secrets to git:

### Step 1: Remove from Git History

```bash
# Remove file from all commits (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch channels_config.json" \
  --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner (recommended)
bfg --delete-files channels_config.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 2: Force Push (if already pushed)

```bash
# ⚠️ WARNING: This rewrites history
git push origin --force --all
git push origin --force --tags
```

### Step 3: Rotate Secrets

**IMPORTANT:** Even after removing from git, you must rotate all secrets:

1. **YouTube API Key**
   - Go to Google Cloud Console
   - Delete the old API key
   - Create a new API key
   - Update `.env` file

2. **OpenAI/Anthropic API Key**
   - Log into provider dashboard
   - Revoke old key
   - Generate new key
   - Update `channels_config.json`

3. **AWS Credentials (Bedrock)**
   - Go to AWS IAM Console
   - Delete old access key
   - Create new access key
   - Update `channels_config.json`

## Git Best Practices

### Before Committing

Always check what you're about to commit:

```bash
# See what will be committed
git status

# Review changes line by line
git diff

# Check for accidentally staged secrets
git diff --cached | grep -E "apiKey|secret|password|credential"
```

### Safe Commit Workflow

```bash
# 1. Check status
git status

# 2. Add only specific files (NEVER use git add .)
git add backend/main.py
git add frontend/src/App.js
git add README.md

# 3. Review what's staged
git status
git diff --cached

# 4. Commit
git commit -m "Add feature X"

# 5. Push
git push origin main
```

### NEVER Do This

```bash
# ❌ NEVER use these commands
git add .           # Adds everything, including secrets
git add -A          # Same as above
git add *           # Same as above

# ❌ NEVER force add ignored files
git add -f channels_config.json
```

## Sharing Configuration

### With Team Members

**Don't:** Send `channels_config.json` via email/Slack

**Do:** Share the template and instructions:

1. Send them `channels_config.example.json`
2. Tell them to copy it to `channels_config.json`
3. Provide secrets through secure channels:
   - Password managers (1Password, LastPass)
   - Encrypted messaging (Signal)
   - Secure key management systems (AWS Secrets Manager, HashiCorp Vault)

### In Documentation

**Don't:** Include real API keys in examples

```json
// ❌ BAD
{
  "apiKey": "sk-1234567890abcdef"
}
```

**Do:** Use placeholders

```json
// ✅ GOOD
{
  "apiKey": "your-api-key-here"
}
```

## Environment-Specific Configuration

### Development

```json
{
  "llm": {
    "provider": "local",
    "model": "llama2"
  }
}
```

### Production

```json
{
  "llm": {
    "provider": "bedrock",
    "model": "anthropic.claude-opus-4-7",
    "awsAccessKeyId": "AKIA...",
    "awsSecretAccessKey": "...",
    "awsRegion": "us-east-1"
  }
}
```

Keep separate config files:
- `channels_config.dev.json` (local testing)
- `channels_config.prod.json` (production)

Both should be in `.gitignore`.

## Checking for Exposed Secrets

### Pre-Commit Checks

Install a pre-commit hook to scan for secrets:

```bash
# Install gitleaks (secret scanner)
brew install gitleaks  # macOS
# or
sudo apt install gitleaks  # Linux

# Scan repository
gitleaks detect --source . --verbose
```

### GitHub Secret Scanning

If using GitHub:
1. Enable "Secret scanning" in repository settings
2. Enable "Push protection" to block secret commits
3. GitHub will alert you if secrets are detected

## Quick Reference

### ✅ Safe to Commit

- Source code (`.py`, `.js`, `.jsx`)
- Example/template files (`*.example.*`)
- Documentation (`.md`)
- Configuration without secrets
- Public assets (CSS, images)
- Tests

### ❌ NEVER Commit

- `channels_config.json` (has API keys)
- `.env` (has secrets)
- `config.json` (may have secrets)
- Private API keys
- AWS credentials
- Database passwords
- Downloaded data (`channel_data/`)
- Log files (`*.log`)

## Summary

🔐 **Security Checklist**

- [x] `.gitignore` includes `channels_config.json`
- [x] `.gitignore` includes `.env`
- [x] `.gitignore` includes `*_config.json` pattern
- [x] Example files available without secrets
- [x] Removed tracked config from git history
- [x] Never use `git add .` or `git add -A`
- [x] Always review `git status` before committing
- [x] Rotate secrets if accidentally exposed
- [x] Share secrets through secure channels only

**Remember:** Once a secret is committed to git, assume it's compromised. Always rotate credentials immediately.
