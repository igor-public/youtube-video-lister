#!/usr/bin/env python3
"""
YouTube Toolkit - FastAPI Backend
Modern REST API for YouTube channel monitoring and transcript management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import json
import os
from pathlib import Path
from datetime import datetime
import subprocess
import asyncio
from enum import Enum

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
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for vanilla JS frontend
static_path = Path(__file__).parent.parent / "static"
templates_path = Path(__file__).parent.parent / "templates"

if static_path.exists():
    app.mount("/css", StaticFiles(directory=str(static_path / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(static_path / "js")), name="js")

# Configuration
CONFIG_FILE = os.getenv("CONFIG_FILE", "channels_config.json")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "channel_data")

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
    model: str = Field(..., description="Model identifier")
    apiKey: Optional[str] = Field(None, description="API key for OpenAI/Anthropic")
    awsAccessKeyId: Optional[str] = Field(None, description="AWS Access Key for Bedrock")
    awsSecretAccessKey: Optional[str] = Field(None, description="AWS Secret Key for Bedrock")
    awsRegion: Optional[str] = Field(None, description="AWS Region for Bedrock")

    @validator('apiKey')
    def validate_api_key(cls, v, values):
        provider = values.get('provider')
        if provider in [LLMProvider.openai, LLMProvider.anthropic] and not v:
            raise ValueError(f"API key required for {provider}")
        return v

    @validator('awsAccessKeyId')
    def validate_aws_keys(cls, v, values):
        if values.get('provider') == LLMProvider.bedrock and not v:
            raise ValueError("AWS credentials required for Bedrock")
        return v


class KeywordsUpdate(BaseModel):
    """Keywords update payload"""
    keywords: List[str]


class TranscriptResponse(BaseModel):
    """Transcript content response"""
    content: str
    filename: str
    channel: str
    size: int


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
                "settings": {
                    "default_days_back": 7,
                    "default_languages": ["en"],
                    "output_directory": OUTPUT_DIR
                }
            }
            await save_config(default_config)
            return default_config

        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load config: {str(e)}")


async def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to JSON file"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")


async def get_channel_tree() -> List[Dict[str, Any]]:
    """Build hierarchical tree of channels and transcripts"""
    try:
        config = await load_config()
        output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

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
            for file_path in sorted(transcripts_dir.glob("*.md"), reverse=True):
                parts = file_path.stem.split('_')
                date = parts[0] if len(parts) >= 2 else "unknown"
                title = ' '.join(parts[1:]) if len(parts) >= 2 else file_path.stem

                transcripts.append({
                    "filename": file_path.name,
                    "title": title,
                    "date": date,
                    "size": file_path.stat().st_size,
                    "path": str(file_path)
                })

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
    """Run monitoring in background"""
    global monitoring_status

    monitoring_status["running"] = True
    monitoring_status["progress"] = "Initializing..."
    monitoring_status["error"] = None

    try:
        # Use venv python if available
        venv_python = Path(__file__).parent.parent / "venv" / "bin" / "python"
        python_cmd = str(venv_python) if venv_python.exists() else "python3"

        script_path = Path(__file__).parent.parent / "monitor_with_config.py"

        result = subprocess.run(
            [python_cmd, str(script_path)],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True
        )

        monitoring_status["running"] = False
        monitoring_status["lastRun"] = datetime.now().isoformat()

        if result.returncode == 0:
            monitoring_status["progress"] = "Completed"
            monitoring_status["results"] = result.stdout
        else:
            monitoring_status["progress"] = "Error"
            monitoring_status["error"] = result.stderr or f"Exit code: {result.returncode}"

    except Exception as e:
        monitoring_status["running"] = False
        monitoring_status["progress"] = "Error"
        monitoring_status["error"] = str(e)
        monitoring_status["lastRun"] = datetime.now().isoformat()


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", include_in_schema=False)
async def root():
    """Serve vanilla JS frontend"""
    index_path = Path(__file__).parent.parent / "templates" / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
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
async def get_tree():
    """Get channel tree structure with all transcripts"""
    return await get_channel_tree()


@app.get("/api/transcript/{channel}/{filename}", tags=["Transcripts"], response_model=TranscriptResponse)
async def get_transcript(channel: str, filename: str):
    """Get transcript content"""
    config = await load_config()
    output_dir = config.get("settings", {}).get("output_directory", OUTPUT_DIR)

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
        config["llm"]["awsAccessKeyId"] = llm_config.awsAccessKeyId
        config["llm"]["awsSecretAccessKey"] = llm_config.awsSecretAccessKey
        config["llm"]["awsRegion"] = llm_config.awsRegion
        config["llm"].pop("apiKey", None)
    else:
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
