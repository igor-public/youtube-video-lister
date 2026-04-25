#!/usr/bin/env python3
"""
Configuration Management
Centralized configuration handling with validation and defaults
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator
import logging

logger = logging.getLogger(__name__)


class LLMConfig(BaseModel):
    """LLM configuration model"""
    provider: str = Field(..., description="LLM provider (openai, bedrock, etc)")
    model: str = Field(..., description="Model name")
    apiKey: Optional[str] = Field(None, description="API key for OpenAI")
    awsAccessKeyId: Optional[str] = Field(None, description="AWS Access Key ID")
    awsSecretAccessKey: Optional[str] = Field(None, description="AWS Secret Access Key")
    awsRegion: Optional[str] = Field("us-east-1", description="AWS Region")

    @validator('provider')
    def validate_provider(cls, v):
        allowed = ['openai', 'bedrock', 'anthropic']
        if v not in allowed:
            logger.warning(f"Unknown LLM provider: {v}. Allowed: {allowed}")
        return v


class ChannelConfig(BaseModel):
    """Individual channel configuration"""
    url: str = Field(..., description="YouTube channel URL")
    days_back: int = Field(7, ge=1, le=365, description="Days to look back")
    languages: list[str] = Field(default_factory=lambda: ["en"], description="Language codes")
    keywords: Optional[list[str]] = Field(None, description="Optional keywords")
    note: Optional[str] = Field(None, description="Optional note")

    @validator('url')
    def validate_url(cls, v):
        if not v.startswith('http'):
            raise ValueError('URL must start with http:// or https://')
        if 'youtube.com' not in v:
            raise ValueError('Must be a YouTube URL')
        return v


class Settings(BaseModel):
    """Application settings"""
    output_directory: str = Field("channel_data", description="Output directory")
    default_days_back: int = Field(7, ge=1, le=365, description="Default days back")
    default_languages: list[str] = Field(default_factory=lambda: ["en"])
    max_concurrent_downloads: int = Field(5, ge=1, le=20, description="Max concurrent downloads")
    log_level: str = Field("INFO", description="Logging level")

    @validator('log_level')
    def validate_log_level(cls, v):
        allowed = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed:
            return 'INFO'
        return v.upper()


class AppConfig(BaseModel):
    """Main application configuration"""
    channels: list[ChannelConfig] = Field(default_factory=list)
    settings: Settings = Field(default_factory=Settings)
    llm: Optional[LLMConfig] = None


class ConfigManager:
    """Configuration manager with file I/O and validation"""

    def __init__(self, config_path: Path):
        self.config_path = Path(config_path)
        self._config: Optional[AppConfig] = None

    def load(self) -> AppConfig:
        """Load configuration from file"""
        if not self.config_path.exists():
            logger.warning(f"Config file not found: {self.config_path}. Using defaults.")
            self._config = AppConfig()
            self.save()  # Create default config
            return self._config

        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validate and parse
            self._config = AppConfig(**data)
            logger.info(f"Configuration loaded from {self.config_path}")
            return self._config

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            raise ValueError(f"Configuration file contains invalid JSON: {e}")
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def save(self, config: Optional[AppConfig] = None) -> None:
        """Save configuration to file"""
        if config:
            self._config = config

        if not self._config:
            raise ValueError("No configuration to save")

        try:
            # Ensure directory exists
            self.config_path.parent.mkdir(parents=True, exist_ok=True)

            # Write with pretty formatting
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(
                    self._config.model_dump(exclude_none=True),
                    f,
                    indent=2,
                    ensure_ascii=False
                )

            logger.info(f"Configuration saved to {self.config_path}")

        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            raise

    def get(self) -> AppConfig:
        """Get current configuration (load if not loaded)"""
        if not self._config:
            return self.load()
        return self._config

    def reload(self) -> AppConfig:
        """Reload configuration from file"""
        return self.load()

    def update_channel(self, index: int, channel: ChannelConfig) -> None:
        """Update a specific channel"""
        config = self.get()
        if index < 0 or index >= len(config.channels):
            raise IndexError(f"Channel index {index} out of range")

        config.channels[index] = channel
        self.save(config)

    def add_channel(self, channel: ChannelConfig) -> None:
        """Add a new channel"""
        config = self.get()
        config.channels.append(channel)
        self.save(config)

    def delete_channel(self, index: int) -> ChannelConfig:
        """Delete a channel by index"""
        config = self.get()
        if index < 0 or index >= len(config.channels):
            raise IndexError(f"Channel index {index} out of range")

        deleted = config.channels.pop(index)
        self.save(config)
        return deleted

    def update_llm_config(self, llm_config: LLMConfig) -> None:
        """Update LLM configuration"""
        config = self.get()
        config.llm = llm_config
        self.save(config)

    def validate(self) -> tuple[bool, list[str]]:
        """Validate current configuration"""
        errors = []

        try:
            config = self.get()

            # Check for duplicate channel URLs
            urls = [ch.url for ch in config.channels]
            if len(urls) != len(set(urls)):
                errors.append("Duplicate channel URLs found")

            # Validate LLM config if present
            if config.llm:
                if config.llm.provider == 'openai' and not config.llm.apiKey:
                    errors.append("OpenAI API key is required")
                elif config.llm.provider == 'bedrock':
                    if not config.llm.awsAccessKeyId or not config.llm.awsSecretAccessKey:
                        errors.append("AWS credentials are required for Bedrock")

            return len(errors) == 0, errors

        except Exception as e:
            return False, [str(e)]


# Global config manager instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager(config_path: Optional[Path] = None) -> ConfigManager:
    """Get or create global config manager"""
    global _config_manager

    if _config_manager is None:
        if config_path is None:
            # Default path
            config_path = Path(__file__).parent / "config" / "channels_config.json"
        _config_manager = ConfigManager(config_path)

    return _config_manager
