#!/bin/bash
# PAI System Gemini - Installation Script
set -e

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
GEMINI_CONFIG_DIR="$HOME/.gemini"
GEMINI_SETTINGS="$GEMINI_CONFIG_DIR/settings.json"
# Navigate to the pack root (3 levels up from src/scripts/install.sh)
PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🤖 PAI System Gemini Installer"
echo "=================================="

# 1. Verify PAI Core
if [ ! -d "$PAI_DIR" ]; then
    echo "❌ Error: PAI Core directory not found at $PAI_DIR"
    exit 1
fi
echo "✅ Found PAI Core at $PAI_DIR"

# 2. Build Adapter
echo "📦 Building Gemini Adapter..."
cd "$PACK_DIR"
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $PACK_DIR"
    exit 1
fi

# Install dependencies and build
npm install --silent
npx tsc src/hooks/adapter.ts --outDir dist --esModuleInterop
echo "✅ Adapter built to $PACK_DIR/dist/adapter.js"

# 3. Configure Gemini
echo "🔗 Linking Gemini to PAI..."
mkdir -p "$GEMINI_CONFIG_DIR"

if [ ! -f "$GEMINI_SETTINGS" ]; then
    echo "{}" > "$GEMINI_SETTINGS"
fi

# Use Node to merge config safely
// Use Node to merge config safely
node -e "
const fs = require('fs');
const settingsPath = '$GEMINI_SETTINGS';
const adapterPath = '$PACK_DIR/dist/adapter.js';
let settings = {};
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch (e) {}

const hookConfig = {
  type: 'command',
  command: 'node ' + adapterPath
};

settings.hooks = {
  ...(settings.hooks || {}),
  'SessionStart': [hookConfig],
  'BeforeTool': [hookConfig],
  'AfterTool': [hookConfig],
  'BeforeAgent': [hookConfig]
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
"

echo "✅ Gemini settings updated."
echo "🎉 Success! Gemini is now PAI-Enabled."