#!/usr/bin/env python3
"""
YouTube Toolkit - FastAPI Backend
Modern REST API for YouTube channel monitoring and transcript management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import json
import os
import logging
from pathlib import Path
from datetime import datetime
import subprocess
import asyncio
from enum import Enum
from .transcript_metadata import MetadataStore, TranscriptMetadata
from .logging_config import setup_logging
from .llm_client import create_llm_client

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Set up logging with file output
log_dir = PROJECT_ROOT / "logs"
log_dir.mkdir(exist_ok=True)

# Configure logging with rotation
logger = setup_logging(
    log_level="DEBUG",
    log_file=log_dir / "backend.log",
    max_bytes=50 * 1024 * 1024,  # 50MB per file
    backup_count=10  # Keep 10 backup files
)

logger.info("=" * 80)
logger.info("YouTube Toolkit Backend Starting")
logger.info(f"Log directory: {log_dir}")
logger.info("=" * 80)

# Initialize FastAPI app
app = FastAPI(
    title="YouTube Toolkit API",
    description="REST API for YouTube channel monitoring and transcript management",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CONFIG_FILE = os.getenv("CONFIG_FILE", str(PROJECT_ROOT / "channels_config.json"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", str(PROJECT_ROOT / "channel_data"))
METADATA_DB = os.getenv("METADATA_DB", str(PROJECT_ROOT / "transcript_metadata.json"))

# Initialize metadata store
metadata_store = MetadataStore(Path(METADATA_DB))


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize metadata on startup"""
    logger.info("Initializing transcript metadata from filesystem...")
    metadata_store.initialize_from_filesystem(Path(OUTPUT_DIR))
    logger.info(f"Metadata initialized. Total entries: {len(metadata_store.get_all())}")


# Global state
monitoring_status = {
    "running": False,
    "progress": "",
    "results": None,
    "error": None,
    "lastRun": None
}

summarization_status = {
    "running": False,
    "progress": "",
    "total": 0,
    "completed": 0,
    "error": None
}


# ============================================================================
# Pydantic Models
# ============================================================================

class LLMProvider(str, Enum):
    """Supported LLM providers"""
    openai = "openai"
    anthropic = "anthropic"
    bedrock = "bedrock"
    local = "local"


class ChannelInput(BaseModel):
    """Channel configuration input"""
    url: str = Field(..., description="YouTube channel URL")
    days_back: int = Field(7, ge=1, le=365, description="Days to look back")
    languages: List[str] = Field(["en"], description="Subtitle languages")
    keywords: Optional[List[str]] = Field(None, description="Filter keywords")
    note: Optional[str] = Field(None, description="Optional note")

    @validator('url')
    def validate_url(cls, v):
        if not v or not v.strip():
            raise ValueError("URL cannot be empty")
        return v.strip()


class ChannelUpdate(BaseModel):
    """Channel update payload"""
    url: str
    days_back: int = 7
    languages: List[str] = ["en"]
    keywords: Optional[List[str]] = None
    note: Optional[str] = None


class LLMConfig(BaseModel):
    """LLM configuration"""
    provider: LLMProvider
    model: str = Field("", description="Model identifier")
    apiKey: Optional[str] = Field(None, description="API key for OpenAI/Anthropic")
    awsAccessKeyId: Optional[str] = Field(None, description="AWS Access Key for Bedrock")
    awsSecretAccessKey: Optional[str] = Field(None, description="AWS Secret Key for Bedrock")
    awsRegion: Optional[str] = Field("us-east-1", description="AWS Region for Bedrock")


class KeywordsUpdate(BaseModel):
    """Keywords update payload"""
    keywords: List[str]


class Asset(BaseModel):
    """Asset monitoring configuration"""
    id: Optional[str] = Field(None, description="Asset ID (auto-generated)")
    name: str = Field(..., description="Asset name")
    symbol: str = Field(..., description="Asset symbol/ticker")
    source: str = Field("manual", description="Price source")
    category: str = Field("crypto", description="Asset category")
    notes: Optional[str] = Field(None, description="Optional notes")


class AssetUpdate(BaseModel):
    """Asset update payload"""
    name: str
    symbol: str
    source: str = "manual"
    category: str = "crypto"
    notes: Optional[str] = None


class TranscriptResponse(BaseModel):
    """Transcript content response"""
    content: str
    filename: str
    channel: str
    size: int


class DeleteTranscriptResponse(BaseModel):
    """Delete transcript response"""
    success: bool
    message: str
    deleted_files: List[str] = Field(..., description="List of deleted file names")
    errors: Optional[List[str]] = Field(None, description="List of errors if any occurred")


