"""Tests for SubtitleDownloader."""

import pytest
import os
from youtube_toolkit.downloader import SubtitleDownloader


class TestSubtitleDownloader:
    """Test cases for SubtitleDownloader class."""

    def test_downloader_initialization(self):
        """Test downloader initializes with output directory."""
        downloader = SubtitleDownloader(output_dir="test_subtitles")
        assert downloader.output_dir == "test_subtitles"

    def test_output_directory_created(self):
        """Test that output directory is created."""
        test_dir = "test_output_dir"
        downloader = SubtitleDownloader(output_dir=test_dir)
        assert os.path.exists(test_dir)
        # Cleanup
        os.rmdir(test_dir)
