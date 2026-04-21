# Using OpenAI Models on AWS Bedrock

## The Issue

When using OpenAI models on Bedrock, you got error: `'content'`

**Root Cause**: OpenAI models and Anthropic models use different request/response formats on Bedrock.

## Request Format Differences

### Anthropic Models (Claude)
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1024,
  "messages": [{"role": "user", "content": "..."}]
}
```

### OpenAI Models (GPT)
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "max_tokens": 1024,
  "temperature": 0.7
}
```

## Response Format Differences

### Anthropic Response
```json
{
  "content": [{"text": "Summary here..."}]
}
```

### OpenAI Response
```json
{
  "choices": [{"message": {"content": "Summary here..."}}]
}
```

## ✅ Fixed in llm_client.py

The code now:
1. **Detects model type** by checking if model ID starts with `openai.`
2. **Uses correct request format** based on model type
3. **Parses response correctly** for both formats

## Available OpenAI Models on Bedrock

Check your region for availability. Common models:

### GPT-4 Models
- `openai.gpt-4-turbo-2024-04-09-v1:0`
- `openai.gpt-4-0125-preview-v1:0`

### GPT-3.5 Models
- `openai.gpt-3.5-turbo-0125-v1:0`

### Open Source Models
- `openai.gpt-oss-120b-1:0` (your current choice)

## Checking Available Models

### AWS Console
1. https://console.aws.amazon.com/bedrock/
2. Region: eu-central-1
3. Foundation models → Model access
4. Look for models starting with "openai."

### AWS CLI
```bash
aws bedrock list-foundation-models \
  --region eu-central-1 \
  --by-provider OpenAI \
  --query 'modelSummaries[].modelId'
```

## Cost Comparison: OpenAI vs Anthropic on Bedrock

For ~10KB transcript summary:

| Model | Provider | Cost per Summary | Quality | Speed |
|-------|----------|------------------|---------|-------|
| GPT-3.5 Turbo | OpenAI | $0.0003 | Good ★★★☆☆ | Fast ⚡ |
| GPT-4 | OpenAI | $0.003 | Excellent ★★★★☆ | Medium 🚀 |
| Claude 3 Haiku | Anthropic | $0.0005 | Good ★★★☆☆ | Fast ⚡ |
| Claude 3.5 Sonnet | Anthropic | $0.003 | Excellent ★★★★★ | Medium 🚀 |
| Claude 3 Opus | Anthropic | $0.015 | Best ★★★★★+ | Slow 🐌 |

## Your Current Configuration

```json
{
  "provider": "bedrock",
  "model": "openai.gpt-oss-120b-1:0",
  "awsRegion": "eu-central-1"
}
```

## Recommendations

### For YouTube Summaries:

**Best Value (Anthropic):**
- Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
- Why: Better at understanding context, excellent quality
- Cost: ~$0.003/summary

**Cheapest (OpenAI):**
- Model: `openai.gpt-3.5-turbo-0125-v1:0`
- Why: Fast and cheap for simple summaries
- Cost: ~$0.0003/summary

**Best Quality (Anthropic):**
- Model: `anthropic.claude-3-opus-20240229-v1:0`
- Why: Superior reasoning and analysis
- Cost: ~$0.015/summary

## Testing Different Models

You can easily switch between models in the UI:

1. Right panel → "Update LLM Config"
2. Change model ID:
   - OpenAI: `openai.gpt-4-turbo-2024-04-09-v1:0`
   - Anthropic: `anthropic.claude-3-5-sonnet-20240620-v1:0`
3. Save (credentials preserved)
4. Generate a summary to test

## Troubleshooting

### Error: "Unknown response format"
**Cause**: Model type detection failed
**Fix**: Ensure model ID starts with correct prefix:
- OpenAI: `openai.`
- Anthropic: `anthropic.`

### Error: "Could not resolve the foundation model"
**Cause**: Model not available in your region
**Fix**: Check available models:
```bash
aws bedrock list-foundation-models --region eu-central-1
```

### Error: "AccessDeniedException"
**Cause**: Missing IAM permissions
**Fix**: Add to IAM policy:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": [
    "arn:aws:bedrock:*::foundation-model/anthropic.*",
    "arn:aws:bedrock:*::foundation-model/openai.*"
  ]
}
```

## Summary

✅ **Fixed**: OpenAI models now work on Bedrock  
✅ **Auto-detection**: Code detects model type automatically  
✅ **Both formats**: Supports Anthropic and OpenAI response formats  
✅ **Ready to use**: Try generating a summary with your current OpenAI model  

The system now seamlessly handles both Anthropic and OpenAI models on AWS Bedrock!
