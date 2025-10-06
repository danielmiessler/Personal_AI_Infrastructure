# PAI Setup & Troubleshooting

Quick reference for setup and common issues.

## Critical Setup Steps

### 1. Settings Symlink
Claude looks for `~/.claude/settings.json`, not the project directory.

```bash
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json
```

### 2. Hook Permissions
```bash
chmod +x ${PAI_DIR}/hooks/*.ts
```

### 3. Voice Config
Centralized to `${PAI_DIR}/voice-server/voices.json`:
- All voices: 210 WPM (1.2x speed)
- Agents use direct curl to voice server
- Edit one file to change all voices

## Troubleshooting

### Hooks Not Running

**Problem:** Hook doesn't execute when you submit prompts.

**Fix:**
```bash
# Create symlink
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json

# Make executable
chmod +x ${PAI_DIR}/hooks/*.ts
```

**Verify:**
```bash
ls -la ~/.claude/settings.json  # Should point to PAI settings
ls -la ${PAI_DIR}/hooks/*.ts    # Should show -rwxr-xr-x
```

### Testing Hooks

**Wrong:**
```bash
./hooks/load-dynamic-requirements.ts "test"
```

**Right:**
```bash
echo '{"session_id":"test","prompt":"test","transcript_path":"/tmp/t","hook_event_name":"UserPromptSubmit"}' | \
  bun ${PAI_DIR}/hooks/load-dynamic-requirements.ts
```

Hooks need JSON via stdin, not command arguments.

### Agent Loading

Agents work through "persona embodiment":

1. You submit: "Plan a REST API"
2. Hook outputs: markdown with `AGENT: architect`
3. Kai reads: `${PAI_DIR}/agents/architect.md`
4. Kai becomes: Atlas the architect
5. Response includes: `[AGENT:architect]` tag

**Not working?** Check:
- Agent .md files exist in `${PAI_DIR}/agents/`
- Hook output includes agent directives
- Kai actually reads the agent file (check Read tool usage)

### Voice Issues

**Too fast?** Edit `${PAI_DIR}/voice-server/voices.json`:
```json
{
  "kai": {
    "rate_multiplier": 1.0,  // Lower = slower (1.0 = normal)
    "rate_wpm": 175
  }
}
```

**Wrong voice?** All hooks load from `voices.json` now - edit that one file.

**Test a voice:**
```bash
say -v "Jamie (Premium)" "test message"
```

### Debug Logs

Check what's happening:
```bash
tail ~/Library/Logs/hook_debug.log
```

No log file? Hook isn't running - check symlink and permissions above.

### Common Errors

**Exit code 127:** File not found or not executable - check paths and permissions

**Hook runs but nothing happens:** Check the markdown file it's trying to read exists

**Voice not working:** Verify voice name in voices.json matches `say -v '?'` output

**Different voice at startup:** All hooks use voices.json now - edit once, affects all

## How It Works

### Agent System

**Direct loading, not Task tool:**

1. User: "Plan X"
2. Hook: outputs `AGENT: architect`
3. Kai: reads `${PAI_DIR}/agents/architect.md`
4. Kai: becomes that agent
5. Response: includes `[AGENT:architect]` tag

No separate processes. Kai just reads the agent file and transforms.

### Voice Notifications

Agents send voice notifications directly:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Architect completed [task]","rate":210,"voice_enabled":true}'
```

All configured in `voices.json`:
```json
{
  "kai": {"voice_name": "Jamie (Premium)", "rate_wpm": 210},
  "architect": {"voice_name": "Serena (Premium)", "rate_wpm": 210}
}
```

## Claude Sonnet 4.5 Changes

**Problem:** New Claude ignores "MUST" commands, uses contextual reasoning instead.

**Solution:** `commands/load-dynamic-requirements.md` uses strong language and emojis (🚨, ⚠️) to prevent the model from optimizing away critical file loads. Not elegant, but reliable.

**Old approach:**
```
Please load the agent file
```

**Current approach:**
```
🚨🚨🚨 YOU MUST LOAD THIS FILE NOW 🚨🚨🚨
```

## Quick Setup Check

```bash
# PAI_DIR set?
echo $PAI_DIR

# Symlink exists?
ls -la ~/.claude/settings.json

# Hooks executable?
ls -la ${PAI_DIR}/hooks/*.ts

# Bun installed?
bun --version
```

All good? Submit a prompt and check the debug log.

## Verify Setup

```bash
# Check everything
echo $PAI_DIR                              # Set?
ls -la ~/.claude/settings.json             # Symlink?
ls -la ${PAI_DIR}/hooks/*.ts               # Executable?
tail ~/Library/Logs/hook_debug.log         # Working?
```

---

Still stuck? Open an issue with debug output:
```bash
echo "PAI_DIR: $PAI_DIR"
ls -la ~/.claude/settings.json ${PAI_DIR}/hooks/
tail ~/Library/Logs/hook_debug.log
```

*Last Updated: 2025-10-06*
