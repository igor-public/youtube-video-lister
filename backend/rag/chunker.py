"""
Text Chunker
Splits transcripts into semantic chunks using sentence boundaries
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """Represents a text chunk with metadata"""
    id: str
    text: str
    metadata: Dict[str, Any]
    start_char: int
    end_char: int
    paragraph_context: str


class SentenceChunker:
    """Sentence-based text chunker for transcripts"""

    def __init__(
        self,
        target_tokens: int = 400,
        max_tokens: int = 500,
        overlap_sentences: int = 1
    ):
        """
        Initialize chunker

        Args:
            target_tokens: Target chunk size in tokens
            max_tokens: Maximum chunk size in tokens
            overlap_sentences: Number of sentences to overlap between chunks
        """
        self.target_tokens = target_tokens
        self.max_tokens = max_tokens
        self.overlap_sentences = overlap_sentences

    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count (rough approximation: 1 token ≈ 4 characters)

        Args:
            text: Input text

        Returns:
            Estimated token count
        """
        return len(text) // 4

    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences using simple regex

        Args:
            text: Input text

        Returns:
            List of sentences
        """
        # Split on sentence boundaries (., !, ?) followed by space and capital letter
        # Also handle common abbreviations
        sentence_pattern = r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s+(?=[A-Z])'
        sentences = re.split(sentence_pattern, text)

        # Clean up empty sentences
        sentences = [s.strip() for s in sentences if s.strip()]

        return sentences

    def _find_paragraph_context(self, text: str, start_char: int, end_char: int) -> str:
        """
        Extract paragraph context around a chunk

        Args:
            text: Full transcript text
            start_char: Chunk start position
            end_char: Chunk end position

        Returns:
            Paragraph containing the chunk
        """
        # Find paragraph boundaries (double newline or start/end of text)
        paragraphs = text.split('\n\n')

        # Find which paragraph contains this chunk
        current_pos = 0
        for para in paragraphs:
            para_start = current_pos
            para_end = current_pos + len(para)

            # Check if chunk is within this paragraph
            if para_start <= start_char < para_end or para_start < end_char <= para_end:
                return para.strip()

            current_pos = para_end + 2  # +2 for \n\n

        # Fallback: return chunk itself if paragraph not found
        return text[start_char:end_char].strip()

    def chunk_transcript(
        self,
        text: str,
        metadata: Dict[str, Any]
    ) -> List[Chunk]:
        """
        Chunk transcript into sentence-based segments

        Args:
            text: Full transcript text
            metadata: Transcript metadata (channel, filename, title, date, etc.)

        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            logger.warning("Empty text provided to chunker")
            return []

        # Split into sentences
        sentences = self._split_into_sentences(text)

        if not sentences:
            logger.warning("No sentences found in text")
            return []

        chunks = []
        current_chunk_sentences = []
        current_tokens = 0
        chunk_index = 0

        for i, sentence in enumerate(sentences):
            sentence_tokens = self._estimate_tokens(sentence)

            # Check if adding this sentence would exceed max tokens
            if current_tokens + sentence_tokens > self.max_tokens and current_chunk_sentences:
                # Create chunk from current sentences
                chunks.append(self._create_chunk(
                    text=text,
                    sentences=current_chunk_sentences,
                    chunk_index=chunk_index,
                    metadata=metadata
                ))
                chunk_index += 1

                # Start new chunk with overlap
                if self.overlap_sentences > 0 and len(current_chunk_sentences) >= self.overlap_sentences:
                    current_chunk_sentences = current_chunk_sentences[-self.overlap_sentences:]
                    current_tokens = sum(self._estimate_tokens(s) for s in current_chunk_sentences)
                else:
                    current_chunk_sentences = []
                    current_tokens = 0

            # Add sentence to current chunk
            current_chunk_sentences.append(sentence)
            current_tokens += sentence_tokens

            # If we've reached target size, finalize chunk
            if current_tokens >= self.target_tokens:
                chunks.append(self._create_chunk(
                    text=text,
                    sentences=current_chunk_sentences,
                    chunk_index=chunk_index,
                    metadata=metadata
                ))
                chunk_index += 1

                # Start new chunk with overlap
                if self.overlap_sentences > 0 and len(current_chunk_sentences) >= self.overlap_sentences:
                    current_chunk_sentences = current_chunk_sentences[-self.overlap_sentences:]
                    current_tokens = sum(self._estimate_tokens(s) for s in current_chunk_sentences)
                else:
                    current_chunk_sentences = []
                    current_tokens = 0

        # Add remaining sentences as final chunk
        if current_chunk_sentences:
            chunks.append(self._create_chunk(
                text=text,
                sentences=current_chunk_sentences,
                chunk_index=chunk_index,
                metadata=metadata
            ))

        logger.info(f"Chunked transcript into {len(chunks)} chunks (target: {self.target_tokens} tokens)")
        return chunks

    def _create_chunk(
        self,
        text: str,
        sentences: List[str],
        chunk_index: int,
        metadata: Dict[str, Any]
    ) -> Chunk:
        """
        Create a Chunk object from sentences

        Args:
            text: Full transcript text
            sentences: Sentences for this chunk
            chunk_index: Index of this chunk
            metadata: Original metadata

        Returns:
            Chunk object
        """
        chunk_text = ' '.join(sentences)

        # Find position in original text
        start_char = text.find(sentences[0])
        if start_char == -1:
            start_char = 0

        end_char = start_char + len(chunk_text)

        # Get paragraph context
        paragraph_context = self._find_paragraph_context(text, start_char, end_char)

        # Build chunk ID: channel__filename__index
        channel = metadata.get('channel', 'unknown')
        filename = metadata.get('filename', 'unknown')
        chunk_id = f"{channel}__{filename}__{chunk_index}"

        # Enhanced metadata for chunk
        chunk_metadata = {
            **metadata,
            'chunk_index': chunk_index,
            'start_char': start_char,
            'end_char': end_char
        }

        return Chunk(
            id=chunk_id,
            text=chunk_text,
            metadata=chunk_metadata,
            start_char=start_char,
            end_char=end_char,
            paragraph_context=paragraph_context
        )

    def get_stats(self, chunks: List[Chunk]) -> Dict[str, Any]:
        """
        Get statistics about chunks

        Args:
            chunks: List of chunks

        Returns:
            Statistics dictionary
        """
        if not chunks:
            return {
                "total_chunks": 0,
                "avg_tokens": 0,
                "min_tokens": 0,
                "max_tokens": 0
            }

        token_counts = [self._estimate_tokens(chunk.text) for chunk in chunks]

        return {
            "total_chunks": len(chunks),
            "avg_tokens": sum(token_counts) // len(token_counts),
            "min_tokens": min(token_counts),
            "max_tokens": max(token_counts),
            "total_tokens": sum(token_counts)
        }
