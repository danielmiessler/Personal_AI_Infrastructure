# Kai Voice System - Installation Guide

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS or Linux**: Cross-platform audio support included
- **TTS API account** (choose one):
  - **Google Cloud** (recommended): 4M free chars/month - [console.cloud.google.com](https://console.cloud.google.com)
  - **ElevenLabs**: ~10K free chars/month - [elevenlabs.io](https://elevenlabs.io)
- **Required PAI Packs** (install these first):
  - `kai-hook-system` - Foundation hook infrastructure
  - `kai-core-install` - Skills, identity, and response format

---

## Platform Compatibility Check

### Step 0.0: Operating System Check

```bash
OS_TYPE="$(uname -s)"
echo "Detected OS: $OS_TYPE"

if [ "$OS_TYPE" = "Darwin" ]; then
  echo "✓ macOS detected - Voice system is fully supported"
  echo "  Audio: afplay (built-in)"
elif [ "$OS_TYPE" = "Linux" ]; then
  echo "✓ Linux detected - Voice system is fully supported"
  echo ""
  echo "Checking audio players..."
  if command -v mpg123 &> /dev/null; then
    echo "  ✓ mpg123 found (preferred)"
  elif command -v mpv &> /dev/null; then
    echo "  ✓ mpv found"
  elif command -v paplay &> /dev/null; then
    echo "  ✓ paplay found"
  else
    echo "  ⚠️  No audio player found. Install one:"
    echo "     sudo apt install mpg123   # Recommended"
    echo "     sudo apt install mpv"
  fi
else
  echo ""
  echo "❌ UNSUPPORTED: $OS_TYPE detected"
  echo "The Kai Voice System supports macOS and Linux only."
  echo "Windows is not currently supported."
fi
```

**AI Agent Instructions:**
- If OS is macOS → Proceed with installation
- If OS is Linux → Ensure audio player is installed (mpg123 recommended), then proceed
- If OS is Windows → STOP, do not proceed, inform user it's unsupported

---

## Pre-Installation: Port Configuration

### Step 0.1: Choose Voice Server Port

The default port is **8888**. If this port is in use, choose an alternative.

```bash
# Check if default port 8888 is available
if lsof -i :8888 > /dev/null 2>&1; then
  echo "⚠️  Port 8888 is IN USE"
  lsof -i :8888 | head -5
  echo ""
  echo "Options:"
  echo "  1. Stop the service using port 8888"
  echo "  2. Use a different port (set VOICE_SERVER_PORT in .env)"
else
  echo "✓ Port 8888 is available"
fi
```

**To use a custom port:** Add to `$PAI_DIR/.env`:
```bash
VOICE_SERVER_PORT=8889  # or any available port
```

The voice server and hooks will automatically use this port if set.

---

## Pre-Installation: System Analysis

### Step 0.2: Verify Required Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Checking Required Dependencies ==="

# Check hook system (REQUIRED)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ kai-hook-system is installed"
else
  echo "❌ kai-hook-system NOT installed - REQUIRED!"
fi

# Check core install (REQUIRED)
if [ -d "$PAI_CHECK/skills" ] && [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ kai-core-install is installed"
else
  echo "❌ kai-core-install NOT installed - REQUIRED!"
fi

# Check for TTS API key (either Google or ElevenLabs)
PAI_ENV="${PAI_DIR:-$HOME/.config/pai}/.env"
if [ -f "$PAI_ENV" ]; then
  if grep -q "GOOGLE_API_KEY" "$PAI_ENV"; then
    echo "✓ GOOGLE_API_KEY found (Google TTS available)"
  fi
  if grep -q "ELEVENLABS_API_KEY" "$PAI_ENV"; then
    echo "✓ ELEVENLABS_API_KEY found (ElevenLabs available)"
  fi
  if ! grep -q "GOOGLE_API_KEY\|ELEVENLABS_API_KEY" "$PAI_ENV"; then
    echo "⚠️  No TTS API key found - add GOOGLE_API_KEY or ELEVENLABS_API_KEY to $PAI_ENV"
  fi
else
  echo "⚠️  No .env file found at $PAI_ENV"
fi
```

### Step 0.3: Check for Existing Voice System

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for existing voice directory
if [ -d "$PAI_CHECK/voice" ]; then
  echo "⚠️  Voice directory EXISTS"
else
  echo "✓ No existing voice directory"
fi

# Check for running voice server
if lsof -i :8888 > /dev/null 2>&1; then
  echo "⚠️  Something running on port 8888"
else
  echo "✓ Port 8888 is available"
fi
```

### Step 0.4: Stop Existing Voice Server (If Running)

```bash
# Stop any running voice server
pkill -f "voice/server.ts" 2>/dev/null || true

# Unload LaunchAgent if exists (macOS)
if [ -f "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" ]; then
  launchctl unload "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" 2>/dev/null
fi
```

---

## Step 1: Create Directory Structure

```bash
mkdir -p $PAI_DIR/hooks/lib
mkdir -p $PAI_DIR/config
mkdir -p $PAI_DIR/voice-server
```

---

## Step 2: Install Prosody Enhancer Library

Copy `src/hooks/lib/prosody-enhancer.ts` to `$PAI_DIR/hooks/lib/prosody-enhancer.ts`

---

## Step 3: Install Voice Hooks

Copy the following files:
- `src/hooks/stop-hook-voice.ts` → `$PAI_DIR/hooks/stop-hook-voice.ts`
- `src/hooks/subagent-stop-hook-voice.ts` → `$PAI_DIR/hooks/subagent-stop-hook-voice.ts`

---

## Step 4: Install Voice Configuration

Copy `config/voice-personalities.json` to `$PAI_DIR/config/voice-personalities.json`

---

## Step 5: Install Voice Server

Copy `src/voice/server.ts` to `$PAI_DIR/voice-server/server.ts`

---

## Step 6: Set Up TTS Provider

Choose one of the following providers:

### Option A: Google Cloud TTS (Recommended)

**Why Google?** 4 million free characters per month vs ~10K for ElevenLabs. Effectively unlimited for PAI notifications.

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)
2. **Enable Cloud Text-to-Speech API**:
   - Go to APIs & Services → Library
   - Search for "Cloud Text-to-Speech API"
   - Click Enable
3. **Create API key**:
   - Go to APIs & Services → Credentials
   - Create Credentials → API Key
   - (Optional) Restrict key to Cloud Text-to-Speech API
4. **Add to $PAI_DIR/.env**:

```bash
TTS_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
GOOGLE_TTS_VOICE=en-US-Neural2-J  # Optional, this is the default
```

5. **Test your API key**:

```bash
curl -X POST "https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Hello, this is Google Cloud TTS."},"voice":{"languageCode":"en-US","name":"en-US-Neural2-J"},"audioConfig":{"audioEncoding":"MP3"}}' \
  | jq -r '.audioContent' | base64 -d > test.mp3

# Play (macOS: afplay, Linux: mpg123)
mpg123 test.mp3 || afplay test.mp3
rm test.mp3
```

### Option B: ElevenLabs

1. **Sign up** at [elevenlabs.io](https://elevenlabs.io)
2. **Get your API key** from Profile → API key
3. **Add to $PAI_DIR/.env**:

```bash
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-api-key
ELEVENLABS_VOICE_ID=your-voice-id
```

4. **Test your API key**:

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/s3TPKV1kjDlVtZbl4Ksh" \
  -H "xi-api-key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test.", "model_id": "eleven_turbo_v2_5"}' \
  --output test.mp3

mpg123 test.mp3 || afplay test.mp3  # Should hear "Hello, this is a test"
rm test.mp3
```

---

## Step 7: Register Hooks

Merge the hook configuration from `config/settings-hooks.json` into your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/stop-hook-voice.ts"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/subagent-stop-hook-voice.ts"
          }
        ]
      }
    ]
  }
}
```

---

## Step 8: Start Voice Server

```bash
# Start the voice server
bun run $PAI_DIR/voice-server/server.ts &

# Verify it's running
curl http://localhost:8888/health
```

---

## Step 9: (Optional) Set Up Auto-Start

Create a LaunchAgent to auto-start the voice server on login:

```bash
cat > ~/Library/LaunchAgents/com.pai.voice-server.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pai.voice-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/.bun/bin/bun</string>
        <string>run</string>
        <string>/Users/YOUR_USERNAME/.config/pai/voice-server/server.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/pai-voice-server.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/pai-voice-server.log</string>
</dict>
</plist>
EOF

# Replace YOUR_USERNAME with your actual username
# Fallback if USER is undefined (edge case but deterministic)
USERNAME="${USER:-$(whoami)}"

if [ "$(uname -s)" = "Darwin" ]; then
  sed -i '' "s/YOUR_USERNAME/${USERNAME}/g" ~/Library/LaunchAgents/com.pai.voice-server.plist
else
  sed -i "s/YOUR_USERNAME/${USERNAME}/g" ~/Library/LaunchAgents/com.pai.voice-server.plist
fi

# Load the agent
launchctl load ~/Library/LaunchAgents/com.pai.voice-server.plist
```

### Linux (systemd user service)

**Note:** Requires systemd (most modern distros have it)
**WSL2 users:** Run `sudo systemctl enable --now systemd` first if systemd isn't enabled

```bash
mkdir -p ~/.config/systemd/user
mkdir -p ~/.config/pai/voice-server  # Ensure log directory exists

cat > ~/.config/systemd/user/pai-voice-server.service << 'EOF'
[Unit]
Description=PAI Voice Server
After=network.target

[Service]
Type=simple
# Use %h for home directory (systemd variable expansion)
WorkingDirectory=%h/.config/pai/voice-server
# Ensure log directory exists before starting
ExecStartPre=/bin/mkdir -p %h/.config/pai/voice-server
# Run server.ts from working directory
ExecStart=%h/.bun/bin/bun run server.ts
Restart=on-failure
RestartSec=5
# Logging
StandardOutput=append:%h/.config/pai/voice-server/voice-server.log
StandardError=append:%h/.config/pai/voice-server/voice-server.log
# Environment (bun needs to find node_modules if any)
Environment=PATH=%h/.bun/bin:/usr/local/bin:/usr/bin

[Install]
WantedBy=default.target
EOF

# Enable linger so service survives logout
loginctl enable-linger $USER

# Reload, enable, and start
systemctl --user daemon-reload
systemctl --user enable pai-voice-server.service
systemctl --user start pai-voice-server.service

# Verify it's running
systemctl --user status pai-voice-server.service

# Test the server responds
curl http://localhost:8888/health

echo "✓ Voice server will auto-start on boot"
echo "  Control: systemctl --user {start|stop|restart|status} pai-voice-server.service"
echo "  Logs: journalctl --user -u pai-voice-server.service -f"
```

---

## Step 10: Verify Installation

Run the verification checklist in VERIFY.md to confirm everything works.

---

## Troubleshooting

### No Voice Output

1. Check voice server is running: `curl http://localhost:8888/health`
2. Verify TTS API key is set in `$PAI_DIR/.env`
3. Check which provider is active: response shows `provider: google` or `provider: elevenlabs`
4. Check logs: `tail -f $PAI_DIR/voice-server/voice-server.log`

### Google TTS Errors

| Error | Solution |
|-------|----------|
| `SERVICE_DISABLED` | Enable Cloud Text-to-Speech API in Google Cloud Console |
| `API_KEY_SERVICE_BLOCKED` | Add Cloud Text-to-Speech API to allowed APIs for your key |
| `PERMISSION_DENIED` | Check API key is valid and has correct permissions |

### ElevenLabs Errors

| Error | Solution |
|-------|----------|
| `invalid_uid` | Remove quotes from API key in .env: `ELEVENLABS_API_KEY=abc123` not `"abc123"` |
| `quota_exceeded` | Free tier exhausted. Consider switching to Google TTS |
| `missing_permissions` | Enable TTS permission in ElevenLabs dashboard |

### Wrong Voice

1. Verify voice ID in `config/voice-personalities.json`
2. Check agent type is being detected correctly in hooks

### Audio Playback Issues (Linux)

1. Install an audio player: `sudo apt install mpg123`
2. Check it works: `echo "test" | mpg123 -`
3. Server auto-detects: mpg123 → mpv → paplay

### Audio Playback Issues (macOS)

1. Ensure `afplay` is available (macOS built-in)
2. Check system volume
3. Verify audio permissions
