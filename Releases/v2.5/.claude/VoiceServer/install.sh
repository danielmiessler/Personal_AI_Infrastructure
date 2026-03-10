#!/bin/bash
# Install Qwen3-TTS Voice Server (uv-based)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLIST_SRC="$SCRIPT_DIR/macos-service/com.pai.qwen3-voice-server.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.pai.qwen3-voice-server.plist"

echo "=================================================="
echo "  Qwen3-TTS Voice Server Installation"
echo "=================================================="

# Check uv
echo ""
echo "1. Checking uv..."
if ! command -v uv &> /dev/null; then
    echo "   ERROR: uv not found."
    echo "   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
echo "   Using: $(uv --version)"

# Initialize uv project if needed
echo ""
echo "2. Setting up uv environment..."
cd "$SCRIPT_DIR"

if [ ! -f "pyproject.toml" ]; then
    echo "   Creating pyproject.toml..."
    uv init --no-readme --no-git
fi

# Sync dependencies
echo ""
echo "3. Installing dependencies with uv..."
uv sync
echo "   Dependencies installed"

# Create directories
echo ""
echo "4. Creating directories..."
mkdir -p "$SCRIPT_DIR/voices/prompts"
mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/reference_audio"
mkdir -p /tmp/qwen3-voice
echo "   Directories ready"

# Initialize voice index
echo ""
echo "5. Initializing voice storage..."
INDEX_FILE="$SCRIPT_DIR/voices/index.json"
if [ ! -f "$INDEX_FILE" ]; then
    echo '{"prompts": {}}' > "$INDEX_FILE"
    echo "   Created voice index"
else
    echo "   Voice index already exists"
fi

# Install LaunchAgent
echo ""
echo "6. Installing LaunchAgent..."
mkdir -p "$HOME/Library/LaunchAgents"

# Update plist with actual home directory
sed "s|__HOME__|$HOME|g" "$PLIST_SRC" > "$PLIST_DST"
echo "   Installed: $PLIST_DST"

# Make scripts executable
echo ""
echo "7. Setting permissions..."
chmod +x "$SCRIPT_DIR"/*.sh
echo "   Scripts are executable"

echo ""
echo "=================================================="
echo "  Installation Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Start server:  $SCRIPT_DIR/start.sh"
echo "  2. Check status:  $SCRIPT_DIR/status.sh"
echo "  3. Test health:   curl http://localhost:8889/health"
echo ""
echo "Note: First request will download the model (~7GB)"
echo "      This may take several minutes."
echo ""
