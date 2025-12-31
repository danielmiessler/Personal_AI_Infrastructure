#!/bin/bash
# Generate personal iOS shortcuts from templates
# Injects credentials from environment variables or .env file
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"
BUILD_DIR="${SCRIPT_DIR}/build"

# Load .env if present (check multiple locations, priority order)
load_env() {
    local envfile="$1"
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        # Only export known variables (avoid path issues)
        case "$key" in
            TELEGRAM_*|PAI_USERNAME)
                export "$key=$value"
                ;;
        esac
    done < "$envfile"
}

# Check for PAI_DIR from environment or ~/.pai-env
if [[ -z "${PAI_DIR:-}" && -f "${HOME}/.pai-env" ]]; then
    source "${HOME}/.pai-env"
fi

# Check .env locations in priority order
if [[ -n "${PAI_DIR:-}" && -f "${PAI_DIR}/.env" ]]; then
    echo "Loading credentials from ${PAI_DIR}/.env..."
    load_env "${PAI_DIR}/.env"
elif [[ -f "${HOME}/.claude/.env" ]]; then
    echo "Loading credentials from ~/.claude/.env..."
    load_env "${HOME}/.claude/.env"
elif [[ -f "${SCRIPT_DIR}/.env" ]]; then
    echo "Loading credentials from shortcuts/.env..."
    load_env "${SCRIPT_DIR}/.env"
elif [[ -f "${HOME}/.config/fabric/.env" ]]; then
    echo "Loading credentials from ~/.config/fabric/.env..."
    load_env "${HOME}/.config/fabric/.env"
fi

# Normalize variable names (support multiple conventions)
# Send bot token: TELEGRAM_SENDER_BOT_TOKEN (PAI standard) or TELEGRAM_SEND_BOT_TOKEN or TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_TOKEN="${TELEGRAM_SENDER_BOT_TOKEN:-${TELEGRAM_SEND_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}}"
# Chat ID: TELEGRAM_INBOX_CHANNEL_ID (PAI v2) or TELEGRAM_CHANNEL_ID or TELEGRAM_CHAT_ID
TELEGRAM_CHAT_ID="${TELEGRAM_INBOX_CHANNEL_ID:-${TELEGRAM_CHANNEL_ID:-${TELEGRAM_CHAT_ID:-}}}"

# Validate required environment variables
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    echo "Error: Missing TELEGRAM_SENDER_BOT_TOKEN"
    echo ""
    echo "Run the pai-knowledge installer first, or set it manually in your .env:"
    echo "  TELEGRAM_SENDER_BOT_TOKEN=your_send_bot_token"
    exit 1
fi

if [[ -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "Error: Missing TELEGRAM_INBOX_CHANNEL_ID"
    echo ""
    echo "Run the pai-knowledge installer first, or set it manually in your .env:"
    echo "  TELEGRAM_INBOX_CHANNEL_ID=your_channel_id"
    exit 1
fi

# Optional username (defaults to system username)
PAI_USERNAME="${PAI_USERNAME:-$(whoami)}"

echo "Building shortcuts with:"
echo "  Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "  Chat ID: ${TELEGRAM_CHAT_ID}"
echo "  Username: ${PAI_USERNAME}"
echo ""

# Create build directory
mkdir -p "${BUILD_DIR}"

# Process each template
for template in "${TEMPLATES_DIR}"/*.json; do
    filename=$(basename "$template" .json)
    unsigned="${BUILD_DIR}/${filename}-unsigned.shortcut"
    output="${BUILD_DIR}/${filename}.shortcut"

    echo "Processing ${filename}..."

    # Replace placeholders and convert to binary plist
    sed \
        -e "s/YOUR_BOT_TOKEN_HERE/${TELEGRAM_BOT_TOKEN}/g" \
        -e "s/YOUR_CHAT_ID_HERE/${TELEGRAM_CHAT_ID}/g" \
        -e "s/YOUR_USERNAME/${PAI_USERNAME}/g" \
        "$template" | \
    plutil -convert binary1 -o "$unsigned" -

    # Sign the shortcut (required for macOS import)
    shortcuts sign --mode anyone --input "$unsigned" --output "$output" 2>/dev/null
    rm "$unsigned"

    echo "  → ${output} (signed)"
done

echo ""
echo "Done! Shortcuts are in: ${BUILD_DIR}/"
echo ""
echo "Install options:"
echo "  1. Double-click on Mac to import directly"
echo "  2. AirDrop .shortcut files to iOS device"
echo "  3. Copy to iCloud Drive and open from Files app"
