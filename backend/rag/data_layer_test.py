#!/usr/bin/env python3
"""
Test script for data layer components
Tests SQLite, ChromaDB, and BM25 stores
"""

import sys
from pathlib import Path
import logging

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from chat.models import ChatDatabase, Conversation, Message
from rag.vector_store import VectorStore
from rag.bm25_store import BM25Store

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_sqlite_database():
    """Test SQLite chat database"""
    logger.info("=" * 80)
    logger.info("Testing SQLite Chat Database")
    logger.info("=" * 80)

    # Initialize database (temp location for testing)
    db_path = Path(__file__).parent.parent / "data" / "test_chat_history.db"
    db = ChatDatabase(db_path)

    # Test 1: Create conversation
    logger.info("\n1. Creating conversation...")
    conv = db.create_conversation(title="Test Bitcoin Discussion")
    logger.info(f"✓ Created conversation: {conv.id}")

    # Test 2: Add user message
    logger.info("\n2. Adding user message...")
    user_msg = db.add_message(
        conversation_id=conv.id,
        role="user",
        content="What did @PeterSchiff say about Bitcoin?",
        input_tokens=15,
        embedding_tokens=10,
        channel_filters=["@PeterSchiff"]
    )
    logger.info(f"✓ Added user message: {user_msg.id}")

    # Test 3: Add assistant message with sources
    logger.info("\n3. Adding assistant message with sources...")
    sources = [
        {
            "chunk_id": "peterschiff__video1__0",
            "channel": "PeterSchiff",
            "title": "Bitcoin Analysis 2026",
            "date": "2026-04-20",
            "excerpt": "Bitcoin is a speculative bubble..."
        }
    ]
    assistant_msg = db.add_message(
        conversation_id=conv.id,
        role="assistant",
        content="Based on recent discussions, Peter Schiff remains skeptical of Bitcoin...",
        output_tokens=50,
        documents_retrieved=5,
        sources=sources
    )
    logger.info(f"✓ Added assistant message: {assistant_msg.id}")

    # Test 4: Retrieve conversation
    logger.info("\n4. Retrieving conversation...")
    retrieved_conv = db.get_conversation(conv.id)
    logger.info(f"✓ Retrieved conversation: {retrieved_conv.title}")
    logger.info(f"  Total tokens: {retrieved_conv.total_input_tokens + retrieved_conv.total_output_tokens}")

    # Test 5: Retrieve messages
    logger.info("\n5. Retrieving messages...")
    messages = db.get_messages(conv.id)
    logger.info(f"✓ Retrieved {len(messages)} messages")
    for msg in messages:
        logger.info(f"  - {msg.role}: {msg.content[:50]}...")

    # Test 6: Get conversation with messages
    logger.info("\n6. Getting full conversation data...")
    full_data = db.get_conversation_with_messages(conv.id)
    logger.info(f"✓ Full conversation data retrieved")
    logger.info(f"  Message count: {full_data['message_count']}")

    # Test 7: List all conversations
    logger.info("\n7. Listing all conversations...")
    all_convs = db.get_all_conversations()
    logger.info(f"✓ Found {len(all_convs)} conversations")

    logger.info("\n✓ SQLite database tests passed!")
    return db_path


