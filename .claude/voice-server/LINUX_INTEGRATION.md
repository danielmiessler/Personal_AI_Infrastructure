# Linux Integration for PAI Voice Server

This document describes the Linux-specific features added to the PAI Voice Server, enabling cross-platform voice notifications on both macOS and Linux.

## Overview

The PAI Voice Server now supports **Linux** in addition to macOS, providing voice notifications through a three-tier fallback system:

1. **ElevenLabs API** (premium, cross-platform) - Primary
2. **SpeechNote TTS** (Linux only) - Linux fallback
3. **paplay audio** (Linux) / say command (macOS) - Final fallback

## Linux Features

### Voice System Architecture

#### Three-Tier Fallback Chain

```
ElevenLabs (Premium AI)
    ↓ (if API fails/unavailable)
SpeechNote TTS (Free Linux TTS)
    ↓ (if SpeechNote fails)
paplay (Audio-only playback)
```

#### Platform Detection

The server automatically detects the operating system and uses appropriate tools:

```typescript
const IS_LINUX = platform() === 'linux';
const IS_MACOS = platform() === 'darwin';
```

### Linux-Specific Components

#### 1. SpeechNote Integration

**What is SpeechNote?**
- Free, open-source TTS application for Linux
- Installed via Flatpak
- Supports multiple high-quality voices (Piper TTS)
- Agent-specific voice models configured in `agent-voices.json`

**Implementation:**
```typescript
async function generateVoiceWithSpeechNote(text: string, voiceModel: string): Promise<boolean> {
  const proc = spawn('flatpak', [
    'run', 'net.mkiol.SpeechNote',
    '--action', 'start-reading-text',
    '--text', text,
    '--id', voiceModel
  ]);
  // ... error handling and timeout
}
```

**Voice Models Available:**
- `en_piper_us_lessac_medium` - US English (main agent)
- `en_piper_gb_alan_medium` - British English (researcher)
- `en_piper_us_joe_medium` - US English male (engineer)
- `en_piper_us_ryan_high` - US English high-quality (architect)
- `en_piper_us_amy_medium` - US English female (designer)
- `en_piper_gb_northern_medium` - Northern British (pentester)

#### 2. PulseAudio Integration (paplay)

**Purpose:** Final fallback for playing pre-generated audio files

**Implementation:**
```typescript
function findPaplay(): string {
  const paplayPaths = [
    '/usr/bin/paplay',
    '/usr/local/bin/paplay',
    '/bin/paplay'
  ];
  // Search standard locations
}
```

**Usage:**
- Plays ElevenLabs-generated MP3 files
- Handles audio output when SpeechNote unavailable
- Automatically searches common installation paths

#### 3. Desktop Notifications (notify-send)

**Purpose:** Visual desktop notifications on Linux

**Implementation:**
```typescript
if (IS_LINUX) {
  await spawnSafe('notify-send', [
    safeTitle,
    safeMessage,
    '--app-name=PAI Voice Server'
  ]);
}
```

**Requirements:**
- `libnotify-bin` package installed
- Desktop environment with notification support (GNOME, KDE, etc.)

#### 4. Systemd Service

**Purpose:** Auto-start voice server on boot and login

**Service File:** `pai-voice-server.service`

```ini
[Unit]
Description=PAI Voice Server - Cross-platform AI Voice Notification System
After=network.target sound.target

[Service]
Type=simple
WorkingDirectory=%h/.claude/voice-server
ExecStart=%h/.bun/bin/bun run server.ts
Restart=always

[Install]
WantedBy=default.target
```

**Key Features:**
- User service (no root required)
- Automatic restart on failure
- Resource limits (256MB-512MB RAM)
- Security hardening (ProtectSystem, ProtectHome, NoNewPrivileges)

## Prerequisites

### Required Software

1. **Bun Runtime**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Flatpak** (for SpeechNote)
   ```bash
   # Ubuntu/Debian
   sudo apt install flatpak

   # Fedora
   sudo dnf install flatpak

   # Arch
   sudo pacman -S flatpak
   ```

