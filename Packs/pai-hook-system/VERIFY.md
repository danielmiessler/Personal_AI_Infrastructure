# Verification Guide: Kai Hook System

## Quick Verification

Run these commands to verify the installation:

```bash
# 1. Check all hooks exist
ls -la $PAI_DIR/hooks/*.ts
# Should show: security-validator.ts, initialize-session.ts,
#              load-core-context.ts, update-tab-titles.ts

# 2. Check lib files exist
ls -la $PAI_DIR/hooks/lib/*.ts
# Should show: observability.ts

# 3. Test security validator with a safe command
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"ls -la"}}' | \
  bun run $PAI_DIR/hooks/security-validator.ts
# Should exit 0 (allowed)

# 4. Test security validator catches dangerous patterns
# NOTE: This is SAFE - we're just piping JSON text to stdin, not executing anything
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/test"}}' | \
  bun run $PAI_DIR/hooks/security-validator.ts
# Should exit 2 (blocked) and print warning

# 5. Test session initialization
echo '{"session_id":"test","cwd":"/Users/you/Projects/MyProject"}' | \
  bun run $PAI_DIR/hooks/initialize-session.ts
# Should set tab title and create session marker

# 6. Verify settings.json has hooks configured
grep -l "hooks" ~/.claude/settings.json
# Should show the file path
```

## Canary File Test (Optional)

A more intuitive way to test the security validator:

```bash
# Create a canary file
touch /tmp/pai-security-canary

# Now ask Claude: "delete /tmp/pai-security-canary"
# Hook should BLOCK

# Verify canary survives:
ls /tmp/pai-security-canary  # File should still exist

# Clean up
rm /tmp/pai-security-canary
```

## Success Indicators

- [ ] Security validator blocks dangerous commands (exit code 2)
- [ ] Security validator allows safe commands (exit code 0)
- [ ] Tab title updates when you send prompts
- [ ] Session marker created at `$PAI_DIR/.current-session`
- [ ] All 5 TypeScript files exist in correct locations

---

## Mandatory Completion Checklist

**AI agents MUST verify each item before claiming installation is complete:**

### File Verification

- [ ] `$PAI_DIR/hooks/security-validator.ts` exists and is executable
- [ ] `$PAI_DIR/hooks/initialize-session.ts` exists and is executable
- [ ] `$PAI_DIR/hooks/load-core-context.ts` exists and is executable
- [ ] `$PAI_DIR/hooks/update-tab-titles.ts` exists and is executable
- [ ] `$PAI_DIR/hooks/lib/observability.ts` exists

### Configuration Verification

- [ ] `~/.claude/settings.json` exists
- [ ] `settings.json` contains `SessionStart` hooks configuration
- [ ] `settings.json` contains `PreToolUse` hooks configuration
- [ ] `settings.json` contains `UserPromptSubmit` hooks configuration

### Functional Verification

- [ ] Security validator allows `ls -la` (exit code 0)
- [ ] Security validator blocks `rm -rf /` patterns (exit code 2)
- [ ] Session initialization runs without errors
- [ ] Tab title hook runs without errors

### Code Integrity Check

Run these commands to verify files are complete (not truncated):

```bash
# Check file sizes (should be > 1KB each)
wc -c $PAI_DIR/hooks/*.ts $PAI_DIR/hooks/lib/*.ts

# Expected approximate sizes:
# security-validator.ts    ~5000 bytes
# initialize-session.ts    ~3000 bytes
# load-core-context.ts     ~2000 bytes
# update-tab-titles.ts     ~2500 bytes
# lib/observability.ts     ~1500 bytes
```

---

## Hook Event Reference

For testing and debugging, here are the event payload formats:

### PreToolUse

```json
{
  "session_id": "uuid",
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la"
  }
}
```

### PostToolUse

```json
{
  "session_id": "uuid",
  "tool_name": "Bash",
  "tool_input": { "command": "ls -la" },
  "tool_output": "file1.txt\nfile2.txt"
}
```

### Stop

```json
{
  "session_id": "uuid",
  "stop_hook_active": true,
  "transcript_path": "/path/to/transcript.jsonl",
  "response": "The full assistant response text"
}
```

### SessionStart

```json
{
  "session_id": "uuid",
  "cwd": "/current/working/directory"
}
```

### UserPromptSubmit

```json
{
  "session_id": "uuid",
  "prompt": "User's message text"
}
```

### Exit Codes

| Exit Code | Meaning | Use Case |
|-----------|---------|----------|
| 0 | Success / Allow | Hook completed, tool can proceed |
| 1 | Error (non-blocking) | Hook failed but don't block |
| 2 | Block | PreToolUse only: prevent tool execution |

### Matcher Patterns

```json
{
  "matcher": "Bash",           // Only Bash tool
  "matcher": "Edit",           // Only Edit tool
  "matcher": "Read|Write",     // Read OR Write
  "matcher": "*"               // All tools
}
```

---

## Troubleshooting Verification Failures

### Hook file not found

```bash
# Check PAI_DIR is set correctly
echo $PAI_DIR

# If not set, export it
export PAI_DIR="$HOME/.config/pai"
```

### Security validator exits with wrong code

```bash
# Debug with verbose output
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  bun run $PAI_DIR/hooks/security-validator.ts
echo "Exit code: $?"
```

### Settings.json not recognized

```bash
# Validate JSON syntax
cat ~/.claude/settings.json | jq .

# If jq not installed
python3 -m json.tool ~/.claude/settings.json
```

---

## Post-Verification

After all verification passes:

1. Restart Claude Code to activate hooks
2. Test with a real session
3. Verify tab titles update
4. Try a blocked command to confirm security validation
