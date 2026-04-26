"""
Hybrid Retriever
Combines vector search, BM25 keyword search, and reranking
"""

from typing import List, Dict, Any, Optional, Tuple
import re
import logging

from .vector_store import VectorStore
from .bm25_store import BM25Store
from .embeddings import BedrockEmbeddings
from .reranker import CohereReranker

logger = logging.getLogger(__name__)


# Module-level regexes so we don't recompile on every call
_MENTION_RE = re.compile(r'@(\w+)')
_WHITESPACE_RE = re.compile(r'\s+')


def strip_channel_mentions(query: str) -> Tuple[str, List[str]]:
    """
    Remove @Channel mentions from a query string.

    This is the single source of truth for mention stripping. Both the
    retriever (before embedding / BM25) and any other caller that needs a
    clean query should use this helper. It must run even when the caller
    has already supplied channel_filters, because the raw @Token noise
    leaks into the embedding model and the BM25 tokenizer otherwise.

    Args:
        query: Raw user query, possibly containing @Mentions.

    Returns:
        (cleaned_query, mentions) where cleaned_query has mentions removed
        and mentions is a list of channel names (without the @).
    """
    if not query:
        return query, []

    mentions = _MENTION_RE.findall(query)
    cleaned = _MENTION_RE.sub('', query)
    cleaned = _WHITESPACE_RE.sub(' ', cleaned).strip()
    return cleaned, mentions


class RetrievedChunk:
    """Container for retrieved chunk with scores"""

    def __init__(
        self,
        chunk_id: str,
        text: str,
        metadata: Dict[str, Any],
        vector_score: float = 0.0,
        bm25_score: float = 0.0,
        rerank_score: float = 0.0,
        final_score: float = 0.0
    ):
        self.chunk_id = chunk_id
        self.text = text
        self.metadata = metadata
        self.vector_score = vector_score
        self.bm25_score = bm25_score
        self.rerank_score = rerank_score
        self.final_score = final_score

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'chunk_id': self.chunk_id,
            'text': self.text,
            'metadata': self.metadata,
            'scores': {
                'vector': self.vector_score,
                'bm25': self.bm25_score,
                'rerank': self.rerank_score,
                'final': self.final_score
            }
        }


