# PAI Voice System v2.3.0 - Installation Guide

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
"I'm installing PAI Voice System v2.3.0 - Voice notification server. This enables spoken notifications using ElevenLabs for natural speech, with fallback to macOS built-in voice.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing VoiceServer
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "WARNING Existing VoiceServer found at: $PAI_CHECK/VoiceServer"
  ls "$PAI_CHECK/VoiceServer/"
else
  echo "OK No existing VoiceServer (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check if port 8888 is in use
if lsof -i :8888 &> /dev/null; then
  echo "WARNING Port 8888 is in use (existing voice server?)"
  lsof -i :8888 | head -3
else
  echo "OK Port 8888 is available"
fi

# Check for ElevenLabs credentials
if [ -n "$ELEVENLABS_API_KEY" ]; then
  echo "OK ELEVENLABS_API_KEY is set in environment"
elif grep -q "ELEVENLABS_API_KEY" ~/.env 2>/dev/null; then
  echo "OK ELEVENLABS_API_KEY found in ~/.env"
else
  echo "NOTE ELEVENLABS_API_KEY not set (will use macOS voice)"
fi

# Check for backup directories with credentials
for backup in "$HOME/.claude.bak" "$HOME/.claude-backup" "$HOME/.claude-old" "$HOME/.pai-backup"; do
  if [ -f "$backup/.env" ]; then
    echo "NOTE Found backup with .env: $backup"
  fi
done

# Check macOS version (for audio playback)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "OK macOS detected - audio playback available"
else
  echo "WARNING Not macOS - audio playback may not work"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing VoiceServer: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Port 8888: [available / in use]
- ElevenLabs API key: [configured / not configured]
- Backup directories with credentials: [found / none]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing VoiceServer found)

