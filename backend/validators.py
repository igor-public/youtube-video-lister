#!/usr/bin/env python3
"""
Input Validation Utilities
Centralized validation functions for API inputs and file operations
"""

import re
from pathlib import Path
from typing import Optional
from exceptions import ValidationError, PermissionError as AppPermissionError


def validate_youtube_url(url: str) -> bool:
    """
    Validate YouTube URL format

    Args:
        url: YouTube URL to validate

    Returns:
        True if valid

    Raises:
        ValidationError: If URL is invalid
    """
    if not url:
        raise ValidationError("URL cannot be empty")

    if not url.startswith(('http://', 'https://')):
        raise ValidationError("URL must start with http:// or https://")

    if 'youtube.com' not in url and 'youtu.be' not in url:
        raise ValidationError("Must be a YouTube URL")

    # Check for valid channel URL patterns
    patterns = [
        r'youtube\.com/@[\w-]+',
        r'youtube\.com/c/[\w-]+',
        r'youtube\.com/user/[\w-]+',
        r'youtube\.com/channel/[\w-]+',
    ]

    if not any(re.search(pattern, url) for pattern in patterns):
        raise ValidationError("Invalid YouTube channel URL format")

    return True


def validate_filename(filename: str) -> bool:
    """
    Validate filename for security and format

    Args:
        filename: Filename to validate

    Returns:
        True if valid

    Raises:
        ValidationError: If filename is invalid
    """
    if not filename:
        raise ValidationError("Filename cannot be empty")

    # Check for path traversal attempts
    if '..' in filename or '/' in filename or '\\' in filename:
        raise ValidationError("Filename contains invalid characters")

    # Check for null bytes
    if '\0' in filename:
        raise ValidationError("Filename contains null bytes")

    # Reasonable length limit
    if len(filename) > 255:
        raise ValidationError("Filename too long (max 255 characters)")

    return True


def validate_channel_name(channel: str) -> bool:
    """
    Validate channel name for security

    Args:
        channel: Channel name to validate

    Returns:
        True if valid

    Raises:
        ValidationError: If channel name is invalid
    """
    if not channel:
        raise ValidationError("Channel name cannot be empty")

    # Check for path traversal attempts
    if '..' in channel or '/' in channel or '\\' in channel:
        raise ValidationError("Channel name contains invalid characters")

    # Check for null bytes
    if '\0' in channel:
        raise ValidationError("Channel name contains null bytes")

    return True


def validate_path_safety(file_path: Path, base_dir: Path) -> bool:
    """
    Validate that a file path is within the allowed base directory
    Prevents path traversal attacks

    Args:
        file_path: File path to validate
        base_dir: Base directory that must contain the file

    Returns:
        True if safe

    Raises:
        AppPermissionError: If path is outside base directory
    """
    try:
        # Resolve to absolute paths
        resolved_file = file_path.resolve()
        resolved_base = base_dir.resolve()

        # Check if file is within base directory
        resolved_file.relative_to(resolved_base)
        return True

    except ValueError:
        raise AppPermissionError(
            "Access denied: path is outside allowed directory",
            details={"file_path": str(file_path), "base_dir": str(base_dir)}
        )


def validate_language_code(lang: str) -> bool:
    """
    Validate language code format (ISO 639-1)

    Args:
        lang: Language code (e.g., 'en', 'es')

    Returns:
        True if valid

    Raises:
        ValidationError: If language code is invalid
    """
    if not lang:
        raise ValidationError("Language code cannot be empty")

    if not re.match(r'^[a-z]{2}$', lang.lower()):
        raise ValidationError("Language code must be 2 lowercase letters (ISO 639-1)")

    return True


def validate_days_back(days: int) -> bool:
    """
    Validate days_back parameter

    Args:
        days: Number of days

    Returns:
        True if valid

    Raises:
        ValidationError: If days value is invalid
    """
    if days < 1:
        raise ValidationError("days_back must be at least 1")

    if days > 365:
        raise ValidationError("days_back cannot exceed 365 days")

    return True


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing/replacing invalid characters

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Remove or replace invalid characters
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)

    # Replace multiple spaces/underscores with single underscore
    filename = re.sub(r'[\s_]+', '_', filename)

    # Limit length
    if len(filename) > 200:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:195] + ('.' + ext if ext else '')

    return filename.strip('_')


def validate_keywords(keywords: list[str], max_count: int = 50, max_length: int = 100) -> bool:
    """
    Validate keyword list

    Args:
        keywords: List of keywords
        max_count: Maximum number of keywords allowed
        max_length: Maximum length of each keyword

    Returns:
        True if valid

    Raises:
        ValidationError: If keywords are invalid
    """
    if not isinstance(keywords, list):
        raise ValidationError("Keywords must be a list")

    if len(keywords) > max_count:
        raise ValidationError(f"Too many keywords (max {max_count})")

    for keyword in keywords:
        if not isinstance(keyword, str):
            raise ValidationError("All keywords must be strings")

        if len(keyword) > max_length:
            raise ValidationError(f"Keyword too long (max {max_length} characters)")

        if len(keyword.strip()) == 0:
            raise ValidationError("Keywords cannot be empty")

    return True
