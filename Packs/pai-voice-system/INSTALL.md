# PAI Voice System v1.0.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing PAI Voice System v1.0.0 - Text-to-speech voice output for your AI assistant using ElevenLabs.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ pai-core-install is installed"
else
  echo "❌ pai-core-install NOT installed - REQUIRED!"
fi

# Check if pai-hook-system is installed (REQUIRED)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ pai-hook-system is installed"
else
  echo "❌ pai-hook-system NOT installed - REQUIRED!"
fi

# Check for existing VoiceServer
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "⚠️  Existing VoiceServer found at: $PAI_CHECK/VoiceServer"
  ls -la "$PAI_CHECK/VoiceServer/"
else
  echo "✓ No existing VoiceServer (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check for ElevenLabs API key
echo ""
echo "API Key Status:"
[ -n "$ELEVENLABS_API_KEY" ] && echo "✓ ELEVENLABS_API_KEY: Set" || echo "⚠️  ELEVENLABS_API_KEY: NOT SET (required for voice)"

# Check for port availability
if lsof -i :8888 &> /dev/null; then
  echo "⚠️  Port 8888 is in use"
  lsof -i :8888 | head -3
else
  echo "✓ Port 8888 is available (voice server)"
fi

# Check macOS audio
if command -v afplay &> /dev/null; then
  echo "✓ afplay available (macOS audio)"
else
  echo "⚠️  afplay not found (may need alternative audio player)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- pai-hook-system: [installed / NOT INSTALLED - REQUIRED]
- Existing VoiceServer: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- ELEVENLABS_API_KEY: [set / not set]
- Port 8888: [available / in use]
- Audio playback: [afplay available / not available]"
```

**STOP if pai-core-install, pai-hook-system, or Bun is not installed.** Tell the user:
```
"pai-core-install and pai-hook-system are required. Please install them first, then return to install this pack.

Install order:
1. pai-core-install
2. pai-hook-system
3. pai-voice-system (this pack)"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing VoiceServer detected:**

