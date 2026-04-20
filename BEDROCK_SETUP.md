# AWS Bedrock Setup Guide

## What is AWS Bedrock?

AWS Bedrock is Amazon's managed service for accessing foundation models (LLMs) including Anthropic's Claude. Using Bedrock allows you to:

- Access Claude 3.5 Sonnet (latest and most capable)
- Use AWS infrastructure and billing
- Benefit from AWS security and compliance
- No separate API key management with Anthropic

## Prerequisites

1. AWS Account
2. IAM user with Bedrock access
3. Bedrock enabled in your AWS region

## Step-by-Step Setup

### 1. Enable Bedrock in AWS Console

1. Log into AWS Console
2. Navigate to **Amazon Bedrock**
3. Select your region (e.g., us-east-1)
4. Go to **Model access** (left sidebar)
5. Click **Manage model access**
6. Enable **Anthropic Claude models**:
   - Claude 3.5 Sonnet
   - Claude 3 Opus
   - Claude 3 Sonnet
   - Claude 3 Haiku
7. Click **Save changes**
8. Wait for access to be granted (usually instant)

### 2. Create IAM User and Get Credentials

#### Option A: Create New IAM User

1. Go to **IAM Console**
2. Click **Users** → **Add users**
3. Enter username (e.g., `youtube-toolkit-bedrock`)
4. Select **Access key - Programmatic access**
5. Click **Next: Permissions**
6. Choose **Attach existing policies directly**
7. Search and select: `AmazonBedrockFullAccess`
8. Click **Next: Tags** (optional)
9. Click **Next: Review**
10. Click **Create user**
11. **IMPORTANT**: Copy the **Access Key ID** and **Secret Access Key**
    - You won't be able to see the secret key again!
12. Store these securely

#### Option B: Use Existing IAM User

1. Go to **IAM Console** → **Users**
2. Select your user
3. Go to **Security credentials** tab
4. Scroll to **Access keys**
5. Click **Create access key**
6. Choose **Application running outside AWS**
7. Click **Next** → **Create access key**
8. Copy the **Access Key ID** and **Secret Access Key**

### 3. Verify Bedrock Access

