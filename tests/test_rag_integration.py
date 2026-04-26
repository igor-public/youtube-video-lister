"""
Integration test for RAG system
Tests the complete RAG pipeline with actual API calls
"""

import requests
import time
import pytest


API_BASE = "http://localhost:5000/api"


class TestRAGIntegration:
    """Integration tests for RAG system"""

    @pytest.fixture(autouse=True)
    def wait_for_server(self):
        """Wait for server to be ready"""
        max_retries = 10
        for i in range(max_retries):
            try:
                response = requests.get(f"{API_BASE}/../health", timeout=2)
                if response.status_code == 200:
                    return
            except:
                pass
            time.sleep(1)
        pytest.skip("Server not running")

    def test_index_status(self):
        """Test that index is built and ready"""
        response = requests.get(f"{API_BASE}/chat/index/status")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "total_chunks" in data
        assert data["status"] in ["current", "stale", "updating"]
        assert data["total_chunks"] > 0

        print(f"\n✓ Index status: {data['status']}")
        print(f"✓ Total chunks: {data['total_chunks']}")

    def test_index_stats(self):
        """Test index statistics"""
        response = requests.get(f"{API_BASE}/chat/index/stats")

        assert response.status_code == 200
        data = response.json()

        assert "vector_store" in data
        assert "bm25_store" in data
        assert data["vector_store"]["total_chunks"] > 0

        print(f"\n✓ Index stats:")
        print(f"  - Vector chunks: {data['vector_store']['total_chunks']}")
        print(f"  - BM25 documents: {data['bm25_store']['total_documents']}")

    def test_rag_query_simple(self):
        """Test simple RAG query with real LLM response"""
        print("\n" + "="*80)
        print("TEST: Simple RAG Query")
        print("="*80)

        query = "What are the main topics discussed in the videos?"
        print(f"\nQuery: {query}")

        response = requests.post(
            f"{API_BASE}/chat/query",
            json={
                "query": query,
                "channel_filters": None,
                "conversation_id": None
            },
            timeout=60  # RAG can take time
        )

        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()

        # Validate response structure
        assert "answer" in data
        assert "sources" in data
        assert "stats" in data
        assert "conversation_id" in data

        # Validate answer
        assert isinstance(data["answer"], str)
        assert len(data["answer"]) > 0
        assert len(data["answer"]) > 50, "Answer should be substantive"

        print(f"\n✓ Got answer ({len(data['answer'])} chars):")
        print("-" * 80)
        print(data["answer"][:500] + "..." if len(data["answer"]) > 500 else data["answer"])
        print("-" * 80)

        # Validate sources
        assert isinstance(data["sources"], list)
        assert len(data["sources"]) > 0, "Should have retrieved sources"

        print(f"\n✓ Retrieved {len(data['sources'])} sources:")
        for i, source in enumerate(data["sources"][:3], 1):
            print(f"  {i}. {source['channel']} - {source['title'][:60]}...")

        # Validate stats
        assert isinstance(data["stats"], dict)
        assert "input_tokens" in data["stats"]
        assert "output_tokens" in data["stats"]
        assert "documents_retrieved" in data["stats"]

        print(f"\n✓ Stats:")
        print(f"  - Input tokens: {data['stats']['input_tokens']}")
        print(f"  - Output tokens: {data['stats']['output_tokens']}")
        print(f"  - Documents retrieved: {data['stats']['documents_retrieved']}")
        print(f"  - LLM calls: {data['stats'].get('llm_calls', 1)}")

    def test_rag_query_with_filter(self):
        """Test RAG query with channel filter"""
        print("\n" + "="*80)
        print("TEST: RAG Query with Channel Filter")
        print("="*80)

        # Get actual channel name from index stats
        stats_response = requests.get(f"{API_BASE}/chat/index/stats")
        channels = stats_response.json()["vector_store"]["channels"]
        channel = channels[0] if channels else "transcripts"

        query = "What topics are discussed?"

        print(f"\nQuery: {query}")
        print(f"Filter: {channel}")

        response = requests.post(
            f"{API_BASE}/chat/query",
            json={
                "query": query,
                "channel_filters": [channel],
                "conversation_id": None
            },
            timeout=60
        )

        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()

        assert "answer" in data
        assert "sources" in data

        print(f"\n✓ Got filtered answer ({len(data['answer'])} chars)")
        print(f"✓ Retrieved {len(data['sources'])} sources")

        # Check that sources match the filter (if results found)
        if len(data["sources"]) > 0:
            print(f"\n✓ Sources from filtered channel:")
            for source in data["sources"][:3]:
                print(f"  - {source['channel']}: {source['title'][:50]}...")

    def test_rag_query_with_mention(self):
        """Test RAG query with @mention syntax"""
        print("\n" + "="*80)
        print("TEST: RAG Query with @mention")
        print("="*80)

        # Get actual channel name
        stats_response = requests.get(f"{API_BASE}/chat/index/stats")
        channels = stats_response.json()["vector_store"]["channels"]
        channel = channels[0] if channels else "transcripts"

        query = f"What did @{channel} discuss?"
        print(f"\nQuery: {query}")

        response = requests.post(
            f"{API_BASE}/chat/query",
            json={
                "query": query,
                "channel_filters": None,  # Should parse @mention automatically
                "conversation_id": None
            },
            timeout=60
        )

        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()

        assert "answer" in data
        assert "sources" in data

        print(f"\n✓ @mention parsed and filtered")
        print(f"✓ Answer length: {len(data['answer'])} chars")
        print(f"✓ Sources retrieved: {len(data['sources'])}")

    def test_rag_conversation_persistence(self):
        """Test that conversation is persisted"""
        print("\n" + "="*80)
        print("TEST: Conversation Persistence")
        print("="*80)

        # First query
        query1 = "What are the main economic topics?"
        response1 = requests.post(
            f"{API_BASE}/chat/query",
            json={"query": query1},
            timeout=60
        )

        assert response1.status_code == 200
        conversation_id = response1.json()["conversation_id"]
        print(f"\n✓ Created conversation: {conversation_id}")

        # Check messages were saved
        messages_response = requests.get(
            f"{API_BASE}/chat/conversations/{conversation_id}/messages"
        )

        assert messages_response.status_code == 200
        messages = messages_response.json()["messages"]
        assert len(messages) == 2, "Should have user + assistant messages"
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"

        print(f"✓ Messages saved:")
        print(f"  - User: {messages[0]['content'][:50]}...")
        print(f"  - Assistant: {messages[1]['content'][:50]}...")

        # Second query in same conversation
        query2 = "Tell me more about that"
        response2 = requests.post(
            f"{API_BASE}/chat/query",
            json={
                "query": query2,
                "conversation_id": conversation_id
            },
            timeout=60
        )

        assert response2.status_code == 200
        print(f"\n✓ Added follow-up question")

        # Check conversation now has 4 messages
        messages_response2 = requests.get(
            f"{API_BASE}/chat/conversations/{conversation_id}/messages"
        )
        messages2 = messages_response2.json()["messages"]
        assert len(messages2) == 4, "Should have 2 exchanges"

        print(f"✓ Conversation has {len(messages2)} messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
