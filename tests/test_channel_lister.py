"""Tests for YouTubeChannelLister."""

import pytest
from youtube_toolkit.channel_lister import YouTubeChannelLister


class TestYouTubeChannelLister:
    """Test cases for YouTubeChannelLister class."""

    def test_extract_channel_id_from_channel_url(self):
        """Test extracting channel ID from channel URL."""
        lister = YouTubeChannelLister()
        url = "https://www.youtube.com/channel/UC123456789"
        result = lister.extract_channel_id(url)
        assert result == "UC123456789"

    def test_extract_channel_id_invalid_url(self):
        """Test that invalid URL raises ValueError."""
        lister = YouTubeChannelLister()
        with pytest.raises(ValueError):
            lister.extract_channel_id("https://invalid-url.com")

    def test_no_api_key_raises_error(self):
        """Test that missing API key raises ValueError."""
        with pytest.raises(ValueError):
            YouTubeChannelLister(api_key=None)