class DeleteChannelResponse(BaseModel):
    """Delete channel response"""
    success: bool
    message: str
    deleted_count: int = Field(..., description="Number of transcripts deleted")
    channel: str = Field(..., description="Channel name")
    errors: Optional[List[str]] = Field(None, description="List of errors if any occurred")


class MonitorResponse(BaseModel):
    """Monitoring operation response"""
    success: bool
    message: str
    channels: Optional[int] = None


class StatusResponse(BaseModel):
    """Status response"""
    running: bool
    progress: str
    error: Optional[str]
    lastRun: Optional[str]
    timestamp: str


# ============================================================================
# Utility Functions
# ============================================================================

async def load_config() -> Dict[str, Any]:
    """Load configuration from JSON file"""
    try:
        if not os.path.exists(CONFIG_FILE):
            default_config = {
                "channels": [],
                "assets": [],
                "settings": {
                    "default_days_back": 7,
                    "default_languages": ["en"],
                    "output_directory": OUTPUT_DIR
                }
            }
            await save_config(default_config)
            return default_config

        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
            if "assets" not in config:
                config["assets"] = []
            return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load config: {str(e)}")


async def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to JSON file"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")


async def get_channel_tree(sort_order: str = "desc") -> List[Dict[str, Any]]:
    """Build hierarchical tree of channels and transcripts

    Args:
        sort_order: Sort order for transcripts ('asc' or 'desc')
    """
    try:
        config = await load_config()
        output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

        # Convert relative path to absolute (relative to project root)
        if not os.path.isabs(output_dir):
            output_dir = str(PROJECT_ROOT / output_dir)

        if not os.path.exists(output_dir):
            return []

        tree = []
        for channel_name in sorted(os.listdir(output_dir)):
            channel_path = Path(output_dir) / channel_name
            if not channel_path.is_dir():
                continue

            transcripts_dir = channel_path / "transcripts"
            if not transcripts_dir.exists():
                continue

            transcripts = []
            # Sort files by date (extracted from filename)
            reverse_sort = sort_order.lower() == "desc"
            for file_path in sorted(transcripts_dir.glob("*.md"), reverse=reverse_sort):
                parts = file_path.stem.split('_')
                date = parts[0] if len(parts) >= 2 else "unknown"
                title = ' '.join(parts[1:]) if len(parts) >= 2 else file_path.stem

                # Get metadata if available
                metadata = metadata_store.get(channel_name, file_path.name)

                transcript_data = {
                    "filename": file_path.name,
                    "title": title,
                    "date": date,
                    "size": file_path.stat().st_size,
                    "path": str(file_path)
                }

                # Add metadata fields if available
                if metadata:
                    transcript_data["keywords"] = metadata.keywords
                    transcript_data["has_summary"] = metadata.summary is not None
                    transcript_data["summary_model"] = metadata.summary_model
                else:
                    transcript_data["keywords"] = None
                    transcript_data["has_summary"] = False
                    transcript_data["summary_model"] = None

                transcripts.append(transcript_data)

            if transcripts:
                tree.append({
                    "channel": channel_name,
                    "transcript_count": len(transcripts),
                    "transcripts": transcripts
                })

        return tree
    except Exception as e:
        print(f"Error building tree: {str(e)}")
        return []