Test your credentials using AWS CLI (optional):

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter Access Key ID
# Enter Secret Access Key
# Enter region: us-east-1
# Enter output format: json

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1 | grep claude
```

### 4. Configure in YouTube Toolkit

1. Open the YouTube Toolkit Web UI
2. Click **"AI Summarization"** → **"Configure LLM"**
3. Select **"AWS Bedrock (Claude via AWS)"** as provider
4. Enter your credentials:
   - **AWS Access Key ID**: `AKIA...`
   - **AWS Secret Access Key**: Your secret key
   - **AWS Region**: `us-east-1` (or your region)
5. Model (optional): `anthropic.claude-3-5-sonnet-20241022-v2:0`
6. Click **"Save Configuration"**

## Available Models

### Bedrock Model IDs

| Model | Bedrock ID | Use Case |
|-------|------------|----------|
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Best overall (Recommended) |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229-v1:0` | Most capable, slower |
| Claude 3 Sonnet | `anthropic.claude-3-sonnet-20240229-v1:0` | Balanced performance |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307-v1:0` | Fastest, cheapest |

### Model Selection

- **Development/Testing**: Claude 3 Haiku (fast and cheap)
- **Production**: Claude 3.5 Sonnet (best quality)
- **Complex Analysis**: Claude 3 Opus (most capable)

## Supported Regions

Bedrock is available in these regions:

| Region | Region Code |
|--------|-------------|
| US East (N. Virginia) | `us-east-1` |
| US West (Oregon) | `us-west-2` |
| EU (Ireland) | `eu-west-1` |
| EU (Frankfurt) | `eu-central-1` |
| Asia Pacific (Singapore) | `ap-southeast-1` |
| Asia Pacific (Tokyo) | `ap-northeast-1` |

**Note:** Model availability varies by region. Check AWS Console for your region.

## Pricing

### Claude 3.5 Sonnet (via Bedrock)

- **Input**: $3.00 per million tokens
- **Output**: $15.00 per million tokens

### Typical Costs

| Transcripts | Input Tokens | Output Tokens | Estimated Cost |
|-------------|--------------|---------------|----------------|
| 1 | ~3,000 | ~500 | $0.017 |
| 10 | ~30,000 | ~5,000 | $0.165 |
| 100 | ~300,000 | ~50,000 | $1.65 |
| 1,000 | ~3,000,000 | ~500,000 | $16.50 |

**Cost-saving tips:**
- Use Claude 3 Haiku for simple summaries ($0.25/$1.25 per million tokens)
- Process in batches
- Cache summaries (don't re-process)

## Security Best Practices

### 1. IAM Policy (Least Privilege)

Instead of `AmazonBedrockFullAccess`, use custom policy:

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

### 2. Credential Management

- **Never commit credentials** to git
- Store in environment variables or config file (gitignored)
- Rotate keys periodically
- Use AWS Secrets Manager for production

### 3. Monitoring

Monitor usage in AWS Console:
1. Go to **CloudWatch**
2. Search for Bedrock metrics
3. Set up billing alerts

## Troubleshooting

### Error: "Access Denied"

**Problem:** IAM user doesn't have Bedrock permissions

**Solution:**
1. Check IAM policy includes `bedrock:InvokeModel`
2. Verify model access is granted in Bedrock console
3. Check region matches (model access is per-region)

### Error: "Model not found"

**Problem:** Model not available in your region

**Solutions:**
1. Check model ID is correct
2. Verify model access is enabled (Bedrock Console → Model access)
3. Try different region (us-east-1 usually has all models)

### Error: "Invalid signature"

**Problem:** AWS credentials are incorrect or expired

**Solutions:**
1. Verify Access Key ID and Secret Access Key
2. Check for extra spaces in credentials
3. Generate new access key
4. Verify system clock is accurate (AWS signature requires correct time)

### Error: "Rate limit exceeded"

**Problem:** Too many requests

**Solutions:**
1. Add delays between requests
2. Use batch processing
3. Request rate limit increase in AWS Support

## Configuration Example

### channels_config.json

```json
{
  "channels": [
    {
      "url": "https://www.youtube.com/@channel",
      "keywords": ["BTC", "ETH"]
    }
  ],
  "llm": {
    "provider": "bedrock",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "AKIA...",
    "awsSecretAccessKey": "...",
    "awsRegion": "us-east-1"
  }
}
```

### Environment Variables

```bash
# .env file
LLM_PROVIDER=bedrock
LLM_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

## Comparison: Bedrock vs Direct Anthropic API

| Feature | AWS Bedrock | Anthropic Direct |
|---------|-------------|------------------|
| **API Key** | AWS credentials | Anthropic API key |
| **Billing** | Through AWS | Direct to Anthropic |
| **Pricing** | Same as direct | Same as Bedrock |
| **Infrastructure** | AWS | Anthropic |
| **Model Access** | Request in console | Direct access |
| **Region Support** | Multiple AWS regions | Global |
| **Enterprise Features** | AWS integrations | Limited |
| **Setup Complexity** | More steps | Simple |

**Use Bedrock if:**
- You already use AWS
- You want AWS billing consolidation
- You need AWS integrations
- You require AWS compliance/security

**Use Direct Anthropic if:**
- You want simpler setup
- You don't use AWS
- You prefer direct billing
- You want fastest access to new models

## Support

### AWS Support
- AWS Documentation: https://docs.aws.amazon.com/bedrock/
- AWS Support: Create case in AWS Console

### YouTube Toolkit Support
- See [SUMMARIZATION_GUIDE.md](SUMMARIZATION_GUIDE.md)
- GitHub Issues: Create issue for bugs

## Next Steps

After setup:
1. Configure keywords for your channels
2. Test with a single transcript
3. Monitor costs in AWS billing
4. Batch process your transcripts

---

**You're now ready to use Claude 3.5 Sonnet via AWS Bedrock for AI-powered transcript summarization!**
