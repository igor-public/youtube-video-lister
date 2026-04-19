"""
YouTube Toolkit - A comprehensive toolkit for YouTube video analysis.

This package provides tools for:
- Listing videos from YouTube channels
- Downloading video subtitles
- Converting subtitles to readable text
- Monitoring channels for new videos
"""

from .channel_lister import YouTubeChannelLister
from .downloader import SubtitleDownloader
from .converter import SubtitleToText
from .monitor import ChannelMonitor

__version__ = "0.1.0"
__author__ = "Your Name"
__all__ = [
    "YouTubeChannelLister",
    "SubtitleDownloader",
    "SubtitleToText",
    "ChannelMonitor"
]
