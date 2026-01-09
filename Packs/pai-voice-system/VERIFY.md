# Kai Voice System - Verification Checklist

## 🚨 Platform Verification (FIRST)

> **FOR AI AGENTS:** Run this check FIRST. If the OS check fails, the installation is NOT valid.

```bash
OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" = "Darwin" ]; then
  echo "✓ Platform: macOS - fully supported"
  echo "   Audio: afplay (built-in)"
elif [ "$OS_TYPE" = "Linux" ]; then
  echo "✓ Platform: Linux - fully supported"
  echo "   Audio: mpg123 (preferred) or mpv"
  if ! command -v mpg123 &> /dev/null && ! command -v mpv &> /dev/null; then
    echo "   ⚠️  No audio player found. Install: sudo apt install mpg123"
  fi
else
  echo "❌ Platform: $OS_TYPE - NOT SUPPORTED"
  echo "   Installation cannot be verified on this platform"
fi
```

**Cross-platform note:** Voice server auto-detects audio players (macOS: afplay, Linux: mpg123/mpv).

---

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/hooks/lib/` directory exists
- [ ] `$PAI_DIR/config/` directory exists
- [ ] `$PAI_DIR/voice-server/` directory exists

### Core Files

- [ ] `$PAI_DIR/hooks/lib/prosody-enhancer.ts` exists
- [ ] `$PAI_DIR/hooks/stop-hook-voice.ts` exists
- [ ] `$PAI_DIR/hooks/subagent-stop-hook-voice.ts` exists
- [ ] `$PAI_DIR/voice-server/server.ts` exists
- [ ] `$PAI_DIR/config/voice-personalities.json` exists

### Configuration

- [ ] `ELEVENLABS_API_KEY` set in `$PAI_DIR/.env`
- [ ] Voice hooks registered in `~/.claude/settings.json`

### Services

- [ ] Voice server running on port 8888

---

## Functional Tests

### Test 1: Verify Directory Structure

```bash
ls -la $PAI_DIR/hooks/lib/
# Expected: prosody-enhancer.ts

ls -la $PAI_DIR/voice-server/
# Expected: server.ts

ls -la $PAI_DIR/config/
# Expected: voice-personalities.json
```

### Test 2: Check Voice Server Health

```bash
curl http://localhost:8888/health
# Expected: {"status":"healthy","port":8888,"voice_system":"ElevenLabs",...}
```

### Test 3: Test Voice Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello from PAI voice system","voice_enabled":true}'
# Expected: Hear "Hello from PAI voice system" spoken aloud
```

### Test 4: Test Emotional Markers

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"[✨ success] Fixed the authentication bug!","voice_enabled":true}'
# Expected: Success tone with emphasis on "Fixed"
```

### Test 5: Verify Prosody Enhancer

```bash
# In a bun REPL or test file:
import { enhanceProsody, cleanForSpeech } from '$PAI_DIR/hooks/lib/prosody-enhancer';

const result = enhanceProsody("Completed fixing the login bug", "engineer");
console.log(result);
# Expected: Enhanced text with emotional markers
```

### Test 6: Check Hook Registration

```bash
grep -A5 "stop-hook-voice" ~/.claude/settings.json
# Expected: Shows hook configuration
```

---

## Integration Tests

### Test A: Main Agent Voice

In a Claude Code session:
1. Complete a task that produces 🎯 COMPLETED output
2. Listen for voice announcement
3. Should hear the COMPLETED message spoken

### Test B: Subagent Voice

In a Claude Code session:
1. Run a Task that spawns a subagent
2. Wait for subagent to complete
3. Should hear different voice for the agent type

### Test C: Graceful Degradation

```bash
# Stop the voice server
pkill -f "voice/server.ts"

# In Claude Code, complete a task
# Should complete without errors (silent, no crash)

# Restart voice server
bun run $PAI_DIR/voice-server/server.ts &
```

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Kai Voice System Verification ==="
echo ""

# Check files
for file in "hooks/lib/prosody-enhancer.ts" "hooks/stop-hook-voice.ts" "hooks/subagent-stop-hook-voice.ts" "voice-server/server.ts" "config/voice-personalities.json"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "✓ $file"
  else
    echo "❌ $file MISSING"
  fi
done

echo ""

# Check API key
if [ -f "$PAI_CHECK/.env" ] && grep -q "ELEVENLABS_API_KEY" "$PAI_CHECK/.env"; then
  echo "✓ ELEVENLABS_API_KEY configured"
else
  echo "❌ ELEVENLABS_API_KEY not configured"
fi

echo ""

# Check voice server
if curl -s http://localhost:8888/health > /dev/null 2>&1; then
  echo "✓ Voice server running on port 8888"
else
  echo "❌ Voice server NOT running"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. All directory structure items are checked
2. All core files are present
3. ElevenLabs API key is configured
4. Voice server responds to health check
5. Test notification produces audible output
6. Hooks are registered in settings.json
