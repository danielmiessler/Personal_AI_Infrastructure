# PAI Voice Server

A voice notification server for the Personal AI Infrastructure (PAI) system that provides text-to-speech notifications using ElevenLabs API.

**Cross-platform support:** macOS and Linux (Ubuntu/Debian)

> **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.

## 🎯 Features

- **ElevenLabs Integration**: High-quality AI voices for notifications
- **Intelligent Audio Caching**: Automatically caches generated audio to reduce API costs by 99%+
- **Multiple Voice Support**: Different voices for different AI agents
- **Cross-Platform Service**: Runs automatically in the background (LaunchAgent on macOS, systemd on Linux)
- **Menu Bar Indicator**: Visual status indicator in macOS menu bar (macOS only)
- **Simple HTTP API**: Easy integration with any tool or script
- **Fallback TTS**: Uses system TTS (macOS `say`, Linux `espeak`) when ElevenLabs unavailable
- **Smart Cache Expiration**: Keeps frequently-used messages cached, auto-deletes old one-time messages

## 📋 Prerequisites

**All Platforms:**
- [Bun](https://bun.sh) runtime installed
- ElevenLabs API key (optional, falls back to system TTS)

**Platform-Specific:**
- **macOS**: macOS 11+ (includes afplay, osascript, say)
- **Linux**: Ubuntu/Debian-based distribution with:
  - Audio: `mpg123`, `mplayer`, or `pulseaudio-utils`
  - TTS: `espeak-ng` or `speech-dispatcher`
  - Notifications: `libnotify-bin`

## 🚀 Quick Start

### 1. Install Bun (if not already installed)
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. (Linux Only) Install Dependencies
On Linux, install audio, TTS, and notification tools:
```bash
cd ~/.claude/voice-server/linux-service
./setup-deps.sh
```

Or manually:
```bash
sudo apt install mpg123 espeak-ng libnotify-bin
```

### 3. Configure API Key (Optional)
Add your ElevenLabs API key to `~/.claude/.env`:
```bash
mkdir -p ~/.claude
echo "ELEVENLABS_API_KEY=your_api_key_here" >> ~/.claude/.env
echo "ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh" >> ~/.claude/.env
```

> Get your free API key at [elevenlabs.io](https://elevenlabs.io) (10,000 characters/month free)

### 4. Install Voice Server
```bash
cd ~/.claude/voice-server
./install.sh
```

This will:
- Detect your platform (macOS or Linux)
- Install dependencies
- Create a service for auto-start (LaunchAgent on macOS, systemd on Linux)
- Start the voice server on port 8888
- Verify the installation
- (macOS only) Optionally install menu bar indicator

## 🛠️ Service Management

### Start Server
```bash
./start.sh
```

**Platform-specific:**
```bash
# macOS
launchctl load ~/Library/LaunchAgents/com.pai.voice-server.plist

# Linux
systemctl --user start pai-voice-server
```

### Stop Server
```bash
./stop.sh
```

**Platform-specific:**
```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.pai.voice-server.plist

# Linux
systemctl --user stop pai-voice-server
```

### Restart Server
```bash
./restart.sh
```

### Check Status
```bash
./status.sh
```

### Test System
```bash
./test-system.sh  # Comprehensive validation
```

### Uninstall
```bash
./uninstall.sh
```
This will stop the service and remove the LaunchAgent (macOS) or systemd service (Linux).

## 📡 API Usage

### Send a Voice Notification
```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Task completed successfully",
    "voice_id": "s3TPKV1kjDlVtZbl4Ksh",
    "voice_enabled": true
  }'
```

### Parameters
- `message` (required): The text to speak
- `voice_id` (optional): ElevenLabs voice ID to use
- `voice_enabled` (optional): Whether to speak the notification (default: true)
- `title` (optional): Notification title (default: "PAI Notification")

### Available Voice IDs
```javascript
// PAI System Agents
Kai:                     s3TPKV1kjDlVtZbl4Ksh  // Main assistant
Perplexity-Researcher:   AXdMgz6evoL7OPd7eU12  // Perplexity research agent
Claude-Researcher:       AXdMgz6evoL7OPd7eU12  // Claude research agent
Gemini-Researcher:       iLVmqjzCGGvqtMCk6vVQ  // Gemini research agent
Engineer:                fATgBRI8wg5KkDFg8vBd  // Engineering agent
Principal-Engineer:      iLVmqjzCGGvqtMCk6vVQ  // Principal engineering agent
Designer:                ZF6FPAbjXT4488VcRRnw  // Design agent
Architect:               muZKMsIDGYtIkjjiUS82  // Architecture agent
Pentester:               xvHLFjaUEpx4BOf7EiDd  // Security agent
Artist:                  ZF6FPAbjXT4488VcRRnw  // Artist agent
Writer:                  gfRt6Z3Z8aTbpLfexQ7N  // Content agent
```

## 🖥️ Menu Bar Indicator

The voice server includes an optional menu bar indicator that shows the server status.

### Installing the Menu Bar

1. **Install SwiftBar** (recommended) or BitBar:
```bash
brew install --cask swiftbar
# OR
brew install --cask bitbar
```

2. **Run the menu bar installer**:
```bash
cd ${PAI_DIR}/voice-server/menubar
./install-menubar.sh
```

### Menu Bar Features
- **Visual Status**: 🎙️ (running) or 🎙️⚫ (stopped)
- **Quick Controls**: Start/Stop/Restart server from menu
- **Status Info**: Shows voice type (ElevenLabs)
- **Quick Test**: Test voice with one click
- **View Logs**: Access server logs directly

### Manual Installation
If you prefer manual installation:
1. Copy `menubar/pai-voice.5s.sh` to your SwiftBar/BitBar plugins folder
2. Make it executable: `chmod +x pai-voice.5s.sh`
3. Refresh SwiftBar/BitBar

## 🔧 Configuration

### Configuration Hierarchy

The voice server uses a two-tier configuration system:
1. **Primary**: `~/.claude/settings.json` (centralized PAI configuration)
2. **Fallback**: `~/.claude/.env` (legacy/override configuration)

### Environment Variables

#### Settings.json (Primary Configuration)

Edit `~/.claude/settings.json` → `env` section:

```json
{
  "env": {
    "DA_VOICE_ID": "cgSgspJ2msm6clMCkdW9",     // Your Digital Assistant's voice ID
    "VOICE_SERVER_PORT": "8888",               // Server port
    "VOICE_CACHE_TTL_DAYS": "30"               // Cache expiration (optional)
  }
}
```

**Available Variables:**
- `DA_VOICE_ID` - ElevenLabs voice ID for your Digital Assistant (primary voice)
- `VOICE_SERVER_PORT` - Port number for the voice server (default: 8888)
- `VOICE_CACHE_TTL_DAYS` - Days to keep cached audio files (default: 30)

#### .env (Fallback Configuration)

Add to `~/.claude/.env` for API credentials or overrides:

```bash
# Required for ElevenLabs (otherwise uses system TTS)
ELEVENLABS_API_KEY=your_api_key_here

# Optional - Falls back to settings.json values
PORT=8888                                    # Server port (fallback if not in settings.json)
ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh   # Default voice ID (fallback to DA_VOICE_ID)
ELEVENLABS_MODEL=eleven_multilingual_v2      # ElevenLabs TTS model
PAI_DIR=~/.claude                            # PAI directory path
VOICE_CACHE_TTL_DAYS=30                      # Cache expiration in days
```

**Variable Priority:**
- **Voice ID**: `settings.json DA_VOICE_ID` → `.env ELEVENLABS_VOICE_ID` → hardcoded default
- **Port**: `settings.json VOICE_SERVER_PORT` → `.env PORT` → 8888
- **Cache TTL**: `settings.json VOICE_CACHE_TTL_DAYS` → `.env VOICE_CACHE_TTL_DAYS` → 30 days

### Voice Configuration (voices.json)

The `voices.json` file provides reference metadata for agent voices:

```json
{
  "default_rate": 175,
  "voices": {
    "kai": {
      "voice_name": "Jamie (Premium)",
      "rate_multiplier": 1.3,
      "rate_wpm": 228,
      "description": "UK Male - Professional, conversational",
      "type": "Premium"
    },
    "researcher": {
      "voice_name": "Ava (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "US Female - Analytical, highest quality",
      "type": "Premium"
    },
    "engineer": {
      "voice_name": "Zoe (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "US Female - Steady, professional",
      "type": "Premium"
    },
    "architect": {
      "voice_name": "Serena (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "UK Female - Strategic, sophisticated",
      "type": "Premium"
    },
    "designer": {
      "voice_name": "Isha (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "Indian Female - Creative, distinct",
      "type": "Premium"
    },
    "artist": {
      "voice_name": "Isha (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "Indian Female - Creative, artistic",
      "type": "Premium"
    },
    "pentester": {
      "voice_name": "Oliver (Enhanced)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "UK Male - Technical, sharp",
      "type": "Enhanced"
    },
    "writer": {
      "voice_name": "Serena (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "UK Female - Articulate, warm",
      "type": "Premium"
    }
  }
}
```

**Note:** The actual ElevenLabs voice IDs are configured in the hook files (`hooks/stop-hook.ts` and `hooks/subagent-stop-hook.ts`), not in `voices.json`.

## 💾 Audio Caching System

The voice server includes an intelligent caching system that dramatically reduces ElevenLabs API costs by reusing generated audio files.

### How It Works

1. **Cache Key Generation**: When a notification is sent, the server creates a unique cache key using SHA256 hash of `message + voice_id`
2. **Cache Lookup**: Before calling ElevenLabs API, the server checks if cached audio exists
3. **Cache Hit**: If cached audio exists, it's played immediately (no API call)
4. **Cache Miss**: If not cached, the server calls ElevenLabs API, saves the audio to cache, then plays it
5. **Access Tracking**: Every time cached audio is used, its modification time is updated ("touched")
6. **Automatic Cleanup**: On server startup, expired cache files are deleted

### Cache Behavior

**Static Messages** (frequently repeated):
```
Example: "Kai here, ready to go"
- First use: Cache MISS → API call → saved to cache
- Subsequent uses: Cache HIT → instant playback, no API call
- Result: File stays cached indefinitely (touched on every use)
```

**Dynamic Messages** (one-time use):
```
Example: "Found 15 instances of getCwd across 8 different files"
- First use: Cache MISS → API call → saved to cache
- After 30 days of no use: Automatically deleted during cleanup
- Result: Prevents cache bloat from unique messages
```

### Cache Location

```bash
~/.claude/voice-server/cache/
```

Each cached file is named with its SHA256 hash:
```bash
# Example cache file
~/.claude/voice-server/cache/a1b2c3d4e5f6...789.mp3
```

### Cache Statistics

On server startup, you'll see cache statistics:
```bash
💾 Cache stats: 47 file(s), ~2.3MB, 30 day TTL
```

If expired files are deleted:
```bash
🧹 Cache cleanup: Removed 12 expired file(s)
💾 Cache stats: 35 file(s), ~1.8MB, 30 day TTL
```

### Cache Logs

Watch cache behavior in real-time:
```bash
# Cache HIT (reusing existing audio)
💾 Cache HIT: Using cached audio for "Kai here, ready to go..."

# Cache MISS (generating new audio)
💾 Cache MISS: Generating new audio for "Task completed successfully..."
🎙️  Generating speech with ElevenLabs (voice: cgSgspJ2msm6clMCkdW9)
💾 Cached audio saved: a1b2c3d4e5f6...789.mp3
```

### Customizing Cache TTL

**Short TTL (7 days)** - For systems with limited disk space:
```json
// settings.json
{
  "env": {
    "VOICE_CACHE_TTL_DAYS": "7"
  }
}
```

**Long TTL (90 days)** - For systems with plenty of space:
```json
// settings.json
{
  "env": {
    "VOICE_CACHE_TTL_DAYS": "90"
  }
}
```

**Disable Cleanup** - Keep all cached audio forever:
```json
// settings.json
{
  "env": {
    "VOICE_CACHE_TTL_DAYS": "36500"  // 100 years
  }
}
```

### Manual Cache Management

**View cache size:**
```bash
du -sh ~/.claude/voice-server/cache/
```

**Count cached files:**
```bash
ls ~/.claude/voice-server/cache/*.mp3 | wc -l
```

**Clear entire cache:**
```bash
rm ~/.claude/voice-server/cache/*.mp3
```

**Clear old cache files manually:**
```bash
# Delete files older than 7 days
find ~/.claude/voice-server/cache/ -name "*.mp3" -mtime +7 -delete
```

### Cost Savings Example

**Without Cache:**
- Session start notification: 15 characters × 10 sessions/day = 150 chars/day
- Monthly: 150 × 30 = 4,500 characters

**With Cache:**
- First session: 15 characters (API call)
- Subsequent sessions: 0 characters (cache hit)
- Monthly: 15 characters total

**Savings: 99.7% reduction** for static messages like session start notifications.

## 🏥 Health Check

Check server status:
```bash
curl http://localhost:8888/health
```

Response:
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "ElevenLabs",
  "default_voice_id": "s3TPKV1kjDlVtZbl4Ksh",
  "api_key_configured": true
}
```

## 🐛 Troubleshooting

### Server won't start
1. Run the test script:
   ```bash
   ./test-system.sh
   ```

2. Check if another service is using port 8888:
   ```bash
   # macOS/Linux
   lsof -i:8888
   # OR Linux
   ss -tln | grep 8888
   ```

3. Kill the process if needed:
   ```bash
   lsof -ti:8888 | xargs kill -9
   ```

### No voice output
1. Verify ElevenLabs API key is configured:
   ```bash
   grep ELEVENLABS_API_KEY ~/.claude/.env
   ```

2. Check server logs:
   ```bash
   # macOS
   tail -f ~/Library/Logs/pai-voice-server.log

   # Linux
   journalctl --user -u pai-voice-server -f
   # OR
   tail -f ~/.local/share/pai-voice-server.log
   ```

3. Test the API directly:
   ```bash
   curl -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message":"Test message","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
   ```

### Linux-specific: No audio output
1. Install audio dependencies:
   ```bash
   sudo apt install mpg123 pulseaudio-utils
   ```

2. Test audio manually:
   ```bash
   mpg123 /path/to/test.mp3
   ```

### Linux-specific: No notifications
1. Install notification tools:
   ```bash
   sudo apt install libnotify-bin
   ```

2. Test notifications manually:
   ```bash
   notify-send "Test" "This is a test"
   ```

### Linux-specific: Service won't auto-start
1. Enable user lingering (allows services to run without login):
   ```bash
   loginctl enable-linger $USER
   ```

### API Errors
- **401 Unauthorized**: Invalid API key - check ~/.env
- **429 Too Many Requests**: Rate limit exceeded - wait or upgrade plan
- **Quota Exceeded**: Monthly character limit reached - upgrade plan or wait for reset

## 📁 Project Structure

```
voice-server/
├── server.ts              # Main server implementation
├── voices.json            # Voice metadata and configuration
├── install.sh             # Installation script
├── start.sh               # Start service
├── stop.sh                # Stop service
├── restart.sh             # Restart service
├── status.sh              # Check service status
├── uninstall.sh           # Uninstall service
├── run-server.sh          # Direct server runner
├── cache/                 # Cached audio files (auto-generated)
│   └── *.mp3             # SHA256-named cached audio files
├── logs/                  # Server logs
│   ├── voice-server.log
│   └── voice-server-error.log
├── macos-service/         # LaunchAgent configuration
│   └── com.paivoice.server.plist
└── menubar/               # Menu bar indicator scripts
    └── pai-voice.5s.sh
```

## 🔒 Security

- **API Key Protection**: Keep your `ELEVENLABS_API_KEY` secure
- **Never commit** API keys to version control
- **CORS**: Server is restricted to localhost only
- **Rate Limiting**: 10 requests per minute per IP

## 📊 Performance

- **Voice Generation (Cache Miss)**: ~500ms-2s (API call + network)
- **Voice Generation (Cache Hit)**: ~50-100ms (instant playback from cache)
- **Audio Playback**: Immediate after generation
- **Cache Hit Rate**: Typically 90%+ for static messages (e.g., session start notifications)
- **Cost Savings**: 99%+ reduction in API usage for repeated messages
- **Monthly Quota**: 10,000 characters (free tier) - cache extends this significantly
- **Rate Limits**: Per ElevenLabs plan
- **Cache Storage**: ~50KB per cached message (MP3 format)

## 📝 License

Part of the Personal AI Infrastructure (PAI) system.

## 🙋 Support

For issues or questions:
1. Check the logs: `${PAI_DIR}/voice-server/logs/`
2. Verify configuration: `curl http://localhost:8888/health`
3. Review documentation: `documentation/voice-system.md`
