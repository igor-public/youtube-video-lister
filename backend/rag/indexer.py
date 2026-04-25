"""
Background Indexer Service
Handles transcript indexing for RAG system
"""

import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import logging

from .chunker import SentenceChunker
from .embeddings import BedrockEmbeddings
from .vector_store import VectorStore
from .bm25_store import BM25Store

logger = logging.getLogger(__name__)


class IndexStatus(str, Enum):
    """Index status enumeration"""
    CURRENT = "current"
    UPDATING = "updating"
    STALE = "stale"
    ERROR = "error"


class BackgroundIndexer:
    """Background service for indexing transcripts"""

    def __init__(
        self,
        vector_store: VectorStore,
        bm25_store: BM25Store,
        embeddings_client: BedrockEmbeddings,
        chunker: SentenceChunker,
        transcript_dir: Path
    ):
        """
        Initialize indexer

        Args:
            vector_store: ChromaDB vector store
            bm25_store: BM25 keyword store
            embeddings_client: Bedrock embeddings client
            chunker: Text chunker
            transcript_dir: Directory containing transcripts
        """
        self.vector_store = vector_store
        self.bm25_store = bm25_store
        self.embeddings_client = embeddings_client
        self.chunker = chunker
        self.transcript_dir = transcript_dir

        self.status = IndexStatus.CURRENT
        self.last_indexed: Optional[str] = None
        self.total_chunks_indexed: int = 0
        self.indexing_progress: float = 0.0
        self.indexing_error: Optional[str] = None

        logger.info("Background indexer initialized")

    def _read_transcript(self, transcript_path: Path) -> str:
        """
        Read transcript file content

        Args:
            transcript_path: Path to transcript file

        Returns:
            Transcript text
        """
        try:
            with open(transcript_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read transcript {transcript_path}: {e}")
            raise

    def _extract_metadata_from_path(self, transcript_path: Path) -> Dict[str, Any]:
        """
        Extract metadata from transcript file path

        Args:
            transcript_path: Path to transcript file

        Returns:
            Metadata dictionary
        """
        # Expected structure: channel_data/ChannelName/filename.md
        parts = transcript_path.parts

        if len(parts) < 2:
            raise ValueError(f"Invalid transcript path structure: {transcript_path}")

        channel = parts[-2]  # Parent directory is channel name
        filename = transcript_path.name

        # Try to extract date from filename (e.g., video_20260420.md)
        import re
        date_match = re.search(r'(\d{8})', filename)
        date = None
        if date_match:
            date_str = date_match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y%m%d')
                date = date_obj.strftime('%Y-%m-%d')
            except:
                pass

        # Extract title (first line of transcript or filename)
        try:
            with open(transcript_path, 'r', encoding='utf-8') as f:
                first_line = f.readline().strip()
                # Remove markdown heading markers
                title = first_line.lstrip('#').strip() if first_line else filename
        except:
            title = filename

        return {
            "channel": channel,
            "filename": filename,
            "title": title,
            "date": date or "unknown",
            "transcript_path": str(transcript_path)
        }

    async def index_transcript(self, transcript_path: Path) -> int:
        """
        Index a single transcript file

        Args:
            transcript_path: Path to transcript file

        Returns:
            Number of chunks created
        """
        logger.info(f"Indexing transcript: {transcript_path}")

        try:
            # Read transcript
            text = self._read_transcript(transcript_path)

            if not text or not text.strip():
                logger.warning(f"Empty transcript: {transcript_path}")
                return 0

            # Extract metadata
            metadata = self._extract_metadata_from_path(transcript_path)

            # Chunk transcript
            chunks = self.chunker.chunk_transcript(text, metadata)

            if not chunks:
                logger.warning(f"No chunks created for: {transcript_path}")
                return 0

            # Prepare chunks for embedding
            chunk_texts = [chunk.text for chunk in chunks]

            # Generate embeddings (async)
            logger.info(f"Generating embeddings for {len(chunk_texts)} chunks...")
            embeddings = await self.embeddings_client.embed_texts_async(
                chunk_texts,
                input_type="search_document"
            )

            # Prepare data for vector store
            vector_chunks = []
            for i, chunk in enumerate(chunks):
                vector_chunks.append({
                    'id': chunk.id,
                    'text': chunk.text,
                    'metadata': {
                        **chunk.metadata,
                        'paragraph_context': chunk.paragraph_context
                    }
                })

            # Add to vector store
            self.vector_store.add_chunks(vector_chunks, embeddings)

            # Prepare data for BM25 store
            bm25_chunks = []
            for chunk in chunks:
                bm25_chunks.append({
                    'id': chunk.id,
                    'text': chunk.text,
                    'metadata': chunk.metadata
                })

            # Add to BM25 store
            self.bm25_store.add_chunks(bm25_chunks)

            logger.info(f"Successfully indexed {len(chunks)} chunks from {transcript_path}")
            return len(chunks)

        except Exception as e:
            logger.error(f"Failed to index transcript {transcript_path}: {e}")
            raise

    def index_transcript_sync(self, transcript_path: Path) -> int:
        """
        Index transcript synchronously (wrapper for async)

        Args:
            transcript_path: Path to transcript file

        Returns:
            Number of chunks created
        """
        return asyncio.run(self.index_transcript(transcript_path))

    async def rebuild_full_index(self) -> Dict[str, Any]:
        """
        Rebuild entire index from all transcripts in transcript_dir

        Returns:
            Indexing statistics
        """
        logger.info("Starting full index rebuild...")
        self.status = IndexStatus.UPDATING
        self.indexing_progress = 0.0
        self.indexing_error = None

        start_time = datetime.utcnow()

        try:
            # Find all transcript files
            transcript_files = list(self.transcript_dir.rglob("*.md"))
            total_files = len(transcript_files)

            if total_files == 0:
                logger.warning(f"No transcript files found in {self.transcript_dir}")
                self.status = IndexStatus.CURRENT
                self.last_indexed = datetime.utcnow().isoformat()
                return {
                    "status": "success",
                    "total_files": 0,
                    "total_chunks": 0,
                    "elapsed_seconds": 0
                }

            logger.info(f"Found {total_files} transcript files to index")

            # Reset stores
            self.vector_store.reset()
            self.bm25_store.reset()

            # Index each file
            total_chunks = 0
            for i, transcript_path in enumerate(transcript_files):
                try:
                    chunks_count = await self.index_transcript(transcript_path)
                    total_chunks += chunks_count

                    # Update progress
                    self.indexing_progress = (i + 1) / total_files
                    logger.info(f"Progress: {self.indexing_progress * 100:.1f}% ({i + 1}/{total_files})")

                except Exception as e:
                    logger.error(f"Failed to index {transcript_path}: {e}")
                    # Continue with other files
                    continue

            # Finalize
            end_time = datetime.utcnow()
            elapsed = (end_time - start_time).total_seconds()

            self.status = IndexStatus.CURRENT
            self.last_indexed = end_time.isoformat()
            self.total_chunks_indexed = total_chunks
            self.indexing_progress = 1.0

            stats = {
                "status": "success",
                "total_files": total_files,
                "total_chunks": total_chunks,
                "elapsed_seconds": elapsed,
                "chunks_per_file": total_chunks / total_files if total_files > 0 else 0
            }

            logger.info(f"Index rebuild complete: {stats}")
            return stats

        except Exception as e:
            self.status = IndexStatus.ERROR
            self.indexing_error = str(e)
            logger.error(f"Index rebuild failed: {e}")
            raise

    def rebuild_full_index_sync(self) -> Dict[str, Any]:
        """
        Rebuild full index synchronously

        Returns:
            Indexing statistics
        """
        return asyncio.run(self.rebuild_full_index())

    def get_index_status(self) -> Dict[str, Any]:
        """
        Get current index status

        Returns:
            Status dictionary
        """
        # Count new transcripts not yet indexed
        new_transcripts = self._count_new_transcripts()

        # Determine status
        if self.status == IndexStatus.UPDATING:
            status = IndexStatus.UPDATING
        elif new_transcripts > 0:
            status = IndexStatus.STALE
        else:
            status = IndexStatus.CURRENT

        return {
            "status": status.value,
            "total_chunks": self.vector_store.count(),
            "last_indexed": self.last_indexed,
            "new_transcripts_available": new_transcripts,
            "indexing_progress": self.indexing_progress,
            "indexing_error": self.indexing_error
        }

    def _count_new_transcripts(self) -> int:
        """
        Count transcripts not yet indexed

        Returns:
            Number of new transcripts
        """
        try:
            # Get all transcript files
            all_transcripts = set(str(p) for p in self.transcript_dir.rglob("*.md"))

            # Get indexed channels from vector store
            indexed_channels = self.vector_store.get_all_channels()

            # This is a simplified check - in production, track indexed files
            # For now, just check if we have any transcripts vs indexed chunks
            if self.vector_store.count() == 0 and len(all_transcripts) > 0:
                return len(all_transcripts)

            # TODO: Implement proper tracking of indexed files
            return 0

        except Exception as e:
            logger.error(f"Failed to count new transcripts: {e}")
            return 0

    def delete_channel_index(self, channel: str):
        """
        Delete all indexed data for a channel

        Args:
            channel: Channel name
        """
        logger.info(f"Deleting index for channel: {channel}")

        try:
            self.vector_store.delete_by_channel(channel)
            # BM25 doesn't have delete_by_channel, so rebuild index
            self.rebuild_full_index_sync()

            logger.info(f"Successfully deleted index for channel: {channel}")

        except Exception as e:
            logger.error(f"Failed to delete channel index: {e}")
            raise