def test_vector_store():
    """Test ChromaDB vector store"""
    logger.info("\n" + "=" * 80)
    logger.info("Testing ChromaDB Vector Store")
    logger.info("=" * 80)

    # Initialize vector store (temp location for testing)
    persist_dir = Path(__file__).parent.parent / "data" / "test_chromadb"
    store = VectorStore(persist_dir, collection_name="test_transcript_chunks")

    # Test 1: Add chunks with mock embeddings
    logger.info("\n1. Adding chunks with embeddings...")
    chunks = [
        {
            "id": "peterschiff__video1__0",
            "text": "Bitcoin is a speculative bubble driven by FOMO and greed.",
            "metadata": {
                "channel": "PeterSchiff",
                "filename": "video1.md",
                "title": "Bitcoin Analysis 2026",
                "date": "2026-04-20",
                "chunk_index": 0,
                "total_chunks": 3
            }
        },
        {
            "id": "peterschiff__video1__1",
            "text": "Gold remains the superior store of value throughout history.",
            "metadata": {
                "channel": "PeterSchiff",
                "filename": "video1.md",
                "title": "Bitcoin Analysis 2026",
                "date": "2026-04-20",
                "chunk_index": 1,
                "total_chunks": 3
            }
        },
        {
            "id": "robertkiyosaki__video2__0",
            "text": "Bitcoin and gold are both excellent hedges against inflation.",
            "metadata": {
                "channel": "RobertKiyosaki",
                "filename": "video2.md",
                "title": "Inflation Hedges",
                "date": "2026-04-21",
                "chunk_index": 0,
                "total_chunks": 2
            }
        }
    ]

    # Create mock embeddings (1024 dimensions, normally from Bedrock)
    import random
    embeddings = [[random.random() for _ in range(1024)] for _ in chunks]

    store.add_chunks(chunks, embeddings)
    logger.info(f"✓ Added {len(chunks)} chunks to vector store")

    # Test 2: Search with mock query embedding
    logger.info("\n2. Searching with mock query embedding...")
    query_embedding = [random.random() for _ in range(1024)]
    results = store.search(query_embedding, n_results=3)
    logger.info(f"✓ Search returned {len(results)} results")
    for i, result in enumerate(results, 1):
        logger.info(f"  {i}. {result['metadata']['channel']} - {result['metadata']['title']}")
        logger.info(f"     Score: {result['score']:.4f}")

    # Test 3: Search with channel filter
    logger.info("\n3. Searching with channel filter...")
    filtered_results = store.search(query_embedding, n_results=5, channel_filter=["PeterSchiff"])
    logger.info(f"✓ Filtered search returned {len(filtered_results)} results")
    for result in filtered_results:
        logger.info(f"  - {result['metadata']['channel']}: {result['text'][:50]}...")

    # Test 4: Get specific chunk
    logger.info("\n4. Getting specific chunk...")
    chunk = store.get_chunk("peterschiff__video1__0")
    if chunk:
        logger.info(f"✓ Retrieved chunk: {chunk['chunk_id']}")
        logger.info(f"  Text: {chunk['text'][:50]}...")

    # Test 5: Get stats
    logger.info("\n5. Getting collection stats...")
    stats = store.get_stats()
    logger.info(f"✓ Collection stats:")
    logger.info(f"  Total chunks: {stats['total_chunks']}")
    logger.info(f"  Total channels: {stats['total_channels']}")
    logger.info(f"  Channels: {stats['channels']}")

    logger.info("\n✓ ChromaDB vector store tests passed!")
    return persist_dir


