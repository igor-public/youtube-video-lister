#!/bin/bash
# Quick Start Script for YouTube Toolkit

set -e

echo "========================================"
echo "YouTube Toolkit - Quick Start"
echo "========================================"
echo ""

# Check if in correct directory
if [ ! -f "monitor_channels.py" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  No .env file found!"
    echo ""
    echo "Creating .env from example..."
    cp .env.example .env
    echo ""
    echo "Please edit .env and add your YouTube API key:"
    echo "  nano .env"
    echo ""
    echo "Get your API key from: https://console.cloud.google.com/"
    echo ""
    exit 0
fi

# Check if channels_config.json exists
if [ ! -f "channels_config.json" ]; then
    echo ""
    echo "No channels_config.json found. Creating from example..."
    cp channels_config.example.json channels_config.json
    echo ""
    echo "✓ Created channels_config.json"
    echo ""
    echo "Edit this file to add your YouTube channels:"
    echo "  nano channels_config.json"
    echo ""
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg is not installed (optional but recommended)"
    echo ""
    echo "To install ffmpeg, run:"
    echo "  ./install_ffmpeg.sh"
    echo ""
    echo "Or manually:"
    echo "  sudo apt update && sudo apt install -y ffmpeg"
    echo ""
fi

echo "To monitor channels, run:"
echo "  python monitor_channels.py"
echo ""
echo "Or with config file:"
echo "  python monitor_with_config.py"
echo ""
echo "View documentation:"
echo "  cat README.md"
echo "  cat USAGE_GUIDE.md"
echo ""
echo "Happy monitoring! 🎥"
echo ""
