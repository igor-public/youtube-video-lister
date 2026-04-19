"""Tests for SubtitleToText converter."""

import pytest
from youtube_toolkit.converter import SubtitleToText


class TestSubtitleToText:
    """Test cases for SubtitleToText class."""

    def test_parse_srt_time(self):
        """Test SRT timestamp parsing."""
        converter = SubtitleToText()
        result = converter.parse_srt_time("00:01:30,500")
        assert result == 90.5

    def test_parse_srt_time_hours(self):
        """Test SRT timestamp with hours."""
        converter = SubtitleToText()
        result = converter.parse_srt_time("01:30:45,250")
        assert result == 5445.25

    def test_clean_text(self):
        """Test text cleaning."""
        converter = SubtitleToText()
        result = converter.clean_text("This  is   a    test  .  ")
        assert result == "This is a test."

    def test_clean_text_multiple_punctuation(self):
        """Test cleaning multiple punctuation."""
        converter = SubtitleToText()
        result = converter.clean_text("Hello , , world . .")
        assert result == "Hello, world."
