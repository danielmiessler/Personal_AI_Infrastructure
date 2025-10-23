# Phase 3: Voice Server Integration (Optional Feature)

**Duration:** ~1 hour
**Priority:** Medium (Feature enhancement)
**Dependencies:** Phase 2 complete

---

## Objective

Make voice notification system fully optional and configurable, allowing users to enable/disable voice features without breaking functionality.

---

## Background

**Current State:** Voice server is assumed to be running at `localhost:8888`
**Target State:** Voice server is optional, controlled by `ENABLE_VOICE` environment variable
**Benefit:** Plugin works for users without voice server setup

**Why This Matters:**
- Voice server requires additional setup (Bun, voice-server directory)
- Not all users want voice notifications
- Plugin should have graceful degradation
- Makes plugin more accessible to new users

---

## Tasks

### Task 3.1: Add Voice Configuration Flag

**File:** `pai-plugin/settings.example.json`

**Add to env section:**
```json
"env": {
  "DA": "[YOUR_ASSISTANT_NAME]",
  "PAI_DIR": "$HOME/.claude",
  "ENABLE_VOICE": "false",
  "VOICE_SERVER_URL": "http://localhost:8888",
  "VOICE_ENABLED_AGENTS": "engineer,architect,designer,researcher"
}
```

**Configuration Options:**
- `ENABLE_VOICE`: `"true"` or `"false"` - Master switch
- `VOICE_SERVER_URL`: Voice server endpoint (default: localhost:8888)
- `VOICE_ENABLED_AGENTS`: Comma-separated list of agents with voice (optional)

---

### Task 3.2: Update stop-hook.ts

**File:** `pai-plugin/hooks/stop-hook.ts`

**Current Implementation (excerpt):**
```typescript
// Voice notification
const voiceMessage = completedLine || "Task completed";
await fetch('http://localhost:8888/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: voiceMessage,
    rate: 228,
    voice_enabled: true
  })
});
```

