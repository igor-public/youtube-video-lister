#!/usr/bin/env python3
"""
Test script for indexer and index management
Tests chunking, embeddings (mock), and indexing workflow
"""

import sys
import asyncio
from pathlib import Path
import logging

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from rag.chunker import SentenceChunker
from rag.vector_store import VectorStore
from rag.bm25_store import BM25Store
from rag.indexer import BackgroundIndexer

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Mock embeddings client for testing
class MockEmbeddings:
    """Mock embeddings client that returns random vectors"""

    def __init__(self):
        self.embedding_dimensions = 1024
        logger.info("Initialized mock embeddings client")

    async def embed_texts_async(self, texts, input_type=None):
        """Return mock embeddings"""
        import random
        logger.info(f"Generating mock embeddings for {len(texts)} texts")
        await asyncio.sleep(0.1)  # Simulate API call
        return [[random.random() for _ in range(1024)] for _ in texts]

    def embed_texts_sync(self, texts, input_type=None):
        """Sync version"""
        return asyncio.run(self.embed_texts_async(texts, input_type))


def create_sample_transcript():
    """Create a sample transcript file for testing"""
    test_dir = Path(__file__).parent.parent / "data" / "test_transcripts"
    test_dir.mkdir(parents=True, exist_ok=True)

    channel_dir = test_dir / "TestChannel"
    channel_dir.mkdir(exist_ok=True)

    transcript_path = channel_dir / "test_video_20260425.md"

    content = """# Bitcoin Analysis and Market Outlook

## Introduction
Bitcoin has been experiencing significant volatility in recent weeks. The cryptocurrency market continues to evolve as institutional adoption increases. Many analysts are watching key resistance levels closely.

## Market Analysis
The current price action suggests a potential breakout above $65,000. Historical data shows that similar patterns have led to substantial gains in the past. However, regulatory concerns remain a key factor.

## Technical Indicators
The RSI indicates oversold conditions. Moving averages are showing bullish crossover patterns. Volume has been increasing steadily, which is a positive sign for continued upward momentum.

## Investment Outlook
Long-term holders should consider dollar-cost averaging. Short-term traders need to watch support levels at $60,000. The halving event is expected to impact supply dynamics significantly.

## Conclusion
Bitcoin remains a compelling asset for portfolio diversification. The fundamental thesis for digital scarcity remains intact. Investors should maintain a balanced perspective and manage risk appropriately."""

    with open(transcript_path, 'w', encoding='utf-8') as f:
        f.write(content)

    logger.info(f"Created sample transcript: {transcript_path}")
    return transcript_path, test_dir


async def test_indexer():
    """Test the complete indexing workflow"""
    logger.info("=" * 80)
    logger.info("Testing Indexer Components")
    logger.info("=" * 80)

    # Create sample transcript
    transcript_path, test_dir = create_sample_transcript()

    # Initialize components
    logger.info("\n1. Initializing components...")

    vector_store = VectorStore(
        persist_directory=Path(__file__).parent.parent / "data" / "test_chromadb_indexer",
        collection_name="test_chunks"
    )

    bm25_store = BM25Store(
        index_path=Path(__file__).parent.parent / "data" / "test_bm25_indexer.pkl"
    )

    embeddings_client = MockEmbeddings()

    chunker = SentenceChunker(
        target_tokens=100,  # Smaller for testing
        max_tokens=150,
        overlap_sentences=1
    )

    indexer = BackgroundIndexer(
        vector_store=vector_store,
        bm25_store=bm25_store,
        embeddings_client=embeddings_client,
        chunker=chunker,
        transcript_dir=test_dir
    )

    logger.info("✓ Components initialized")

    # Test 2: Index single transcript
    logger.info("\n2. Indexing single transcript...")
    chunks_count = await indexer.index_transcript(transcript_path)
    logger.info(f"✓ Indexed {chunks_count} chunks")

    # Test 3: Get index status
    logger.info("\n3. Getting index status...")
    status = indexer.get_index_status()
    logger.info(f"✓ Index status:")
    logger.info(f"  Status: {status['status']}")
    logger.info(f"  Total chunks: {status['total_chunks']}")
    logger.info(f"  Last indexed: {status['last_indexed']}")

    # Test 4: Search in vector store
    logger.info("\n4. Testing vector search...")
    import random
    query_embedding = [random.random() for _ in range(1024)]
    results = vector_store.search(query_embedding, n_results=3)
    logger.info(f"✓ Vector search returned {len(results)} results")
    for i, result in enumerate(results, 1):
        logger.info(f"  {i}. {result['metadata']['title']}")
        logger.info(f"     {result['text'][:60]}...")

    # Test 5: Search in BM25
    logger.info("\n5. Testing BM25 keyword search...")
    bm25_results = bm25_store.search("Bitcoin investment", n_results=3)
    logger.info(f"✓ BM25 search returned {len(bm25_results)} results")
    for i, result in enumerate(bm25_results, 1):
        logger.info(f"  {i}. Score: {result['bm25_score']:.4f}")
        logger.info(f"     {result['text'][:60]}...")

    # Test 6: Get chunk context
    logger.info("\n6. Getting chunk context...")
    if results:
        chunk_id = results[0]['chunk_id']
        chunk = vector_store.get_chunk(chunk_id)
        logger.info(f"✓ Retrieved chunk: {chunk_id}")
        logger.info(f"  Channel: {chunk['metadata']['channel']}")
        logger.info(f"  Title: {chunk['metadata']['title']}")
        logger.info(f"  Paragraph context length: {len(chunk['metadata'].get('paragraph_context', ''))}")

    # Test 7: Full rebuild
    logger.info("\n7. Testing full index rebuild...")
    stats = await indexer.rebuild_full_index()
    logger.info(f"✓ Full rebuild complete:")
    logger.info(f"  Total files: {stats['total_files']}")
    logger.info(f"  Total chunks: {stats['total_chunks']}")
    logger.info(f"  Elapsed: {stats['elapsed_seconds']:.2f}s")

    logger.info("\n" + "=" * 80)
    logger.info("ALL INDEXER TESTS PASSED! ✓")
    logger.info("=" * 80)

    # Cleanup
    logger.info("\nCleaning up test files...")
    import shutil
    shutil.rmtree(test_dir)
    shutil.rmtree(Path(__file__).parent.parent / "data" / "test_chromadb_indexer")
    (Path(__file__).parent.parent / "data" / "test_bm25_indexer.pkl").unlink(missing_ok=True)
    logger.info("✓ Cleanup complete")


def main():
    """Run indexer tests"""
    try:
        asyncio.run(test_indexer())
        return 0
    except Exception as e:
        logger.error(f"\n✗ Test failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
