"""
Unit tests for the RAG chat layer.

Covers the four fixes applied in the backend refactor:
  1. Indexer channel extraction must walk the path to find the component
     immediately after "channel_data" (not blindly use parts[-2]).
  2. @mentions must be stripped from the query text BEFORE it reaches the
     embedding model / BM25 tokenizer, even when channel_filters is supplied.
  3. The chat pipeline uses the new ``generate_chat_stream_async`` on the LLM
     client — no double-prompt wrapping.
  4. Empty retrieval falls through to a context-free prompt (no hard abort).
"""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from backend.rag import retriever as retriever_module
from backend.rag.retriever import HybridRetriever, strip_channel_mentions
from backend.rag.indexer import BackgroundIndexer
from backend.rag.chat_service import RAGChatService


# ---------------------------------------------------------------------------
# Item 1: channel extraction
# ---------------------------------------------------------------------------


def _make_indexer(transcript_dir: Path) -> BackgroundIndexer:
    """Construct an indexer with all collaborators mocked — we only test
    path parsing here so the stores / embeddings never get called."""
    return BackgroundIndexer(
        vector_store=MagicMock(),
        bm25_store=MagicMock(),
        embeddings_client=MagicMock(),
        chunker=MagicMock(),
        transcript_dir=transcript_dir,
    )


