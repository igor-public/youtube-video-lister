"""
ChromaDB Vector Store
Handles embedding storage and semantic search
"""

import chromadb
from chromadb.config import Settings
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class VectorStore:
    """ChromaDB wrapper for transcript chunk storage and retrieval"""

    def __init__(self, persist_directory: Path, collection_name: str = "transcript_chunks"):
        """
        Initialize ChromaDB vector store

        Args:
            persist_directory: Directory to persist ChromaDB data
            collection_name: Name of the collection
        """
        self.persist_directory = persist_directory
        self.collection_name = collection_name

        # Ensure directory exists
        persist_directory.mkdir(parents=True, exist_ok=True)

        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(
            path=str(persist_directory),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "YouTube transcript chunks with embeddings"}
        )

        logger.info(f"Vector store initialized at {persist_directory}")
        logger.info(f"Collection '{collection_name}' contains {self.collection.count()} documents")

    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ):
        """
        Add document chunks with embeddings to the collection

        Args:
            chunks: List of chunk dictionaries with keys:
                - id: Unique identifier (channel__filename__index)
                - text: Chunk text content
                - metadata: Dict with channel, filename, title, date, etc.
            embeddings: List of embedding vectors (1024-dim for Cohere v3)
        """
        if not chunks or not embeddings:
            return

        if len(chunks) != len(embeddings):
            raise ValueError(f"Chunks ({len(chunks)}) and embeddings ({len(embeddings)}) must have same length")

        ids = [chunk['id'] for chunk in chunks]
        documents = [chunk['text'] for chunk in chunks]
        metadatas = [chunk['metadata'] for chunk in chunks]

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

        logger.info(f"Added {len(chunks)} chunks to vector store")

    def search(
        self,
        query_embedding: List[float],
        n_results: int = 20,
        channel_filter: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using vector similarity

        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return
            channel_filter: Optional list of channel names to filter by

        Returns:
            List of matching chunks with metadata and scores
        """
        # Build where clause for channel filtering
        where_clause = None
        if channel_filter:
            if len(channel_filter) == 1:
                where_clause = {"channel": channel_filter[0]}
            else:
                where_clause = {"channel": {"$in": channel_filter}}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        chunks = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                chunks.append({
                    'chunk_id': results['ids'][0][i],
                    'text': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i],
                    'score': 1.0 / (1.0 + results['distances'][0][i])  # Convert distance to similarity score
                })

        logger.debug(f"Vector search returned {len(chunks)} results")
        return chunks

    def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific chunk by ID

        Args:
            chunk_id: Chunk identifier

        Returns:
            Chunk data with metadata, or None if not found
        """
        results = self.collection.get(
            ids=[chunk_id],
            include=["documents", "metadatas"]
        )

        if results['ids']:
            return {
                'chunk_id': results['ids'][0],
                'text': results['documents'][0],
                'metadata': results['metadatas'][0]
            }

        return None

    def delete_chunks(self, chunk_ids: List[str]):
        """
        Delete chunks by IDs

        Args:
            chunk_ids: List of chunk identifiers to delete
        """
        if not chunk_ids:
            return

        self.collection.delete(ids=chunk_ids)
        logger.info(f"Deleted {len(chunk_ids)} chunks from vector store")

    def delete_by_channel(self, channel: str):
        """
        Delete all chunks for a specific channel

        Args:
            channel: Channel name
        """
        self.collection.delete(
            where={"channel": channel}
        )
        logger.info(f"Deleted all chunks for channel: {channel}")

    def delete_by_filename(self, channel: str, filename: str):
        """
        Delete all chunks for a specific transcript file

        Args:
            channel: Channel name
            filename: Transcript filename
        """
        self.collection.delete(
            where={
                "$and": [
                    {"channel": channel},
                    {"filename": filename}
                ]
            }
        )
        logger.info(f"Deleted chunks for {channel}/{filename}")

    def get_all_channels(self) -> List[str]:
        """
        Get list of all unique channels in the collection

        Returns:
            List of channel names
        """
        # Get all metadatas
        results = self.collection.get(include=["metadatas"])

        if not results['metadatas']:
            return []

        channels = set(meta['channel'] for meta in results['metadatas'] if 'channel' in meta)
        return sorted(list(channels))

    def count(self) -> int:
        """Get total number of chunks in collection"""
        return self.collection.count()

    def reset(self):
        """Delete all data in collection (use with caution!)"""
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.create_collection(
            name=self.collection_name,
            metadata={"description": "YouTube transcript chunks with embeddings"}
        )
        logger.warning("Vector store collection reset - all data deleted")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get collection statistics

        Returns:
            Dictionary with collection stats
        """
        total_chunks = self.count()
        channels = self.get_all_channels()

        return {
            "total_chunks": total_chunks,
            "total_channels": len(channels),
            "channels": channels,
            "collection_name": self.collection_name
        }
