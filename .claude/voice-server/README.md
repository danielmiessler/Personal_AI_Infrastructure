# PAI Voice Server

A voice notification server for the Personal AI Infrastructure (PAI) system that provides text-to-speech notifications using ElevenLabs API.

**Cross-platform support:** macOS and Linux (Ubuntu/Debian)

> **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.

## 🎯 Features

- **ElevenLabs Integration**: High-quality AI voices for notifications
- **Voice ID Validation**: Regex validation ensures valid voice IDs, automatic fallback to configured default
- **Configuration-Driven**: All voice settings managed through `settings.json` and `voices.json`
- **Intelligent Audio Caching**: Automatically caches generated audio to reduce API costs by 99%+
- **Multiple Voice Support**: Different voices for different AI agents (8+ agent types)
- **Dynamic Voice Loading**: Hooks automatically load agent voices from `voices.json`
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
    "voice_id": "cgSgspJ2msm6clMCkdW9",
    "voice_enabled": true,
    "title": "PAI Completion"
  }'
```

### Parameters
- `message` (required): The text to speak
- `voice_id` (optional): ElevenLabs voice ID to use (validated, falls back to DA_VOICE_ID)
- `voice_enabled` (optional): Whether to speak the notification (default: true)
- `title` (optional): Notification title (default: "PAI Notification")

### Voice ID Validation

The server validates voice IDs using regex pattern `/^[A-Za-z0-9]{20}$/`:
- **Valid**: Exactly 20 alphanumeric characters (e.g., `cgSgspJ2msm6clMCkdW9`)
- **Invalid**: Wrong length, special characters, or non-alphanumeric

**Validation Behavior:**
```bash
# Valid voice ID - used as provided
{"voice_id": "cgSgspJ2msm6clMCkdW9"}  # ✅ Valid - used directly

# Invalid voice ID - falls back to DA_VOICE_ID
{"voice_id": "abc123"}                  # ❌ Invalid - fallback to DA_VOICE_ID
{"voice_id": "default-voice"}       # ❌ Invalid - fallback to DA_VOICE_ID
```

**Server logs on validation failure:**
```
⚠️  Invalid voice ID format: "abc123" (must be 20 alphanumeric characters)
   Falling back to DA_VOICE_ID from settings.json: cgSgspJ2msm6clMCkdW9
```

### Available Voice IDs

**Default Voice IDs** (configured in `voices.json`):
```javascript
// PAI System Agents - All use ElevenLabs Default Voices (free tier)
main:        cgSgspJ2msm6clMCkdW9  // Jessica - Default Voice (main assistant)
researcher:  FGY2WhTYpPnrIDTdsKH5  // Laura - Young adult female (research agent)
engineer:    XrExE9yKIg1WjnnlVkGX  // Matilda - Professional woman (engineering agent)
architect:   EXAVITQu4vr4xnSDxMaL  // Sarah - Confident and warm (architecture agent)
designer:    Xb7hH8MSUJpSbSDYk0k2  // Alice - British accent (design agent)
artist:      pFZP5JQG7iQjIQuC4Bku  // Lilly - Velvety British (artist agent)
pentester:   IKne3meq5aSn9XLyUdCD  // Charlie - Australian male (security agent)
writer:      CwhRBWXzGAHq8TQ4Fs17  // Roger - Easy going (content agent)
```

**These voice IDs are automatically loaded by PAI hooks from `voices.json`.**

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

The `voices.json` file configures agent voices with ElevenLabs voice IDs and metadata. PAI hooks dynamically load voice configurations from this file at runtime.

```json
{
  "voices": {
    "main": {
      "voice_id": "cgSgspJ2msm6clMCkdW9",
      "voice_name": "Jessica (Default Voice)",
      "rate_wpm": 175,
      "description": "Default Voice - Available to all ElevenLabs users"
    },
    "researcher": {
      "voice_id": "FGY2WhTYpPnrIDTdsKH5",
      "voice_name": "Laura (Default Voice)",
      "rate_wpm": 175,
      "description": "Young adult female - Research agent"
    },
    "engineer": {
      "voice_id": "XrExE9yKIg1WjnnlVkGX",
      "voice_name": "Matilda (Default Voice)",
      "rate_wpm": 175,
      "description": "Professional woman - Engineering agent"
    },
    "architect": {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "voice_name": "Sarah (Default Voice)",
      "rate_wpm": 175,
      "description": "Confident and warm - Architecture agent"
    },
    "designer": {
      "voice_id": "Xb7hH8MSUJpSbSDYk0k2",
      "voice_name": "Alice (Default Voice)",
      "rate_wpm": 175,
      "description": "British accent - Design agent"
    },
    "artist": {
      "voice_id": "pFZP5JQG7iQjIQuC4Bku",
      "voice_name": "Lilly (Default Voice)",
      "rate_wpm": 175,
      "description": "Velvety British - Artist agent"
    },
    "pentester": {
      "voice_id": "IKne3meq5aSn9XLyUdCD",
      "voice_name": "Charlie (Default Voice)",
      "rate_wpm": 175,
      "description": "Australian male - Security agent"
    },
    "writer": {
      "voice_id": "CwhRBWXzGAHq8TQ4Fs17",
      "voice_name": "Roger (Default Voice)",
      "rate_wpm": 175,
      "description": "Easy going - Content agent"
    }
  }
}
```

**Dynamic Loading**: PAI hooks (`stop-hook.ts`, `subagent-stop-hook.ts`, `context-compression-hook.ts`) automatically load voice IDs from this file at runtime, eliminating hardcoded values and making voice customization easy.

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

## 🔌 Hook Integration

The voice server is tightly integrated with PAI's hook system to provide voice notifications for different events. All hooks are configuration-driven and dynamically load voice settings from `settings.json` and `voices.json`.

### Hook Types

#### 1. Stop Hook (`Hooks/stop-hook.ts`)
**Triggers:** When the main assistant completes a task

**Configuration Loading:**
- Loads `DA` name from `settings.json` (e.g., "PAI", "Kai")
- Loads `DA_VOICE_ID` from `settings.json` for voice notifications
- Loads `PAI_DIR` for proper path resolution

**Notification Format:**
```json
{
  "title": "PAI Completion",          // Uses DA name from settings
  "message": "Task completed",        // Extracted from 🎯 COMPLETED: marker
  "voice_id": "cgSgspJ2msm6clMCkdW9", // Uses DA_VOICE_ID
  "voice_enabled": true
}
```

**Example:**
```typescript
// Settings.json
{
  "env": {
    "DA": "PAI",
    "DA_VOICE_ID": "cgSgspJ2msm6clMCkdW9"
  }
}