3. **SpeechNote**
   ```bash
   flatpak install flathub net.mkiol.SpeechNote
   ```

4. **PulseAudio Utils** (optional but recommended)
   ```bash
   # Ubuntu/Debian
   sudo apt install pulseaudio-utils

   # Fedora
   sudo dnf install pulseaudio-utils

   # Arch
   sudo pacman -S pulseaudio
   ```

5. **libnotify** (for desktop notifications)
   ```bash
   # Ubuntu/Debian
   sudo apt install libnotify-bin

   # Fedora
   sudo dnf install libnotify

   # Arch
   sudo pacman -S libnotify
   ```

### Optional: ElevenLabs API

Add to `~/.env` for premium voices:
```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=jqcCZkN6Knx8BJ5TBdYR  # Default voice
```

## Installation on Linux

### 1. Run Installation Script

```bash
cd ~/.claude/voice-server
./install.sh
```

The installer will:
- Check all prerequisites
- Detect Linux platform automatically
- Create systemd user service
- Enable and start the service
- Send test notification

### 2. Verify Installation

```bash
# Check service status
systemctl --user status pai-voice-server

# Check server health
curl http://localhost:8888/health

# Test notification
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification", "agent_type": "main"}'
```

## Service Management on Linux

### Using systemctl

```bash
# Start service
systemctl --user start pai-voice-server

# Stop service
systemctl --user stop pai-voice-server

# Restart service
systemctl --user restart pai-voice-server

# Check status
systemctl --user status pai-voice-server

# View logs
journalctl --user -u pai-voice-server -f

# Enable auto-start (on by default)
systemctl --user enable pai-voice-server

# Disable auto-start
systemctl --user disable pai-voice-server
```

### Using Management Scripts

```bash
# Start
./start.sh

# Stop
./stop.sh

# Restart
./restart.sh

# Status
./status.sh
```

All scripts automatically detect Linux and use systemctl.

## Configuration

### Agent Voice Configuration

File: `agent-voices.json`

```json
{
  "agent_voices": {
    "main": {
      "name": "PAI Main Assistant",
      "elevenlabs_voice_id": "jqcCZkN6Knx8BJ5TBdYR",
      "speechnote_voice": "en_piper_us_lessac_medium",
      "personality": "Helpful AI assistant",
      "voice_enabled": true
    },
    "researcher": {
      "name": "Research Specialist",
      "elevenlabs_voice_id": "AXdMgz6evoL7OPd7eU12",
      "speechnote_voice": "en_piper_gb_alan_medium",
      "voice_enabled": true
    }
  },
  "default_config": {
    "fallback_enabled": true,
    "elevenlabs_model": "eleven_turbo_v2_5",
    "voice_settings": {
      "stability": 0.75,
      "similarity_boost": 0.75
    },
    "speechnote_fallback_voice": "en_piper_us_lessac_medium"
  }
}
```

### Environment Variables

In `~/.env`:

```bash
# Optional - for ElevenLabs premium voices
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=jqcCZkN6Knx8BJ5TBdYR

# Optional - server port
PORT=8888
```

## API Usage on Linux

### Send Notification with Agent Voice

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research Complete",
    "message": "Found 5 relevant papers",
    "agent_type": "researcher",
    "voice_enabled": true
  }'
