# pai-voice - ElevenLabs TTS/STT CLI

**Version:** 1.0.0
**Author:** Daniel Miessler / PAI
**Last Updated:** 2025-12-04

---

## Overview

`pai-voice` is a clean, deterministic command-line interface for ElevenLabs voice synthesis and transcription. It replaces complex MCP server setups with a simple, reliable CLI tool.

### Why This CLI Exists

**Problem:** MCP-based voice integration had reconnection issues and complex debugging requirements.

**Solution:** A CLI-First tool that:
- Calls ElevenLabs REST API directly
- Works independently of Claude Code's MCP system
- Is testable, debuggable, and version-controlled
- Follows PAI's architectural principles

### Philosophy

`pai-voice` follows PAI's **CLI-First Architecture**:

1. **Deterministic** - Same input always produces same output
2. **Clean** - Single responsibility (voice operations only)
3. **Composable** - JSON output pipes to jq, grep, other tools
4. **Documented** - Comprehensive help and examples
5. **Testable** - Predictable, verifiable behavior

---

## Installation

The CLI is pre-installed at `~/.claude/bin/pai-voice/`.

### Make Executable

```bash
chmod +x ~/.claude/bin/pai-voice/pai-voice.ts
```

### Add to PATH (Optional)

```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$HOME/.claude/bin/pai-voice:$PATH"
```

### Verify Installation

```bash
~/.claude/bin/pai-voice/pai-voice.ts --help
```

---

## Configuration

### Required Environment Variables

Add to `~/.claude/.env`:

```bash
# Required
ELEVENLABS_API_KEY=your_api_key_here

# Optional (with defaults)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_flash_v2_5
```

### Available Models

| Model | Description | Speed | Languages |
|-------|-------------|-------|-----------|
| `eleven_flash_v2_5` | Fastest (recommended) | ⚡⚡⚡ | 32 |
| `***REMOVED***` | Highest quality | ⚡ | 29 |
| `eleven_turbo_v2_5` | Balanced | ⚡⚡ | 32 |
| `eleven_flash_v2` | Fast English | ⚡⚡⚡ | 1 |
| `eleven_turbo_v2` | Balanced English | ⚡⚡ | 1 |

---

## Usage

### Text-to-Speech

```bash
# Basic usage
pai-voice say "Hello, world!"

# With immediate playback
pai-voice say "Hello! Task completed." --play

# Custom voice and model
pai-voice say "Hallo" --voice EXAVITQu4vr4xnSDxMaL --model ***REMOVED***

# Save to specific file
pai-voice say "Test" --output ~/Desktop/test.mp3
```

### Speech-to-Text

```bash
# Basic transcription
pai-voice transcribe recording.mp3

# With speaker diarization
pai-voice transcribe meeting.mp3 --diarize

# JSON output with word timestamps
pai-voice transcribe audio.mp3 --json

# Specific language
pai-voice transcribe german.mp3 --language deu
```

### Play Audio

```bash
pai-voice play ~/audio/greeting.mp3
```

### List Voices

```bash
# All voices
pai-voice voices

# Search for specific voices
pai-voice voices --search german
pai-voice voices --search female

# JSON output
pai-voice voices --json
```

### Check Subscription

```bash
# Human-readable
pai-voice subscription

# JSON output
pai-voice subscription --json
```

---

## Examples with Piping

### Save Voice Info to File

```bash
pai-voice voices --json > voices.json
```

### Get Voice IDs Only

```bash
pai-voice voices --json | jq '.[].voice_id'
```

### Check Character Usage Percentage

```bash
pai-voice subscription --json | jq '.character_count / .character_limit * 100'
```

### Generate and Process

```bash
# Generate speech, get file path, play it
FILE=$(pai-voice say "Test" | jq -r '.file')
pai-voice play "$FILE"
```

---

## Output Formats

### Standard Output

- **Status messages** → stderr (visible in terminal)
- **Data/Results** → stdout (JSON or text)
- **Exit code** → 0 (success) or 1 (error)

### JSON Structure: say

```json
{
  "success": true,
  "file": "/tmp/pai-voice-1701234567890.mp3",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model": "eleven_flash_v2_5",
  "text_length": 25
}
```

### JSON Structure: subscription

```json
{
  "tier": "creator",
  "character_count": 6660,
  "character_limit": 181426,
  "status": "active",
  "next_character_count_reset_unix": 1767455496
}
```

---

## Integration with Claude Code

### In Hooks

```typescript
// In stop-hook.ts
import { execSync } from "child_process";

const message = "Task completed successfully";
execSync(`~/.claude/bin/pai-voice/pai-voice.ts say "${message}" --play`);
```

### In Skills

```markdown
## Voice Feedback

When task is complete, use:
\`\`\`bash
~/.claude/bin/pai-voice/pai-voice.ts say "Done!" --play
\`\`\`
```

### Direct Bash Calls

```bash
# Claude Code can call directly
~/.claude/bin/pai-voice/pai-voice.ts say "Research completed" --play
```

---

## Troubleshooting

### "ELEVENLABS_API_KEY not found"

Ensure your API key is in `~/.claude/.env`:
```bash
echo 'ELEVENLABS_API_KEY=your_key' >> ~/.claude/.env
```

### "Permission denied"

Make the script executable:
```bash
chmod +x ~/.claude/bin/pai-voice/pai-voice.ts
```

### "Command not found: bun"

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Audio not playing

On macOS, `afplay` is used. Ensure your audio output is configured correctly.

---

## Comparison: MCP vs CLI

| Aspect | MCP Server | pai-voice CLI |
|--------|------------|---------------|
| Complexity | High (stdio, reconnect) | Low (direct API) |
| Debugging | Hard | Easy (`--verbose`) |
| Testing | Needs Claude Code | Standalone |
| Reliability | Reconnect issues | Always works |
| PAI Compliance | Tier 1 (Discovery) | CLI-First |

---

## Version History

### 1.0.0 (2025-12-04)

- Initial release
- Commands: say, transcribe, play, voices, subscription
- Replaces elevenlabs-proxy MCP

---

## License

MIT License - Daniel Miessler / PAI
