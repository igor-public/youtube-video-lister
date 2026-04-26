"""
SQLite data models for chat conversations and messages
"""

import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class Conversation:
    """Conversation model"""
    id: str
    created_at: str
    updated_at: str
    title: Optional[str] = None
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_embedding_tokens: int = 0
    total_llm_calls: int = 0
    total_documents_retrieved: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class Message:
    """Message model"""
    id: str
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: str
    input_tokens: int = 0
    output_tokens: int = 0
    embedding_tokens: int = 0
    documents_retrieved: int = 0
    sources: Optional[List[Dict[str, Any]]] = None
    channel_filters: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        # Keep sources and channel_filters as lists in dict representation
        return data


class ChatDatabase:
    """SQLite database manager for chat history"""

    def __init__(self, db_path: Path):
        """Initialize database connection"""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        logger.info(f"Chat database initialized at {db_path}")

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with row factory"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_database(self):
        """Initialize database schema"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                title TEXT,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                total_embedding_tokens INTEGER DEFAULT 0,
                total_llm_calls INTEGER DEFAULT 0,
                total_documents_retrieved INTEGER DEFAULT 0
            )
        """)

        # Create messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                embedding_tokens INTEGER DEFAULT 0,
                documents_retrieved INTEGER DEFAULT 0,
                sources TEXT,
                channel_filters TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_conversation
            ON messages(conversation_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_updated
            ON conversations(updated_at DESC)
        """)

        conn.commit()
        conn.close()

        logger.info("Database schema initialized successfully")

    def create_conversation(self, title: Optional[str] = None) -> Conversation:
        """Create new conversation"""
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        conversation = Conversation(
            id=conv_id,
            created_at=now,
            updated_at=now,
            title=title
        )

        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO conversations (
                id, created_at, updated_at, title,
                total_input_tokens, total_output_tokens,
                total_embedding_tokens, total_llm_calls,
                total_documents_retrieved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            conversation.id,
            conversation.created_at,
            conversation.updated_at,
            conversation.title,
            conversation.total_input_tokens,
            conversation.total_output_tokens,
            conversation.total_embedding_tokens,
            conversation.total_llm_calls,
            conversation.total_documents_retrieved
        ))

        conn.commit()
        conn.close()

        logger.info(f"Created conversation {conv_id}")
        return conversation

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM conversations WHERE id = ?
        """, (conversation_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return Conversation(**dict(row))
        return None

    def get_all_conversations(self, limit: int = 50) -> List[Conversation]:
        """Get all conversations ordered by update time"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM conversations
            ORDER BY updated_at DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        return [Conversation(**dict(row)) for row in rows]

    def update_conversation_title(self, conversation_id: str, title: str):
        """Update conversation title"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ?
        """, (title, datetime.now(timezone.utc).isoformat(), conversation_id))

        conn.commit()
        conn.close()

        logger.info(f"Updated conversation {conversation_id} title to: {title}")

    def update_conversation_stats(
        self,
        conversation_id: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        embedding_tokens: int = 0,
        llm_calls: int = 0,
        documents_retrieved: int = 0
    ):
        """Update conversation statistics (incremental)"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE conversations
            SET
                total_input_tokens = total_input_tokens + ?,
                total_output_tokens = total_output_tokens + ?,
                total_embedding_tokens = total_embedding_tokens + ?,
                total_llm_calls = total_llm_calls + ?,
                total_documents_retrieved = total_documents_retrieved + ?,
                updated_at = ?
            WHERE id = ?
        """, (
            input_tokens,
            output_tokens,
            embedding_tokens,
            llm_calls,
            documents_retrieved,
            datetime.now(timezone.utc).isoformat(),
            conversation_id
        ))

        conn.commit()
        conn.close()

    def delete_conversation(self, conversation_id: str):
        """Delete conversation and all messages (CASCADE)"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM conversations WHERE id = ?
        """, (conversation_id,))

        conn.commit()
        conn.close()

        logger.info(f"Deleted conversation {conversation_id}")

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        embedding_tokens: int = 0,
        documents_retrieved: int = 0,
        sources: Optional[List[Dict[str, Any]]] = None,
        channel_filters: Optional[List[str]] = None
    ) -> Message:
        """Add message to conversation"""
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        message = Message(
            id=msg_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            created_at=now,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            embedding_tokens=embedding_tokens,
            documents_retrieved=documents_retrieved,
            sources=sources,
            channel_filters=channel_filters
        )

        conn = self._get_connection()
        cursor = conn.cursor()

        # Serialize lists to JSON
        sources_json = json.dumps(sources) if sources else None
        filters_json = json.dumps(channel_filters) if channel_filters else None

        cursor.execute("""
            INSERT INTO messages (
                id, conversation_id, role, content, created_at,
                input_tokens, output_tokens, embedding_tokens,
                documents_retrieved, sources, channel_filters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            message.id,
            message.conversation_id,
            message.role,
            message.content,
            message.created_at,
            message.input_tokens,
            message.output_tokens,
            message.embedding_tokens,
            message.documents_retrieved,
            sources_json,
            filters_json
        ))

        conn.commit()
        conn.close()

        # Update conversation stats
        self.update_conversation_stats(
            conversation_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            embedding_tokens=embedding_tokens,
            llm_calls=1 if role == 'assistant' else 0,
            documents_retrieved=documents_retrieved
        )

        logger.info(f"Added {role} message to conversation {conversation_id}")
        return message

    def get_messages(self, conversation_id: str) -> List[Message]:
        """Get all messages for a conversation"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        """, (conversation_id,))

        rows = cursor.fetchall()
        conn.close()

        messages = []
        for row in rows:
            data = dict(row)
            # Deserialize JSON fields
            if data['sources']:
                data['sources'] = json.loads(data['sources'])
            if data['channel_filters']:
                data['channel_filters'] = json.loads(data['channel_filters'])
            messages.append(Message(**data))

        return messages

    def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation with all messages and stats"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return None

        messages = self.get_messages(conversation_id)

        return {
            "conversation": conversation.to_dict(),
            "messages": [msg.to_dict() for msg in messages],
            "message_count": len(messages)
        }

    def close(self):
        """Close database connection (for cleanup)"""
        # SQLite connections are per-operation, nothing to close
        logger.info("Chat database closed")
