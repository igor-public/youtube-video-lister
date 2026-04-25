"""
Chat API Routes
Conversation management and messaging endpoints
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Global chat service instance
_chat_service = None


def set_chat_service(service):
    """Set global chat service instance"""
    global _chat_service
    _chat_service = service


def get_chat_service():
    """Get chat service instance"""
    if _chat_service is None:
        raise HTTPException(status_code=500, detail="Chat service not initialized")
    return _chat_service


# ============================================================================
# Request/Response Models
# ============================================================================

class ConversationCreateResponse(BaseModel):
    """Create conversation response"""
    conversation_id: str
    created_at: str


class ConversationSummary(BaseModel):
    """Conversation list item"""
    id: str
    title: Optional[str]
    created_at: str
    updated_at: str
    message_count: int
    total_tokens: int


class ConversationsListResponse(BaseModel):
    """List conversations response"""
    conversations: List[ConversationSummary]


class Message(BaseModel):
    """Message model"""
    id: str
    role: str
    content: str
    created_at: str
    channel_filters: Optional[List[str]] = None
    input_tokens: int = 0
    output_tokens: int = 0
    embedding_tokens: int = 0
    documents_retrieved: int = 0
    sources: Optional[List[Dict[str, Any]]] = None


class ConversationStats(BaseModel):
    """Conversation statistics"""
    total_input_tokens: int
    total_output_tokens: int
    total_embedding_tokens: int
    total_llm_calls: int
    total_documents_retrieved: int


class MessagesResponse(BaseModel):
    """Get messages response"""
    messages: List[Message]
    stats: ConversationStats


class MessageRequest(BaseModel):
    """Send message request"""
    query: str
    channel_filters: Optional[List[str]] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/conversations", response_model=ConversationCreateResponse)
async def create_conversation():
    """
    Create new conversation

    Returns conversation ID and creation timestamp
    """
    try:
        service = get_chat_service()
        conversation = service.chat_db.create_conversation()

        return ConversationCreateResponse(
            conversation_id=conversation.id,
            created_at=conversation.created_at
        )

    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations", response_model=ConversationsListResponse)
async def list_conversations(limit: int = 50):
    """
    Get all conversations ordered by update time

    Args:
        limit: Maximum number of conversations to return

    Returns:
        List of conversation summaries
    """
    try:
        service = get_chat_service()
        conversations = service.chat_db.get_all_conversations(limit=limit)

        summaries = []
        for conv in conversations:
            # Get message count
            messages = service.chat_db.get_messages(conv.id)
            total_tokens = conv.total_input_tokens + conv.total_output_tokens

            summaries.append(ConversationSummary(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=len(messages),
                total_tokens=total_tokens
            ))

        return ConversationsListResponse(conversations=summaries)

    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}/messages", response_model=MessagesResponse)
async def get_messages(conversation_id: str):
    """
    Get all messages for a conversation

    Args:
        conversation_id: Conversation UUID

    Returns:
        Messages and conversation statistics
    """
    try:
        service = get_chat_service()

        # Check conversation exists
        conversation = service.chat_db.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Get messages
        db_messages = service.chat_db.get_messages(conversation_id)

        messages = [
            Message(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
                channel_filters=msg.channel_filters,
                input_tokens=msg.input_tokens,
                output_tokens=msg.output_tokens,
                embedding_tokens=msg.embedding_tokens,
                documents_retrieved=msg.documents_retrieved,
                sources=msg.sources
            )
            for msg in db_messages
        ]

        stats = ConversationStats(
            total_input_tokens=conversation.total_input_tokens,
            total_output_tokens=conversation.total_output_tokens,
            total_embedding_tokens=conversation.total_embedding_tokens,
            total_llm_calls=conversation.total_llm_calls,
            total_documents_retrieved=conversation.total_documents_retrieved
        )

        return MessagesResponse(messages=messages, stats=stats)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """
    Delete a conversation and all its messages

    Args:
        conversation_id: Conversation UUID

    Returns:
        Success confirmation
    """
    try:
        service = get_chat_service()

        # Check conversation exists
        conversation = service.chat_db.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Delete conversation (cascades to messages)
        service.chat_db.delete_conversation(conversation_id)

        return {"success": True, "message": f"Conversation {conversation_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/conversations/{conversation_id}/message")
async def send_message(websocket: WebSocket, conversation_id: str):
    """
    Send message and stream response via WebSocket

    WebSocket protocol:
        Send: {"query": "question", "channel_filters": ["@Channel"]}
        Receive: {"type": "start|chunk|sources|stats|done|error", ...}

    Args:
        conversation_id: Conversation UUID
    """
    await websocket.accept()

    try:
        service = get_chat_service()

        # Check conversation exists
        conversation = service.chat_db.get_conversation(conversation_id)
        if not conversation:
            await websocket.send_json({
                'type': 'error',
                'error': 'Conversation not found'
            })
            await websocket.close()
            return

        # Receive message request
        data = await websocket.receive_json()
        query = data.get('query', '')
        channel_filters = data.get('channel_filters')

        if not query:
            await websocket.send_json({
                'type': 'error',
                'error': 'Query cannot be empty'
            })
            await websocket.close()
            return

        logger.info(f"WebSocket message received: {query[:50]}...")

        # Parse @mentions if not provided
        if channel_filters is None:
            from .retriever import HybridRetriever
            # Use static method for parsing
            import re
            mentions = re.findall(r'@(\w+)', query)
            channel_filters = mentions if mentions else None

        # Stream response
        async for response in service.generate_answer(conversation_id, query, channel_filters):
            await websocket.send_json(response.to_dict())

        await websocket.close()

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                'type': 'error',
                'error': str(e)
            })
            await websocket.close()
        except:
            pass