def run_monitoring_background(channels: List[Dict], output_dir: str):
    """Run monitoring in background with real-time output capture"""
    global monitoring_status

    monitoring_status["running"] = True
    monitoring_status["progress"] = "Initializing..."
    monitoring_status["error"] = None
    monitoring_status["logs"] = []

    try:
        # Use venv python if available
        venv_python = Path(__file__).parent.parent / "venv" / "bin" / "python"
        python_cmd = str(venv_python) if venv_python.exists() else "python3"

        script_path = Path(__file__).parent.parent / "monitor_with_config.py"

        # Use Popen for real-time output
        process = subprocess.Popen(
            [python_cmd, str(script_path)],
            cwd=Path(__file__).parent.parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Read output line by line
        stdout_lines = []
        stderr_lines = []

        while True:
            stdout_line = process.stdout.readline()
            if stdout_line:
                stdout_line = stdout_line.strip()
                stdout_lines.append(stdout_line)
                monitoring_status["logs"].append(stdout_line)
                monitoring_status["progress"] = stdout_line
                # Keep only last 50 log lines
                if len(monitoring_status["logs"]) > 50:
                    monitoring_status["logs"].pop(0)

            # Check if process finished
            if process.poll() is not None:
                # Read any remaining output
                remaining_stdout = process.stdout.read()
                if remaining_stdout:
                    for line in remaining_stdout.strip().split('\n'):
                        if line:
                            stdout_lines.append(line)
                            monitoring_status["logs"].append(line)
                break

        # Get any stderr
        stderr_output = process.stderr.read()
        if stderr_output:
            stderr_lines = stderr_output.strip().split('\n')

        monitoring_status["running"] = False
        monitoring_status["lastRun"] = datetime.now().isoformat()

        if process.returncode == 0:
            monitoring_status["progress"] = "Completed successfully"
            monitoring_status["results"] = '\n'.join(stdout_lines)
        else:
            monitoring_status["progress"] = "Completed with errors"
            monitoring_status["error"] = '\n'.join(stderr_lines) if stderr_lines else f"Exit code: {process.returncode}"

    except Exception as e:
        monitoring_status["running"] = False
        monitoring_status["progress"] = "Error"
        monitoring_status["error"] = str(e)
        monitoring_status["lastRun"] = datetime.now().isoformat()
        monitoring_status["logs"].append(f"ERROR: {str(e)}")


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", include_in_schema=False)
async def root():
    """API root endpoint"""
    return {"message": "YouTube Toolkit API", "docs": "/api/docs", "frontend": "http://localhost:3000"}


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "configFile": CONFIG_FILE,
        "configExists": os.path.exists(CONFIG_FILE)
    }


@app.get("/api/config", tags=["Configuration"])
async def get_config():
    """Get current configuration"""
    return await load_config()


@app.post("/api/config", tags=["Configuration"])
async def update_config(config: Dict[str, Any]):
    """Update configuration"""
    if "channels" not in config or "settings" not in config:
        raise HTTPException(status_code=400, detail="Invalid configuration structure")

    await save_config(config)
    return {"success": True, "message": "Configuration saved successfully"}


