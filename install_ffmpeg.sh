#!/bin/bash
# Script to install ffmpeg

echo "========================================"
echo "ffmpeg Installation Helper"
echo "========================================"
echo ""

# Check if ffmpeg is already installed
if command -v ffmpeg &> /dev/null; then
    echo "✓ ffmpeg is already installed!"
    ffmpeg -version | head -1
    echo ""
    exit 0
fi

echo "ffmpeg is not installed."
echo ""
echo "Installing ffmpeg..."
echo ""

# Try to install with apt
if command -v apt &> /dev/null; then
    echo "Using apt package manager..."
    sudo apt update
    sudo apt install -y ffmpeg

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ ffmpeg installed successfully!"
        ffmpeg -version | head -1
    else
        echo ""
        echo "✗ Installation failed. You may need sudo privileges."
        echo ""
        echo "Try running manually:"
        echo "  sudo apt update && sudo apt install -y ffmpeg"
    fi

elif command -v yum &> /dev/null; then
    echo "Using yum package manager..."
    sudo yum install -y ffmpeg

elif command -v brew &> /dev/null; then
    echo "Using Homebrew..."
    brew install ffmpeg

else
    echo "Could not detect package manager."
    echo ""
    echo "Please install ffmpeg manually:"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt update && sudo apt install -y ffmpeg"
    echo ""
    echo "CentOS/RHEL:"
    echo "  sudo yum install -y ffmpeg"
    echo ""
    echo "macOS:"
    echo "  brew install ffmpeg"
    echo ""
    echo "Or see: https://ffmpeg.org/download.html"
    echo ""
    echo "Alternatively, see INSTALL_FFMPEG.md for static build installation."
fi

echo ""
echo "After installation, verify with:"
echo "  ffmpeg -version"
echo ""