**Only ask if existing VoiceServer directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing VoiceServer detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, stops existing server, installs fresh"},
    {"label": "Replace without backup", "description": "Stops existing server and overwrites files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Port 8888 Conflict (if port in use)

**Only ask if port 8888 is in use:**

```json
{
  "header": "Port Conflict",
  "question": "Port 8888 is in use. Should I stop the existing process?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, stop it (Recommended)", "description": "Kill the process using port 8888"},
    {"label": "Cancel", "description": "Abort installation - resolve manually"}
  ]
}
```

### Question 3: ElevenLabs Configuration

**Only ask if no ElevenLabs key detected:**

```json
{
  "header": "Voice",
  "question": "Voice notifications use ElevenLabs for natural speech. Do you have an ElevenLabs account?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I have an API key", "description": "I'll configure ElevenLabs for natural voice"},
    {"label": "Help me get one", "description": "Guide me through ElevenLabs signup"},
    {"label": "Use macOS voice (Recommended)", "description": "Use built-in macOS voice - can add ElevenLabs later"}
  ]
}
```

**If user chooses "Help me get one":**
```
"Here's how to get an ElevenLabs API key:
1. Go to https://elevenlabs.io
2. Create a free account
3. Go to Settings > API Keys
4. Copy your API key
5. Come back and we'll configure it"
```

### Question 4: Restore from Backup

**Only ask if backup directories with .env files were found:**

```json
{
  "header": "Restore",
  "question": "I found ElevenLabs credentials in a backup. Should I restore them?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, restore credentials (Recommended)", "description": "Copy API key and voice ID from backup"},
    {"label": "No, start fresh", "description": "Don't restore anything from backups"}
  ]
}
```

### Question 5: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Voice System v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation"},
    {"label": "Show me what will change", "description": "Lists all files that will be created"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup and Cleanup

**Execute based on user choices:**

### Backup (if user chose "Backup and replace")

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/voice-system-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/VoiceServer" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/VoiceServer" "$BACKUP_DIR/"
  echo "Backup created at: $BACKUP_DIR"
fi
```

### Stop Existing Server (if port 8888 was in use)

```bash
lsof -ti :8888 | xargs kill -9 2>/dev/null || true
echo "Stopped existing process on port 8888"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy VoiceServer files from pack", "status": "pending", "activeForm": "Copying VoiceServer files"},
    {"content": "Configure credentials", "status": "pending", "activeForm": "Configuring credentials"},
    {"content": "Start voice server", "status": "pending", "activeForm": "Starting voice server"},
    {"content": "Test voice notification", "status": "pending", "activeForm": "Testing voice notification"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/VoiceServer"
```

**Mark todo as completed.**

### 4.2 Copy VoiceServer Files

**Mark todo "Copy VoiceServer files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/VoiceServer/"* "$PAI_DIR/VoiceServer/"
chmod +x "$PAI_DIR/VoiceServer/"*.sh 2>/dev/null || true
```

**Files included:**
- `server.ts` - Main voice server
- `package.json` - Dependencies
- Management scripts

**Mark todo as completed.**

### 4.3 Configure Credentials

**Mark todo "Configure credentials" as in_progress.**

**If user provided an ElevenLabs API key:**

```bash
# Add to ~/.env if not already present
if ! grep -q "ELEVENLABS_API_KEY" ~/.env 2>/dev/null; then
  echo 'ELEVENLABS_API_KEY="USER_PROVIDED_KEY"' >> ~/.env
  echo "Added ELEVENLABS_API_KEY to ~/.env"
fi
```

**If user chose to restore from backup:**

```bash
# Copy credentials from backup
BACKUP_ENV="$BACKUP_PATH/.env"
if [ -f "$BACKUP_ENV" ]; then
  grep "ELEVENLABS" "$BACKUP_ENV" >> ~/.env
  echo "Restored ElevenLabs credentials from backup"
fi
```

**If user chose macOS voice:**
```
"Skipping ElevenLabs configuration. Voice server will use macOS built-in voice.
To enable ElevenLabs later:
1. Get a key from https://elevenlabs.io
2. Add to ~/.env: ELEVENLABS_API_KEY=\"your-key-here\""
```

**Mark todo as completed.**

### 4.4 Start Voice Server

**Mark todo "Start voice server" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Kill any existing voice server
lsof -ti :8888 | xargs kill -9 2>/dev/null || true

# Start the voice server in background
cd "$PAI_DIR/VoiceServer" && bun run server.ts &

# Wait for server to start
sleep 2

# Verify it's running
if curl -s http://localhost:8888/health > /dev/null; then
  echo "Voice server started on port 8888"
else
  echo "WARNING: Voice server may not have started correctly"
fi
```

**Mark todo as completed.**

### 4.5 Test Voice Notification

**Mark todo "Test voice notification" as in_progress.**

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Voice system installed successfully."}'
```

Ask the user:
```
"How did that sound? Would you like to adjust anything?"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Voice System v2.3.0 Verification ==="

# Check VoiceServer directory
echo "Checking VoiceServer directory..."
[ -d "$PAI_DIR/VoiceServer" ] && echo "OK VoiceServer directory exists" || echo "ERROR VoiceServer directory missing"

# Check server.ts
echo ""
echo "Checking server files..."
[ -f "$PAI_DIR/VoiceServer/server.ts" ] && echo "OK server.ts" || echo "ERROR server.ts missing"

# Check server is running
echo ""
echo "Checking server status..."
if lsof -i :8888 &> /dev/null; then
  echo "OK Voice server is running on port 8888"
else
  echo "ERROR Voice server is not running"
fi

# Check health endpoint
echo ""
echo "Checking health endpoint..."
if curl -s http://localhost:8888/health > /dev/null; then
  echo "OK Health endpoint responds"
else
  echo "ERROR Health endpoint not responding"
fi

# Check credentials
echo ""
echo "Checking credentials..."
if [ -n "$ELEVENLABS_API_KEY" ] || grep -q "ELEVENLABS_API_KEY" ~/.env 2>/dev/null; then
  echo "OK ElevenLabs credentials configured"
else
  echo "NOTE Using macOS voice (ElevenLabs not configured)"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Voice System v2.3.0 installed successfully!

What's available:
- Voice notifications on port 8888
- ElevenLabs natural speech (if configured)
- macOS voice fallback
- Hook integration for automatic notifications

Management commands:
- Check status: curl http://localhost:8888/health
- Stop server: lsof -ti :8888 | xargs kill
- Start server: cd ~/.claude/VoiceServer && bun run server.ts &
- View logs: tail -f ~/Library/Logs/pai-voice-server.log

Test it: 'Say hello'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check port 8888 is available: `lsof -i :8888`
4. Start server manually: `cd ~/.claude/VoiceServer && bun run server.ts`
5. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "bun: command not found"

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### No audio output

```bash
# Check ElevenLabs key
echo $ELEVENLABS_API_KEY
grep ELEVENLABS ~/.env

# Test macOS audio
say "test"

# Check API key at elevenlabs.io
```

### Port 8888 conflict

```bash
# Find process
lsof -i :8888

# Kill it
lsof -ti :8888 | xargs kill -9
```

### Server won't start

```bash
# Check Bun
bun --version

# Start manually and see errors
cd ~/.claude/VoiceServer && bun run server.ts
```

### Voice sounds robotic

ElevenLabs provides natural voice. Without it, macOS voice is used.
```bash
# Add ElevenLabs key
echo 'ELEVENLABS_API_KEY="your-key"' >> ~/.env

# Restart server
lsof -ti :8888 | xargs kill
cd ~/.claude/VoiceServer && bun run server.ts &
```

---

## What's Included

### VoiceServer Files

| File | Purpose |
|------|---------|
| `server.ts` | Main voice server |
| `package.json` | Dependencies |
| `*.sh` | Management scripts |

---

## Usage

### Send Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

### Management

| Action | Command |
|--------|---------|
| Check status | `curl http://localhost:8888/health` |
| Stop server | `lsof -ti :8888 \| xargs kill` |
| Start server | `cd ~/.claude/VoiceServer && bun run server.ts &` |
| View logs | `tail -f ~/Library/Logs/pai-voice-server.log` |

### Integration with Hooks

The voice server integrates with PAI hooks for automatic notifications. Install pai-hook-system for session start/stop notifications.

### Voice Customization

**With ElevenLabs:**
- Custom voice cloning available
- Set voice ID in settings.json: `daidentity.voiceId`

**With macOS:**
- Uses system default voice
- Change in System Settings > Accessibility > Spoken Content
