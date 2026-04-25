"""
Cohere Rerank API Client
Reranks search results for better relevance
"""

from typing import List, Dict, Any
import logging

try:
    import cohere
    COHERE_AVAILABLE = True
except ImportError:
    COHERE_AVAILABLE = False

logger = logging.getLogger(__name__)


class CohereReranker:
    """Cohere Rerank API client"""

    def __init__(self, api_key: str, model: str = "rerank-english-v3.0"):
        """
        Initialize Cohere reranker

        Args:
            api_key: Cohere API key
            model: Rerank model name
        """
        if not COHERE_AVAILABLE:
            raise ImportError("cohere package not installed. Install with: pip install cohere")

        self.api_key = api_key
        self.model = model
        self.client = cohere.Client(api_key)

        logger.info(f"Initialized Cohere reranker with model: {model}")

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents based on query relevance

        Args:
            query: Search query
            documents: List of document dicts with 'chunk_id' and 'text' keys
            top_n: Number of top results to return

        Returns:
            Reranked documents with relevance scores
        """
        if not documents:
            return []

        # Extract texts for reranking
        texts = [doc['text'] for doc in documents]

        try:
            # Call Cohere Rerank API
            response = self.client.rerank(
                query=query,
                documents=texts,
                top_n=min(top_n, len(documents)),
                model=self.model,
                return_documents=True
            )

            # Map reranked results back to original documents
            reranked = []
            for result in response.results:
                original_doc = documents[result.index]
                reranked.append({
                    **original_doc,
                    'rerank_score': result.relevance_score,
                    'rerank_index': result.index
                })

            logger.debug(f"Reranked {len(documents)} documents to top {len(reranked)}")
            return reranked

        except Exception as e:
            logger.error(f"Failed to rerank documents: {e}")
            # Fallback: return original documents without reranking
            logger.warning("Returning original document order as fallback")
            return documents[:top_n]

    async def rerank_async(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Async version of rerank (Cohere SDK doesn't have true async yet)

        Args:
            query: Search query
            documents: List of documents
            top_n: Number of results

        Returns:
            Reranked documents
        """
        # Cohere Python SDK doesn't have async support yet
        # Run in executor would be ideal, but for now just call sync version
        return self.rerank(query, documents, top_n)


class MockReranker:
    """Mock reranker for testing without Cohere API"""

    def __init__(self):
        logger.info("Initialized mock reranker (no API calls)")

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """Return documents as-is with mock scores"""
        logger.debug(f"Mock reranking {len(documents)} documents")

        # Just assign descending scores
        for i, doc in enumerate(documents[:top_n]):
            doc['rerank_score'] = 1.0 - (i * 0.05)
            doc['rerank_index'] = i

        return documents[:top_n]

    async def rerank_async(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """Async mock rerank"""
        return self.rerank(query, documents, top_n)
