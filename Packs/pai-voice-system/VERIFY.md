# PAI Voice System - Verification Checklist

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/hooks/lib/` directory exists
- [ ] `$PAI_DIR/VoiceServer/` directory exists

### Core Files

- [ ] `$PAI_DIR/hooks/lib/prosody-enhancer.ts` exists
- [ ] `$PAI_DIR/hooks/stop-hook-voice.ts` exists
- [ ] `$PAI_DIR/hooks/subagent-stop-hook-voice.ts` exists
- [ ] `$PAI_DIR/VoiceServer/server.ts` exists
- [ ] `$PAI_DIR/VoiceServer/manage.sh` exists
- [ ] `$PAI_DIR/VoiceServer/voice-personalities.json` exists

### Configuration

- [ ] `ELEVENLABS_API_KEY` set in `~/.env`
- [ ] `ELEVENLABS_VOICE_ID` set in `~/.env`
- [ ] Voice hooks registered in `~/.claude/settings.json`

### Services

- [ ] Voice server running on port 8888

---

## Functional Tests

### Test 1: Verify Directory Structure

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

ls -la $PAI_CHECK/hooks/lib/
# Expected: prosody-enhancer.ts

ls -la $PAI_CHECK/VoiceServer/
# Expected: server.ts, manage.sh

ls -la $PAI_CHECK/hooks/
# Expected: stop-hook-voice.ts, subagent-stop-hook-voice.ts
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
# Expected: Success tone with adjusted voice parameters
```

### Test 5: Check Hook Registration

```bash
grep -A5 "stop-hook-voice" ~/.claude/settings.json
# Expected: Shows hook configuration
```

### Test 6: Test Management Script

```bash
$PAI_DIR/VoiceServer/manage.sh status
# Expected: Shows server running status
```

---

## Integration Tests

### Test A: Main Agent Voice

In a Claude Code session:
1. Complete a task that produces `🗣️ PAI:` output
2. Listen for voice announcement
3. Should hear the message spoken

### Test B: Subagent Voice

In a Claude Code session:
1. Run a Task that spawns a subagent
2. Wait for subagent to complete
3. Should hear voice notification

### Test C: Graceful Degradation

```bash
# Stop the voice server
$PAI_DIR/VoiceServer/manage.sh stop

# In Claude Code, complete a task
# Should complete without errors (silent, no crash)

# Restart voice server
$PAI_DIR/VoiceServer/manage.sh start
```

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== PAI Voice System v1.0.0 Verification ==="
echo ""

# Check files
echo "📁 Files:"
for file in "hooks/lib/prosody-enhancer.ts" "hooks/stop-hook-voice.ts" "hooks/subagent-stop-hook-voice.ts" "VoiceServer/server.ts" "VoiceServer/manage.sh"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ❌ $file MISSING"
  fi
done

echo ""

# Check API key
echo "🔑 Configuration:"
if [ -f "$HOME/.env" ] && grep -q "ELEVENLABS_API_KEY" "$HOME/.env"; then
  echo "  ✓ ELEVENLABS_API_KEY configured"
else
  echo "  ❌ ELEVENLABS_API_KEY not configured"
fi

if [ -f "$HOME/.env" ] && grep -q "ELEVENLABS_VOICE_ID" "$HOME/.env"; then
  echo "  ✓ ELEVENLABS_VOICE_ID configured"
else
  echo "  ❌ ELEVENLABS_VOICE_ID not configured"
fi

echo ""

# Check voice server
echo "🔊 Voice Server:"
if curl -s http://localhost:8888/health > /dev/null 2>&1; then
  echo "  ✓ Voice server running on port 8888"
  curl -s http://localhost:8888/health | head -c 100
  echo ""
else
  echo "  ❌ Voice server NOT running"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. ✅ All directory structure items exist
2. ✅ All core files are present
3. ✅ ElevenLabs API key and voice ID are configured
4. ✅ Voice server responds to health check
5. ✅ Test notification produces audible output
6. ✅ Hooks are registered in settings.json
