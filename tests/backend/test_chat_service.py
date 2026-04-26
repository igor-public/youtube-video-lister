"""
Unit tests for backend.rag.chat_service.RAGChatService.

Focus: the pipeline must NOT hard-fail with "No relevant information found"
when retrieval returns zero chunks. Instead, it should fall back to a
context-free prompt so the LLM can answer meta / conversational / general
questions (e.g. "summary of the channel", "what can you do", "thanks").
"""

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from unittest.mock import patch

import pytest

from backend.rag.chat_service import RAGChatService


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------

@dataclass
class FakeChunk:
    chunk_id: str
    text: str
    metadata: Dict[str, Any]


class FakeRetriever:
    """Retriever stub. Returns whatever `chunks` it was given."""

    def __init__(self, chunks: Optional[List[FakeChunk]] = None):
        self.chunks = chunks or []
        self.calls = 0

    async def retrieve(self, query, channel_filters=None, log_callback=None):
        self.calls += 1
        if log_callback is not None:
            await log_callback("retriever stub invoked")
        return list(self.chunks)


class FakeMessage:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content


class FakeChatDatabase:
    """Minimal ChatDatabase stub: in-memory history, no side effects."""

    def __init__(self):
        self.messages: Dict[str, List[FakeMessage]] = {}
        self.titles: Dict[str, str] = {}

    def get_messages(self, conversation_id: str) -> List[FakeMessage]:
        return self.messages.get(conversation_id, [])

    def add_message(self, conversation_id, role, content, **kwargs):
        self.messages.setdefault(conversation_id, []).append(FakeMessage(role, content))
        return FakeMessage(role, content)

    def update_conversation_title(self, conversation_id, title):
        self.titles[conversation_id] = title


class FakeLLMClient:
    """Streams a fixed response word-by-word."""

    def __init__(self, text: str = "Hello there."):
        self.text = text
        self.last_prompt: Optional[str] = None
        self.last_keywords: Optional[list] = None

    async def generate_summary_stream_async(self, content: str, keywords, title):
        self.last_prompt = content
        self.last_keywords = list(keywords)
        for word in self.text.split():
            yield word + " "


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _collect(agen):
    return [item async for item in agen]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestEmptyRetrievalFallback:
    """Regression tests for: empty retrieval must not error out."""

    def _make_service(self, chunks: Optional[List[FakeChunk]] = None):
        retriever = FakeRetriever(chunks)
        chat_db = FakeChatDatabase()
        service = RAGChatService(retriever, chat_db, llm_config={"provider": "bedrock"})
        return service, retriever, chat_db

    def test_empty_retrieval_does_not_emit_error(self):
        """With no chunks retrieved, the service must not yield type='error'."""
        service, _, _ = self._make_service(chunks=[])
        llm = FakeLLMClient(text="I can summarize what you have indexed.")

        async def run():
            with patch("backend.rag.chat_service.create_llm_client", return_value=llm):
                return await _collect(service.generate_answer("conv-1", "summary of the channel"))

        responses = _run(run())

        types = [r.type for r in responses]
        assert "error" not in types, f"pipeline emitted error: {[r.error for r in responses if r.type == 'error']}"
        assert "start" in types
        assert "chunk" in types
        assert "done" in types

    def test_empty_retrieval_still_streams_llm_answer(self):
        """The LLM must still be called and its chunks streamed to the client."""
        service, _, _ = self._make_service(chunks=[])
        llm = FakeLLMClient(text="Here is what I can do for you.")

        async def run():
            with patch("backend.rag.chat_service.create_llm_client", return_value=llm):
                return await _collect(service.generate_answer("conv-2", "what can you do"))

        responses = _run(run())
        chunks = [r.content for r in responses if r.type == "chunk"]
        joined = "".join(chunks).strip()
        assert joined.startswith("Here is what I can do")

    def test_empty_retrieval_emits_no_sources(self):
        """Citation events should not fire when there are no retrieved chunks."""
        service, _, _ = self._make_service(chunks=[])
        llm = FakeLLMClient()

        async def run():
            with patch("backend.rag.chat_service.create_llm_client", return_value=llm):
                return await _collect(service.generate_answer("conv-3", "thanks"))

        responses = _run(run())
        assert not any(r.type == "sources" for r in responses)

    def test_empty_retrieval_prompt_is_context_free(self):
        """The prompt shipped to the LLM must not reference 'Retrieved Context'."""
        service, _, _ = self._make_service(chunks=[])
        llm = FakeLLMClient()

        async def run():
            with patch("backend.rag.chat_service.create_llm_client", return_value=llm):
                await _collect(service.generate_answer("conv-4", "summary of the channel"))

        _run(run())
        assert llm.last_prompt is not None
        assert "Retrieved Context" not in llm.last_prompt, (
            "Fallback prompt must not claim retrieved context exists"
        )


class TestPopulatedRetrievalUnchanged:
    """Make sure the happy path still works: sources event fires + prompt cites context."""

    def test_with_chunks_emits_sources_and_includes_context(self):
        chunk = FakeChunk(
            chunk_id="c-1",
            text="The Fed signalled a pause in May.",
            metadata={"channel": "MacroVoices", "title": "Fed pause", "date": "2026-04-22"},
        )
        service = RAGChatService(
            FakeRetriever([chunk]),
            FakeChatDatabase(),
            llm_config={"provider": "bedrock"},
        )
        llm = FakeLLMClient(text="MacroVoices says the Fed paused.")

        async def run():
            with patch("backend.rag.chat_service.create_llm_client", return_value=llm):
                return await _collect(service.generate_answer("conv-5", "what did MacroVoices say?"))

        responses = _run(run())
        assert any(r.type == "sources" for r in responses)
        src_event = next(r for r in responses if r.type == "sources")
        assert src_event.sources and src_event.sources[0]["channel"] == "MacroVoices"
        assert "Retrieved Context" in llm.last_prompt
        assert "Fed signalled a pause" in llm.last_prompt


class TestPromptBuilders:
    """Direct tests against the prompt helpers."""

    def test_no_context_prompt_mentions_no_retrieval(self):
        service = RAGChatService(FakeRetriever([]), FakeChatDatabase(), llm_config={})
        prompt = service._build_prompt_no_context("summary of the channel", None)
        assert "No indexed transcripts were retrieved" in prompt
        assert "summary of the channel" in prompt

    def test_context_prompt_includes_sources(self):
        service = RAGChatService(FakeRetriever([]), FakeChatDatabase(), llm_config={})
        chunk = FakeChunk(
            chunk_id="c-1",
            text="Bitcoin dominance is rising.",
            metadata={"channel": "BitcoinStrategy", "title": "BTC dom", "date": "2026-04-24"},
        )
        prompt = service._build_prompt("btc dominance?", [chunk], None)
        assert "[Source 1]" in prompt
        assert "BitcoinStrategy" in prompt
        assert "Bitcoin dominance is rising" in prompt

    def test_context_prompt_no_longer_forbids_outside_knowledge(self):
        """The old prompt said 'Only use provided context' — that was too strict."""
        service = RAGChatService(FakeRetriever([]), FakeChatDatabase(), llm_config={})
        chunk = FakeChunk(
            chunk_id="c-1",
            text="…",
            metadata={"channel": "x", "title": "y", "date": "z"},
        )
        prompt = service._build_prompt("q", [chunk], None)
        assert "Only use provided context" not in prompt