```

### Parameters

- `title` - Notification title (default: "PAI Notification")
- `message` - Text to speak and display
- `agent_type` - Agent identifier (main, researcher, engineer, etc.)
- `voice_enabled` - Enable/disable voice (default: true)
- `voice_id` - Override with specific ElevenLabs voice ID

## Troubleshooting

### SpeechNote Not Working

1. **Verify installation:**
   ```bash
   flatpak list | grep SpeechNote
   ```

2. **Test SpeechNote directly:**
   ```bash
   flatpak run net.mkiol.SpeechNote --action start-reading-text \
     --text "Test message" \
     --id "en_piper_us_lessac_medium"
   ```

3. **Check available voices:**
   ```bash
   flatpak run net.mkiol.SpeechNote --action list-models
   ```

### paplay Not Found

1. **Install PulseAudio:**
   ```bash
   sudo apt install pulseaudio pulseaudio-utils
   ```

2. **Check paplay location:**
   ```bash
   which paplay
   ```

3. **Test audio playback:**
   ```bash
   paplay /usr/share/sounds/alsa/Front_Center.wav
   ```

### Service Won't Start

1. **Check logs:**
   ```bash
   journalctl --user -u pai-voice-server --no-pager -n 50
   ```

2. **Run server manually:**
   ```bash
   cd ~/.claude/voice-server
   bun run server.ts
   ```

3. **Verify permissions:**
   ```bash
   ls -la ~/.claude/voice-server
   chmod +x ~/.claude/voice-server/*.sh
   ```

### Desktop Notifications Not Showing

1. **Install libnotify:**
   ```bash
   sudo apt install libnotify-bin
   ```

2. **Test notify-send:**
   ```bash
   notify-send "Test" "Notification test"
   ```

## Technical Details

### Platform Detection

```typescript
// Automatic platform detection
const IS_LINUX = platform() === 'linux';
const IS_MACOS = platform() === 'darwin';
```

### Voice Fallback Logic

```typescript
// 1. Try ElevenLabs (if API key configured)
const audioFile = await generateVoice(message, voiceId);

if (audioFile) {
  // 2. Play with paplay (Linux) or afplay (macOS)
  await playAudioFile(audioFile);
} else {
  // 3. Fallback to SpeechNote (Linux) or say (macOS)
  if (IS_LINUX) {
    await generateVoiceWithSpeechNote(message, voiceModel);
  } else {
    await spawnSafe('/usr/bin/say', [message]);
  }
}
```

### Security Features

- **Sandboxing:** systemd service isolation
- **Resource limits:** Memory capped at 512MB
- **Read-only home:** Protects user files
- **Rate limiting:** 10 requests/minute
- **Input validation:** Sanitizes all user input
- **CORS:** Restricted to localhost only

## Performance

### Voice Generation Times

| Method | Average Time | Quality |
|--------|--------------|---------|
| ElevenLabs | 500ms-2s | Excellent (AI) |
| SpeechNote | 300ms-1s | Good (Piper TTS) |
| paplay | Immediate | N/A (playback only) |

### Resource Usage

- **RAM:** ~50-100MB idle, ~150-200MB active
- **CPU:** <5% idle, 10-30% during voice generation
- **Disk:** ~20MB (code + dependencies)
- **Network:** Only for ElevenLabs API calls

## Differences from macOS Version

| Feature | Linux | macOS |
|---------|-------|-------|
| **Voice Fallback** | SpeechNote TTS | `say` command |
| **Audio Player** | paplay | afplay |
| **Notifications** | notify-send | osascript |
| **Service Manager** | systemd | LaunchAgent |
| **Start Command** | `systemctl --user start` | `launchctl load` |
| **Logs Location** | journalctl | ~/Library/Logs |

## Future Enhancements

Potential improvements for Linux integration:

- [ ] GUI configuration tool
- [ ] System tray indicator (similar to macOS menu bar)
- [ ] More SpeechNote voice models
- [ ] Festival TTS as additional fallback
- [ ] espeak-ng integration
- [ ] Wayland native notifications
- [ ] Docker container option
- [ ] Snap package
- [ ] AppImage distribution

## Contributing

If you improve the Linux integration, please:
1. Test on multiple distributions (Ubuntu, Fedora, Arch)
2. Document dependencies clearly
3. Maintain backward compatibility with macOS
4. Add appropriate error handling
5. Update this documentation

## License

Part of the Personal AI Infrastructure (PAI) project.
