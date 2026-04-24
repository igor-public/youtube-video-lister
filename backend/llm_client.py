#!/usr/bin/env python3
"""
LLM Client - Unified interface for multiple LLM providers
"""

import os
import json
import logging
import asyncio
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod
from .prompts import PromptTemplates

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class LLMClient(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        """Generate a summary focusing on specific keywords"""
        pass

    def generate_summary_stream(self, content: str, keywords: list[str], title: str):
        """Generate a summary with streaming. Default implementation (non-streaming fallback)."""
        import time
        summary = self.generate_summary(content, keywords, title)
        # Stream word by word with small delay (fallback for non-streaming providers)
        words = summary.split(' ')
        for i, word in enumerate(words):
            if i == 0:
                yield word
            else:
                yield ' ' + word
            time.sleep(0.05)  # 50ms delay between words for smooth streaming

    @abstractmethod
    def extract_keywords(self, content: str, max_keywords: int = 10) -> list[str]:
        """Extract keywords from content"""
        pass


class OpenAIClient(LLMClient):
    """OpenAI API client"""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        try:
            try:
                import openai
            except ImportError:
                raise Exception("openai package not installed. Install with: pip install openai")
            openai.api_key = self.api_key

            prompt = PromptTemplates.get_summary_prompt(title, content, keywords)
            system_message = PromptTemplates.get_system_message("openai")

            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=600
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    def extract_keywords(self, content: str, max_keywords: int = 10) -> list[str]:
        try:
            try:
                import openai
            except ImportError:
                raise Exception("openai package not installed. Install with: pip install openai")
            openai.api_key = self.api_key

            prompt = PromptTemplates.get_keyword_extraction_prompt(content, max_keywords)

            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You extract keywords from text. Return only comma-separated keywords."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=100
            )

            keywords_text = response.choices[0].message.content.strip()
            return [k.strip() for k in keywords_text.split(',') if k.strip()]

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")


class AnthropicClient(LLMClient):
    """Anthropic (Claude) API client"""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        try:
            try:
                import anthropic
            except ImportError:
                raise Exception("anthropic package not installed. Install with: pip install anthropic")

            client = anthropic.Anthropic(api_key=self.api_key)

            prompt = PromptTemplates.get_summary_prompt(title, content, keywords)

            message = client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            return message.content[0].text.strip()

        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")

    def extract_keywords(self, content: str, max_keywords: int = 10) -> list[str]:
        try:
            try:
                import anthropic
            except ImportError:
                raise Exception("anthropic package not installed. Install with: pip install anthropic")

            client = anthropic.Anthropic(api_key=self.api_key)

            prompt = PromptTemplates.get_keyword_extraction_prompt(content, max_keywords)

            message = client.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            keywords_text = message.content[0].text.strip()
            return [k.strip() for k in keywords_text.split(',') if k.strip()]

        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")


