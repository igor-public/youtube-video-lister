#!/usr/bin/env python3
"""Test if AWS Bedrock actually streams responses"""

import json
import time
import asyncio
import sys

async def test_async_streaming():
    """Test aioboto3 async streaming"""
    try:
        import aioboto3
    except ImportError:
        print("ERROR: aioboto3 not installed")
        return

    # Load config
    import os
    from pathlib import Path

    config_path = Path(__file__).parent.parent / "backend" / "config" / "channels_config.json"
    with open(config_path) as f:
        config = json.load(f)

    llm_config = config.get('llm', {})
    if llm_config.get('provider') != 'bedrock':
        print("ERROR: LLM provider is not bedrock")
        return

    print(f"Testing model: {llm_config['model']}")
    print(f"Region: {llm_config['awsRegion']}")
    print("-" * 60)

    session = aioboto3.Session()

    async with session.client(
        service_name='bedrock-runtime',
        region_name=llm_config['awsRegion'],
        aws_access_key_id=llm_config['awsAccessKeyId'],
        aws_secret_access_key=llm_config['awsSecretAccessKey']
    ) as bedrock:

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "messages": [
                {"role": "user", "content": "Count from 1 to 10, with each number on a new line."}
            ]
        })

        print("Invoking model...")
        start_time = time.time()

        response = await bedrock.invoke_model_with_response_stream(
            modelId=llm_config['model'],
            body=body
        )

        print(f"Got response object at {(time.time() - start_time)*1000:.0f}ms")
        print("Starting to iterate events...")
        print("-" * 60)

        chunk_count = 0
        last_time = start_time

        async for event in response['body']:
            now = time.time()
            elapsed = (now - start_time) * 1000
            since_last = (now - last_time) * 1000
            last_time = now

            chunk = json.loads(event['chunk']['bytes'].decode())
            chunk_count += 1

            if chunk['type'] == 'content_block_delta':
                if 'delta' in chunk and 'text' in chunk['delta']:
                    text = chunk['delta']['text']
                    print(f"[{elapsed:6.0f}ms] (+{since_last:4.0f}ms) Chunk #{chunk_count}: {repr(text)}")
                    sys.stdout.flush()
            elif chunk['type'] == 'message_stop':
                print(f"[{elapsed:6.0f}ms] Stream complete. Total chunks: {chunk_count}")
                break

        total_time = (time.time() - start_time) * 1000
        print("-" * 60)
        print(f"Total time: {total_time:.0f}ms")
        print(f"Average time between chunks: {total_time/chunk_count:.0f}ms")

if __name__ == '__main__':
    asyncio.run(test_async_streaming())
