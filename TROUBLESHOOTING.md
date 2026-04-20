# Troubleshooting Guide

## LLM Configuration Issues

### Error: "Failed to save configuration"

#### Check 1: Config File Status

Open in browser:
```
http://localhost:5000/api/debug/config-status
```

This will show:
- Whether `channels_config.json` exists
- If it's readable/writable
- File size and last modified time
- Whether the JSON is valid

#### Check 2: File Permissions

```bash
# Check if config file exists
ls -la channels_config.json

# If it doesn't exist, create it
touch channels_config.json

# Set proper permissions
chmod 644 channels_config.json

# Check you own the file
sudo chown $USER:$USER channels_config.json
```

#### Check 3: Disk Space

```bash
# Check available disk space
df -h .

# Check if directory is writable
touch test.txt && rm test.txt
```

#### Check 4: Server Logs

Look at the terminal where you started the server. You should see:
```
Received LLM config update request: { provider: 'bedrock', ... }
Bedrock config: { hasAccessKey: true, ... }
Saving LLM config: { provider: 'bedrock', ... }
Writing config to channels_config.json (XXX bytes)
Configuration saved successfully
Config file size: XXX bytes
```

If you see errors, they will indicate the specific problem.

### Error: "API Key is required"

**Problem:** Frontend validation passed but backend rejected

**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for: `Sending config to server...` and `Response data:`
3. The console will show exactly what was sent and received

**Common causes:**
- Empty spaces instead of actual key
- Copy-paste added extra characters
- Browser autocomplete filled wrong value

**Fix:**
```javascript
// In browser console, check what you're sending:
console.log(document.getElementById('llm-api-key').value.length);
// Should be > 0 for non-local providers
```

### Error: "AWS Access Key ID is required"

**Problem:** Switching to Bedrock but fields are empty

**Solution:**
1. Make sure you're filling the AWS fields, not the API Key field
2. The form should show:
   - AWS Access Key ID field
   - AWS Secret Access Key field
   - AWS Region dropdown
3. API Key field should be hidden

**If fields aren't showing:**
1. Refresh the page
2. Select "AWS Bedrock" from dropdown
3. Fields should appear automatically
4. If not, check browser console for JavaScript errors

### Error: "Invalid signature" (Bedrock)

**Problem:** AWS credentials are incorrect

**Solutions:**

1. **Verify credentials format:**
   - Access Key: Should start with `AKIA` (20 characters)
   - Secret Key: Should be 40 characters
   - Region: Should be like `us-east-1`

2. **Test credentials with AWS CLI:**
```bash
aws sts get-caller-identity \
  --region us-east-1 \
  --profile your-profile
```

3. **Check for extra spaces:**
```javascript
// In browser console:
console.log('|' + document.getElementById('aws-access-key').value + '|');
// Should NOT have spaces: |AKIA...|
```

4. **Generate new credentials:**
   - Go to AWS IAM Console
   - Create new access key
   - Use the newly generated ones

### Error: "Provider is invalid"

**Problem:** Server doesn't recognize the provider name

**Valid providers:**
- `openai`
- `anthropic`
- `bedrock`
- `local`

**Check in browser console:**
```javascript
console.log(document.getElementById('llm-provider').value);
// Should be one of the above
```

### Error: Network Error

**Problem:** Can't reach server

**Checks:**
```bash
# Is server running?
curl http://localhost:5000/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123.45}

# If not running, start it:
./start_server.sh
```

## Configuration Not Persisting

### Problem: Config saves but doesn't persist after refresh

**Check 1: Config file location**
```bash
# Find where config is stored
node -e "console.log(process.cwd())"
ls -la channels_config.json
```

**Check 2: Multiple instances**
```bash
# Check if multiple servers are running
ps aux | grep "node server.js"

# Kill all and start one:
pkill -f "node server.js"
./start_server.sh
```

**Check 3: File is being overwritten**
```bash
# Watch the file for changes
watch -n 1 "ls -la channels_config.json && wc -l channels_config.json"
```

## Bedrock-Specific Issues

### Error: "Model not found"

**Problem:** Model not available in your region