class HybridRetriever:
    """Hybrid retrieval combining vector search, BM25, and reranking"""

    def __init__(
        self,
        vector_store: VectorStore,
        bm25_store: BM25Store,
        embeddings_client: BedrockEmbeddings,
        reranker: CohereReranker,
        vector_top_k: int = 20,
        bm25_top_k: int = 20,
        rerank_top_k: int = 10,
        final_top_k: int = 5
    ):
        """
        Initialize hybrid retriever

        Args:
            vector_store: ChromaDB vector store
            bm25_store: BM25 keyword store
            embeddings_client: Bedrock embeddings client
            reranker: Cohere reranker
            vector_top_k: Number of results from vector search
            bm25_top_k: Number of results from BM25
            rerank_top_k: Number of results after reranking
            final_top_k: Final number of results to return
        """
        self.vector_store = vector_store
        self.bm25_store = bm25_store
        self.embeddings_client = embeddings_client
        self.reranker = reranker

        self.vector_top_k = vector_top_k
        self.bm25_top_k = bm25_top_k
        self.rerank_top_k = rerank_top_k
        self.final_top_k = final_top_k

        logger.info(f"Initialized hybrid retriever: vector={vector_top_k}, bm25={bm25_top_k}, rerank={rerank_top_k}, final={final_top_k}")

    def _parse_channel_filters(self, query: str) -> Tuple[str, List[str]]:
        """
        Parse @channel mentions from query (thin wrapper around
        strip_channel_mentions kept for backward compatibility).

        Args:
            query: User query with optional @channel mentions

        Returns:
            Tuple of (cleaned_query, channel_filters)
        """
        cleaned_query, mentions = strip_channel_mentions(query)
        if mentions:
            logger.debug(f"Parsed channels: {mentions}, cleaned query: {cleaned_query}")
        return cleaned_query, mentions

    async def retrieve(
        self,
        query: str,
        channel_filters: Optional[List[str]] = None,
        top_k: Optional[int] = None,
        log_callback = None
    ) -> List[RetrievedChunk]:
        """
        Retrieve relevant chunks using hybrid search

        Args:
            query: Search query
            channel_filters: Optional list of channel names to filter
            top_k: Override final_top_k

        Returns:
            List of retrieved chunks with scores
        """
        if top_k is None:
            top_k = self.final_top_k

        logger.info(f"Retrieving chunks for query: '{query[:50]}...'")

        # Always strip @mentions from the text that will be embedded / tokenised,
        # regardless of whether channel_filters was supplied by the caller. The
        # @Token noise must never reach the embedding model or BM25 tokenizer.
        cleaned_query, parsed_mentions = strip_channel_mentions(query)

        if channel_filters is None:
            # No pre-supplied filters — use whatever we parsed from the query.
            channel_filters = parsed_mentions if parsed_mentions else None

        # Query passed to embedding / BM25 from here on is the cleaned version.
        query = cleaned_query

        if channel_filters:
            logger.info(f"Filtering by channels: {channel_filters}")
            if log_callback:
                await log_callback(f"Filtering to: {', '.join(channel_filters)}")

        # Step 1: Embed query
        if log_callback:
            await log_callback("Step 1/6: Embedding query (Bedrock Cohere v3)...")
        logger.info(f"Embedding query text: {query!r}")
        query_embedding = await self.embeddings_client.embed_query_async(query)
        if log_callback:
            await log_callback("Query embedded successfully")

        # Step 2: Vector search
        if log_callback:
            await log_callback(f"Step 2/6: Vector search in ChromaDB (top {self.vector_top_k})...")
        logger.debug(f"Performing vector search (top {self.vector_top_k})...")
        vector_results = self.vector_store.search(
            query_embedding=query_embedding,
            n_results=self.vector_top_k,
            channel_filter=channel_filters if channel_filters else None
        )
        if log_callback:
            await log_callback(f"Found {len(vector_results)} vector matches")

        # Step 3: BM25 search
        if log_callback:
            await log_callback(f"Step 3/6: BM25 keyword search (top {self.bm25_top_k})...")
        logger.debug(f"Performing BM25 search (top {self.bm25_top_k})...")
        bm25_results = self.bm25_store.search(
            query=query,
            n_results=self.bm25_top_k,
            channel_filter=channel_filters if channel_filters else None
        )
        if log_callback:
            await log_callback(f"Found {len(bm25_results)} keyword matches")

        # Step 4: Merge results
        if log_callback:
            await log_callback("Step 4/6: Merging and deduplicating...")
        logger.debug("Merging vector and BM25 results...")
        merged = self._merge_results(vector_results, bm25_results)

        if not merged:
            logger.warning("No results found")
            if log_callback:
                await log_callback("No results found!")
            return []

        if log_callback:
            await log_callback(f"Merged to {len(merged)} unique chunks")

        # Step 5: Rerank with Cohere
        if log_callback:
            await log_callback(f"Step 5/6: Reranking (top {self.rerank_top_k})...")
        logger.debug(f"Reranking {len(merged)} candidates (top {self.rerank_top_k})...")
        reranked = await self.reranker.rerank_async(
            query=query,
            documents=merged,
            top_n=self.rerank_top_k
        )
        if log_callback:
            await log_callback(f"Reranked to {len(reranked)} results")

        # Step 6: Select final top K
        if log_callback:
            await log_callback(f"Step 6/6: Selecting top {top_k} for LLM...")
        final_results = reranked[:top_k]

        # Convert to RetrievedChunk objects
        chunks = []
        for result in final_results:
            chunk = RetrievedChunk(
                chunk_id=result['chunk_id'],
                text=result['text'],
                metadata=result['metadata'],
                vector_score=result.get('vector_score', 0.0),
                bm25_score=result.get('bm25_score', 0.0),
                rerank_score=result.get('rerank_score', 0.0),
                final_score=result.get('rerank_score', 0.0)  # Use rerank as final
            )
            chunks.append(chunk)

        logger.info(f"Retrieved {len(chunks)} final chunks")
        return chunks

    def _merge_results(
        self,
        vector_results: List[Dict[str, Any]],
        bm25_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Merge vector and BM25 results, removing duplicates

        Args:
            vector_results: Results from vector search
            bm25_results: Results from BM25 search

        Returns:
            Merged list of unique documents
        """
        merged = {}

        # Add vector results
        for result in vector_results:
            chunk_id = result['chunk_id']
            merged[chunk_id] = {
                'chunk_id': chunk_id,
                'text': result['text'],
                'metadata': result['metadata'],
                'vector_score': result.get('score', 0.0),
                'bm25_score': 0.0
            }

        # Add/update with BM25 results
        for result in bm25_results:
            chunk_id = result['chunk_id']
            if chunk_id in merged:
                # Update BM25 score
                merged[chunk_id]['bm25_score'] = result.get('bm25_score', 0.0)
            else:
                # Add new result
                merged[chunk_id] = {
                    'chunk_id': chunk_id,
                    'text': result['text'],
                    'metadata': result['metadata'],
                    'vector_score': 0.0,
                    'bm25_score': result.get('bm25_score', 0.0)
                }

        # Convert to list and sort by combined score
        merged_list = list(merged.values())

        # Simple combined score: average of normalized scores
        for doc in merged_list:
            combined = (doc['vector_score'] + doc['bm25_score']) / 2.0
            doc['combined_score'] = combined

        # Sort by combined score (descending)
        merged_list.sort(key=lambda x: x['combined_score'], reverse=True)

        logger.debug(f"Merged {len(merged_list)} unique documents from {len(vector_results)} vector + {len(bm25_results)} BM25")

        return merged_list

    def retrieve_sync(
        self,
        query: str,
        channel_filters: Optional[List[str]] = None,
        top_k: Optional[int] = None
    ) -> List[RetrievedChunk]:
        """
        Synchronous version of retrieve

        Args:
            query: Search query
            channel_filters: Optional channel filters
            top_k: Number of results

        Returns:
            Retrieved chunks
        """
        import asyncio
        return asyncio.run(self.retrieve(query, channel_filters, top_k))
