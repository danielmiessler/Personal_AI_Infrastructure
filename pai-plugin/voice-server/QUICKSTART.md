# PAI Voice Server - Quick Start Guide

Get voice notifications working in 5 minutes with ElevenLabs TTS.

## Prerequisites

- macOS (tested on macOS 11+)
- [Bun](https://bun.sh) runtime
- ElevenLabs account (free tier available)

## Step 1: Install Bun

If you don't have Bun installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Step 2: Get Your ElevenLabs API Key

1. Go to [elevenlabs.io](https://elevenlabs.io) and create a free account
2. Navigate to your [Profile Settings](https://elevenlabs.io/app/settings/api-keys)
3. Click "Create API Key" or copy your existing key
4. Copy the API key (starts with something like `sk_...`)

**Free Tier:** 10,000 characters/month (perfect for notifications)

## Step 3: Configure Your Environment

Add your ElevenLabs API key to `~/.env`:

```bash
# Create or edit ~/.env
echo "ELEVENLABS_API_KEY=your_api_key_here" >> ~/.env
echo "ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh" >> ~/.env
```

Replace `your_api_key_here` with your actual API key from Step 2.

**Important:** The `~/.env` file should be in your home directory, NOT in the PAI directory.

## Step 4: Install the Voice Server

```bash
cd ${PAI_DIR}/voice-server
./install.sh
```

This will:
- Install dependencies
- Create a macOS LaunchAgent for auto-start
- Start the voice server on port 8888
- Verify the installation works

## Step 5: Test It!

Send a test notification:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Voice system is working perfectly!"}'
```

You should hear the message spoken aloud!

## What's Next?

### Choose Different Voices

Browse the [ElevenLabs Voice Library](https://elevenlabs.io/voice-library) to find voices you like:

1. Click on a voice to preview it
2. Click "Use" and copy the Voice ID
3. Update `ELEVENLABS_VOICE_ID` in your `~/.env`

### Agent Voice Configuration

The PAI system supports different voices for different agents:

| Agent | Default Voice ID | Purpose |
|-------|------------------|---------|
| Kai | s3TPKV1kjDlVtZbl4Ksh | Main assistant voice |
| Perplexity-Researcher | AXdMgz6evoL7OPd7eU12 | Research agent |
| Claude-Researcher | AXdMgz6evoL7OPd7eU12 | Research agent |
| Engineer | kmSVBPu7loj4ayNinwWM | Development agent |
| Designer | ZF6FPAbjXT4488VcRRnw | Design agent |
| Pentester | hmMWXCj9K7N5mCPcRkfC | Security agent |
| Architect | muZKMsIDGYtIkjjiUS82 | Architecture agent |
| Writer | gfRt6Z3Z8aTbpLfexQ7N | Content agent |

These voice IDs are configured in your hooks and agent files.

### Install Menu Bar Indicator (Optional)

Get visual status in your macOS menu bar:

```bash
# Install SwiftBar (recommended)
brew install --cask swiftbar

# Install the menu bar indicator
cd ${PAI_DIR}/voice-server/menubar
./install-menubar.sh
```

## Troubleshooting

### "No voice output"

**Check 1:** Verify API key is set:
```bash
grep ELEVENLABS_API_KEY ~/.env
```

**Check 2:** Test the server:
```bash
curl http://localhost:8888/health
```

Expected output:
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "ElevenLabs",
  "default_voice_id": "s3TPKV1kjDlVtZbl4Ksh",
  "api_key_configured": true
}
```

**Check 3:** Look at server logs:
```bash
tail -f ~/.claude/voice-server/logs/voice-server.log
```

### "Port 8888 already in use"

Kill any existing process and restart:
```bash
lsof -ti:8888 | xargs kill -9
cd ${PAI_DIR}/voice-server && ./restart.sh
```

### "Invalid API key"

1. Verify your API key is correct in `~/.env`
2. Check that it doesn't have extra spaces or quotes
3. Make sure you copied the entire key from ElevenLabs

## Service Management

Once installed, the voice server runs automatically. You can control it with:

```bash
# Check status
./status.sh

# Stop server
./stop.sh

# Start server
./start.sh

# Restart server
./restart.sh

# Uninstall (removes LaunchAgent)
./uninstall.sh
```

## API Usage

### Send a Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your notification message here",
    "voice_id": "s3TPKV1kjDlVtZbl4Ksh",
    "title": "Optional Title"
  }'
```

### Parameters

- `message` (required): Text to speak
- `voice_id` (optional): ElevenLabs voice ID (uses default if not specified)
- `voice_enabled` (optional): Set to `false` to disable voice
- `title` (optional): Notification title (default: "PAI Notification")

## Security Notes

- Your API key is stored securely in `~/.env` (not in code)
- Server only accepts connections from localhost
- Rate limited to 10 requests/minute
- No sensitive data is logged

## What You've Accomplished

✅ Voice server running automatically on startup
✅ High-quality AI voices for notifications
✅ Secure API key storage
✅ Simple HTTP API for integration
✅ Different voices for different agents (optional)

## Learn More

- [Full Documentation](README.md) - Complete feature guide
- [Voice System Architecture](../documentation/voice-system.md) - How it works
- [ElevenLabs Docs](https://elevenlabs.io/docs) - Voice API reference

## Need Help?

1. Check the [README](README.md) for detailed troubleshooting
2. Review server logs: `tail -f ~/.claude/voice-server/logs/voice-server.log`
3. Test the health endpoint: `curl http://localhost:8888/health`

---

**🎉 Congratulations!** Your PAI voice system is now set up with professional AI voices!
