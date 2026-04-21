# AWS Bedrock Model IDs Reference

## Important: Bedrock vs. Direct API Model IDs

AWS Bedrock uses **different model IDs** than the direct Anthropic API:

❌ **WRONG** (Direct API): `claude-opus-4-7`, `anthropic.claude-opus-4-7`  
✅ **CORRECT** (Bedrock): `anthropic.claude-3-5-sonnet-20241022-v2:0`

## Valid AWS Bedrock Model IDs

### Claude 3.5 Models (Recommended)

| Model | Bedrock ID | Use Case |
|-------|------------|----------|
| **Claude 3.5 Sonnet v2** | `anthropic.claude-3-5-sonnet-20241022-v2:0` | **Best balance** - Recommended for most tasks |
| Claude 3.5 Sonnet v1 | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Previous version |

### Claude 3 Models

| Model | Bedrock ID | Use Case |
|-------|------------|----------|
| **Claude 3 Sonnet** | `anthropic.claude-3-sonnet-20240229-v1:0` | Good balance of speed and quality |
| **Claude 3 Haiku** | `anthropic.claude-3-haiku-20240307-v1:0` | **Fastest & cheapest** - Good for simple summaries |
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | **Most capable** - Best for complex analysis |

## Current Configuration

Your system is now configured with:
- **Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0` (Claude 3.5 Sonnet v2)
- **Region**: eu-central-1
- **Status**: Ready to use

## Model Selection Guide

### For YouTube Transcript Summaries:

**With Keywords (Focused Analysis):**
- Use: **Claude 3.5 Sonnet v2** (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
- Why: Best at understanding context and focusing on specific topics
- Cost: ~$0.003 per summary (10KB transcript)

**Without Keywords (General Overview):**
- Use: **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
- Why: Fast bullet-point summaries, cheaper
- Cost: ~$0.0005 per summary (10KB transcript)

**Complex Technical Content:**
- Use: **Claude 3 Opus** (`anthropic.claude-3-opus-20240229-v1:0`)
- Why: Best reasoning and analysis
- Cost: ~$0.015 per summary (10KB transcript)

## Regional Availability

Ensure your region has the model enabled:
- ✅ **eu-central-1** (Frankfurt) - Your current region
- ✅ us-east-1 (N. Virginia)
- ✅ us-west-2 (Oregon)
- ✅ ap-southeast-1 (Singapore)

Check AWS Bedrock console: https://console.aws.amazon.com/bedrock/

## Troubleshooting

### Error: "Invocation of model ID ... with on-demand throughput isn't supported"

**Cause**: Using direct API model IDs instead of Bedrock IDs

**Fix**:
1. Open LLM Config in the UI
2. Select a model from the dropdown (not manual entry)
3. Save configuration

### Error: "Could not resolve the foundation model"

**Cause**: Model not enabled in your AWS region

**Fix**:
1. Go to AWS Bedrock Console
2. Navigate to "Model access"
3. Enable the Claude models
4. Wait 5-10 minutes for activation

### Error: "AccessDeniedException"

**Cause**: IAM permissions insufficient

**Fix**: Ensure your IAM user/role has:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    }
  ]
}
```

## Testing Your Configuration

```bash
# Check current config
curl http://127.0.0.1:5000/api/llm/config

# Should show:
# {
#   "provider": "bedrock",
#   "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
#   "awsRegion": "eu-central-1",
#   "hasAwsCredentials": true
# }
```

## Cost Estimates (EU Central-1)

Based on ~10KB transcript (typical YouTube video):

| Model | Input | Output | Per Summary |
|-------|-------|--------|-------------|
| Claude 3.5 Sonnet v2 | $3/MTok | $15/MTok | ~$0.003 |
| Claude 3 Sonnet | $3/MTok | $15/MTok | ~$0.003 |
| Claude 3 Haiku | $0.25/MTok | $1.25/MTok | ~$0.0005 |
| Claude 3 Opus | $15/MTok | $75/MTok | ~$0.015 |

**Monthly estimate** (100 summaries):
- Haiku: $0.05
- Sonnet: $0.30
- Opus: $1.50

## References

- AWS Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
- Anthropic Claude Models: https://docs.anthropic.com/claude/docs/models-overview
- Model IDs: https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
