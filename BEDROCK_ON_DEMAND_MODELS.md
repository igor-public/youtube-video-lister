# AWS Bedrock - On-Demand Throughput Models

## Understanding the Error

**Error**: "Invocation of model ID ... with on-demand throughput isn't supported"

**Cause**: Newer Claude models require **inference profiles** instead of direct model IDs.

## Two Ways to Invoke Models in Bedrock

### 1. Direct Model IDs (Older, Simpler)
- Format: `anthropic.claude-3-sonnet-20240229-v1:0`
- Works for: Claude 3 and Claude 3.5 (older versions)
- ✅ Supports on-demand throughput

### 2. Inference Profiles (Newer, Required for Latest Models)
- Format: `us.anthropic.claude-3-7-sonnet-20250219-v1:0` (region prefix)
- Or ARN: `arn:aws:bedrock:region::foundation-model/model-id`
- Required for: Claude 3.7, Claude 4.x, newest Claude 3.5 versions
- ❌ May not support on-demand in all regions

## ✅ Models Supporting On-Demand Throughput

### Claude 3.5 Models (RECOMMENDED - Best for On-Demand)

| Model | Direct Model ID | Status |
|-------|----------------|---------|
| **Claude 3.5 Sonnet v1** | `anthropic.claude-3-5-sonnet-20240620-v1:0` | ✅ **Best choice** |
| **Claude 3.5 Sonnet v2** | `anthropic.claude-3-5-sonnet-20241022-v2:0` | ✅ Works |

### Claude 3 Models (Fully Supported)

| Model | Direct Model ID | Status |
|-------|----------------|---------|
| **Claude 3 Sonnet** | `anthropic.claude-3-sonnet-20240229-v1:0` | ✅ Works |
| **Claude 3 Haiku** | `anthropic.claude-3-haiku-20240307-v1:0` | ✅ Works |
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | ✅ Works |

### ❌ Models NOT Supporting On-Demand (Yet)

| Model | Issue |
|-------|-------|
| Claude 3.7 Sonnet | Requires inference profile (may not be available in your region) |
| Claude 4.x | Requires inference profile + may need provisioned throughput |

## Using Inference Profiles (Advanced)

If you have access to inference profiles in your region:

### Format: Region-Specific Inference Profiles
```
{region}.anthropic.claude-{model}
```

### Examples:
- `eu.anthropic.claude-3-5-sonnet-20241022-v2:0` (EU regions)
- `us.anthropic.claude-3-5-sonnet-20241022-v2:0` (US regions)

### Check Available Profiles:
```bash
aws bedrock list-foundation-models \
  --region eu-central-1 \
  --by-inference-type ON_DEMAND \
  --query 'modelSummaries[?contains(modelId, `anthropic`)].modelId'
```

## ✅ RECOMMENDED Configuration

For your use case (YouTube transcript summarization):

### Option 1: Best Balance (RECOMMENDED)
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "awsRegion": "eu-central-1"
}
```
- ✅ Fully supports on-demand
- ✅ Excellent quality
- ✅ Good speed
- ✅ Available in all Bedrock regions

### Option 2: Cheaper & Faster
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-haiku-20240307-v1:0",
  "awsRegion": "eu-central-1"
}
```
- ✅ ~80% cheaper than Sonnet
- ✅ Faster response
- ✅ Good for simple summaries

### Option 3: Most Capable
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-opus-20240229-v1:0",
  "awsRegion": "eu-central-1"
}
```
- ✅ Best reasoning
- ✅ Best for complex analysis
- ⚠️ More expensive (~5x Sonnet)

## Why Claude 3.7/4.x Don't Work

1. **Newer Models**: Released after standard on-demand support
2. **Inference Profiles Required**: Need region-specific profile IDs
3. **Limited Availability**: Not all regions have them yet
4. **Provisioned Throughput**: Some models may require pre-purchased capacity

## How to Check Available Models in Your Region

### Method 1: AWS Console
1. Go to: https://console.aws.amazon.com/bedrock/
2. Select region: **eu-central-1**
3. Navigate to: **Foundation models** → **Model access**
4. Check which models show "Available" for "On-demand"

### Method 2: AWS CLI
```bash
# List all on-demand models
aws bedrock list-foundation-models \
  --region eu-central-1 \
  --by-inference-type ON_DEMAND

# List only Anthropic models
aws bedrock list-foundation-models \
  --region eu-central-1 \
  --by-inference-type ON_DEMAND \
  --query 'modelSummaries[?providerName==`Anthropic`]'
```

## Regional Availability

### eu-central-1 (Frankfurt) - Your Region

**Definitely Available (On-Demand):**
- ✅ Claude 3 (all versions)
- ✅ Claude 3.5 Sonnet v1 & v2

**May Require Inference Profile:**
- ⚠️ Claude 3.7
- ⚠️ Claude 4.x (if available)

## Cost Comparison (On-Demand, eu-central-1)

For ~10KB transcript:

| Model | Cost per Summary | Speed | Quality |
|-------|-----------------|-------|---------|
| Claude 3 Haiku | $0.0005 | Fast ⚡ | Good ★★★☆☆ |
| Claude 3.5 Sonnet v1 | $0.003 | Medium 🚀 | Excellent ★★★★★ |
| Claude 3 Opus | $0.015 | Slow 🐌 | Best ★★★★★+ |

## Troubleshooting

### Error: "model ID ... with on-demand throughput isn't supported"
**Solution**: Use one of these model IDs:
- `anthropic.claude-3-5-sonnet-20240620-v1:0` (recommended)
- `anthropic.claude-3-haiku-20240307-v1:0` (cheaper)
- `anthropic.claude-3-opus-20240229-v1:0` (best quality)

### Error: "Could not resolve the foundation model"
**Solution**: 
1. Check model is enabled in AWS Console
2. Verify you're in the correct region
3. Wait 5-10 minutes after enabling

### Error: "AccessDeniedException"
**Solution**: Add IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
}
```

## Quick Fix for Your Current Error

Change your model to one of these working IDs:

```bash
# Option 1: Best balance (recommended)
anthropic.claude-3-5-sonnet-20240620-v1:0

# Option 2: Cheaper/faster
anthropic.claude-3-haiku-20240307-v1:0

# Option 3: Highest quality
anthropic.claude-3-opus-20240229-v1:0
```

All three are guaranteed to work with on-demand throughput in eu-central-1.
