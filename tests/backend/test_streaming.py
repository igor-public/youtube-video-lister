#!/usr/bin/env python3
"""
Test AWS Bedrock Streaming
Verify that Claude model supports true streaming
"""

import json
import boto3
import sys

# Load config
from pathlib import Path
config_path = Path(__file__).parent.parent.parent / "backend" / "config" / "channels_config.json"
with open(config_path) as f:
    config = json.load(f)

llm_config = config['llm']

print(f"Testing streaming with model: {llm_config['model']}")
print(f"Region: {llm_config['awsRegion']}")
print("-" * 60)

# Create Bedrock client
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name=llm_config['awsRegion'],
    aws_access_key_id=llm_config['awsAccessKeyId'],
    aws_secret_access_key=llm_config['awsSecretAccessKey']
)

# Simple test prompt
prompt = "Write a very short 2-sentence summary about Bitcoin."

body = json.dumps({
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 100,
    "messages": [
        {"role": "user", "content": prompt}
    ]
})

print("\nSending request to Bedrock...")
print("Waiting for streaming response...\n")

try:
    response = bedrock.invoke_model_with_response_stream(
        modelId=llm_config['model'],
        body=body
    )

    chunk_count = 0
    full_text = ""

    print("STREAMING OUTPUT:")
    print("-" * 60)

    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'].decode())

        if chunk['type'] == 'content_block_delta':
            if 'delta' in chunk and 'text' in chunk['delta']:
                text = chunk['delta']['text']
                chunk_count += 1
                full_text += text

                # Print each chunk as it arrives
                print(f"[Chunk {chunk_count}] '{text}'", flush=True)

        elif chunk['type'] == 'message_stop':
            print("-" * 60)
            print("\nSTREAMING COMPLETE!")
            break

    print(f"\nTotal chunks received: {chunk_count}")
    print(f"Full text length: {len(full_text)} characters")
    print(f"\nFull text:\n{full_text}")

    if chunk_count > 0:
        print("\n✅ SUCCESS: Streaming is working!")
        sys.exit(0)
    else:
        print("\n❌ FAIL: No chunks received")
        sys.exit(1)

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