def test_bm25_store():
    """Test BM25 keyword search store"""
    logger.info("\n" + "=" * 80)
    logger.info("Testing BM25 Keyword Search Store")
    logger.info("=" * 80)

    # Initialize BM25 store (temp location for testing)
    index_path = Path(__file__).parent.parent / "data" / "test_bm25_index.pkl"
    store = BM25Store(index_path)

    # Test 1: Build index
    logger.info("\n1. Building BM25 index...")
    chunks = [
        {
            "id": "peterschiff__video1__0",
            "text": "Bitcoin is a speculative bubble driven by FOMO and greed.",
            "metadata": {
                "channel": "PeterSchiff",
                "filename": "video1.md",
                "title": "Bitcoin Analysis 2026",
                "date": "2026-04-20"
            }
        },
        {
            "id": "peterschiff__video1__1",
            "text": "Gold remains the superior store of value throughout history.",
            "metadata": {
                "channel": "PeterSchiff",
                "filename": "video1.md",
                "title": "Bitcoin Analysis 2026",
                "date": "2026-04-20"
            }
        },
        {
            "id": "robertkiyosaki__video2__0",
            "text": "Bitcoin and gold are both excellent hedges against inflation.",
            "metadata": {
                "channel": "RobertKiyosaki",
                "filename": "video2.md",
                "title": "Inflation Hedges",
                "date": "2026-04-21"
            }
        },
        {
            "id": "robertkiyosaki__video2__1",
            "text": "Central banks will continue printing money, making hard assets essential.",
            "metadata": {
                "channel": "RobertKiyosaki",
                "filename": "video2.md",
                "title": "Inflation Hedges",
                "date": "2026-04-21"
            }
        }
    ]

    store.build_index(chunks)
    logger.info(f"✓ Built BM25 index with {store.count()} documents")

    # Test 2: Search by keyword
    logger.info("\n2. Searching for 'Bitcoin'...")
    results = store.search("Bitcoin", n_results=5)
    logger.info(f"✓ Search returned {len(results)} results")
    for i, result in enumerate(results, 1):
        logger.info(f"  {i}. {result['metadata']['channel']} - BM25 score: {result['bm25_score']:.4f}")
        logger.info(f"     {result['text'][:60]}...")

    # Test 3: Search with channel filter
    logger.info("\n3. Searching 'gold' with channel filter...")
    filtered_results = store.search("gold", n_results=5, channel_filter=["PeterSchiff"])
    logger.info(f"✓ Filtered search returned {len(filtered_results)} results")
    for result in filtered_results:
        logger.info(f"  - {result['metadata']['channel']}: {result['text'][:50]}...")

    # Test 4: Multi-word query
    logger.info("\n4. Searching multi-word query 'inflation hedge'...")
    multi_results = store.search("inflation hedge", n_results=5)
    logger.info(f"✓ Search returned {len(multi_results)} results")
    for result in multi_results:
        logger.info(f"  - Score: {result['bm25_score']:.4f} | {result['text'][:50]}...")

    # Test 5: Get stats
    logger.info("\n5. Getting index stats...")
    stats = store.get_stats()
    logger.info(f"✓ Index stats:")
    logger.info(f"  Total documents: {stats['total_documents']}")
    logger.info(f"  Total channels: {stats['total_channels']}")
    logger.info(f"  Indexed at: {stats['indexed_at']}")

    # Test 6: Add more chunks (incremental)
    logger.info("\n6. Adding more chunks to index...")
    new_chunks = [
        {
            "id": "newchannel__video3__0",
            "text": "Cryptocurrency adoption is accelerating globally.",
            "metadata": {
                "channel": "NewChannel",
                "filename": "video3.md",
                "title": "Crypto Trends",
                "date": "2026-04-22"
            }
        }
    ]
    store.add_chunks(new_chunks)
    logger.info(f"✓ Index now contains {store.count()} documents")

    logger.info("\n✓ BM25 store tests passed!")
    return index_path


def main():
    """Run all data layer tests"""
    logger.info("\n" + "=" * 80)
    logger.info("DATA LAYER TESTS - Starting")
    logger.info("=" * 80)

    try:
        # Test SQLite
        db_path = test_sqlite_database()

        # Test ChromaDB
        vector_dir = test_vector_store()

        # Test BM25
        bm25_path = test_bm25_store()

        logger.info("\n" + "=" * 80)
        logger.info("ALL DATA LAYER TESTS PASSED! ✓")
        logger.info("=" * 80)
        logger.info(f"\nTest files created:")
        logger.info(f"  - SQLite DB: {db_path}")
        logger.info(f"  - ChromaDB: {vector_dir}")
        logger.info(f"  - BM25 Index: {bm25_path}")
        logger.info("\nYou can safely delete these test files.")

        return 0

    except Exception as e:
        logger.error(f"\n✗ Test failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