**Check model availability:**
```bash
aws bedrock list-foundation-models --region us-east-1 | grep claude
```

**Solution:** Use correct model ID for your region

### Error: "Access denied"

**Problem:** IAM permissions insufficient

**Check permissions:**
```bash
# List your permissions
aws iam get-user-policy --user-name YOUR_USERNAME --policy-name YOUR_POLICY

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

**Solution:**
1. Go to IAM Console
2. Add policy: `AmazonBedrockFullAccess`
3. Or create custom policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["bedrock:InvokeModel"],
    "Resource": "*"
  }]
}
```

### Error: "Region not enabled"

**Problem:** Bedrock not available in selected region

**Solution:**
1. Try `us-east-1` (most reliable)
2. Check region support: https://docs.aws.amazon.com/bedrock/
3. Enable Bedrock in AWS Console for that region

## Debugging Steps

### 1. Enable Verbose Logging

**Backend:**
```bash
# Start server with debug logging
NODE_ENV=development node server.js
```

**Frontend:**
```javascript
// In browser console, enable verbose logging:
localStorage.setItem('debug', 'true');
// Refresh page
```

### 2. Test Config Endpoints Directly

```bash
# Get current config
curl http://localhost:5000/api/llm/config

# Save config (OpenAI example)
curl -X POST http://localhost:5000/api/llm/config \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "apiKey": "sk-..."
  }'

# Save config (Bedrock example)
curl -X POST http://localhost:5000/api/llm/config \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "bedrock",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "AKIA...",
    "awsSecretAccessKey": "...",
    "awsRegion": "us-east-1"
  }'
```

### 3. Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for:
   - Red errors
   - `Sending config to server...` messages
   - `Response data:` messages
   - Network errors

### 4. Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter: `llm`
4. Click the request
5. Check:
   - Request Payload (what you sent)
   - Response (what server returned)
   - Status Code (should be 200)

### 5. Verify JSON Structure

```bash
# Check if config file is valid JSON
cat channels_config.json | jq .

# If invalid, fix or recreate:
cat > channels_config.json << 'EOF'
{
  "channels": [],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  }
}
EOF
```

## Common Error Messages Decoded

| Error | Meaning | Fix |
|-------|---------|-----|
| `EACCES` | Permission denied | `chmod 644 channels_config.json` |
| `ENOENT` | File/directory not found | Create the file or directory |
| `ENOSPC` | No disk space | Free up space: `df -h` |
| `Invalid JSON` | Config file corrupted | Recreate config file |
| `Network error` | Can't reach server | Check server is running |
| `400 Bad Request` | Invalid input | Check request format |
| `403 Forbidden` | AWS permissions | Check IAM policy |
| `404 Not Found` | Wrong endpoint | Check URL |
| `500 Server Error` | Server crash | Check server logs |

## Still Having Issues?

### Collect Debug Information

```bash
# System info
uname -a
node --version
npm --version

# Config file status
ls -la channels_config.json
cat channels_config.json

# Server health
curl http://localhost:5000/health
curl http://localhost:5000/api/debug/config-status

# Server logs
# Copy last 50 lines from terminal where server is running
```

### Create Minimal Test Case

1. Stop server
2. Backup config: `cp channels_config.json channels_config.json.bak`
3. Create minimal config:
```bash
cat > channels_config.json << 'EOF'
{
  "channels": [],
  "settings": {
    "default_days_back": 7,
    "default_languages": ["en"],
    "output_directory": "channel_data"
  }
}
EOF
```
4. Start server
5. Try saving LLM config again

### Report Issue

Include:
1. Error message (exact text)
2. Browser console output
3. Server logs
4. Debug endpoint output
5. Steps to reproduce

---

**Most issues are caused by:**
1. File permissions (80%)
2. Invalid credentials (15%)
3. Network issues (5%)

**Quick Fix Checklist:**
- [ ] Config file exists and is writable
- [ ] Server is running
- [ ] Browser console shows no errors
- [ ] Credentials are correct format
- [ ] No typos in keys/tokens
- [ ] Disk has space
- [ ] Using correct provider name
