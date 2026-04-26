"""
Unit tests for Chat API endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import app

client = TestClient(app)


class TestChatAPI:
    """Test suite for Chat API endpoints"""

    def test_create_conversation(self):
        """Test creating a new conversation"""
        response = client.post("/api/chat/conversations")

        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "created_at" in data
        assert isinstance(data["conversation_id"], str)
        assert len(data["conversation_id"]) > 0

    def test_list_conversations(self):
        """Test listing all conversations"""
        # Create a conversation first
        create_response = client.post("/api/chat/conversations")
        assert create_response.status_code == 200

        # List conversations
        response = client.get("/api/chat/conversations")

        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        assert len(data["conversations"]) > 0

    def test_get_conversation_messages(self):
        """Test retrieving conversation messages"""
        # Create conversation
        create_response = client.post("/api/chat/conversations")
        conversation_id = create_response.json()["conversation_id"]

        # Get messages (should be empty)
        response = client.get(f"/api/chat/conversations/{conversation_id}/messages")

        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert "stats" in data
        assert isinstance(data["messages"], list)
        assert len(data["messages"]) == 0

    def test_delete_conversation(self):
        """Test deleting a conversation"""
        # Create conversation
        create_response = client.post("/api/chat/conversations")
        conversation_id = create_response.json()["conversation_id"]

        # Delete it
        response = client.delete(f"/api/chat/conversations/{conversation_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_query_index_simple(self):
        """Test simple query to RAG index"""
        response = client.post(
            "/api/chat/query",
            json={
                "query": "What topics are discussed in the videos?",
                "channel_filters": None,
                "conversation_id": None
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "answer" in data
        assert "sources" in data
        assert "stats" in data
        assert "conversation_id" in data

        # Check answer is not empty
        assert isinstance(data["answer"], str)
        assert len(data["answer"]) > 0

        # Check sources
        assert isinstance(data["sources"], list)
        assert len(data["sources"]) > 0

        # Check stats
        assert isinstance(data["stats"], dict)
        assert "input_tokens" in data["stats"]
        assert "output_tokens" in data["stats"]
        assert "documents_retrieved" in data["stats"]

    def test_query_index_with_filter(self):
        """Test query with channel filter"""
        response = client.post(
            "/api/chat/query",
            json={
                "query": "What did they say about gold?",
                "channel_filters": ["PeterSchiff"],
                "conversation_id": None
            }
        )

        # Should succeed even if channel doesn't exist (just returns fewer/no results)
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data

    def test_query_index_with_mention(self):
        """Test query with @mention syntax"""
        response = client.post(
            "/api/chat/query",
            json={
                "query": "What did @PeterSchiff say about Bitcoin?",
                "channel_filters": None,  # Should auto-parse @mention
                "conversation_id": None
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data

    def test_query_index_with_existing_conversation(self):
        """Test query with existing conversation_id"""
        # Create conversation
        create_response = client.post("/api/chat/conversations")
        conversation_id = create_response.json()["conversation_id"]

        # Query with this conversation
        response = client.post(
            "/api/chat/query",
            json={
                "query": "Tell me about crypto",
                "channel_filters": None,
                "conversation_id": conversation_id
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["conversation_id"] == conversation_id

        # Check that message was added
        messages_response = client.get(f"/api/chat/conversations/{conversation_id}/messages")
        messages = messages_response.json()["messages"]
        assert len(messages) == 2  # User + Assistant

    def test_query_empty_string(self):
        """Test query with empty string should fail gracefully"""
        response = client.post(
            "/api/chat/query",
            json={
                "query": "",
                "channel_filters": None,
                "conversation_id": None
            }
        )

        # Should either return 422 (validation) or 500 (error)
        assert response.status_code in [422, 500]

    def test_query_invalid_conversation_id(self):
        """Test query with non-existent conversation_id"""
        response = client.post(
            "/api/chat/query",
            json={
                "query": "test",
                "channel_filters": None,
                "conversation_id": "invalid-uuid-12345"
            }
        )

        assert response.status_code == 404

    def test_index_status(self):
        """Test index status endpoint"""
        response = client.get("/api/chat/index/status")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "total_chunks" in data
        assert data["status"] in ["current", "stale", "updating"]

    def test_index_stats(self):
        """Test index statistics endpoint"""
        response = client.get("/api/chat/index/stats")

        assert response.status_code == 200
        data = response.json()
        assert "total_chunks" in data
        assert "total_transcripts" in data
        assert isinstance(data["total_chunks"], int)
        assert isinstance(data["total_transcripts"], int)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
