"""
BM25 Keyword Search Store
Handles traditional keyword-based search using BM25 algorithm
"""

import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BM25Store:
    """BM25 keyword search index for transcript chunks"""

    def __init__(self, index_path: Path):
        """
        Initialize BM25 store

        Args:
            index_path: Path to pickle file for persistence
        """
        self.index_path = index_path
        self.index_path.parent.mkdir(parents=True, exist_ok=True)

        self.corpus: List[str] = []  # List of chunk texts
        self.doc_ids: List[str] = []  # Corresponding chunk IDs
        self.metadata_map: Dict[str, Dict[str, Any]] = {}  # chunk_id -> metadata
        self.bm25_model: Optional[BM25Okapi] = None
        self.indexed_at: Optional[str] = None

        # Load existing index if available
        self._load()

    def _tokenize(self, text: str) -> List[str]:
        """
        Simple tokenization for BM25

        Args:
            text: Text to tokenize

        Returns:
            List of tokens (lowercase, split by whitespace)
        """
        return text.lower().split()

    def build_index(self, chunks: List[Dict[str, Any]]):
        """
        Build BM25 index from chunks

        Args:
            chunks: List of chunk dictionaries with keys:
                - id: Unique identifier
                - text: Chunk text content
                - metadata: Dict with channel, filename, title, date, etc.
        """
        if not chunks:
            logger.warning("No chunks provided to build BM25 index")
            return

        logger.info(f"Building BM25 index from {len(chunks)} chunks...")

        # Reset index
        self.corpus = []
        self.doc_ids = []
        self.metadata_map = {}

        # Build corpus
        for chunk in chunks:
            chunk_id = chunk['id']
            text = chunk['text']
            metadata = chunk.get('metadata', {})

            self.corpus.append(text)
            self.doc_ids.append(chunk_id)
            self.metadata_map[chunk_id] = metadata

        # Tokenize corpus
        tokenized_corpus = [self._tokenize(doc) for doc in self.corpus]

        # Build BM25 model
        self.bm25_model = BM25Okapi(tokenized_corpus)
        self.indexed_at = datetime.utcnow().isoformat()

        logger.info(f"BM25 index built successfully with {len(self.corpus)} documents")

        # Persist to disk
        self._save()

    def search(
        self,
        query: str,
        n_results: int = 20,
        channel_filter: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search using BM25 keyword matching

        Args:
            query: Search query
            n_results: Number of results to return
            channel_filter: Optional list of channel names to filter by

        Returns:
            List of matching chunks with metadata and BM25 scores
        """
        if not self.bm25_model or not self.corpus:
            logger.warning("BM25 index is empty, returning no results")
            return []

        # Tokenize query
        tokenized_query = self._tokenize(query)

        # Get BM25 scores for all documents
        scores = self.bm25_model.get_scores(tokenized_query)

        # Create list of (index, score) tuples
        doc_scores = [(i, scores[i]) for i in range(len(scores))]

        # Filter by channel if specified
        if channel_filter:
            filtered_scores = []
            for idx, score in doc_scores:
                chunk_id = self.doc_ids[idx]
                metadata = self.metadata_map.get(chunk_id, {})
                if metadata.get('channel') in channel_filter:
                    filtered_scores.append((idx, score))
            doc_scores = filtered_scores

        # Sort by score (descending)
        doc_scores.sort(key=lambda x: x[1], reverse=True)

        # Take top N results
        top_results = doc_scores[:n_results]

        # Format results
        results = []
        for idx, score in top_results:
            chunk_id = self.doc_ids[idx]
            results.append({
                'chunk_id': chunk_id,
                'text': self.corpus[idx],
                'metadata': self.metadata_map.get(chunk_id, {}),
                'bm25_score': float(score)
            })

        logger.debug(f"BM25 search returned {len(results)} results")
        return results

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Add new chunks to existing index (incremental)

        Args:
            chunks: List of chunk dictionaries to add

        Note: This rebuilds the entire index - for large updates,
              consider using rebuild_index() instead
        """
        if not chunks:
            return

        logger.info(f"Adding {len(chunks)} chunks to BM25 index...")

        # Add to corpus
        for chunk in chunks:
            chunk_id = chunk['id']
            text = chunk['text']
            metadata = chunk.get('metadata', {})

            self.corpus.append(text)
            self.doc_ids.append(chunk_id)
            self.metadata_map[chunk_id] = metadata

        # Rebuild model
        tokenized_corpus = [self._tokenize(doc) for doc in self.corpus]
        self.bm25_model = BM25Okapi(tokenized_corpus)
        self.indexed_at = datetime.utcnow().isoformat()

        logger.info(f"BM25 index updated - now contains {len(self.corpus)} documents")

        # Persist
        self._save()

    def delete_chunks(self, chunk_ids: List[str]):
        """
        Delete chunks from index

        Args:
            chunk_ids: List of chunk IDs to delete
        """
        if not chunk_ids:
            return

        chunk_ids_set = set(chunk_ids)

        # Filter out deleted chunks
        new_corpus = []
        new_doc_ids = []
        new_metadata_map = {}

        for i, doc_id in enumerate(self.doc_ids):
            if doc_id not in chunk_ids_set:
                new_corpus.append(self.corpus[i])
                new_doc_ids.append(doc_id)
                new_metadata_map[doc_id] = self.metadata_map[doc_id]

        deleted_count = len(self.corpus) - len(new_corpus)

        # Update index
        self.corpus = new_corpus
        self.doc_ids = new_doc_ids
        self.metadata_map = new_metadata_map

        # Rebuild model if corpus not empty
        if self.corpus:
            tokenized_corpus = [self._tokenize(doc) for doc in self.corpus]
            self.bm25_model = BM25Okapi(tokenized_corpus)
            self.indexed_at = datetime.utcnow().isoformat()
        else:
            self.bm25_model = None

        logger.info(f"Deleted {deleted_count} chunks from BM25 index")

        # Persist
        self._save()

    def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """
        Get chunk by ID

        Args:
            chunk_id: Chunk identifier

        Returns:
            Chunk data with metadata, or None if not found
        """
        if chunk_id not in self.metadata_map:
            return None

        # Find index
        try:
            idx = self.doc_ids.index(chunk_id)
            return {
                'chunk_id': chunk_id,
                'text': self.corpus[idx],
                'metadata': self.metadata_map[chunk_id]
            }
        except ValueError:
            return None

    def count(self) -> int:
        """Get total number of documents in index"""
        return len(self.corpus)

    def reset(self):
        """Clear all data from index"""
        self.corpus = []
        self.doc_ids = []
        self.metadata_map = {}
        self.bm25_model = None
        self.indexed_at = None

        logger.warning("BM25 index reset - all data cleared")

        # Persist empty state
        self._save()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get index statistics

        Returns:
            Dictionary with index stats
        """
        channels = set()
        for metadata in self.metadata_map.values():
            if 'channel' in metadata:
                channels.add(metadata['channel'])

        return {
            "total_documents": self.count(),
            "total_channels": len(channels),
            "channels": sorted(list(channels)),
            "indexed_at": self.indexed_at,
            "index_path": str(self.index_path)
        }

    def _save(self):
        """Persist index to disk"""
        try:
            data = {
                "corpus": self.corpus,
                "doc_ids": self.doc_ids,
                "metadata_map": self.metadata_map,
                "bm25_model": self.bm25_model,
                "indexed_at": self.indexed_at,
                "version": "1.0"
            }

            with open(self.index_path, 'wb') as f:
                pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)

            logger.info(f"BM25 index saved to {self.index_path}")

        except Exception as e:
            logger.error(f"Failed to save BM25 index: {e}")

    def _load(self):
        """Load index from disk"""
        if not self.index_path.exists():
            logger.info("No existing BM25 index found")
            return

        try:
            with open(self.index_path, 'rb') as f:
                data = pickle.load(f)

            self.corpus = data.get("corpus", [])
            self.doc_ids = data.get("doc_ids", [])
            self.metadata_map = data.get("metadata_map", {})
            self.bm25_model = data.get("bm25_model")
            self.indexed_at = data.get("indexed_at")

            logger.info(f"BM25 index loaded from {self.index_path}")
            logger.info(f"Index contains {len(self.corpus)} documents, indexed at {self.indexed_at}")

        except Exception as e:
            logger.error(f"Failed to load BM25 index: {e}")
            logger.warning("Starting with empty BM25 index")
