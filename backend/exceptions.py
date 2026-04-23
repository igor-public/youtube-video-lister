#!/usr/bin/env python3
"""
Custom Exceptions
Define application-specific exceptions for better error handling
"""

from typing import Optional, Any


class YouTubeToolkitException(Exception):
    """Base exception for all application errors"""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ConfigurationError(YouTubeToolkitException):
    """Configuration-related errors"""
    pass


class ChannelNotFoundError(YouTubeToolkitException):
    """Channel not found in data or configuration"""
    pass


class TranscriptNotFoundError(YouTubeToolkitException):
    """Transcript file not found"""
    pass


class MetadataError(YouTubeToolkitException):
    """Metadata operations failed"""
    pass


class DownloadError(YouTubeToolkitException):
    """Video or subtitle download failed"""
    pass


class LLMError(YouTubeToolkitException):
    """LLM/AI operations failed"""
    pass


class ValidationError(YouTubeToolkitException):
    """Input validation failed"""
    pass


class PermissionError(YouTubeToolkitException):
    """Permission/access denied"""
    pass


class MonitoringError(YouTubeToolkitException):
    """Monitoring process errors"""
    pass
