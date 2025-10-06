# PAI Troubleshooting

Quick fixes for common PAI setup issues.

## Hooks Not Running

**Problem:** Hook doesn't execute when you submit prompts.

**Fix:**
```bash
# Create symlink so Claude can find settings
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json

# Make hooks executable
chmod +x ${PAI_DIR}/hooks/*.ts
```

**Verify:**
```bash
ls -la ~/.claude/settings.json  # Should point to PAI settings
ls -la ${PAI_DIR}/hooks/*.ts    # Should show -rwxr-xr-x
```

## Testing Hooks

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

## Agent Loading

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

## Voice Issues

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

## Debug Logs

Check what's happening:
```bash
tail ~/Library/Logs/hook_debug.log
```

No log file? Hook isn't running - check symlink and permissions above.

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

## Common Fixes

**Exit code 127:** File not found or not executable - check paths and permissions

**Hook runs but nothing happens:** Check the markdown file it's trying to read exists

**Voice not working:** Verify voice name in voices.json matches `say -v '?'` output

**Different voice at startup:** All hooks use voices.json now - edit once, affects all

---

Still stuck? Open an issue with debug output:
```bash
echo "PAI_DIR: $PAI_DIR"
ls -la ~/.claude/settings.json ${PAI_DIR}/hooks/
tail ~/Library/Logs/hook_debug.log
```
