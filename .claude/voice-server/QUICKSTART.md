# PAI Voice Server - Quick Start Guide

**5-minute setup for macOS and Linux**

## Prerequisites Check

Before starting, verify you have:
- [ ] Terminal access
- [ ] Internet connection
- [ ] Sudo privileges (Linux only, for installing dependencies)

## Step 1: Install Bun (2 minutes)

Bun is the JavaScript runtime that powers the voice server.

```bash
curl -fsSL https://bun.sh/install | bash
```

**Verify installation:**
```bash
bun --version
```

## Step 2: Install Platform Dependencies

### macOS

✅ No action needed! macOS includes all required tools (`afplay`, `say`, `osascript`).

### Linux (Ubuntu/Debian)

Install audio, TTS, and notification tools:

```bash
cd ~/.claude/voice-server/linux-service
./setup-deps.sh
```

**Or install manually:**
```bash
sudo apt update
sudo apt install mpg123 espeak-ng libnotify-bin
```

## Step 3: Configure Voice API (1 minute)

### Option A: AI Voices (ElevenLabs)

Get a free API key at [elevenlabs.io](https://elevenlabs.io) (10,000 characters/month free).

```bash
mkdir -p ~/.claude
echo "ELEVENLABS_API_KEY=sk_..." >> ~/.claude/.env
```

### Option B: System TTS (Free)

Skip this step! The server will automatically use:
- macOS: `say` command
- Linux: `espeak` or `spd-say`

## Step 4: Install Voice Server (2 minutes)

```bash
cd ~/.claude/voice-server
./install.sh
```

The installer will:
1. Detect your platform (macOS or Linux)
2. Check dependencies
3. Create and start the service
4. Test the installation

## Step 5: Test It!

Send a test notification:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from PAI!"}'
```

You should hear/see a notification!

## ✅ You're Done!

The voice server is now running and will start automatically on boot.

## Common Commands

```bash
# Check status
cd ~/.claude/voice-server
./status.sh

# Restart server
./restart.sh

# Run full system test
./test-system.sh

# View logs (macOS)
tail -f ~/Library/Logs/pai-voice-server.log

# View logs (Linux)
journalctl --user -u pai-voice-server -f
```

## Platform-Specific Service Commands

### macOS (LaunchAgent)

```bash
# Start
launchctl load ~/Library/LaunchAgents/com.pai.voice-server.plist

# Stop
launchctl unload ~/Library/LaunchAgents/com.pai.voice-server.plist

# Check status
launchctl list | grep pai
```

### Linux (systemd)

```bash
# Start
systemctl --user start pai-voice-server

# Stop
systemctl --user stop pai-voice-server

# Check status
systemctl --user status pai-voice-server

# Enable auto-start on boot
loginctl enable-linger $USER
```

## Next Steps

### For macOS Users

Install the optional menu bar indicator:

1. Install SwiftBar:
   ```bash
   brew install --cask swiftbar
   ```

2. Run the installer:
   ```bash
   cd ~/.claude/voice-server/menubar
   ./install-menubar.sh
   ```

### Customize Voices

Edit `~/.claude/.env` to change the default voice:

```bash
# UK Male - Professional
ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh

# US Female - Analytical
ELEVENLABS_VOICE_ID=AXdMgz6evoL7OPd7eU12

# See README.md for full voice list
```

## Troubleshooting

### Server not responding?

```bash
# Run diagnostic test
cd ~/.claude/voice-server
./test-system.sh
```

### Linux: No audio?

```bash
# Test audio player
mpg123 --version

# If missing
sudo apt install mpg123
```

### Linux: No notifications?

```bash
# Test notifications
notify-send "Test" "Hello"

# If missing
sudo apt install libnotify-bin
```

### Port 8888 in use?

```bash
# Find what's using it
lsof -i:8888

# Kill it
lsof -ti:8888 | xargs kill -9
```

## API Integration

### Basic Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed"}'
```

### With Custom Voice

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from PAI",
    "voice_id": "s3TPKV1kjDlVtZbl4Ksh",
    "title": "PAI Notification"
  }'
```

### Disable Voice

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Silent notification",
    "voice_enabled": false
  }'
```

## Support

- Full documentation: [README.md](README.md)
- Test your setup: `./test-system.sh`
- Check logs for errors
- Verify ElevenLabs API key: `grep ELEVENLABS_API_KEY ~/.claude/.env`

## Uninstall

To remove the voice server:

```bash
cd ~/.claude/voice-server
./uninstall.sh
```

This removes the service but keeps your configuration and server files.
