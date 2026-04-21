#!/usr/bin/env python3
"""
Transcript Metadata Management
Stores keywords, summaries, and other metadata for downloaded transcripts
"""

import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class TranscriptMetadata(BaseModel):
    """Metadata for a single transcript"""
    channel: str = Field(..., description="Channel name")
    filename: str = Field(..., description="Transcript filename")
    title: str = Field(..., description="Video title")
    date: str = Field(..., description="Video date (YYYY-MM-DD)")
    video_url: Optional[str] = Field(None, description="YouTube video URL")

    # Extracted metadata
    keywords: Optional[List[str]] = Field(None, description="Extracted keywords")
    keywords_extracted_at: Optional[str] = Field(None, description="Timestamp of keyword extraction")

    summary: Optional[str] = Field(None, description="AI-generated summary")
    summary_generated_at: Optional[str] = Field(None, description="Timestamp of summary generation")
    summary_model: Optional[str] = Field(None, description="LLM model used for summary")

    # Additional metadata
    size_bytes: Optional[int] = Field(None, description="File size in bytes")
    last_modified: Optional[str] = Field(None, description="Last modification timestamp")


class MetadataStore:
    """Manager for transcript metadata database"""

    def __init__(self, db_path: Path):
        """Initialize metadata store

        Args:
            db_path: Path to the JSON database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._data: Dict[str, Dict[str, Any]] = self._load()

    def _load(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata from disk"""
        if self.db_path.exists():
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load metadata database: {e}")
                return {}
        return {}

    def _save(self):
        """Save metadata to disk"""
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Error: Could not save metadata database: {e}")

    def _get_key(self, channel: str, filename: str) -> str:
        """Generate unique key for a transcript"""
        return f"{channel}:{filename}"

    def get(self, channel: str, filename: str) -> Optional[TranscriptMetadata]:
        """Get metadata for a transcript

        Args:
            channel: Channel name
            filename: Transcript filename

        Returns:
            TranscriptMetadata or None if not found
        """
        key = self._get_key(channel, filename)
        data = self._data.get(key)
        if data:
            return TranscriptMetadata(**data)
        return None

    def set(self, metadata: TranscriptMetadata):
        """Store or update metadata for a transcript

        Args:
            metadata: TranscriptMetadata object
        """
        key = self._get_key(metadata.channel, metadata.filename)
        self._data[key] = metadata.model_dump()
        self._save()

    def update_keywords(self, channel: str, filename: str, keywords: List[str]):
        """Update keywords for a transcript

        Args:
            channel: Channel name
            filename: Transcript filename
            keywords: List of extracted keywords
        """
        metadata = self.get(channel, filename)
        if metadata:
            metadata.keywords = keywords
            metadata.keywords_extracted_at = datetime.now().isoformat()
            self.set(metadata)

    def update_summary(self, channel: str, filename: str, summary: str, model: str):
        """Update summary for a transcript

        Args:
            channel: Channel name
            filename: Transcript filename
            summary: AI-generated summary
            model: LLM model used
        """
        metadata = self.get(channel, filename)
        if metadata:
            metadata.summary = summary
            metadata.summary_generated_at = datetime.now().isoformat()
            metadata.summary_model = model
            self.set(metadata)

    def get_all_for_channel(self, channel: str) -> List[TranscriptMetadata]:
        """Get all metadata for a channel

        Args:
            channel: Channel name

        Returns:
            List of TranscriptMetadata objects
        """
        results = []
        for key, data in self._data.items():
            if data.get('channel') == channel:
                results.append(TranscriptMetadata(**data))
        return results

    def delete(self, channel: str, filename: str):
        """Delete metadata for a transcript

        Args:
            channel: Channel name
            filename: Transcript filename
        """
        key = self._get_key(channel, filename)
        if key in self._data:
            del self._data[key]
            self._save()

    def get_all(self) -> List[TranscriptMetadata]:
        """Get all metadata entries

        Returns:
            List of all TranscriptMetadata objects
        """
        return [TranscriptMetadata(**data) for data in self._data.values()]

    def initialize_from_filesystem(self, output_dir: Path):
        """Scan filesystem and initialize metadata for all transcripts

        Args:
            output_dir: Root directory containing channel_data
        """
        output_dir = Path(output_dir)
        if not output_dir.exists():
            return

        for channel_dir in output_dir.iterdir():
            if not channel_dir.is_dir():
                continue

            channel = channel_dir.name
            transcripts_dir = channel_dir / "transcripts"

            if not transcripts_dir.exists():
                continue

            for transcript_file in transcripts_dir.glob("*.md"):
                filename = transcript_file.name

                # Check if metadata already exists
                existing = self.get(channel, filename)
                if existing:
                    continue

                # Parse filename: YYYY-MM-DD_Title.md
                parts = filename.replace('.md', '').split('_', 1)
                if len(parts) == 2:
                    date_str = parts[0]
                    title = parts[1].replace('_', ' ')
                else:
                    date_str = "unknown"
                    title = filename.replace('.md', '').replace('_', ' ')

                # Create new metadata entry
                metadata = TranscriptMetadata(
                    channel=channel,
                    filename=filename,
                    title=title,
                    date=date_str,
                    size_bytes=transcript_file.stat().st_size,
                    last_modified=datetime.fromtimestamp(
                        transcript_file.stat().st_mtime
                    ).isoformat()
                )
                self.set(metadata)