```json
{
  "header": "Conflict",
  "question": "Existing VoiceServer detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: ElevenLabs Setup

**Only ask if ELEVENLABS_API_KEY is not set:**

```json
{
  "header": "API Key",
  "question": "ElevenLabs API key not found. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Create .env template (Recommended)", "description": "Creates template file for you to add API key later"},
    {"label": "I'll set it manually", "description": "Skip .env creation, set key in shell profile"},
    {"label": "Continue without voice", "description": "Install server but voice won't work until key is set"}
  ]
}
```

### Question 3: Auto-Start Configuration

```json
{
  "header": "Auto-Start",
  "question": "How should the voice server start?",
  "multiSelect": false,
  "options": [
    {"label": "Manual start (Recommended)", "description": "Start with manage.sh when you want voice output"},
    {"label": "Start on login", "description": "Create a LaunchAgent to auto-start (macOS only)"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Voice System v1.0.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/voice-system-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/VoiceServer" ] && cp -r "$PAI_DIR/VoiceServer" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create VoiceServer directory", "status": "pending", "activeForm": "Creating VoiceServer directory"},
    {"content": "Copy voice server files", "status": "pending", "activeForm": "Copying voice server files"},
    {"content": "Copy voice hooks", "status": "pending", "activeForm": "Copying voice hooks"},
    {"content": "Copy prosody enhancer", "status": "pending", "activeForm": "Copying prosody enhancer"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Configure environment", "status": "pending", "activeForm": "Configuring environment"},
    {"content": "Register hooks in settings.json", "status": "pending", "activeForm": "Registering hooks"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create VoiceServer Directory

**Mark todo "Create VoiceServer directory" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/VoiceServer"
mkdir -p "$PAI_DIR/hooks/lib"
```

**Mark todo as completed.**

### 4.2 Copy Voice Server Files

**Mark todo "Copy voice server files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy voice server
cp "$PACK_DIR/src/voice/server.ts" "$PAI_DIR/VoiceServer/"

# Copy voice personalities configuration
cp "$PACK_DIR/config/voice-personalities.json" "$PAI_DIR/VoiceServer/"

# Copy management script
cp "$PACK_DIR/src/voice/manage.sh" "$PAI_DIR/VoiceServer/"

# Make scripts executable
chmod +x "$PAI_DIR/VoiceServer/"*.sh
```

**Files copied:**
- `server.ts` - ElevenLabs TTS HTTP server (port 8888)
- `voice-personalities.json` - Agent voice configurations with stability/similarity settings
- `manage.sh` - Unified management script (start/stop/restart/status/test)

**Mark todo as completed.**

### 4.3 Copy Voice Hooks

**Mark todo "Copy voice hooks" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/hooks/stop-hook-voice.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/hooks/subagent-stop-hook-voice.ts" "$PAI_DIR/hooks/"
```

**Files copied:**
- `stop-hook-voice.ts` - Extracts and speaks 🗣️ line on session stop
- `subagent-stop-hook-voice.ts` - Speaks subagent completions

**Mark todo as completed.**

### 4.4 Copy Prosody Enhancer

**Mark todo "Copy prosody enhancer" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/hooks/lib/prosody-enhancer.ts" "$PAI_DIR/hooks/lib/"
```

**Files copied:**
- `prosody-enhancer.ts` - Adds SSML prosody tags for natural speech

**Mark todo as completed.**

### 4.5 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/VoiceServer"
bun add @elysiajs/cors
```

**Mark todo as completed.**

### 4.6 Configure Environment (If User Chose Yes)

**Mark todo "Configure environment" as in_progress.**

**Only execute if user chose to create .env template:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create or append to .env
if [ ! -f "$PAI_DIR/.env" ]; then
  cat > "$PAI_DIR/.env" << 'EOF'
# PAI Voice System Configuration

# ElevenLabs API (REQUIRED for voice)
# Get your key from: https://elevenlabs.io → Profile → API key
ELEVENLABS_API_KEY=your-api-key-here

# Default voice ID (optional - uses default if not set)
# Browse voices at: https://elevenlabs.io/voice-library
ELEVENLABS_VOICE_ID=your-voice-id-here

# Voice server port (optional - default 8888)
VOICE_SERVER_PORT=8888
EOF
  echo "Created $PAI_DIR/.env - Please add your ElevenLabs API key"
else
  # Check if ElevenLabs config already exists
  if ! grep -q "ELEVENLABS_API_KEY" "$PAI_DIR/.env"; then
    cat >> "$PAI_DIR/.env" << 'EOF'

# PAI Voice System Configuration
ELEVENLABS_API_KEY=your-api-key-here
ELEVENLABS_VOICE_ID=your-voice-id-here
VOICE_SERVER_PORT=8888
EOF
    echo "Added ElevenLabs config to $PAI_DIR/.env"
  else
    echo "ElevenLabs config already exists in $PAI_DIR/.env"
  fi
fi
```

Tell the user:
```
"Created/updated .env at $PAI_DIR/.env

Please add your ElevenLabs credentials:
1. Sign up at https://elevenlabs.io
2. Get API key from Profile → API key
3. Choose a voice from the Voice Library
4. Add both to your .env file"
```

**Mark todo as completed (or skip if user declined).**

### 4.7 Register Hooks in settings.json

**Mark todo "Register hooks in settings.json" as in_progress.**

Read the hook configuration from `config/settings-hooks.json` and merge it into the user's `~/.claude/settings.json`.

**Important:** Merge the hooks, don't replace existing hooks.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Voice System Verification ==="

# Check VoiceServer files
echo "Checking VoiceServer files..."
[ -f "$PAI_DIR/VoiceServer/server.ts" ] && echo "✓ server.ts" || echo "❌ server.ts missing"
[ -f "$PAI_DIR/VoiceServer/voice-personalities.json" ] && echo "✓ voice-personalities.json" || echo "❌ voice-personalities.json missing"
[ -x "$PAI_DIR/VoiceServer/manage.sh" ] && echo "✓ manage.sh (executable)" || echo "❌ manage.sh not executable"

# Check hook files
echo ""
echo "Checking hook files..."
[ -f "$PAI_DIR/hooks/stop-hook-voice.ts" ] && echo "✓ stop-hook-voice.ts" || echo "❌ stop-hook-voice.ts missing"
[ -f "$PAI_DIR/hooks/subagent-stop-hook-voice.ts" ] && echo "✓ subagent-stop-hook-voice.ts" || echo "❌ subagent-stop-hook-voice.ts missing"
[ -f "$PAI_DIR/hooks/lib/prosody-enhancer.ts" ] && echo "✓ prosody-enhancer.ts" || echo "❌ prosody-enhancer.ts missing"

# Check API key
echo ""
echo "Checking configuration..."
if [ -n "$ELEVENLABS_API_KEY" ]; then
  echo "✓ ELEVENLABS_API_KEY is set"
else
  echo "⚠️  ELEVENLABS_API_KEY not set (voice won't work)"
fi

# Test server start
echo ""
echo "Testing voice server..."
$PAI_DIR/VoiceServer/manage.sh start &
sleep 3
if curl -s http://localhost:8888/health | grep -q "ok"; then
  echo "✓ Voice server responding on port 8888"
else
  echo "⚠️  Voice server not responding (may need API key)"
fi
$PAI_DIR/VoiceServer/manage.sh stop

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Voice System v1.0.0 installed successfully!

What's available:
- ElevenLabs TTS voice server
- Prosody enhancement for natural speech
- Multi-agent voice personalities
- Session and subagent voice hooks

To start the voice server:
  $PAI_DIR/VoiceServer/manage.sh start

To test voice output:
  curl -X POST http://localhost:8888/notify \
    -H 'Content-Type: application/json' \
    -d '{\"message\": \"Hello, voice is working!\"}'

To stop: $PAI_DIR/VoiceServer/manage.sh stop"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Ensure pai-hook-system is installed second
3. Verify Bun is installed: `bun --version`
4. Set ELEVENLABS_API_KEY in ~/.env
5. Check port 8888 is available
6. Check directory permissions on $PAI_DIR/
7. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "pai-hook-system not found"

This pack requires pai-hook-system for hook infrastructure. Install it:
```
Give the AI the pai-hook-system pack directory and ask it to install.
```

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### No voice output

```bash
# 1. Check server is running
curl http://localhost:8888/health

# 2. Check API key is set
echo $ELEVENLABS_API_KEY

# 3. Check logs
tail -f /tmp/pai-voice-server.log
```

### ElevenLabs errors

| Error | Solution |
|-------|----------|
| `invalid_uid` | Remove quotes from API key in .env |
| `quota_exceeded` | Free tier exhausted (~10K chars/month) |
| `missing_permissions` | Enable TTS permission in ElevenLabs dashboard |
| `voice_not_found` | Check voice ID is correct |

### Port already in use

```bash
# Check what's using the port
lsof -i :8888

# Kill existing processes
$PAI_DIR/VoiceServer/manage.sh stop

# Or use a different port
export VOICE_SERVER_PORT=9999
```

### Audio playback issues (macOS)

```bash
# Verify afplay works
afplay /System/Library/Sounds/Ping.aiff

# Check system volume
# System Preferences → Sound

# Check audio permissions
# System Preferences → Security & Privacy → Microphone
```

---

## What's Included

| File | Purpose |
|------|---------|
| `VoiceServer/server.ts` | ElevenLabs TTS HTTP server (port 8888) |
| `VoiceServer/voice-personalities.json` | Agent voice configurations with stability/similarity settings |
| `VoiceServer/manage.sh` | Unified management script (start/stop/restart/status/test) |
| `hooks/stop-hook-voice.ts` | Session stop voice hook |
| `hooks/subagent-stop-hook-voice.ts` | Subagent stop voice hook |
| `hooks/lib/prosody-enhancer.ts` | Prosody enhancement with 13 emotional markers |

---

## Usage

### Starting the Voice Server

```bash
# Start
$PAI_DIR/VoiceServer/manage.sh start

# Check status
$PAI_DIR/VoiceServer/manage.sh status

# Stop
$PAI_DIR/VoiceServer/manage.sh stop

# Restart
$PAI_DIR/VoiceServer/manage.sh restart
```

### Testing Voice Output

```bash
# Send a test notification
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, this is a test."}'
```

### From Claude Code

Once installed, the voice system works automatically:
- Your AI's 🗣️ response line is spoken aloud
- Subagent completions are announced
- Session endings are narrated

### CLI Examples

```bash
# Quick notification
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed successfully."}' \
  > /dev/null 2>&1 &

# With specific speaker/voice
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Research complete.", "speaker": "Intern"}'
```

---

## Voice Personalities

The voice system supports multiple agent voices via `voice-personalities.json`:

| Agent | Voice Style |
|-------|-------------|
| Main Assistant | Default configured voice |
| Intern | Slightly faster, enthusiastic |
| Architect | Measured, thoughtful pace |
| Engineer | Clear, technical tone |

Configure voices in `$PAI_DIR/VoiceServer/voice-personalities.json`.

---

## Auto-Start on Login (macOS)

If you chose auto-start during installation, a LaunchAgent was created:

```bash
# Check LaunchAgent status
launchctl list | grep pai-voice

# View LaunchAgent
cat ~/Library/LaunchAgents/com.pai.voice-server.plist

# Reload if needed
launchctl unload ~/Library/LaunchAgents/com.pai.voice-server.plist
launchctl load ~/Library/LaunchAgents/com.pai.voice-server.plist
```

---

## Configuration

**Environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAI_DIR` | `~/.claude` | Root PAI directory |
| `ELEVENLABS_API_KEY` | (required) | ElevenLabs API authentication |
| `ELEVENLABS_VOICE_ID` | (optional) | Default voice ID |
| `VOICE_SERVER_PORT` | `8888` | Voice server HTTP port |

**Ports:**

| Service | Port | Purpose |
|---------|------|---------|
| Voice Server | 8888 | TTS HTTP API |
