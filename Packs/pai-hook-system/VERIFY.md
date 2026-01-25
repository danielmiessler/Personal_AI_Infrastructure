# Verification Guide: PAI Hook System v2.3.0

## Quick Verification

Run these commands to verify the installation:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# 1. Check all hooks exist (15 expected)
echo "Hook files:"
ls -la $PAI_DIR/hooks/*.hook.ts | wc -l
# Should show: 15

# 2. Check lib files exist (12 expected)
echo "Library files:"
ls -la $PAI_DIR/hooks/lib/*.ts | wc -l
# Should show: 12

# 3. Check handler files exist (4 expected)
echo "Handler files:"
ls -la $PAI_DIR/hooks/handlers/*.ts | wc -l
# Should show: 4

# 4. Test security validator with a safe command
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"ls -la"}}' | \
  bun run $PAI_DIR/hooks/SecurityValidator.hook.ts
# Should exit 0 (allowed)

# 5. Test security validator catches dangerous patterns
# NOTE: This is SAFE - we're just piping JSON text to stdin, not executing anything
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/test"}}' | \
  bun run $PAI_DIR/hooks/SecurityValidator.hook.ts
# Should exit 2 (blocked) and print warning

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

- [ ] 15 hook files exist in $PAI_DIR/hooks/
- [ ] 12 library files exist in $PAI_DIR/hooks/lib/
- [ ] 4 handler files exist in $PAI_DIR/hooks/handlers/
- [ ] Security validator blocks dangerous commands (exit code 2)
- [ ] Security validator allows safe commands (exit code 0)
- [ ] Tab title updates when you send prompts
- [ ] All TypeScript files exist in correct locations

---

## Mandatory Completion Checklist

**AI agents MUST verify each item before claiming installation is complete:**

### File Verification

#### Hooks (15 files)
- [ ] `$PAI_DIR/hooks/SecurityValidator.hook.ts` exists
- [ ] `$PAI_DIR/hooks/LoadContext.hook.ts` exists
- [ ] `$PAI_DIR/hooks/StartupGreeting.hook.ts` exists
- [ ] `$PAI_DIR/hooks/CheckVersion.hook.ts` exists
- [ ] `$PAI_DIR/hooks/UpdateTabTitle.hook.ts` exists
- [ ] `$PAI_DIR/hooks/SetQuestionTab.hook.ts` exists
- [ ] `$PAI_DIR/hooks/ExplicitRatingCapture.hook.ts` exists
- [ ] `$PAI_DIR/hooks/FormatEnforcer.hook.ts` exists
- [ ] `$PAI_DIR/hooks/StopOrchestrator.hook.ts` exists
- [ ] `$PAI_DIR/hooks/SessionSummary.hook.ts` exists
- [ ] `$PAI_DIR/hooks/QuestionAnswered.hook.ts` exists
- [ ] `$PAI_DIR/hooks/AutoWorkCreation.hook.ts` exists
- [ ] `$PAI_DIR/hooks/WorkCompletionLearning.hook.ts` exists
- [ ] `$PAI_DIR/hooks/ImplicitSentimentCapture.hook.ts` exists
- [ ] `$PAI_DIR/hooks/AgentOutputCapture.hook.ts` exists

#### Libraries (12 files)
- [ ] `$PAI_DIR/hooks/lib/observability.ts` exists
- [ ] `$PAI_DIR/hooks/lib/notifications.ts` exists
- [ ] `$PAI_DIR/hooks/lib/identity.ts` exists
- [ ] `$PAI_DIR/hooks/lib/paths.ts` exists
- [ ] `$PAI_DIR/hooks/lib/time.ts` exists
- [ ] `$PAI_DIR/hooks/lib/change-detection.ts` exists
- [ ] `$PAI_DIR/hooks/lib/learning-utils.ts` exists
- [ ] `$PAI_DIR/hooks/lib/metadata-extraction.ts` exists
- [ ] `$PAI_DIR/hooks/lib/recovery-types.ts` exists
- [ ] `$PAI_DIR/hooks/lib/response-format.ts` exists
- [ ] `$PAI_DIR/hooks/lib/IdealState.ts` exists
- [ ] `$PAI_DIR/hooks/lib/TraceEmitter.ts` exists

#### Handlers (4 files)
- [ ] `$PAI_DIR/hooks/handlers/capture.ts` exists
- [ ] `$PAI_DIR/hooks/handlers/voice.ts` exists
- [ ] `$PAI_DIR/hooks/handlers/tab-state.ts` exists
- [ ] `$PAI_DIR/hooks/handlers/SystemIntegrity.ts` exists

### Configuration Verification

- [ ] `~/.claude/settings.json` exists
- [ ] `settings.json` contains `SessionStart` hooks configuration
- [ ] `settings.json` contains `PreToolUse` hooks configuration
- [ ] `settings.json` contains `UserPromptSubmit` hooks configuration
- [ ] `settings.json` contains `Stop` hooks configuration
- [ ] `settings.json` contains `SubagentStop` hooks configuration

### Functional Verification

- [ ] Security validator allows `ls -la` (exit code 0)
- [ ] Security validator blocks `rm -rf /` patterns (exit code 2)
- [ ] LoadContext hook runs without errors
- [ ] Tab title hook runs without errors

### Code Integrity Check

Run these commands to verify files are complete (not truncated):

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check total file count
echo "Total files:"
find $PAI_DIR/hooks -name "*.ts" | wc -l
# Expected: 31 (15 hooks + 12 libs + 4 handlers)

# Check file sizes (should be > 1KB each for most files)
echo ""
echo "File sizes:"
wc -c $PAI_DIR/hooks/*.hook.ts | tail -1
wc -c $PAI_DIR/hooks/lib/*.ts | tail -1
wc -c $PAI_DIR/hooks/handlers/*.ts | tail -1

# Expected approximate totals:
# hooks/*.hook.ts     ~120KB total
# lib/*.ts            ~90KB total
# handlers/*.ts       ~20KB total
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

### SubagentStop

```json
{
  "session_id": "uuid",
  "agent_name": "engineer",
  "transcript_path": "/path/to/transcript.jsonl",
  "response": "The agent's response text"
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
export PAI_DIR="$HOME/.claude"
```

### Security validator exits with wrong code

```bash
# Debug with verbose output
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  bun run $PAI_DIR/hooks/SecurityValidator.hook.ts
echo "Exit code: $?"
```

### Settings.json not recognized

```bash
# Validate JSON syntax
cat ~/.claude/settings.json | jq .

# If jq not installed
python3 -m json.tool ~/.claude/settings.json
```

### Missing library dependencies

```bash
# Check all lib files are present
ls -la $PAI_DIR/hooks/lib/

# Verify specific imports work
bun run -e "import { emitEvent } from '$PAI_DIR/hooks/lib/observability.ts'; console.log('OK')"
```

---

## Post-Verification

After all verification passes:

1. Restart Claude Code to activate hooks
2. Test with a real session
3. Verify tab titles update
4. Try a blocked command to confirm security validation
5. Check learning hooks capture data (if enabled)

---

## Version Information

- **Pack Version:** 2.3.0
- **Release Date:** 2026-01-14
- **Hook Count:** 15
- **Library Count:** 12
- **Handler Count:** 4
- **Total Files:** 31
