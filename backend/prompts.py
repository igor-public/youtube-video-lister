#!/usr/bin/env python3
"""
LLM Prompt Templates
Centralized prompt templates for consistency across all LLM providers
"""

from typing import List


class PromptTemplates:
    """Centralized prompt templates for LLM interactions"""

    @staticmethod
    def get_summary_prompt(title: str, content: str, keywords: List[str] = None) -> str:
        """
        Generate summary prompt based on whether keywords are provided

        Args:
            title: Video title
            content: Transcript content
            keywords: Optional list of keywords to focus on

        Returns:
            Formatted prompt string
        """
        if keywords and len(keywords) > 0:
            return PromptTemplates._get_keyword_focused_prompt(title, content, keywords)
        else:
            return PromptTemplates._get_bullet_point_prompt(title, content)

    @staticmethod
    def _get_keyword_focused_prompt(title: str, content: str, keywords: List[str]) -> str:
        """Prompt for keyword-focused summary (3-4 paragraphs)"""
        keywords_str = ", ".join(keywords)
        return f"""Please provide a comprehensive summary of the following video transcript titled "{title}".

Focus particularly on these topics: {keywords_str}

Transcript:
{content[:100000]}

Provide a summary in 3-4 paragraphs that:
1. Highlights key points related to: {keywords_str}
2. Captures main arguments and insights
3. Notes any actionable takeaways or predictions"""

    @staticmethod
    def _get_bullet_point_prompt(title: str, content: str) -> str:
        """Prompt for general bullet-point summary"""
        return f"""Please provide a concise summary of the following video transcript titled "{title}".

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

    @staticmethod
    def get_keyword_extraction_prompt(content: str, max_keywords: int = 10) -> str:
        """
        Generate prompt for keyword extraction

        Args:
            content: Transcript content
            max_keywords: Maximum number of keywords to extract

        Returns:
            Formatted prompt string
        """
        return f"""Extract {max_keywords} key topics/keywords from this transcript. Return only a comma-separated list.

Transcript:
{content[:50000]}

Keywords:"""

    @staticmethod
    def get_system_message(provider: str) -> str:
        """
        Get system message for providers that support it (OpenAI)

        Args:
            provider: LLM provider name

        Returns:
            System message string
        """
        if provider.lower() == "openai":
            return "You are a helpful assistant that summarizes video transcripts clearly and concisely."
        return ""  # Anthropic and Bedrock don't use separate system messages
