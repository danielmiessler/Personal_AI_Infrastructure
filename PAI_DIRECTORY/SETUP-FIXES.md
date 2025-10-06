# PAI Setup Notes

Quick reference for fixes applied to get PAI running.

## Critical Fixes

### Settings Symlink
Claude looks for `~/.claude/settings.json`, not project directory.

```bash
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json
```

### Hook Permissions
```bash
chmod +x ${PAI_DIR}/hooks/*.ts
```

### Voice Config (2025-10-06)
Centralized all voice settings to `${PAI_DIR}/voice-server/voices.json`:
- All voices: 210 WPM (1.2x speed)
- Removed hardcoded voices from hooks
- Fixed startup voice (was female ElevenLabs ID, now male Jamie)

Edit one file to change all voices.

## How Agents Work

**Direct loading, not Task tool:**

1. User: "Plan X"
2. Hook: outputs `AGENT: architect`
3. Kai: reads `${PAI_DIR}/agents/architect.md`
4. Kai: becomes that agent
5. Response: includes `[AGENT:architect]` tag

No separate processes. Kai just reads the agent file and transforms.

## Hook Testing

Hooks need JSON via stdin:
```bash
echo '{"session_id":"t","prompt":"test","transcript_path":"/tmp/t","hook_event_name":"UserPromptSubmit"}' | \
  bun ${PAI_DIR}/hooks/load-dynamic-requirements.ts
```

Exit 127 = command not found (wrong path or not executable)

## Voice Speeds

**Before:** Too fast (228-236 WPM)
**After:** Comfortable (210 WPM)

All in `voices.json`:
```json
{
  "kai": {"voice_name": "Jamie (Premium)", "rate_wpm": 210},
  "architect": {"voice_name": "Serena (Premium)", "rate_wpm": 210}
}
```

## Claude Sonnet 4.5 Fix (2025-10-06)

**Problem:** New Claude ignores "MUST" commands, uses contextual reasoning instead.

**Solution:** Rewrote `commands/load-dynamic-requirements.md` to use decision trees instead of drill-sergeant commands.

**Old:**
```
🚨 YOU MUST LOAD THE AGENT NOW 🚨
```

**New:**
```
Is this architecture work? → YES
Do you have architect context? → NO
Why loading helps: User expects Atlas with PRD expertise
Action: read ${PAI_DIR}/agents/architect.md
```

Now works with Sonnet 4.5's reasoning instead of fighting it.

## Verify Setup

```bash
# Check everything
echo $PAI_DIR                              # Set?
ls -la ~/.claude/settings.json             # Symlink?
ls -la ${PAI_DIR}/hooks/*.ts               # Executable?
tail ~/Library/Logs/hook_debug.log         # Working?
```

---

*Last Updated: 2025-10-06*
