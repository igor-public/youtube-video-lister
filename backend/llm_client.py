#!/usr/bin/env python3
"""
LLM Client - Unified interface for multiple LLM providers
"""

import os
import json
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod


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

    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model

    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        try:
            try:
                import openai
            except ImportError:
                raise Exception("openai package not installed. Install with: pip install openai")
            openai.api_key = self.api_key

            if keywords and len(keywords) > 0:
                # Keyword-focused summary
                keywords_str = ", ".join(keywords)
                prompt = f"""Please provide a comprehensive summary of the following video transcript titled "{title}".

Focus particularly on these topics: {keywords_str}

Transcript:
{content[:8000]}  # Limit content length

Provide a summary in 3-4 paragraphs that:
1. Highlights key points related to: {keywords_str}
2. Captures main arguments and insights
3. Notes any actionable takeaways or predictions"""
            else:
                # Bullet point summary (no keywords)
                prompt = f"""Please provide a concise summary of the following video transcript titled "{title}".

Transcript:
{content[:8000]}  # Limit content length

Provide a summary with:
1. A brief 1-2 sentence overview
2. Maximum 10 bullet points covering the key topics and main points discussed

Format as:
Overview: [1-2 sentences]

Key Points:
• [point 1]
• [point 2]
..."""

            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes video transcripts clearly and concisely."},
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

            prompt = f"""Extract {max_keywords} key topics/keywords from this transcript. Return only a comma-separated list.

Transcript:
{content[:4000]}

Keywords:"""

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

    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.api_key = api_key
        self.model = model

    def generate_summary(self, content: str, keywords: list[str], title: str) -> str:
        try:
            try:
                import anthropic
            except ImportError:
                raise Exception("anthropic package not installed. Install with: pip install anthropic")

            client = anthropic.Anthropic(api_key=self.api_key)

            if keywords and len(keywords) > 0:
                # Keyword-focused summary
                keywords_str = ", ".join(keywords)
                prompt = f"""Please provide a comprehensive summary of the following video transcript titled "{title}".

Focus particularly on these topics: {keywords_str}

Transcript:
{content[:100000]}  # Claude has larger context window

Provide a summary in 3-4 paragraphs that:
1. Highlights key points related to: {keywords_str}
2. Captures main arguments and insights
3. Notes any actionable takeaways or predictions"""
            else:
                # Bullet point summary (no keywords)
                prompt = f"""Please provide a concise summary of the following video transcript titled "{title}".

Transcript:
{content[:100000]}  # Claude has larger context window

Provide a summary with:
1. A brief 1-2 sentence overview
2. Maximum 10 bullet points covering the key topics and main points discussed

Format as:
Overview: [1-2 sentences]

Key Points:
• [point 1]
• [point 2]
..."""

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

            prompt = f"""Extract {max_keywords} key topics/keywords from this transcript. Return only a comma-separated list, nothing else.

Transcript:
{content[:50000]}

Keywords:"""

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
                 aws_region: str = "us-east-1", model: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.aws_region = aws_region
        self.model = model

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

            if keywords and len(keywords) > 0:
                # Keyword-focused summary
                keywords_str = ", ".join(keywords)
                prompt = f"""Please provide a comprehensive summary of the following video transcript titled "{title}".

Focus particularly on these topics: {keywords_str}

Transcript:
{content[:100000]}

Provide a summary in 3-4 paragraphs that:
1. Highlights key points related to: {keywords_str}
2. Captures main arguments and insights
3. Notes any actionable takeaways or predictions"""
            else:
                # Bullet point summary (no keywords)
                prompt = f"""Please provide a concise summary of the following video transcript titled "{title}".

Transcript:
{content[:100000]}

Provide a summary with:
1. A brief 1-2 sentence overview
2. Maximum 10 bullet points covering the key topics and main points discussed

Format as:
Overview: [1-2 sentences]

Key Points:
• [point 1]
• [point 2]
..."""

            # Determine model type and format request accordingly
            is_openai = self.model.startswith('openai.')

            if is_openai:
                # OpenAI format
                body = json.dumps({
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.7
                })
            else:
                # Anthropic format
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1024,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                })

            response = bedrock.invoke_model(
                modelId=self.model,
                body=body
            )

            response_body = json.loads(response['body'].read())

            # Handle different response formats
            if 'content' in response_body:
                # Anthropic format
                return response_body['content'][0]['text'].strip()
            elif 'choices' in response_body:
                # OpenAI format
                return response_body['choices'][0]['message']['content'].strip()
            else:
                raise Exception(f"Unknown response format: {response_body}")

        except Exception as e:
            raise Exception(f"AWS Bedrock API error: {str(e)}")

    def generate_summary_stream(self, content: str, keywords: list[str], title: str):
        """Generate summary with true Bedrock streaming"""
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

            if keywords and len(keywords) > 0:
                # Keyword-focused summary
                keywords_str = ", ".join(keywords)
                prompt = f"""Please provide a comprehensive summary of the following video transcript titled "{title}".

Focus particularly on these topics: {keywords_str}

Transcript:
{content[:100000]}

Provide a summary in 3-4 paragraphs that:
1. Highlights key points related to: {keywords_str}
2. Captures main arguments and insights
3. Notes any actionable takeaways or predictions"""
            else:
                # Bullet point summary (no keywords)
                prompt = f"""Please provide a concise summary of the following video transcript titled "{title}".

Transcript:
{content[:100000]}

Provide a summary with:
1. A brief 1-2 sentence overview
2. Maximum 10 bullet points covering the key topics and main points discussed

Format as:
Overview: [1-2 sentences]

Key Points:
• [point 1]
• [point 2]
..."""

            # Determine model type and format request accordingly
            is_openai = self.model.startswith('openai.')
            is_anthropic = self.model.startswith('anthropic.') or self.model.startswith('us.anthropic.') or self.model.startswith('eu.anthropic.')

            if is_anthropic:
                # Use Anthropic streaming with invoke_model_with_response_stream
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1024,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                })

                response = bedrock.invoke_model_with_response_stream(
                    modelId=self.model,
                    body=body
                )

                # Stream the response
                for event in response['body']:
                    chunk = json.loads(event['chunk']['bytes'].decode())

                    if chunk['type'] == 'content_block_delta':
                        if 'delta' in chunk and 'text' in chunk['delta']:
                            yield chunk['delta']['text']
                    elif chunk['type'] == 'message_stop':
                        break

            elif is_openai:
                # OpenAI doesn't support streaming via Bedrock the same way
                # Fall back to word-by-word simulation
                body = json.dumps({
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.7
                })

                response = bedrock.invoke_model(
                    modelId=self.model,
                    body=body
                )

                response_body = json.loads(response['body'].read())

                if 'choices' in response_body:
                    full_text = response_body['choices'][0]['message']['content'].strip()
                    # Simulate streaming
                    import time
                    for char in full_text:
                        yield char
                        time.sleep(0.01)  # 10ms per character
            else:
                # Unknown model type - use non-streaming fallback
                summary = self.generate_summary(content, keywords, title)
                import time
                for char in summary:
                    yield char
                    time.sleep(0.01)

        except Exception as e:
            raise Exception(f"AWS Bedrock streaming error: {str(e)}")

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

            prompt = f"""Extract {max_keywords} key topics/keywords from this transcript. Return only a comma-separated list.

Transcript:
{content[:50000]}

Keywords:"""

            # Determine model type and format request accordingly
            is_openai = self.model.startswith('openai.')

            if is_openai:
                # OpenAI format
                body = json.dumps({
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 200,
                    "temperature": 0.5
                })
            else:
                # Anthropic format
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 200,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                })

            response = bedrock.invoke_model(
                modelId=self.model,
                body=body
            )

            response_body = json.loads(response['body'].read())

            # Handle different response formats
            if 'content' in response_body:
                # Anthropic format
                keywords_text = response_body['content'][0]['text'].strip()
            elif 'choices' in response_body:
                # OpenAI format
                keywords_text = response_body['choices'][0]['message']['content'].strip()
            else:
                raise Exception(f"Unknown response format: {response_body}")

            return [k.strip() for k in keywords_text.split(',') if k.strip()]

        except Exception as e:
            raise Exception(f"AWS Bedrock API error: {str(e)}")


def create_llm_client(llm_config: Dict[str, Any]) -> LLMClient:
    """Factory function to create appropriate LLM client"""
    provider = llm_config.get("provider", "").lower()

    if provider == "openai":
        return OpenAIClient(
            api_key=llm_config.get("apiKey", ""),
            model=llm_config.get("model", "gpt-4")
        )
    elif provider == "anthropic":
        return AnthropicClient(
            api_key=llm_config.get("apiKey", ""),
            model=llm_config.get("model", "claude-3-sonnet-20240229")
        )
    elif provider == "bedrock":
        return BedrockClient(
            aws_access_key_id=llm_config.get("awsAccessKeyId", ""),
            aws_secret_access_key=llm_config.get("awsSecretAccessKey", ""),
            aws_region=llm_config.get("awsRegion", "us-east-1"),
            model=llm_config.get("model", "anthropic.claude-3-sonnet-20240229-v1:0")
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