class BedrockClient(LLMClient):
    """AWS Bedrock API client"""

    def __init__(self, aws_access_key_id: str, aws_secret_access_key: str,
                 aws_region: str, model: str):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.aws_region = aws_region
        self.model = model

    async def generate_summary_stream_async(self, content: str, keywords: list[str], title: str):
        """Generate summary with TRUE async streaming using aioboto3 and Converse Stream API"""
        try:
            try:
                import aioboto3
            except ImportError:
                raise Exception("aioboto3 package not installed. Install with: pip install aioboto3")

            import time

            session = aioboto3.Session()
            prompt = PromptTemplates.get_summary_prompt(title, content, keywords)

            async with session.client(
                service_name='bedrock-runtime',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            ) as bedrock:

                # Use Converse Stream API - unified format for all models
                response = await bedrock.converse_stream(
                    modelId=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": [{"text": prompt}]
                        }
                    ],
                    inferenceConfig={
                        "maxTokens": 1024,
                        "temperature": 0.7
                    }
                )

                # TRUE async streaming with Converse API
                chunk_count = 0
                start_time = time.time()
                last_chunk_time = start_time

                async for event in response['stream']:
                    now = time.time()
                    time_since_start = (now - start_time) * 1000  # ms
                    time_since_last = (now - last_chunk_time) * 1000  # ms
                    last_chunk_time = now

                    chunk_count += 1
                    logger.info(f"[Bedrock-Async-Converse] Event #{chunk_count} at {time_since_start:.0f}ms (+{time_since_last:.0f}ms)")

                    # Handle contentBlockDelta events (unified format)
                    if 'contentBlockDelta' in event:
                        delta = event['contentBlockDelta'].get('delta', {})
                        if 'text' in delta:
                            text = delta['text']
                            if text:
                                yield text
                    elif 'messageStop' in event:
                        logger.info(f"[Bedrock-Async-Converse] Complete at {time_since_start:.0f}ms. Total: {chunk_count}")
                        break

        except Exception as e:
            raise Exception(f"AWS Bedrock Converse async streaming error: {str(e)}")

    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        try:
            try:
                import boto3
            except ImportError:
                raise Exception("boto3 package not installed. Install with: pip install boto3")

            bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )

            prompt = PromptTemplates.get_summary_prompt(title, content, keywords)

            # Use Converse API - unified format for all models
            response = bedrock.converse(
                modelId=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                inferenceConfig={
                    "maxTokens": 1024,
                    "temperature": 0.7
                }
            )

            # Extract text from unified response format
            output_message = response['output']['message']
            text_content = output_message['content'][0]['text']
            return text_content.strip()

        except Exception as e:
            raise Exception(f"AWS Bedrock Converse API error: {str(e)}")

    def generate_summary_stream(self, content: str, keywords: list[str], title: str):
        """Generate summary with true Bedrock streaming using Converse Stream API"""
        try:
            try:
                import boto3
            except ImportError:
                raise Exception("boto3 package not installed. Install with: pip install boto3")

            bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )

            prompt = PromptTemplates.get_summary_prompt(title, content, keywords)

            # Use Converse Stream API - unified format for all models
            response = bedrock.converse_stream(
                modelId=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                inferenceConfig={
                    "maxTokens": 1024,
                    "temperature": 0.7
                }
            )

            # Stream the response
            import time
            chunk_count = 0
            start_time = time.time()
            last_chunk_time = start_time

            for event in response['stream']:
                now = time.time()
                time_since_start = (now - start_time) * 1000  # ms
                time_since_last = (now - last_chunk_time) * 1000  # ms
                last_chunk_time = now

                chunk_count += 1
                logger.info(f"[Bedrock-Converse] Event #{chunk_count} at {time_since_start:.0f}ms (+{time_since_last:.0f}ms)")

                # Handle contentBlockDelta events (unified format)
                if 'contentBlockDelta' in event:
                    delta = event['contentBlockDelta'].get('delta', {})
                    if 'text' in delta:
                        text = delta['text']
                        logger.info(f"[Bedrock-Converse] Yielding text ({len(text)} chars) at {time_since_start:.0f}ms: {repr(text[:30])}")
                        yield text
                elif 'messageStop' in event:
                    logger.info(f"[Bedrock-Converse] Stream complete at {time_since_start:.0f}ms. Total chunks: {chunk_count}")
                    break

        except Exception as e:
            raise Exception(f"AWS Bedrock Converse streaming error: {str(e)}")

    def extract_keywords(self, content: str, max_keywords: int = 10) -> list[str]:
        try:
            try:
                import boto3
            except ImportError:
                raise Exception("boto3 package not installed. Install with: pip install boto3")

            bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )

            prompt = PromptTemplates.get_keyword_extraction_prompt(content, max_keywords)

            # Use Converse API - unified format for all models
            response = bedrock.converse(
                modelId=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                inferenceConfig={
                    "maxTokens": 200,
                    "temperature": 0.5
                }
            )

            # Extract text from unified response format
            output_message = response['output']['message']
            keywords_text = output_message['content'][0]['text'].strip()

            return [k.strip() for k in keywords_text.split(',') if k.strip()]

        except Exception as e:
            raise Exception(f"AWS Bedrock Converse API error: {str(e)}")


def create_llm_client(llm_config: Dict[str, Any]) -> LLMClient:
    """Factory function to create appropriate LLM client"""
    provider = llm_config.get("provider", "").lower()

    if not provider:
        raise ValueError("LLM provider not configured")

    if provider == "openai":
        api_key = llm_config.get("apiKey", "")
        model = llm_config.get("model", "")

        if not api_key:
            raise ValueError("OpenAI API key not configured")
        if not model:
            raise ValueError("OpenAI model not configured")

        return OpenAIClient(api_key=api_key, model=model)

    elif provider == "anthropic":
        api_key = llm_config.get("apiKey", "")
        model = llm_config.get("model", "")

        if not api_key:
            raise ValueError("Anthropic API key not configured")
        if not model:
            raise ValueError("Anthropic model not configured")

        return AnthropicClient(api_key=api_key, model=model)

    elif provider == "bedrock":
        aws_access_key_id = llm_config.get("awsAccessKeyId", "")
        aws_secret_access_key = llm_config.get("awsSecretAccessKey", "")
        aws_region = llm_config.get("awsRegion", "")
        model = llm_config.get("model", "")

        if not aws_access_key_id:
            raise ValueError("AWS Access Key ID not configured")
        if not aws_secret_access_key:
            raise ValueError("AWS Secret Access Key not configured")
        if not aws_region:
            raise ValueError("AWS region not configured")
        if not model:
            raise ValueError("Bedrock model not configured")

        return BedrockClient(
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_region=aws_region,
            model=model
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
