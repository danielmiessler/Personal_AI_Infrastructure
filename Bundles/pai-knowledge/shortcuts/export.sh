#!/bin/bash
# Export PAI shortcuts from iCloud to JSON templates
# Usage: ./export.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"

echo "PAI Shortcuts Exporter"
echo "======================"
echo ""
echo "This script downloads shortcuts from iCloud and converts them to"
echo "sanitized JSON templates for version control."
echo ""

# Shortcuts to export: "name:template:icloud_id"
SHORTCUTS=(
    "File → PAI:file-capture:dd380611fac44edc930dbe01d0f9ea04"
    "Large File → PAI:large-file-capture:f29a82cdbb2546de86da5354b014937f"
    "Clipboard → PAI:clipboard-capture:6fb5ef3186b4438eaa7891a8e5b7abe0"
)

echo "Shortcuts to export:"
for entry in "${SHORTCUTS[@]}"; do
    name="${entry%%:*}"
    echo "  - $name"
done
echo ""

# Process each shortcut
for entry in "${SHORTCUTS[@]}"; do
    IFS=':' read -r name template icloud_id <<< "$entry"

    echo "Processing: $name"

    # Get download URL from iCloud API
    API_URL="https://www.icloud.com/shortcuts/api/records/${icloud_id}"
    DOWNLOAD_URL=$(curl -s "$API_URL" | jq -r '.fields.shortcut.value.downloadURL' 2>/dev/null)

    if [[ -z "$DOWNLOAD_URL" || "$DOWNLOAD_URL" == "null" ]]; then
        echo "  ❌ Failed to get download URL from iCloud API"
        echo "     URL: $API_URL"
        continue
    fi

    # Download unsigned shortcut
    TEMP_PLIST="/tmp/${template}.plist"
    TEMP_JSON="/tmp/${template}.json"

    curl -s "$DOWNLOAD_URL" -o "$TEMP_PLIST"

    if [[ ! -s "$TEMP_PLIST" ]]; then
        echo "  ❌ Download failed"
        continue
    fi

    # Convert to JSON
    if ! plutil -convert json "$TEMP_PLIST" -o "$TEMP_JSON" 2>/dev/null; then
        echo "  ❌ Failed to convert to JSON"
        continue
    fi

    # Sanitize credentials
    sed \
        -e 's/bot[0-9]\{9,10\}:[A-Za-z0-9_-]\{35,50\}/botYOUR_BOT_TOKEN_HERE/g' \
        -e 's/-100[0-9]\{10,13\}/YOUR_CHAT_ID_HERE/g' \
        -e 's/\[user:[^]]*\]/[user:YOUR_USERNAME]/g' \
        "$TEMP_JSON" | jq '.' > "${TEMPLATES_DIR}/${template}.json"

    # Cleanup
    rm -f "$TEMP_PLIST" "$TEMP_JSON"

    echo "  ✅ Saved: templates/${template}.json"
done

echo ""
echo "Verifying sanitization..."
echo "-------------------------"

LEAKED=0
if grep -l "bot[0-9]\{9,10\}:" "$TEMPLATES_DIR"/*.json 2>/dev/null; then
    echo "❌ Bot token found!"
    LEAKED=1
fi
if grep -l "\-100[0-9]\{10\}" "$TEMPLATES_DIR"/*.json 2>/dev/null; then
    echo "❌ Chat ID found!"
    LEAKED=1
fi

if [[ $LEAKED -eq 0 ]]; then
    echo "✅ No credentials found - safe to commit"
fi

echo ""
echo "Done! Review changes with: git diff shortcuts/templates/"
echo ""
echo "To update iCloud shortcut IDs:"
echo "  1. Share shortcut to iCloud (Shortcuts.app → File → Share → Copy iCloud Link)"
echo "  2. Extract ID from URL: https://www.icloud.com/shortcuts/<ID>"
echo "  3. Update SHORTCUTS array in this script"