def test_channel_extraction_uses_channel_data_anchor(tmp_path, monkeypatch):
    """Path .../channel_data/Foo/transcripts/bar.md must yield channel='Foo'."""
    transcript_path = Path("/tmp/fake/channel_data/Foo/transcripts/bar.md")
    indexer = _make_indexer(transcript_dir=Path("/tmp/fake/channel_data"))

    # Stub the file read so we don't need the file on disk.
    monkeypatch.setattr(
        BackgroundIndexer,
        "_read_transcript",
        lambda self, p: "# dummy title\nbody text",
    )
    # Patch ``open`` as used inside _extract_metadata_from_path for title line.
    import builtins
    real_open = builtins.open

    def fake_open(path, *args, **kwargs):
        if str(path) == str(transcript_path):
            from io import StringIO
            return StringIO("# Fake Title\nrest")
        return real_open(path, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", fake_open)

    metadata = indexer._extract_metadata_from_path(transcript_path)

    assert metadata["channel"] == "Foo", (
        f"Expected channel='Foo', got {metadata['channel']!r}. "
        "Bug: indexer is still using parts[-2] which returns 'transcripts'."
    )
    assert metadata["filename"] == "bar.md"


def test_channel_extraction_real_layout(tmp_path, monkeypatch):
    """Simulate the production layout channel_data/BitcoinStrategy/transcripts/x.md."""
    transcript_path = Path(
        "/home/x/channel_data/BitcoinStrategy/transcripts/video_20260101.md"
    )
    indexer = _make_indexer(transcript_dir=Path("/home/x/channel_data"))

    import builtins
    real_open = builtins.open

    def fake_open(path, *args, **kwargs):
        if str(path) == str(transcript_path):
            from io import StringIO
            return StringIO("# Title\n")
        return real_open(path, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", fake_open)

    metadata = indexer._extract_metadata_from_path(transcript_path)
    assert metadata["channel"] == "BitcoinStrategy"
    assert metadata["date"] == "2026-01-01"


# ---------------------------------------------------------------------------
# Item 2: @mention stripping
# ---------------------------------------------------------------------------


def test_strip_channel_mentions_basic():
    cleaned, mentions = strip_channel_mentions("summarise @Foo for me")
    assert cleaned == "summarise for me"
    assert mentions == ["Foo"]


def test_strip_channel_mentions_multiple():
    cleaned, mentions = strip_channel_mentions("compare @Foo and @Bar opinions")
    assert cleaned == "compare and opinions"
    assert mentions == ["Foo", "Bar"]


def test_strip_channel_mentions_none():
    cleaned, mentions = strip_channel_mentions("no mentions here")
    assert cleaned == "no mentions here"
    assert mentions == []


def test_strip_channel_mentions_empty():
    cleaned, mentions = strip_channel_mentions("")
    assert cleaned == ""
    assert mentions == []


def test_retriever_strips_mentions_even_when_filters_supplied():
    """
    Regression test: the previous retriever skipped _parse_channel_filters
    when channel_filters was already provided, letting '@Foo' leak into the
    embed call and BM25 tokenization. The fix: always strip mentions.
    """
    captured = {}

    async def fake_embed(query):
        captured["embedded_query"] = query
        return [0.0] * 1024

    vector_store = MagicMock()
    vector_store.search.return_value = []
    bm25_store = MagicMock()
    bm25_store.search.return_value = []

    # Reranker is only async when vector/bm25 results are non-empty — but
    # merge will be empty here so reranker is never awaited. Still provide
    # an object.
    reranker = MagicMock()

    embeddings_client = SimpleNamespace(embed_query_async=fake_embed)

    retriever = HybridRetriever(
        vector_store=vector_store,
        bm25_store=bm25_store,
        embeddings_client=embeddings_client,
        reranker=reranker,
    )

    import asyncio
    asyncio.get_event_loop()
    asyncio.run(
        retriever.retrieve(
            query="summarise @Foo for me",
            channel_filters=["Foo"],  # pre-supplied
        )
    )

    assert "@Foo" not in captured["embedded_query"], (
        f"Mention leaked into embedding call: {captured['embedded_query']!r}"
    )
    assert captured["embedded_query"] == "summarise for me"

    # BM25 must also receive the cleaned query, not the raw @-laden one.
    bm25_call = bm25_store.search.call_args
    assert bm25_call is not None
    bm25_query = bm25_call.kwargs.get("query") or bm25_call.args[0]
    assert "@Foo" not in bm25_query


def test_retriever_parses_mentions_when_filters_none():
    """When channel_filters=None, @mentions must still be parsed and stripped."""
    captured = {}

    async def fake_embed(query):
        captured["embedded_query"] = query
        return [0.0] * 1024

    vector_store = MagicMock()
    vector_store.search.return_value = []
    bm25_store = MagicMock()
    bm25_store.search.return_value = []

    embeddings_client = SimpleNamespace(embed_query_async=fake_embed)

    retriever = HybridRetriever(
        vector_store=vector_store,
        bm25_store=bm25_store,
        embeddings_client=embeddings_client,
        reranker=MagicMock(),
    )

    import asyncio
    asyncio.run(
        retriever.retrieve(
            query="what did @BitcoinStrategy say",
            channel_filters=None,
        )
    )

    assert captured["embedded_query"] == "what did say"
    vector_call = vector_store.search.call_args
    assert vector_call.kwargs.get("channel_filter") == ["BitcoinStrategy"]


# ---------------------------------------------------------------------------
# Items 3 + 5: chat pipeline calls generate_chat_stream_async AND has a
# graceful empty-retrieval fallback.
# ---------------------------------------------------------------------------


def _collect(async_gen):
    """Drain an async generator into a list (sync helper for tests)."""
    import asyncio
    out = []

    async def _drain():
        async for item in async_gen:
            out.append(item)

    asyncio.run(_drain())
    return out


def _make_chat_service(
    retrieved_chunks,
    llm_chunks,
    retrieved_chunks_unfiltered=None,
):
    """Build a RAGChatService with mocks. Returns (service, llm_client_mock)."""

    # Retriever returns different results depending on channel_filters, to
    # simulate the "filter empty, un-filtered non-empty" path.
    class FakeRetriever:
        def __init__(self):
            self.calls = []

        async def retrieve(self, query, channel_filters=None, log_callback=None):
            self.calls.append(channel_filters)
            if channel_filters:
                return retrieved_chunks
            return (
                retrieved_chunks_unfiltered
                if retrieved_chunks_unfiltered is not None
                else retrieved_chunks
            )

    retriever = FakeRetriever()

    # Fake ChatDatabase
    chat_db = MagicMock()
    chat_db.get_messages.return_value = []
    chat_db.add_message.return_value = MagicMock(id="msg-id")

    # Fake LLM client exposing the new chat-stream method.
    captured_prompt = {}

    class FakeLLMClient:
        async def generate_chat_stream_async(self, prompt):
            captured_prompt["prompt"] = prompt
            for c in llm_chunks:
                yield c

        # Should NEVER be called in the new path.
        async def generate_summary_stream_async(self, content, keywords, title):
            captured_prompt["called_summary_instead"] = True
            if False:
                yield ""

    fake_llm = FakeLLMClient()

    service = RAGChatService(
        retriever=retriever,
        chat_db=chat_db,
        llm_config={"provider": "bedrock", "model": "test-model"},
    )

    # Patch create_llm_client to return our fake client.
    import backend.rag.chat_service as cs_mod
    cs_mod.create_llm_client = lambda cfg: fake_llm

    return service, fake_llm, retriever, captured_prompt


def _fake_chunk(channel="Foo", title="T", date="2026-01-01", text="body"):
    return SimpleNamespace(
        chunk_id=f"{channel}__f__0",
        text=text,
        metadata={"channel": channel, "title": title, "date": date},
    )


def test_chat_uses_generate_chat_stream_async_not_summary():
    """Item 3: chat service must call generate_chat_stream_async with the RAG prompt
    directly, NOT generate_summary_stream_async which would double-wrap it."""
    chunks = [_fake_chunk()]
    service, fake_llm, _retr, captured = _make_chat_service(
        retrieved_chunks=chunks, llm_chunks=["Hello ", "world"]
    )

    events = _collect(
        service.generate_answer(
            conversation_id="conv-1",
            query="what happened",
            channel_filters=["Foo"],
        )
    )

    # We got chunked content
    chunk_events = [e for e in events if e.type == "chunk"]
    assert "".join(e.content for e in chunk_events) == "Hello world"

    # The prompt passed to the LLM is the RAG prompt, not double-wrapped.
    assert "Retrieved Context:" in captured["prompt"]
    assert "transcript titled" not in captured["prompt"], (
        "Prompt appears to have been wrapped by the summarise-transcript template."
    )
    assert "called_summary_instead" not in captured


def test_chat_empty_retrieval_falls_through_to_no_context_prompt():
    """Item 5: empty retrieval (both filtered + un-filtered) must fall through
    to the context-free prompt rather than hard-aborting with an error."""
    service, fake_llm, retriever, captured = _make_chat_service(
        retrieved_chunks=[],  # filtered empty
        retrieved_chunks_unfiltered=[],  # un-filtered also empty
        llm_chunks=["I have no context but here is a reply."],
    )

    events = _collect(
        service.generate_answer(
            conversation_id="conv-2",
            query="anything",
            channel_filters=["Foo"],
        )
    )

    # Must NOT emit an error event.
    error_events = [e for e in events if e.type == "error"]
    assert not error_events, f"Unexpected error events: {[e.error for e in error_events]}"

    # Must have called the LLM with the no-context prompt.
    assert "No relevant transcript excerpts" in captured["prompt"]

    # Should have tried filtered retrieval first, then retried un-filtered.
    assert retriever.calls == [["Foo"], None], (
        f"Expected filtered then un-filtered retrieval, got {retriever.calls}"
    )

    # Chunks got streamed.
    chunk_events = [e for e in events if e.type == "chunk"]
    assert "".join(e.content for e in chunk_events).startswith("I have no context")


def test_chat_empty_filtered_retrieval_retries_unfiltered_and_succeeds():
    """Item 5 variant: filtered retrieval empty but un-filtered returns results."""
    service, fake_llm, retriever, captured = _make_chat_service(
        retrieved_chunks=[],
        retrieved_chunks_unfiltered=[_fake_chunk(channel="Foo")],
        llm_chunks=["ok"],
    )

    events = _collect(
        service.generate_answer(
            conversation_id="conv-3",
            query="anything",
            channel_filters=["Foo"],
        )
    )

    error_events = [e for e in events if e.type == "error"]
    assert not error_events

    # Context prompt (not no-context) because un-filtered retry worked.
    assert "Retrieved Context:" in captured["prompt"]
    assert retriever.calls == [["Foo"], None]
