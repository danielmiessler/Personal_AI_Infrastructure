#!/bin/bash
# LifeOS Pulse Menu Bar — Install Script
# Builds, deploys, removes old Monitor, installs launchd plist, launches

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="$HOME"
APP_NAME="LifeOS Pulse"
BINARY_NAME="LifeOS Pulse"
APP_DIR="$HOME_DIR/Applications"
APP_DEST="$APP_DIR/$APP_NAME.app"
OLD_APP="$APP_DIR/PAI Monitor.app"

PLIST_LABEL="com.lifeos.pulse-menubar"
PLIST_SRC="$SCRIPT_DIR/com.lifeos.pulse-menubar.plist"
PLIST_DST="$HOME_DIR/Library/LaunchAgents/$PLIST_LABEL.plist"

OLD_PLIST_LABEL="com.lifeos.monitor-menubar"
OLD_PLIST_DST="$HOME_DIR/Library/LaunchAgents/$OLD_PLIST_LABEL.plist"

echo "=== LifeOS Pulse Menu Bar Installer ==="
echo ""

# Step 1: Build
echo "[1/6] Building..."
bash "$SCRIPT_DIR/build.sh"
echo ""

# Step 2: Unload old menu bar plist if present
echo "[2/6] Removing old Monitor menu bar agent..."
if [ -f "$OLD_PLIST_DST" ]; then
    launchctl unload "$OLD_PLIST_DST" 2>/dev/null || true
    rm -f "$OLD_PLIST_DST"
    echo "  Removed $OLD_PLIST_LABEL"
fi

# Step 3: Remove old Monitor app
echo "[3/6] Removing old Monitor app..."
if [ -d "$OLD_APP" ]; then
    rm -rf "$OLD_APP"
    echo "  Removed $OLD_APP"
else
    echo "  Not found, skipping."
fi

# Step 4: Unload current plist if it exists (for reinstall)
echo "[4/6] Preparing deployment..."
if [ -f "$PLIST_DST" ]; then
    launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

# Kill any running instance
pkill -f "LifeOS Pulse.app" 2>/dev/null || true
sleep 1

# Step 5: Deploy app bundle
echo "[5/6] Deploying to $APP_DIR..."
mkdir -p "$APP_DIR"
rm -rf "$APP_DEST"
cp -R "$SCRIPT_DIR/build/$APP_NAME.app" "$APP_DEST"
echo "  Installed $APP_DEST"

# Step 6: Install and load launchd plist
echo "[6/6] Installing LaunchAgent..."

# Substitute __HOME__ placeholder with actual home directory
sed "s|__HOME__|$HOME_DIR|g" "$PLIST_SRC" > "$PLIST_DST"
echo "  Installed $PLIST_DST"

# Ensure logs directory exists
mkdir -p "$HOME_DIR/.claude/LIFEOS/PULSE/logs"

# `launchctl load` is the legacy API: it prints "Load failed: N: ..." to stderr
# but still exits 0, so `set -e` cannot see it. Use the domain-target API, which
# returns a real exit status, and bootout first so a stale registration of the
# same label cannot fail the bootstrap with EX 5 (Input/output error).
DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$PLIST_LABEL" 2>/dev/null || true

if ! launchctl bootstrap "$DOMAIN" "$PLIST_DST"; then
    echo "  ERROR: launchctl bootstrap failed for $PLIST_LABEL" >&2
    echo "  The menu bar is NOT installed. Plist: $PLIST_DST" >&2
    exit 1
fi
echo "  Bootstrapped $PLIST_LABEL"

# A successful bootstrap only means launchd accepted the job definition.
# Confirm the process actually came up before claiming the menu bar is running.
BINARY_PATH="$APP_DEST/Contents/MacOS/$BINARY_NAME"
for _ in $(seq 1 10); do
    if pgrep -f "$BINARY_PATH" >/dev/null 2>&1; then
        RUNNING=1
        break
    fi
    sleep 0.5
done

if [ "${RUNNING:-0}" -ne 1 ]; then
    echo "  ERROR: $PLIST_LABEL was bootstrapped but no process is running." >&2
    echo "  Check $HOME_DIR/.claude/LIFEOS/PULSE/logs/menubar-stderr.log" >&2
    launchctl print "$DOMAIN/$PLIST_LABEL" 2>&1 | grep -E "last exit code|state =" >&2 || true
    exit 1
fi

echo ""
echo "=== Installation complete ==="
echo "LifeOS Pulse menu bar is now running."
echo "It will auto-start on login."
