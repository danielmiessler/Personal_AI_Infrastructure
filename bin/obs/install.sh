#!/bin/bash
# Install script for obs CLI
# Run: ./install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"

echo "Installing obs CLI..."

# Create bin directory if needed
mkdir -p "$BIN_DIR"

# Create wrapper script
cat > "${BIN_DIR}/obs" << 'EOF'
#!/bin/bash
exec bun run "${HOME}/Documents/src/PAI-v1.2/Personal_AI_Infrastructure/bin/obs/obs.ts" "$@"
EOF

chmod +x "${BIN_DIR}/obs"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "Installing automatic embedding updates..."

# Install launchd plist for automatic embeddings
PLIST_SRC="${SCRIPT_DIR}/com.pai.obs-embed.plist"
PLIST_DST="${HOME}/Library/LaunchAgents/com.pai.obs-embed.plist"

if [[ -f "$PLIST_SRC" ]]; then
    # Unload if already loaded
    launchctl unload "$PLIST_DST" 2>/dev/null || true

    # Copy and load
    cp "$PLIST_SRC" "$PLIST_DST"
    launchctl load "$PLIST_DST"

    echo "  Installed launchd job for auto-embedding (every 30 min)"
fi

echo ""
echo "Done! Verify with: obs --help"
echo ""
echo "Configuration via ~/.config/fabric/.env:"
echo "  OBSIDIAN_VAULT_PATH=~/Documents/your_vault"
echo "  OPENAI_API_KEY=sk-..."
