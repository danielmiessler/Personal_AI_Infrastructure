# PAI System Troubleshooting Guide

## Issues Found During Initial Setup

This document tracks issues discovered during PAI system setup and their solutions.

---

## 1. Hook System Not Executing

### Issue
The UserPromptSubmit hook (`load-dynamic-requirements.ts`) was not being triggered when submitting prompts to Claude Code, preventing automatic agent selection.

### Root Cause
Claude Code expects `settings.json` to be in one of these locations:
- `.claude/settings.json` (project-specific)
- `~/.claude/settings.json` (global user settings)

The PAI `settings.json` was in `/path/to/PAI_DIRECTORY/settings.json` which Claude Code doesn't check.

### Solution
Create a symlink from the standard location to the PAI settings file:

```bash
# Create .claude directory if it doesn't exist
mkdir -p ~/.claude

# Create symlink to PAI settings
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json

# Verify symlink
ls -la ~/.claude/settings.json
```

### Verification
After creating the symlink:
1. Submit a new prompt to Claude Code
2. Check hook execution: `tail ~/Library/Logs/hook_debug.log`
3. You should see log entries showing the hook executed

---

## 2. Hook File Permissions

### Issue
Hook files may not have execute permissions, causing them to fail silently.

### Root Cause
Git doesn't always preserve execute permissions when cloning repositories.

### Solution
Ensure all hook files are executable:

```bash
chmod +x ${PAI_DIR}/hooks/*.ts
chmod +x ${PAI_DIR}/hooks/*.sh  # if you have bash hooks
```

### Verification
Check permissions:
```bash
ls -la ${PAI_DIR}/hooks/
```

All hook files should show `-rwxr-xr-x` (executable).

---

## 3. Hook Testing Issues

### Issue
Testing hooks with incorrect syntax results in "command not found" (exit code 127).

### Common Mistakes

#### ❌ Wrong: Missing file extension
```bash
./hooks/user-prompt-submit-hook "test"
```

#### ❌ Wrong: Command line arguments instead of JSON
```bash
./hooks/user-prompt-submit-hook.ts "test prompt"
```

#### ❌ Wrong: Wrong directory
```bash
cd hooks
./load-dynamic-requirements.ts  # stdin hangs waiting for input
```

### Correct Hook Testing

#### ✅ Correct: With JSON via stdin
```bash
echo '{"session_id":"test","prompt":"Plan the implementation","transcript_path":"/tmp/test","hook_event_name":"UserPromptSubmit"}' | bun ${PAI_DIR}/hooks/load-dynamic-requirements.ts
```

### Hook Input Requirements

All TypeScript hooks expect JSON input via **stdin** with this structure:

```json
{
  "session_id": "unique-session-id",
  "prompt": "user prompt text",
  "transcript_path": "/path/to/transcript",
  "hook_event_name": "UserPromptSubmit"
}
```

---

## 4. Agent Selection and Embodiment

### How Agent Selection Actually Works

The PAI agent system uses **persona embodiment**, not Task tool invocation. Here's the correct flow:

1. **User submits prompt**: "Plan the implementation of a REST API"
2. **UserPromptSubmit hook fires**: `load-dynamic-requirements.ts` executes
3. **Hook outputs instructions**: Markdown with `**AGENT:** architect` directive
4. **Claude (Kai) reads instructions**: Sees the agent directive in the markdown
5. **Kai reads agent file**: Uses Read tool to load `${PAI_DIR}/agents/architect.md`
6. **Kai embodies agent**: Transforms into the agent persona by:
   - Following the agent's instructions and methodologies
   - Using the agent's communication style and personality
   - Applying the agent's output format requirements
   - Including the `[AGENT:architect]` tag in responses
   - Using the agent's voice ID for notifications

### Critical Understanding

**Agent loading is NOT done via Claude Code's Task tool.** Instead:
- Kai reads the agent markdown file directly
- Kai then responds AS that agent
- This keeps context within the same session
- No separate subagent process is spawned

### Available Agents

Located in `${PAI_DIR}/agents/`:
- `architect.md` - Atlas, Principal Software Architect (PRDs, system design)
- `researcher.md` - Research specialist (information gathering)
- `pentester.md` - Security testing specialist (vulnerability assessment)
- `designer.md` - UI/UX designer (visual design, browser testing)
- `engineer.md` - Software engineer (implementation, coding)

### Verification

Agent system is working when:
- ✅ Hook executes and outputs markdown with `AGENT:` directives
- ✅ Kai reads the appropriate agent file from `${PAI_DIR}/agents/`
- ✅ Kai's response follows the agent's format (includes `[AGENT:name]` tag)
- ✅ Voice notifications use the agent's specific voice ID

### Troubleshooting Agent Loading

If agents aren't being loaded:
1. Check that `${PAI_DIR}/agents/` directory exists with agent .md files
2. Verify hook is outputting the full markdown instructions
3. Look for the "HOW TO LOAD AGENTS" section in hook output
4. Ensure Kai reads the agent file (check for Read tool usage)
5. Confirm response includes the `[AGENT:name]` tag in COMPLETED line