// Result: Notification title = "PAI Completion"
// Voice used: Jessica (cgSgspJ2msm6clMCkdW9)
```

#### 2. Subagent Stop Hook (`Hooks/subagent-stop-hook.ts`)
**Triggers:** When a specialized agent (researcher, engineer, etc.) completes a task

**Configuration Loading:**
- Loads `DA_VOICE_ID` from `settings.json` as default fallback
- Dynamically loads all agent voice IDs from `voices.json`
- Maps agent types to their specific voices

**Voice Mapping:**
```typescript
// Dynamically loaded from voices.json
AGENT_VOICE_IDS = {
  default: "cgSgspJ2msm6clMCkdW9",     // DA_VOICE_ID fallback
  researcher: "FGY2WhTYpPnrIDTdsKH5",  // Laura
  engineer: "XrExE9yKIg1WjnnlVkGX",    // Matilda
  architect: "EXAVITQu4vr4xnSDxMaL",   // Sarah
  designer: "Xb7hH8MSUJpSbSDYk0k2",    // Alice
  artist: "pFZP5JQG7iQjIQuC4Bku",      // Lilly
  pentester: "IKne3meq5aSn9XLyUdCD",   // Charlie
  writer: "CwhRBWXzGAHq8TQ4Fs17"       // Roger
}
```

**Notification Format:**
```json
{
  "title": "Pentester Agent",                        // Agent-specific title
  "message": "Pentester completed security scan",    // Agent-specific message
  "voice_id": "IKne3meq5aSn9XLyUdCD",               // Agent-specific voice
  "agent_type": "pentester",
  "voice_enabled": true
}
```

**Debug Logging:**
```
📁 Loading voices from: /home/user/.claude/voice-server/voices.json
📂 File exists: true
📊 Found 8 voices in config
  ✓ Loaded main: cgSgspJ2msm6clMCkdW9
  ✓ Loaded researcher: FGY2WhTYpPnrIDTdsKH5
  ✓ Loaded engineer: XrExE9yKIg1WjnnlVkGX
  ...