@app.get("/api/tree", tags=["Channels"], response_model=List[Dict[str, Any]])
async def get_tree(sort: str = "desc", search: Optional[str] = None):
    """Get channel tree structure with all transcripts

    Args:
        sort: Sort order for transcripts ('asc' or 'desc', default 'desc')
        search: Optional search query to filter transcripts
    """
    tree = await get_channel_tree(sort_order=sort)

    if not search or not search.strip():
        return tree

    search_lower = search.lower().strip()
    filtered_tree = []

    config = await load_config()
    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)
    if not os.path.isabs(output_dir):
        output_dir = str(PROJECT_ROOT / output_dir)

    for channel in tree:
        filtered_transcripts = []

        for transcript in channel["transcripts"]:
            # Search in title
            if search_lower in transcript["title"].lower():
                filtered_transcripts.append(transcript)
                continue

            # Search in keywords
            if transcript.get("keywords"):
                if any(search_lower in kw.lower() for kw in transcript["keywords"]):
                    filtered_transcripts.append(transcript)
                    continue

            # Search in transcript content
            transcript_path = Path(output_dir) / channel["channel"] / "transcripts" / transcript["filename"]
            if transcript_path.exists():
                try:
                    with open(transcript_path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        if search_lower in content:
                            filtered_transcripts.append(transcript)
                            continue
                except Exception as e:
                    logger.error(f"Error reading transcript for search: {e}")

            # Search in summary
            metadata = metadata_store.get(channel["channel"], transcript["filename"])
            if metadata and metadata.summary:
                if search_lower in metadata.summary.lower():
                    filtered_transcripts.append(transcript)
                    continue

        if filtered_transcripts:
            filtered_tree.append({
                **channel,
                "transcripts": filtered_transcripts,
                "transcript_count": len(filtered_transcripts)
            })

    return filtered_tree


@app.get("/api/transcript/{channel}/{filename}", tags=["Transcripts"], response_model=TranscriptResponse)
async def get_transcript(channel: str, filename: str):
    """Get transcript content"""
    config = await load_config()
    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

    # Convert relative path to absolute (relative to project root)
    if not os.path.isabs(output_dir):
        output_dir = str(PROJECT_ROOT / output_dir)

    file_path = Path(output_dir) / channel / "transcripts" / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    # Security: prevent path traversal
    try:
        file_path.resolve().relative_to(Path(output_dir).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    content = file_path.read_text(encoding='utf-8')
    return {
        "content": content,
        "filename": filename,
        "channel": channel,
        "size": len(content)
    }


@app.delete("/api/transcript/{channel}/{filename}", tags=["Transcripts"], response_model=DeleteTranscriptResponse)
async def delete_transcript(channel: str, filename: str):
    """
    Delete a transcript and its associated files (subtitle, metadata)

    This will remove:
    - The transcript markdown file
    - The associated subtitle file (if exists)
    - The metadata entry
    """
    config = await load_config()
    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

    # Convert relative path to absolute (relative to project root)
    if not os.path.isabs(output_dir):
        output_dir = str(PROJECT_ROOT / output_dir)

    channel_dir = Path(output_dir) / channel
    transcript_path = channel_dir / "transcripts" / filename

    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    # Security: prevent path traversal
    try:
        transcript_path.resolve().relative_to(Path(output_dir).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    deleted_files = []
    errors = []

    try:
        # Delete transcript file
        transcript_path.unlink()
        deleted_files.append(str(transcript_path.name))

        # Try to find and delete associated subtitle file
        # Subtitle filename format: "Video Title.en.srt" (without date prefix)
        # Extract title from transcript filename: "YYYY-MM-DD_Title.md"
        transcript_title = filename.replace('.md', '').split('_', 1)
        if len(transcript_title) == 2:
            title_part = transcript_title[1].replace('_', ' ')

            subtitles_dir = channel_dir / "subtitles"
            if subtitles_dir.exists():
                # Look for subtitle files with similar name
                for subtitle_file in subtitles_dir.glob(f"{title_part}*.srt"):
                    try:
                        subtitle_file.unlink()
                        deleted_files.append(str(subtitle_file.name))
                    except Exception as e:
                        errors.append(f"Failed to delete subtitle {subtitle_file.name}: {str(e)}")

        # Delete metadata
        metadata_store.delete(channel, filename)

        return {
            "success": True,
            "message": f"Transcript deleted successfully",
            "deleted_files": deleted_files,
            "errors": errors if errors else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete transcript: {str(e)}")


@app.delete("/api/channel/{channel}", tags=["Channels"], response_model=DeleteChannelResponse)
async def delete_channel_data(channel: str):
    """
    Delete all data for a channel (transcripts, subtitles, metadata)

    This will remove the entire channel directory including:
    - All transcript files
    - All subtitle files
    - All metadata entries for this channel

    Note: This does not remove the channel from the monitoring configuration.
    """
    import shutil

    config = await load_config()
    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

    # Convert relative path to absolute (relative to project root)
    if not os.path.isabs(output_dir):
        output_dir = str(PROJECT_ROOT / output_dir)

    channel_dir = Path(output_dir) / channel

    if not channel_dir.exists():
        raise HTTPException(status_code=404, detail="Channel data not found")

    # Security: prevent path traversal
    try:
        channel_dir.resolve().relative_to(Path(output_dir).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    errors = []
    deleted_count = 0

    try:
        # Count transcripts before deletion
        transcripts_dir = channel_dir / "transcripts"
        if transcripts_dir.exists():
            deleted_count = len(list(transcripts_dir.glob("*.md")))

        # Delete all metadata entries for this channel
        all_metadata = metadata_store.get_all_for_channel(channel)
        for metadata in all_metadata:
            try:
                metadata_store.delete(channel, metadata.filename)
            except Exception as e:
                errors.append(f"Failed to delete metadata for {metadata.filename}: {str(e)}")

        # Delete entire channel directory
        shutil.rmtree(channel_dir)

        return {
            "success": True,
            "message": f"Channel data deleted successfully",
            "deleted_count": deleted_count,
            "channel": channel,
            "errors": errors if errors else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete channel data: {str(e)}")


@app.post("/api/channels", tags=["Channels"])
async def add_channel(channel: ChannelInput):
    """Add new channel"""
    config = await load_config()

    if not isinstance(config.get("channels"), list):
        config["channels"] = []

    new_channel = channel.dict(exclude_none=True)
    config["channels"].append(new_channel)

    await save_config(config)
    return {"success": True, "message": "Channel added successfully", "channel": new_channel}


@app.put("/api/channels/{index}", tags=["Channels"])
async def update_channel(index: int, channel: ChannelUpdate):
    """Update existing channel"""
    config = await load_config()

    if index < 0 or index >= len(config["channels"]):
        raise HTTPException(status_code=404, detail="Channel not found")

    config["channels"][index] = channel.dict(exclude_none=True)
    await save_config(config)
    return {"success": True, "message": "Channel updated successfully"}


@app.delete("/api/channels/{index}", tags=["Channels"])
async def delete_channel(index: int):
    """Delete channel"""
    config = await load_config()

    if index < 0 or index >= len(config["channels"]):
        raise HTTPException(status_code=404, detail="Channel not found")

    deleted = config["channels"].pop(index)
    await save_config(config)
    return {"success": True, "message": "Channel deleted successfully", "deleted": deleted}


@app.get("/api/channels/{index}/keywords", tags=["Channels"])
async def get_keywords(index: int):
    """Get channel keywords"""
    config = await load_config()

    if index < 0 or index >= len(config["channels"]):
        raise HTTPException(status_code=404, detail="Channel not found")

    channel = config["channels"][index]
    return {"keywords": channel.get("keywords", [])}


@app.put("/api/channels/{index}/keywords", tags=["Channels"])
async def update_keywords(index: int, payload: KeywordsUpdate):
    """Update channel keywords"""
    config = await load_config()

    if index < 0 or index >= len(config["channels"]):
        raise HTTPException(status_code=404, detail="Channel not found")

    config["channels"][index]["keywords"] = [k.strip() for k in payload.keywords if k.strip()]
    await save_config(config)
    return {"success": True, "message": "Keywords updated successfully"}


@app.post("/api/monitor/start", tags=["Monitoring"], response_model=MonitorResponse)
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start monitoring process"""
    if monitoring_status["running"]:
        raise HTTPException(status_code=400, detail="Monitoring already in progress")

    config = await load_config()
    channels = config.get("channels", [])

    if not channels:
        raise HTTPException(status_code=400, detail="No channels configured")

    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

    background_tasks.add_task(run_monitoring_background, channels, output_dir)

    return {
        "success": True,
        "message": "Monitoring started",
        "channels": len(channels)
    }


@app.get("/api/monitor/status", tags=["Monitoring"], response_model=StatusResponse)
async def get_monitor_status():
    """Get monitoring status"""
    return {
        **monitoring_status,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/llm/config", tags=["LLM"])
async def get_llm_config():
    """Get LLM configuration (sanitized)"""
    config = await load_config()
    llm_config = config.get("llm", {})

    response = {
        "provider": llm_config.get("provider", "openai"),
        "model": llm_config.get("model", ""),
        "hasApiKey": bool(llm_config.get("apiKey"))
    }

    if llm_config.get("provider") == "bedrock":
        response["awsRegion"] = llm_config.get("awsRegion", "us-east-1")
        response["hasAwsCredentials"] = bool(
            llm_config.get("awsAccessKeyId") and llm_config.get("awsSecretAccessKey")
        )

    return response


@app.post("/api/llm/config", tags=["LLM"])
async def update_llm_config(llm_config: LLMConfig):
    """Update LLM configuration"""
    config = await load_config()

    if "llm" not in config:
        config["llm"] = {}

    config["llm"]["provider"] = llm_config.provider.value
    config["llm"]["model"] = llm_config.model

    if llm_config.provider == LLMProvider.bedrock:
        # Update AWS credentials only if provided (non-empty)
        if llm_config.awsAccessKeyId:
            config["llm"]["awsAccessKeyId"] = llm_config.awsAccessKeyId
        if llm_config.awsSecretAccessKey:
            config["llm"]["awsSecretAccessKey"] = llm_config.awsSecretAccessKey
        config["llm"]["awsRegion"] = llm_config.awsRegion
        config["llm"].pop("apiKey", None)
    else:
        # Update API key only if provided (non-empty)
        if llm_config.apiKey:
            config["llm"]["apiKey"] = llm_config.apiKey
        config["llm"].pop("awsAccessKeyId", None)
        config["llm"].pop("awsSecretAccessKey", None)
        config["llm"].pop("awsRegion", None)

    await save_config(config)
    return {"success": True, "message": "LLM configuration updated successfully"}


@app.get("/api/stats", tags=["Statistics"])
async def get_stats():
    """Get system statistics"""
    tree = await get_channel_tree()

    total_size = sum(
        t["size"]
        for channel in tree
        for t in channel["transcripts"]
    )

    return {
        "total_channels": len(tree),
        "total_transcripts": sum(ch["transcript_count"] for ch in tree),
        "total_size_bytes": total_size,
        "total_size_kb": round(total_size / 1024, 2),
        "total_size_mb": round(total_size / 1024 / 1024, 2)
    }


@app.get("/api/summarize/status", tags=["Summarization"])
async def get_summarize_status():
    """Get summarization status"""
    return {
        **summarization_status,
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# Transcript Metadata Endpoints
# ============================================================================

@app.get("/api/metadata/transcript/{channel}/{filename}", tags=["Metadata"])
async def get_transcript_metadata(channel: str, filename: str):
    """Get metadata for a specific transcript"""
    metadata = metadata_store.get(channel, filename)
    if not metadata:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return metadata.model_dump()


@app.post("/api/metadata/transcript/{channel}/{filename}/keywords", tags=["Metadata"])
async def update_transcript_keywords(
    channel: str,
    filename: str,
    keywords: List[str]
):
    """Update keywords for a transcript"""
    metadata = metadata_store.get(channel, filename)
    if not metadata:
        raise HTTPException(status_code=404, detail="Transcript not found")

    metadata_store.update_keywords(channel, filename, keywords)
    return {"success": True, "keywords": keywords}


@app.post("/api/metadata/transcript/{channel}/{filename}/summary", tags=["Metadata"])
async def update_transcript_summary(
    channel: str,
    filename: str,
    summary: str,
    model: str = "unknown"
):
    """Update summary for a transcript"""
    metadata = metadata_store.get(channel, filename)
    if not metadata:
        raise HTTPException(status_code=404, detail="Transcript not found")

    metadata_store.update_summary(channel, filename, summary, model)
    return {"success": True, "summary": summary}


@app.post("/api/metadata/initialize", tags=["Metadata"])
async def initialize_metadata():
    """Scan filesystem and initialize metadata for all transcripts"""
    metadata_store.initialize_from_filesystem(Path(OUTPUT_DIR))
    return {"success": True, "message": "Metadata initialized from filesystem"}


@app.get("/api/metadata/all", tags=["Metadata"])
async def get_all_metadata():
    """Get all transcript metadata"""
    all_metadata = metadata_store.get_all()
    return [m.model_dump() for m in all_metadata]


@app.get("/api/transcript/{channel}/{filename}/summarize/stream", tags=["AI"])
async def summarize_transcript_stream(channel: str, filename: str):
    """Stream AI summary generation for real-time display"""
    async def generate():
        try:
            # Load config to get LLM settings
            config = await load_config()
            llm_config = config.get("llm")

            if not llm_config or not llm_config.get("provider"):
                yield f"data: {json.dumps({'error': 'LLM not configured'})}\n\n"
                return

            # Load transcript content
            output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)
            if not os.path.isabs(output_dir):
                output_dir = str(PROJECT_ROOT / output_dir)

            transcript_path = Path(output_dir) / channel / "transcripts" / filename
            if not transcript_path.exists():
                yield f"data: {json.dumps({'error': 'Transcript not found'})}\n\n"
                return

            with open(transcript_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract title from filename
            parts = filename.replace('.md', '').split('_', 1)
            title = parts[1].replace('_', ' ') if len(parts) == 2 else filename

            # Get or create metadata
            metadata = metadata_store.get(channel, filename)
            if not metadata:
                metadata = TranscriptMetadata(
                    channel=channel,
                    filename=filename,
                    title=title,
                    date=parts[0] if len(parts) == 2 else "unknown",
                    size_bytes=transcript_path.stat().st_size
                )
                metadata_store.set(metadata)

            # Get keywords
            transcript_keywords = metadata.keywords if metadata.keywords else []
            if not transcript_keywords:
                for ch in config.get("channels", []):
                    ch_name = ch.get("url", "").split("/")[-1]
                    if ch_name == channel or ch.get("url", "").endswith(f"/{channel}"):
                        transcript_keywords = ch.get("keywords", [])
                        break

            # Send initial metadata
            yield f"data: {json.dumps({'type': 'start', 'keywords': transcript_keywords})}\n\n"

            llm_client = create_llm_client(llm_config)
            collected = []

            yield ": keep-alive\n\n"

            async for chunk in llm_client.generate_summary_stream_async(content, transcript_keywords, title):
                if chunk:
                    collected.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            full_summary = "".join(collected)
            model_name = f"{llm_config.get('provider')}:{llm_config.get('model', 'default')}"
            metadata_store.update_summary(channel, filename, full_summary, model_name)

            yield f"data: {json.dumps({'type': 'done', 'model': model_name})}\n\n"

        except asyncio.CancelledError:
            logger.info("Client disconnected from summary stream")
            raise
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        }
    )


@app.websocket("/api/transcript/{channel}/{filename}/summarize/ws")
async def summarize_transcript_websocket(websocket: WebSocket, channel: str, filename: str):
    """WebSocket endpoint for streaming summaries - bypasses gunicorn buffering"""
    await websocket.accept()

    try:
        import time

        # Load config
        config = await load_config()
        llm_config = config.get("llm")

        if not llm_config or not llm_config.get("provider"):
            await websocket.send_json({'type': 'error', 'message': 'LLM not configured'})
            await websocket.close()
            return

        # Load transcript
        output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)
        if not os.path.isabs(output_dir):
            output_dir = str(PROJECT_ROOT / output_dir)

        transcript_path = Path(output_dir) / channel / "transcripts" / filename
        if not transcript_path.exists():
            await websocket.send_json({'type': 'error', 'message': 'Transcript not found'})
            await websocket.close()
            return

        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract title
        parts = filename.replace('.md', '').split('_', 1)
        title = parts[1].replace('_', ' ') if len(parts) == 2 else filename

        # Get metadata and keywords
        metadata = metadata_store.get(channel, filename)
        if not metadata:
            metadata = TranscriptMetadata(
                channel=channel,
                filename=filename,
                title=title,
                date=parts[0] if len(parts) == 2 else "unknown",
                size_bytes=transcript_path.stat().st_size
            )
            metadata_store.set(metadata)

        transcript_keywords = metadata.keywords if metadata.keywords else []
        if not transcript_keywords:
            for ch in config.get("channels", []):
                ch_name = ch.get("url", "").split("/")[-1]
                if ch_name == channel or ch.get("url", "").endswith(f"/{channel}"):
                    transcript_keywords = ch.get("keywords", [])
                    break

        # Send start message
        await websocket.send_json({
            'type': 'start',
            'keywords': transcript_keywords,
            'title': title
        })

        # Stream summary
        llm_client = create_llm_client(llm_config)
        summary_chunks = []

        start_time = time.time()
        chunk_num = 0

        if hasattr(llm_client, 'generate_summary_stream_async'):
            logger.info(f"[WebSocket] Using async streaming")
            async for chunk in llm_client.generate_summary_stream_async(content, transcript_keywords, title):
                chunk_num += 1
                elapsed = (time.time() - start_time) * 1000
                summary_chunks.append(chunk)

                # Send chunk immediately via WebSocket
                await websocket.send_json({
                    'type': 'chunk',
                    'text': chunk,
                    'num': chunk_num,
                    'elapsed': int(elapsed)
                })
                logger.info(f"[WebSocket] Sent chunk #{chunk_num} at {elapsed:.0f}ms")

                # Small delay to ensure message is sent
                await asyncio.sleep(0.001)
        else:
            logger.info(f"[WebSocket] Using sync streaming")
            for chunk in llm_client.generate_summary_stream(content, transcript_keywords, title):
                chunk_num += 1
                elapsed = (time.time() - start_time) * 1000
                summary_chunks.append(chunk)

                await websocket.send_json({
                    'type': 'chunk',
                    'text': chunk,
                    'num': chunk_num,
                    'elapsed': int(elapsed)
                })
                await asyncio.sleep(0)

        # Store summary
        full_summary = ''.join(summary_chunks)
        model_name = f"{llm_config.get('provider')}:{llm_config.get('model', 'default')}"
        metadata_store.update_summary(channel, filename, full_summary, model_name)

        # Send completion
        await websocket.send_json({
            'type': 'done',
            'model': model_name,
            'total_chunks': chunk_num,
            'total_time': int((time.time() - start_time) * 1000)
        })

        logger.info(f"[WebSocket] Completed: {chunk_num} chunks in {(time.time() - start_time)*1000:.0f}ms")

    except WebSocketDisconnect:
        logger.info("[WebSocket] Client disconnected")
    except Exception as e:
        logger.error(f"[WebSocket] Error: {str(e)}")
        try:
            await websocket.send_json({'type': 'error', 'message': str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@app.post("/api/transcript/{channel}/{filename}/summarize", tags=["AI"])
async def summarize_transcript(channel: str, filename: str, background_tasks: BackgroundTasks):
    """Generate AI summary for a transcript focusing on transcript-specific keywords (non-streaming fallback)"""
    try:
        # Load config to get LLM settings
        config = await load_config()
        llm_config = config.get("llm")

        if not llm_config or not llm_config.get("provider"):
            raise HTTPException(status_code=400, detail="LLM not configured. Please configure LLM settings first.")

        # Load transcript content
        output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)
        if not os.path.isabs(output_dir):
            output_dir = str(PROJECT_ROOT / output_dir)

        transcript_path = Path(output_dir) / channel / "transcripts" / filename
        if not transcript_path.exists():
            raise HTTPException(status_code=404, detail="Transcript file not found")

        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract title from filename
        parts = filename.replace('.md', '').split('_', 1)
        title = parts[1].replace('_', ' ') if len(parts) == 2 else filename

        # Get or create metadata
        metadata = metadata_store.get(channel, filename)
        if not metadata:
            # Initialize metadata if it doesn't exist
            metadata = TranscriptMetadata(
                channel=channel,
                filename=filename,
                title=title,
                date=parts[0] if len(parts) == 2 else "unknown",
                size_bytes=transcript_path.stat().st_size
            )
            metadata_store.set(metadata)

        # Use transcript-specific keywords (preferred) or fall back to channel keywords
        transcript_keywords = metadata.keywords if metadata.keywords else []

        # If no transcript keywords, try channel keywords as fallback
        if not transcript_keywords:
            for ch in config.get("channels", []):
                ch_name = ch.get("url", "").split("/")[-1]
                if ch_name == channel or ch.get("url", "").endswith(f"/{channel}"):
                    transcript_keywords = ch.get("keywords", [])
                    break

        # Create LLM client and generate summary
        llm_client = create_llm_client(llm_config)
        summary = llm_client.generate_summary(content, transcript_keywords, title)

        # Store summary
        model_name = f"{llm_config.get('provider')}:{llm_config.get('model', 'default')}"
        metadata_store.update_summary(channel, filename, summary, model_name)

        return {
            "success": True,
            "summary": summary,
            "keywords_focused": transcript_keywords,
            "model": model_name
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


@app.post("/api/transcript/{channel}/{filename}/extract-keywords", tags=["AI"])
async def extract_keywords_from_transcript(channel: str, filename: str):
    """Extract keywords from a transcript using AI"""
    try:
        # Load config to get LLM settings
        config = await load_config()
        llm_config = config.get("llm")

        if not llm_config or not llm_config.get("provider"):
            raise HTTPException(status_code=400, detail="LLM not configured. Please configure LLM settings first.")

        # Load transcript content
        output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)
        if not os.path.isabs(output_dir):
            output_dir = str(PROJECT_ROOT / output_dir)

        transcript_path = Path(output_dir) / channel / "transcripts" / filename
        if not transcript_path.exists():
            raise HTTPException(status_code=404, detail="Transcript file not found")

        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Create LLM client and extract keywords
        llm_client = create_llm_client(llm_config)
        keywords = llm_client.extract_keywords(content, max_keywords=10)

        # Store keywords
        metadata_store.update_keywords(channel, filename, keywords)

        return {
            "success": True,
            "keywords": keywords,
            "model": f"{llm_config.get('provider')}:{llm_config.get('model', 'default')}"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract keywords: {str(e)}")


# ============================================================================
# Asset Monitor Endpoints
# ============================================================================

@app.get("/api/assets", tags=["Asset Monitor"])
async def get_assets():
    """Get all monitored assets"""
    config = await load_config()
    return {"assets": config.get("assets", [])}


@app.post("/api/assets", tags=["Asset Monitor"])
async def add_asset(asset: AssetUpdate):
    """Add new asset to monitor"""
    config = await load_config()

    if "assets" not in config:
        config["assets"] = []

    import uuid
    new_asset = {
        "id": str(uuid.uuid4()),
        **asset.dict()
    }

    config["assets"].append(new_asset)
    await save_config(config)

    return {"success": True, "message": "Asset added successfully", "asset": new_asset}


@app.put("/api/assets/{asset_id}", tags=["Asset Monitor"])
async def update_asset(asset_id: str, asset: AssetUpdate):
    """Update existing asset"""
    config = await load_config()

    assets = config.get("assets", [])
    asset_index = next((i for i, a in enumerate(assets) if a.get("id") == asset_id), None)

    if asset_index is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    assets[asset_index] = {
        "id": asset_id,
        **asset.dict()
    }

    config["assets"] = assets
    await save_config(config)

    return {"success": True, "message": "Asset updated successfully"}


@app.delete("/api/assets/{asset_id}", tags=["Asset Monitor"])
async def delete_asset(asset_id: str):
    """Delete asset from monitoring"""
    config = await load_config()

    assets = config.get("assets", [])
    original_count = len(assets)

    config["assets"] = [a for a in assets if a.get("id") != asset_id]

    if len(config["assets"]) == original_count:
        raise HTTPException(status_code=404, detail="Asset not found")

    await save_config(config)

    return {"success": True, "message": "Asset deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
