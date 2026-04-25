"""
RAG API Routes
Index management and chunk retrieval endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/chat", tags=["RAG"])

# Global indexer instance (will be set by main.py)
_indexer = None


def set_indexer(indexer):
    """Set global indexer instance"""
    global _indexer
    _indexer = indexer


def get_indexer():
    """Get indexer instance"""
    if _indexer is None:
        raise HTTPException(status_code=500, detail="Indexer not initialized")
    return _indexer


# ============================================================================
# Response Models
# ============================================================================

class IndexStatusResponse(BaseModel):
    """Index status response"""
    status: str  # current, updating, stale, error
    total_chunks: int
    last_indexed: Optional[str]
    new_transcripts_available: int
    indexing_progress: float
    indexing_error: Optional[str] = None


class IndexRefreshResponse(BaseModel):
    """Index refresh trigger response"""
    status: str
    message: str
    estimated_time: Optional[str] = None


class ChunkContextResponse(BaseModel):
    """Chunk context response"""
    chunk_id: str
    chunk_text: str
    paragraph_context: str
    channel: str
    title: str
    date: str
    transcript_path: str
    chunk_position: str  # "3 of 12"


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/index/status", response_model=IndexStatusResponse)
async def get_index_status():
    """
    Get current index status

    Returns index state, chunk count, and whether new transcripts are available
    """
    try:
        indexer = get_indexer()
        status = indexer.get_index_status()

        return IndexStatusResponse(**status)

    except Exception as e:
        logger.error(f"Failed to get index status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/refresh", response_model=IndexRefreshResponse)
async def trigger_index_refresh(background_tasks: BackgroundTasks):
    """
    Trigger full index rebuild in background

    Starts indexing all transcripts asynchronously
    """
    try:
        indexer = get_indexer()

        # Check if already indexing
        current_status = indexer.get_index_status()
        if current_status['status'] == 'updating':
            return IndexRefreshResponse(
                status="already_running",
                message="Index refresh already in progress",
                estimated_time=None
            )

        # Start background indexing
        background_tasks.add_task(indexer.rebuild_full_index_sync)

        logger.info("Index refresh triggered")

        return IndexRefreshResponse(
            status="started",
            message="Index refresh started in background",
            estimated_time="2-10 minutes depending on transcript count"
        )

    except Exception as e:
        logger.error(f"Failed to trigger index refresh: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chunks/{chunk_id}/context", response_model=ChunkContextResponse)
async def get_chunk_context(chunk_id: str):
    """
    Get chunk context for citation modal

    Returns the chunk text, surrounding paragraph context, and metadata

    Args:
        chunk_id: Chunk identifier (format: channel__filename__index)
    """
    try:
        indexer = get_indexer()

        # Get chunk from vector store
        chunk = indexer.vector_store.get_chunk(chunk_id)

        if not chunk:
            raise HTTPException(status_code=404, detail=f"Chunk not found: {chunk_id}")

        metadata = chunk['metadata']

        # Parse chunk position from ID
        parts = chunk_id.split('__')
        if len(parts) >= 3:
            chunk_index = int(parts[2])
            total_chunks = metadata.get('total_chunks', '?')
            chunk_position = f"{chunk_index + 1} of {total_chunks}"
        else:
            chunk_position = "unknown"

        return ChunkContextResponse(
            chunk_id=chunk_id,
            chunk_text=chunk['text'],
            paragraph_context=metadata.get('paragraph_context', chunk['text']),
            channel=metadata.get('channel', 'Unknown'),
            title=metadata.get('title', 'Unknown'),
            date=metadata.get('date', 'Unknown'),
            transcript_path=metadata.get('transcript_path', ''),
            chunk_position=chunk_position
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chunk context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/index/stats")
async def get_index_stats() -> Dict[str, Any]:
    """
    Get detailed index statistics

    Returns:
        Statistics about vector store and BM25 index
    """
    try:
        indexer = get_indexer()

        vector_stats = indexer.vector_store.get_stats()
        bm25_stats = indexer.bm25_store.get_stats()

        return {
            "vector_store": vector_stats,
            "bm25_store": bm25_stats,
            "last_indexed": indexer.last_indexed,
            "status": indexer.status.value
        }

    except Exception as e:
        logger.error(f"Failed to get index stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