✅ Loaded 9 total agent voices (including default)
🎤 Using voice ID for pentester: IKne3meq5aSn9XLyUdCD
```

#### 3. Context Compression Hook (`Hooks/context-compression-hook.ts`)
**Triggers:** When context is compressed to manage conversation length

**Configuration Loading:**
- Loads `DA` name from `settings.json`
- Loads `DA_VOICE_ID` from `settings.json`
- No longer depends on `voices.json` (simplified)

**Notification Format:**
```json
{
  "title": "PAI Context",                // Uses DA name
  "message": "Context compressed",       // Compression notification
  "voice_id": "cgSgspJ2msm6clMCkdW9",   // Uses DA_VOICE_ID
  "voice_enabled": true,
  "priority": "low"
}
```

#### 4. Initialize Session Hook (`Hooks/initialize-session.ts`)
**Triggers:** At the start of every Claude Code session (main sessions only, skips subagents)

**Configuration Loading:**
- Loads `DA` name from `settings.json` (e.g., "PAI", "Kai")
- Loads `DA_VOICE_ID` from `settings.json` with fallback chain
- Loads `VOICE_SERVER_PORT` from `settings.json` (default: 8888)
- Fallback chain: `settings.json DA_VOICE_ID` → `process.env.DA_VOICE_ID` → `.env ELEVENLABS_VOICE_ID` → default

**Functionality:**
- Detects and skips subagent sessions (prevents duplicate notifications)
- Debounces duplicate SessionStart events (2-second window)
- Tests stop-hook configuration and executable status
- Sets terminal tab title to "{DA} Ready" (e.g., "PAI Ready")
- Sends voice notification that system is ready

**Notification Format:**
```json
{
  "title": "PAI Systems Initialized",     // Uses DA name
  "message": "PAI here, ready to go.",    // Personalized greeting
  "voice_id": "cgSgspJ2msm6clMCkdW9",    // Uses DA_VOICE_ID
  "voice_enabled": true,
  "priority": "low"
}
```

**Example Output:**
```
🤖 Subagent session detected - skipping session initialization  // (if subagent)
🔇 Debouncing duplicate SessionStart event                       // (if duplicate)

🔍 Testing stop-hook configuration...
✅ Stop-hook found and is executable
📍 Set initial tab title: "PAI Ready"

[Voice notification sent: "PAI here, ready to go."]
```

**Debouncing:**
The hook uses a lockfile (`/tmp/pai-session-start.lock`) to prevent duplicate notifications when the IDE fires multiple SessionStart events:
- First event within 2-second window: Sends notification
- Subsequent events within 2 seconds: Skipped silently

**Subagent Detection:**
Automatically detects subagent sessions and exits silently to prevent notification spam:
```typescript
// Detects subagent by checking:
// 1. CLAUDE_PROJECT_DIR contains "/.claude/agents/"
// 2. CLAUDE_AGENT_TYPE environment variable is set
```

### Configuration Hierarchy

All hooks follow the same configuration loading pattern:

```typescript
// 1. Load settings.json (primary configuration)
const settings = JSON.parse(readFileSync('~/.claude/settings.json'));
const daName = settings.env?.DA || 'PAI';
const daVoiceId = settings.env?.DA_VOICE_ID;
const paiDir = settings.env?.PAI_DIR || '~/.claude';

// 2. Load voices.json (agent-specific voices)
const voicesPath = join(paiDir, 'voice-server', 'voices.json');
const voicesConfig = JSON.parse(readFileSync(voicesPath));

// 3. Fallback chain
const voiceId = agentVoiceId || daVoiceId || 'cgSgspJ2msm6clMCkdW9';
```

### Customizing Agent Voices

To change an agent's voice, edit `~/.claude/voice-server/voices.json`:

```json
{
  "voices": {
    "pentester": {
      "voice_id": "YOUR_PREFERRED_VOICE_ID",
      "voice_name": "Your Voice Name",
      "rate_wpm": 175,
      "description": "Your description"
    }
  }
}
```

**No code changes needed** - hooks automatically reload voice configuration on each invocation.

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
├── server.ts                  # Main server implementation (with voice ID validation)
├── voices.json                # Voice IDs and metadata (dynamically loaded by hooks)
├── install.sh                 # Cross-platform installation script
├── start.sh                   # Start service
├── stop.sh                    # Stop service
├── restart.sh                 # Restart service
├── status.sh                  # Check service status
├── uninstall.sh               # Uninstall service
├── test-system.sh             # Comprehensive system validation
├── run-server.sh              # Direct server runner
├── cache/                     # Cached audio files (auto-generated)
│   └── *.mp3                 # SHA256-named cached audio files
├── logs/                      # Server logs
│   ├── voice-server.log
│   └── voice-server-error.log
├── linux-service/             # Linux systemd service configuration
│   ├── pai-voice-server-user.service
│   ├── install.sh
│   ├── setup-deps.sh
│   ├── uninstall.sh
│   └── validate-setup.sh
├── macos-service/             # macOS LaunchAgent configuration
│   └── com.paivoice.server.plist
└── menubar/                   # Menu bar indicator scripts (macOS only)
    └── pai-voice.5s.sh

../Hooks/                      # PAI hook integration
├── initialize-session.ts      # Session start hook (greeting + tab title)
├── stop-hook.ts               # Main assistant completion hook
├── subagent-stop-hook.ts      # Agent completion hook (8+ agent types)
├── context-compression-hook.ts # Context compression hook
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