---

## 5. Debug Logging

### Enabling Debug Logging

Hook debug logging has been added to `load-dynamic-requirements.ts` and writes to:
```
~/Library/Logs/hook_debug.log
```

### Viewing Debug Logs

```bash
# View recent hook activity
tail ~/Library/Logs/hook_debug.log

# Follow logs in real-time
tail -f ~/Library/Logs/hook_debug.log

# View all hook logs
cat ~/Library/Logs/hook_debug.log
```

### Debug Log Contents

Successful execution shows:
```
[2025-10-05T22:48:15.745Z] [load-dynamic-requirements] Hook started
[2025-10-05T22:48:15.750Z] [load-dynamic-requirements] Received input: {"session_id":"...
[2025-10-05T22:48:15.750Z] [load-dynamic-requirements] Parsed prompt: Test prompt
[2025-10-05T22:48:15.751Z] [load-dynamic-requirements] Reading markdown from: /Users/.../commands/load-dynamic-requirements.md
[2025-10-05T22:48:15.751Z] [load-dynamic-requirements] Markdown file read successfully, length: 12635 chars
[2025-10-05T22:48:15.751Z] [load-dynamic-requirements] Hook completed successfully, markdown output to stdout
```

### If Debug Log is Empty

If `hook_debug.log` doesn't exist or is empty:
1. Hook is not executing at all
2. Check settings.json symlink (issue #1)
3. Verify PAI_DIR environment variable is set
4. Check Claude Code is reading the correct settings file

---

## Common Debugging Commands

### Check PAI Environment
```bash
# Verify PAI_DIR is set
echo $PAI_DIR

# Should output: /Users/andreas/Documents/src/PAI/PAI_DIRECTORY (or your path)
```

### Check Hook Configuration
```bash
# View UserPromptSubmit hook configuration
cat ~/.claude/settings.json | jq '.hooks.UserPromptSubmit'

# Verify it points to load-dynamic-requirements.ts
```

### Test Hook Manually
```bash
# Test the dynamic requirements loader
echo '{"session_id":"manual-test","prompt":"Plan the implementation of a REST API","transcript_path":"/tmp/test","hook_event_name":"UserPromptSubmit"}' | bun ${PAI_DIR}/hooks/load-dynamic-requirements.ts > /tmp/hook-output.txt

# Check output
head -30 /tmp/hook-output.txt

# Check debug log
tail ~/Library/Logs/hook_debug.log
```

### Check All Hook Permissions
```bash
ls -la ${PAI_DIR}/hooks/
```

All `.ts` files should show `-rwxr-xr-x`.

### Validate Settings JSON
```bash
# Check JSON syntax is valid
cat ${PAI_DIR}/settings.json | jq '.' > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
```

---

## Setup Checklist

Use this checklist to verify PAI is correctly configured:

- [ ] PAI_DIR environment variable is set and exported
- [ ] `~/.claude/settings.json` symlink exists and points to `${PAI_DIR}/settings.json`
- [ ] All hook files in `${PAI_DIR}/hooks/` are executable (`chmod +x`)
- [ ] Bun runtime is installed and accessible (`bun --version`)
- [ ] `${PAI_DIR}/commands/load-dynamic-requirements.md` exists
- [ ] `${PAI_DIR}/context/CLAUDE.md` exists
- [ ] Hook debug log directory exists (`mkdir -p ~/Library/Logs`)

### Quick Setup Script

```bash
#!/bin/bash
# PAI Quick Setup Verification

echo "🔍 Checking PAI Setup..."

# Check PAI_DIR
if [ -z "$PAI_DIR" ]; then
    echo "❌ PAI_DIR not set"
    echo "   Add to ~/.zshrc or ~/.bashrc:"
    echo "   export PAI_DIR=\"/path/to/PAI/PAI_DIRECTORY\""
else
    echo "✅ PAI_DIR: $PAI_DIR"
fi

# Check symlink
if [ -L ~/.claude/settings.json ]; then
    echo "✅ Settings symlink exists"
else
    echo "❌ Settings symlink missing"
    echo "   Run: ln -sf \${PAI_DIR}/settings.json ~/.claude/settings.json"
fi

# Check hook permissions
echo "📋 Hook permissions:"
ls -la ${PAI_DIR}/hooks/*.ts | awk '{print $1, $9}'

# Check Bun
if command -v bun &> /dev/null; then
    echo "✅ Bun installed: $(bun --version)"
else
    echo "❌ Bun not installed"
fi

# Check critical files
for file in "commands/load-dynamic-requirements.md" "context/CLAUDE.md"; do
    if [ -f "${PAI_DIR}/${file}" ]; then
        echo "✅ ${file}"
    else
        echo "❌ ${file} missing"
    fi
done

echo ""
echo "🔧 Fix issues above, then test with:"
echo "   Submit a prompt to Claude Code and check: tail ~/Library/Logs/hook_debug.log"
```

---

## Additional Resources

- [Hook System Documentation](./hook-system.md)
- [Agent System Documentation](./agent-system.md)
- [UFC Context System](./ufc-context-system.md)
- [Quick Start Guide](./quick-start.md)

---

## Reporting Issues

If you encounter issues not covered here:

1. **Collect Debug Information**:
   ```bash
   echo "PAI_DIR: $PAI_DIR"
   ls -la ~/.claude/settings.json
   ls -la ${PAI_DIR}/hooks/
   tail ~/Library/Logs/hook_debug.log
   cat ~/.claude/settings.json | jq '.hooks'
   ```

2. **Create GitHub Issue** with:
   - Description of the problem
   - Expected behavior
   - Debug information collected above
   - Steps to reproduce

---

## 6. Voice Configuration Issues

### Problem: Voices Speaking Too Fast

**Symptoms:**
- Voice notifications sound rushed
- Difficult to understand what's being said
- Different speeds between startup and completion

**Root Cause:**
Voice speeds were set too high (1.3-1.35x / 228-236 WPM)

**Solution:**
Adjust speeds in `${PAI_DIR}/voice-server/voices.json`:

```json
{
  "voices": {
    "kai": {
      "voice_name": "Jamie (Premium)",
      "rate_multiplier": 1.2,  // Adjust this value
      "rate_wpm": 210          // Or adjust WPM directly
    }
  }
}
```

**Recommended speeds:**
- 1.0x (175 WPM) - Natural conversational pace
- 1.2x (210 WPM) - Slightly faster, still comfortable ✅ Current setting
- 1.3x (228 WPM) - Noticeably faster, may feel rushed

### Problem: Wrong Voice Gender or Type

**Symptoms:**
- Startup voice is female instead of male (or vice versa)
- Different voice at startup vs completion
- Voice doesn't match expected agent personality

**Root Cause:**
Hooks were using hardcoded voice IDs or outdated configuration

**Solution - Verify Central Configuration:**

All hooks now load from one source: `${PAI_DIR}/voice-server/voices.json`

Check current configuration:
```bash
cat ${PAI_DIR}/voice-server/voices.json | jq '.voices'
```

**Files that load from voices.json:**
1. `hooks/stop-hook.ts` - Completion notifications
2. `hooks/session-start-hook.ts` - Startup greeting
3. `hooks/subagent-stop-hook.ts` - Agent completions

### Problem: Voice Configuration Not Taking Effect

**Symptoms:**
- Changed voices.json but still hearing old voices
- Inconsistent voices across different hooks

**Diagnosis:**
```bash
# Check if voices.json exists
ls -la ${PAI_DIR}/voice-server/voices.json

# Check hooks are loading it
grep "voices.json" ${PAI_DIR}/hooks/stop-hook.ts
grep "voices.json" ${PAI_DIR}/hooks/session-start-hook.ts
grep "voices.json" ${PAI_DIR}/hooks/subagent-stop-hook.ts
```

**Solution:**
1. Verify `${PAI_DIR}` environment variable is set correctly:
   ```bash
   echo $PAI_DIR
   ```

2. Check voices.json is valid JSON:
   ```bash
   cat ${PAI_DIR}/voice-server/voices.json | jq '.'
   ```

3. Changes take effect immediately on next completion (no restart needed)

### Voice Configuration Best Practices

**DO:**
- ✅ Edit only `${PAI_DIR}/voice-server/voices.json`
- ✅ Keep all voices at the same speed for consistency
- ✅ Use Premium or Enhanced voices (not legacy compact voices)
- ✅ Test voice changes with: `say -v "Jamie (Premium)" "test"`

**DON'T:**
- ❌ Don't hardcode voices in hook files
- ❌ Don't edit multiple files to change voices
- ❌ Don't use legacy/compact voices (they sound robotic)
- ❌ Don't set speeds above 1.35x (too fast to understand)

### Voice System Architecture

```
┌─────────────────────────────────────┐
│   voices.json (Single Source)       │
│   - Voice names                     │
│   - Speed settings                  │
│   - All agent configurations        │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
       ▼       ▼       ▼
   stop-hook  session  subagent
              -start   -stop

All hooks load from same config file
```

### Customizing Voices

**To change voice speed:**
```bash
# Edit voices.json
nano ${PAI_DIR}/voice-server/voices.json

# Change rate_multiplier for all voices
# 1.0 = normal, 1.2 = slightly faster, 1.5 = very fast
```

**To change which voice is used:**
```bash
# List available voices
say -v '?' | grep "Premium\|Enhanced"

# Update voices.json with your preferred voice
"kai": {
  "voice_name": "Oliver (Enhanced)",  # Changed from Jamie
  "rate_multiplier": 1.2,
  "rate_wpm": 210
}
```

**To test a voice:**
```bash
# Test directly with macOS say command
say -v "Jamie (Premium)" "This is a test message"
say -v "Serena (Premium)" "Testing architect voice"
```

---

*Last Updated: 2025-10-06 (Voice Configuration Added)*
*Version: 1.1.0*
