"""
RAG Chat Service
Orchestrates retrieval and LLM generation for chat
"""

import json
import uuid
from typing import List, Dict, Any, AsyncGenerator, Optional
from datetime import datetime
import logging

from .retriever import HybridRetriever
from ..chat.models import ChatDatabase
from ..llm_client import create_llm_client

logger = logging.getLogger(__name__)


class ChatResponse:
    """Chat response container"""
    
    def __init__(self, type: str, content: Optional[str] = None, sources: Optional[List[Dict[str, Any]]] = None,
                 stats: Optional[Dict[str, Any]] = None, message_id: Optional[str] = None, error: Optional[str] = None):
        self.type = type
        self.content = content
        self.sources = sources
        self.stats = stats
        self.message_id = message_id
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        data = {'type': self.type}
        if self.content is not None:
            data['content'] = self.content
        if self.sources is not None:
            data['sources'] = self.sources
        if self.stats is not None:
            data['stats'] = self.stats
        if self.message_id is not None:
            data['message_id'] = self.message_id
        if self.error is not None:
            data['error'] = self.error
        return data


class RAGChatService:
    """RAG chat service combining retrieval and generation"""
    
    def __init__(self, retriever: HybridRetriever, chat_db: ChatDatabase, llm_config: Dict[str, Any]):
        self.retriever = retriever
        self.chat_db = chat_db
        self.llm_config = llm_config
        logger.info("Initialized RAG chat service")
    
    def _estimate_tokens(self, text: str) -> int:
        return len(text) // 4
    
    def _build_prompt(self, query: str, retrieved_chunks: List, conversation_history: List[Dict[str, str]] = None) -> str:
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            metadata = chunk.metadata
            context_parts.append(
                f"[Source {i}] {metadata.get('channel', 'Unknown')} - \"{metadata.get('title', 'Unknown')}\" ({metadata.get('date', 'Unknown')})\n{chunk.text}\n"
            )
        context = "\n".join(context_parts)
        
        history = ""
        if conversation_history:
            for msg in conversation_history[-5:]:
                history += f"{msg['role'].capitalize()}: {msg['content']}\n\n"
        
        return f"""You are an AI assistant analyzing YouTube video transcripts.

Retrieved Context:
{context}

{history}User: {query}

Instructions:
- Provide structured answer citing sources
- Format: **@ChannelName** (Date): point...
- Keep concise and actionable
- Only use provided context"""
    
    def _format_sources(self, retrieved_chunks: List) -> List[Dict[str, Any]]:
        sources = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            metadata = chunk.metadata
            sources.append({
                'chunk_id': chunk.chunk_id,
                'channel': metadata.get('channel', 'Unknown'),
                'title': metadata.get('title', 'Unknown'),
                'date': metadata.get('date', 'Unknown'),
                'excerpt': chunk.text[:200] + '...' if len(chunk.text) > 200 else chunk.text,
                'rank': i
            })
        return sources
    
    async def generate_answer(self, conversation_id: str, query: str, channel_filters: Optional[List[str]] = None) -> AsyncGenerator[ChatResponse, None]:
        """Main RAG pipeline with streaming"""
        message_id = str(uuid.uuid4())
        logs_queue = []

        async def log_callback(msg: str):
            """Callback for retriever to send logs"""
            logs_queue.append(msg)

        try:
            yield ChatResponse(type='start', message_id=message_id)
            yield ChatResponse(type='log', content='Starting RAG pipeline...')

            # Get conversation history
            messages = self.chat_db.get_messages(conversation_id)
            history = [{'role': msg.role, 'content': msg.content} for msg in messages[-5:]]

            # Save user message
            user_msg = self.chat_db.add_message(
                conversation_id=conversation_id,
                role='user',
                content=query,
                input_tokens=self._estimate_tokens(query),
                channel_filters=channel_filters
            )

            # Retrieve relevant chunks with streaming logs
            logger.info(f"Retrieving chunks for query: {query[:50]}...")

            retrieved_chunks = await self.retriever.retrieve(query, channel_filters, log_callback=log_callback)

            # Send all accumulated logs
            for log_msg in logs_queue:
                yield ChatResponse(type='log', content=log_msg)
            
            if not retrieved_chunks:
                yield ChatResponse(type='log', content='No relevant information found')
                yield ChatResponse(type='error', error='No relevant information found')
                return

            # Build prompt
            yield ChatResponse(type='log', content='Building prompt with retrieved context...')
            prompt = self._build_prompt(query, retrieved_chunks, history)
            input_tokens = self._estimate_tokens(prompt)

            # Generate answer with LLM streaming
            yield ChatResponse(type='log', content='Calling Bedrock Claude Opus 4.7...')
            llm_client = create_llm_client(self.llm_config)
            full_response = ""
            output_tokens = 0

            # Use the LLM's streaming method
            async for chunk in llm_client.generate_summary_stream_async(
                content=prompt,
                keywords=[],  # No keywords needed for chat
                title="Chat Response"  # Generic title
            ):
                full_response += chunk
                output_tokens = self._estimate_tokens(full_response)
                yield ChatResponse(type='chunk', content=chunk)
            
            # Format sources
            yield ChatResponse(type='log', content='Preparing source citations...')
            sources = self._format_sources(retrieved_chunks)
            yield ChatResponse(type='sources', sources=sources)

            # Save assistant message
            yield ChatResponse(type='log', content='Saving to database...')
            self.chat_db.add_message(
                conversation_id=conversation_id,
                role='assistant',
                content=full_response,
                output_tokens=output_tokens,
                documents_retrieved=len(retrieved_chunks),
                sources=sources
            )

            # Send stats
            stats = {
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'embedding_tokens': self._estimate_tokens(query),
                'documents_retrieved': len(retrieved_chunks),
                'llm_calls': 1
            }
            yield ChatResponse(type='stats', stats=stats)

            # Update conversation title if first message
            if len(messages) == 0:
                title = query[:50] + '...' if len(query) > 50 else query
                self.chat_db.update_conversation_title(conversation_id, title)
                yield ChatResponse(type='log', content='Conversation created')

            yield ChatResponse(type='log', content='✓ Complete')
            yield ChatResponse(type='done')
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}", exc_info=True)
            yield ChatResponse(type='error', error=str(e))
