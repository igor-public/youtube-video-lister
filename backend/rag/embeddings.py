"""
Bedrock Embeddings Client
Wrapper for AWS Bedrock Cohere Embed v3 model
"""

import json
import asyncio
from typing import List, Dict, Any
import logging

try:
    import aioboto3
    AIOBOTO3_AVAILABLE = True
except ImportError:
    AIOBOTO3_AVAILABLE = False
    import boto3

logger = logging.getLogger(__name__)


class BedrockEmbeddings:
    """AWS Bedrock embeddings client for Cohere Embed v3"""

    def __init__(
        self,
        model_id: str = "cohere.embed-english-v3",
        aws_access_key_id: str = None,
        aws_secret_access_key: str = None,
        aws_region: str = "us-east-1",
        input_type: str = "search_document"  # or "search_query"
    ):
        """
        Initialize Bedrock embeddings client

        Args:
            model_id: Bedrock model ID (default: cohere.embed-english-v3)
            aws_access_key_id: AWS access key
            aws_secret_access_key: AWS secret key
            aws_region: AWS region
            input_type: Cohere input type (search_document or search_query)
        """
        self.model_id = model_id
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.aws_region = aws_region
        self.input_type = input_type
        self.embedding_dimensions = 1024  # Cohere v3 dimension

        # Check if aioboto3 is available
        if not AIOBOTO3_AVAILABLE:
            logger.warning("aioboto3 not installed, using synchronous boto3 instead")

        logger.info(f"Initialized Bedrock embeddings with model: {model_id}")

    def _create_sync_client(self):
        """Create synchronous boto3 client"""
        return boto3.client(
            service_name='bedrock-runtime',
            region_name=self.aws_region,
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key
        )

    def embed_text_sync(self, text: str, input_type: str = None) -> List[float]:
        """
        Embed single text synchronously

        Args:
            text: Text to embed
            input_type: Override default input_type

        Returns:
            Embedding vector (1024 dimensions)
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        client = self._create_sync_client()

        # Prepare request body
        body = {
            "texts": [text],
            "input_type": input_type or self.input_type,
            "truncate": "END"  # Truncate if text exceeds max length
        }

        try:
            response = client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json',
                accept='application/json'
            )

            # Parse response
            response_body = json.loads(response['body'].read())

            # Extract embeddings
            embeddings = response_body.get('embeddings', [])
            if not embeddings:
                raise ValueError("No embeddings returned from Bedrock")

            return embeddings[0]

        except Exception as e:
            logger.error(f"Failed to embed text: {e}")
            raise

    def embed_texts_sync(
        self,
        texts: List[str],
        input_type: str = None,
        batch_size: int = 96  # Cohere v3 max batch size
    ) -> List[List[float]]:
        """
        Embed multiple texts synchronously (with batching)

        Args:
            texts: List of texts to embed
            input_type: Override default input_type
            batch_size: Number of texts per batch (max 96 for Cohere v3)

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        # Filter out empty texts
        valid_texts = [(i, text) for i, text in enumerate(texts) if text and text.strip()]
        if not valid_texts:
            raise ValueError("All texts are empty")

        client = self._create_sync_client()
        all_embeddings = [None] * len(texts)

        # Process in batches
        for i in range(0, len(valid_texts), batch_size):
            batch = valid_texts[i:i + batch_size]
            batch_texts = [text for _, text in batch]
            batch_indices = [idx for idx, _ in batch]

            # Prepare request
            body = {
                "texts": batch_texts,
                "input_type": input_type or self.input_type,
                "truncate": "END"
            }

            try:
                response = client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body),
                    contentType='application/json',
                    accept='application/json'
                )

                response_body = json.loads(response['body'].read())
                embeddings = response_body.get('embeddings', [])

                if len(embeddings) != len(batch_texts):
                    raise ValueError(f"Expected {len(batch_texts)} embeddings, got {len(embeddings)}")

                # Store embeddings at original indices
                for j, embedding in enumerate(embeddings):
                    original_idx = batch_indices[j]
                    all_embeddings[original_idx] = embedding

                logger.debug(f"Embedded batch {i // batch_size + 1}: {len(batch_texts)} texts")

            except Exception as e:
                logger.error(f"Failed to embed batch: {e}")
                raise

        return all_embeddings

    async def embed_text_async(self, text: str, input_type: str = None) -> List[float]:
        """
        Embed single text asynchronously

        Args:
            text: Text to embed
            input_type: Override default input_type

        Returns:
            Embedding vector
        """
        if not AIOBOTO3_AVAILABLE:
            raise RuntimeError("aioboto3 not installed, cannot use async methods")

        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        session = aioboto3.Session(
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.aws_region
        )

        async with session.client('bedrock-runtime') as client:
            body = {
                "texts": [text],
                "input_type": input_type or self.input_type,
                "truncate": "END"
            }

            try:
                response = await client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body),
                    contentType='application/json',
                    accept='application/json'
                )

                response_body = json.loads(await response['body'].read())
                embeddings = response_body.get('embeddings', [])

                if not embeddings:
                    raise ValueError("No embeddings returned from Bedrock")

                return embeddings[0]

            except Exception as e:
                logger.error(f"Failed to embed text async: {e}")
                raise

    async def embed_texts_async(
        self,
        texts: List[str],
        input_type: str = None,
        batch_size: int = 96
    ) -> List[List[float]]:
        """
        Embed multiple texts asynchronously

        Args:
            texts: List of texts to embed
            input_type: Override default input_type
            batch_size: Batch size

        Returns:
            List of embedding vectors
        """
        if not AIOBOTO3_AVAILABLE:
            raise RuntimeError("aioboto3 not installed, cannot use async methods")

        if not texts:
            return []

        valid_texts = [(i, text) for i, text in enumerate(texts) if text and text.strip()]
        if not valid_texts:
            raise ValueError("All texts are empty")

        session = aioboto3.Session(
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.aws_region
        )

        all_embeddings = [None] * len(texts)

        async with session.client('bedrock-runtime') as client:
            # Process in batches
            for i in range(0, len(valid_texts), batch_size):
                batch = valid_texts[i:i + batch_size]
                batch_texts = [text for _, text in batch]
                batch_indices = [idx for idx, _ in batch]

                body = {
                    "texts": batch_texts,
                    "input_type": input_type or self.input_type,
                    "truncate": "END"
                }

                try:
                    response = await client.invoke_model(
                        modelId=self.model_id,
                        body=json.dumps(body),
                        contentType='application/json',
                        accept='application/json'
                    )

                    response_body = json.loads(await response['body'].read())
                    embeddings = response_body.get('embeddings', [])

                    if len(embeddings) != len(batch_texts):
                        raise ValueError(f"Expected {len(batch_texts)} embeddings, got {len(embeddings)}")

                    for j, embedding in enumerate(embeddings):
                        original_idx = batch_indices[j]
                        all_embeddings[original_idx] = embedding

                    logger.debug(f"Embedded batch {i // batch_size + 1} async: {len(batch_texts)} texts")

                except Exception as e:
                    logger.error(f"Failed to embed batch async: {e}")
                    raise

        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Embed search query (uses search_query input type)

        Args:
            query: Search query text

        Returns:
            Query embedding vector
        """
        return self.embed_text_sync(query, input_type="search_query")

    async def embed_query_async(self, query: str) -> List[float]:
        """
        Embed search query asynchronously

        Args:
            query: Search query text

        Returns:
            Query embedding vector
        """
        return await self.embed_text_async(query, input_type="search_query")

    def get_embedding_dimensions(self) -> int:
        """Get embedding dimensions"""
        return self.embedding_dimensions