**Updated Implementation:**
```typescript
// Voice notification (optional)
if (process.env.ENABLE_VOICE === 'true') {
  try {
    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8888';
    const voiceMessage = completedLine || "Task completed";

    const response = await fetch(`${voiceServerUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: voiceMessage,
        rate: 228,
        voice_enabled: true
      }),
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });

    if (!response.ok) {
      console.warn(`Voice notification failed: ${response.status}`);
    }
  } catch (error) {
    // Silently fail - don't block on voice errors
    console.debug('Voice notification unavailable:', error.message);
  }
} else {
  console.debug('Voice notifications disabled (ENABLE_VOICE=false)');
}
```

**Key Changes:**
- ✅ Check `ENABLE_VOICE` flag before attempting voice calls
- ✅ Use configurable `VOICE_SERVER_URL`
- ✅ Add timeout to prevent hanging
- ✅ Graceful error handling (don't throw)
- ✅ Debug logging for troubleshooting

---

### Task 3.3: Update subagent-stop-hook.ts

**File:** `pai-plugin/hooks/subagent-stop-hook.ts`

**Apply same pattern as stop-hook.ts:**
```typescript
// Voice notification for agent completion (optional)
if (process.env.ENABLE_VOICE === 'true') {
  const agentName = /* extract from context */;
  const enabledAgents = (process.env.VOICE_ENABLED_AGENTS || '').split(',');

  // Only notify for enabled agents (if filter specified)
  if (enabledAgents.length === 0 || enabledAgents.includes(agentName)) {
    try {
      const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8888';
      const voiceId = agentVoiceMap[agentName] || 'default';

      await fetch(`${voiceServerUrl}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: completionMessage,
          voiceId: voiceId,
          rate: 260,
          voice_enabled: true
        }),
        signal: AbortSignal.timeout(2000)
      });
    } catch (error) {
      console.debug('Agent voice notification unavailable:', error.message);
    }
  }
}
```

**Additional Feature:**
- Per-agent voice filtering via `VOICE_ENABLED_AGENTS`
- Only specified agents trigger voice notifications
- Empty list = all agents notify (if voice enabled)

---

### Task 3.4: Update Agent Files (Optional Voice References)

**Files with voice references:**
- `pai-plugin/agents/engineer.md` (line 44-48)
- `pai-plugin/agents/architect.md` (similar pattern)
- Any other agents with voice instructions

**Current (engineer.md excerpt):**
```markdown
**🎤 MANDATORY VOICE ANNOUNCEMENT AFTER EVERY RESPONSE:**

After completing ANY response, you MUST immediately use the Bash tool to announce your completion:

```bash
curl -X POST http://localhost:8888/notify -H "Content-Type: application/json" -d '{"message":"Engineer completed [YOUR SPECIFIC TASK]","rate":260,"voice_enabled":true}'
```

**Updated:**
```markdown
**🎤 VOICE ANNOUNCEMENT (Optional, if ENABLE_VOICE=true):**

If voice notifications are enabled, announce completion using the 🎯 COMPLETED line in your response format. The stop-hook will automatically handle voice notifications.

**Alternative:** You can manually trigger voice notifications:

```bash
if [ "$ENABLE_VOICE" = "true" ]; then
  curl -X POST ${VOICE_SERVER_URL:-http://localhost:8888}/notify \
    -H "Content-Type: application/json" \
    -d '{"message":"Engineer completed task","rate":260,"voice_enabled":true}' \
    --max-time 2 || true
fi
```

**Note:** Manual voice calls are optional. The recommended approach is using the 🎯 COMPLETED format line, which triggers automatic voice notifications via hooks.
```

**Changes:**
- ✅ Remove "MANDATORY" language
- ✅ Document automatic hook-based notifications
- ✅ Provide conditional bash example
- ✅ Make it clear voice is optional

---

### Task 3.5: Create Voice Configuration Helper

**File:** `pai-plugin/scripts/configure-voice.sh` (NEW)

**Purpose:** Easy voice server configuration

```bash
#!/bin/bash

echo "Voice Server Configuration"
echo "=========================="
echo ""

# Check if voice server exists
if [ -d "$HOME/.claude/voice-server" ]; then
  echo "✅ Voice server found at ~/.claude/voice-server"
else
  echo "⚠️  Voice server not found"
  echo "   Voice server setup: https://github.com/[your-repo]/voice-server"
  echo ""
fi

# Prompt for configuration
read -p "Enable voice notifications? (y/n): " enable_voice

if [ "$enable_voice" = "y" ]; then
  read -p "Voice server URL [http://localhost:8888]: " voice_url
  voice_url=${voice_url:-http://localhost:8888}

  read -p "Agents with voice (comma-separated, empty for all): " enabled_agents

  echo ""
  echo "Configuration:"
  echo "  ENABLE_VOICE=\"true\""
  echo "  VOICE_SERVER_URL=\"$voice_url\""
  echo "  VOICE_ENABLED_AGENTS=\"$enabled_agents\""
  echo ""
  echo "Add these to your ~/.claude/settings.json env section"
else
  echo ""
  echo "Configuration:"
  echo "  ENABLE_VOICE=\"false\""
  echo ""
  echo "Voice notifications will be disabled"
fi
```

---

## Voice Server Documentation Updates

### Task 3.6: Update Voice Server README

**File:** `pai-plugin/voice-server/README.md` (if exists)

**Add section:**
```markdown
## Integration with Plugin

The PAI-Boilerplate plugin supports optional voice notifications.

### Enable Voice Notifications

1. **Start the voice server:**
   ```bash
   cd ~/.claude/voice-server
   bun server.ts &
   ```

2. **Update settings.json:**
   ```json
   "env": {
     "ENABLE_VOICE": "true",
     "VOICE_SERVER_URL": "http://localhost:8888"
   }
   ```

3. **Test voice:**
   ```bash
   curl -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message":"Voice test","voice_enabled":true}'
   ```

### Disable Voice Notifications

Set in settings.json:
```json
"env": {
  "ENABLE_VOICE": "false"
}
```

Plugin will work normally without voice features.
```

---

## Verification Checklist

After Phase 3 completion:

- [ ] `ENABLE_VOICE` flag added to settings.example.json
- [ ] `stop-hook.ts` updated with conditional voice logic
- [ ] `subagent-stop-hook.ts` updated with conditional voice logic
- [ ] Agent files updated to reflect optional voice
- [ ] Voice configuration script created
- [ ] Voice server documentation updated
- [ ] Test with voice enabled (ENABLE_VOICE="true")
- [ ] Test with voice disabled (ENABLE_VOICE="false")
- [ ] Verify graceful failure if voice server is down
- [ ] Verify timeout prevents hanging

---

## Testing Scenarios

### Test 1: Voice Disabled
```bash
# In ~/.claude/settings.json
"env": {
  "ENABLE_VOICE": "false"
}

# Run Claude Code
claude

# Complete a task
# → Should work normally without voice
# → No errors about voice server
```

### Test 2: Voice Enabled, Server Running
```bash
# Start voice server
cd ~/.claude/voice-server && bun server.ts &

# In settings.json
"env": {
  "ENABLE_VOICE": "true"
}

# Complete a task
# → Should announce completion via voice
```

### Test 3: Voice Enabled, Server Down
```bash
# Stop voice server
pkill -f "bun server.ts"

# In settings.json
"env": {
  "ENABLE_VOICE": "true"
}

# Complete a task
# → Should work normally
# → Should log debug message about voice unavailable
# → Should NOT hang or error
```

### Test 4: Per-Agent Voice Filtering
```bash
"env": {
  "ENABLE_VOICE": "true",
  "VOICE_ENABLED_AGENTS": "engineer,architect"
}

# Use engineer agent → Voice notification
# Use designer agent → No voice notification
```

---

## Rollback Plan

If voice changes cause issues:

```bash
# Revert hook files
git checkout pai-plugin/hooks/stop-hook.ts
git checkout pai-plugin/hooks/subagent-stop-hook.ts

# Revert agent files
git checkout pai-plugin/agents/*.md

# Remove configuration script
rm pai-plugin/scripts/configure-voice.sh
```

---

## Files Modified/Created Summary

**Modified (3-10 files):**
- `pai-plugin/settings.example.json` - Voice config flags
- `pai-plugin/hooks/stop-hook.ts` - Conditional voice logic
- `pai-plugin/hooks/subagent-stop-hook.ts` - Conditional voice logic
- `pai-plugin/agents/engineer.md` - Optional voice docs
- (Optional) Other agent files with voice references
- (Optional) `pai-plugin/voice-server/README.md` - Integration docs

**Created (1 file):**
- `pai-plugin/scripts/configure-voice.sh` - Configuration helper

---

## Expected Outcomes

✅ Voice notifications are fully optional
✅ Plugin works without voice server installed
✅ Graceful degradation when voice server is down
✅ User-configurable voice settings
✅ Per-agent voice filtering capability
✅ No hanging or errors when voice unavailable

---

## Next Phase

Once Phase 3 is complete and tested, proceed to:
→ [Phase 4: Setup Automation](./PHASE_4.md)

This will create installation and configuration scripts for easy setup.
