#!/bin/bash
# Install script for ingest CLI and watch daemon
# Run: ./install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAI_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BIN_DIR="${HOME}/.local/bin"
LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"

echo "Installing ingest CLI..."
echo "  PAI Directory: ${PAI_DIR}"
echo ""

# Create bin directory if needed
mkdir -p "$BIN_DIR"
mkdir -p "$LAUNCH_AGENTS"

# Create wrapper script
cat > "${BIN_DIR}/ingest" << EOF
#!/bin/bash
exec bun run "${PAI_DIR}/bin/ingest/ingest.ts" "\$@"
EOF

chmod +x "${BIN_DIR}/ingest"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi

echo "Installing Telegram watch daemon..."

# Prepare the plist with actual paths
PLIST_SRC="${SCRIPT_DIR}/com.pai.ingest-watch.plist"
PLIST_DST="${LAUNCH_AGENTS}/com.pai.ingest-watch.plist"

if [[ -f "$PLIST_SRC" ]]; then
    # Unload if already loaded
    launchctl unload "$PLIST_DST" 2>/dev/null || true

    # Create plist with actual paths substituted
    sed -e "s|__PAI_DIR__|${PAI_DIR}|g" \
        -e "s|__HOME__|${HOME}|g" \
        "$PLIST_SRC" > "$PLIST_DST"

    # Load the daemon
    launchctl load "$PLIST_DST"

    echo "  ✅ Installed LaunchAgent: com.pai.ingest-watch"
    echo "  📂 Logs: /tmp/ingest-watch.log"
    echo ""
    echo "  Management commands:"
    echo "    launchctl unload ~/Library/LaunchAgents/com.pai.ingest-watch.plist  # Stop"
    echo "    launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist    # Start"
    echo "    tail -f /tmp/ingest-watch.log                                       # Monitor"
else
    echo "  ⚠️  Plist template not found: ${PLIST_SRC}"
fi

echo ""
echo "Done! Verify with: ingest --help"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  NEXT STEPS: Configure your environment"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "1. Set up Telegram (see: ${PAI_DIR}/bin/ingest/docs/telegram-setup.md)"
echo "   - Create bot via @BotFather"
echo "   - Create private channel as inbox"
echo "   - Add bot as channel admin"
echo ""
echo "2. Add to ~/.config/fabric/.env:"
echo "   TELEGRAM_BOT_TOKEN=your_bot_token"
echo "   TELEGRAM_CHANNEL_ID=-100your_channel_id"
echo "   OBSIDIAN_VAULT_PATH=~/Documents/your_vault"
echo "   OPENAI_API_KEY=sk-... (optional: for semantic search)"
echo ""
echo "3. Test your setup:"
echo "   ingest config    # Verify configuration"
echo "   ingest poll      # Test Telegram connection"
echo ""
