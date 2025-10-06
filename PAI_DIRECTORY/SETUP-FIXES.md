# PAI Setup Fixes - Quick Reference

## Changes Made to Get System Running

### 1. Settings.json Symlink (CRITICAL)

**Issue:** Claude Code wasn't reading `PAI_DIRECTORY/settings.json`

**Fix:**
```bash
ln -sf ${PAI_DIR}/settings.json ~/.claude/settings.json
```

**Why:** Claude Code looks for settings in `~/.claude/settings.json`, not in the project directory.

---

### 2. Hook File Permissions

**Issue:** Hooks need execute permissions

**Fix:**
```bash
chmod +x ${PAI_DIR}/hooks/*.ts
```

**Verify:**
```bash
ls -la ${PAI_DIR}/hooks/
# All files should show -rwxr-xr-x
```

---

### 3. Debug Logging Added

**Location:** `~/Library/Logs/hook_debug.log`

**Added to:** `hooks/load-dynamic-requirements.ts`

**View logs:**
```bash
tail ~/Library/Logs/hook_debug.log
```

---

## Key Findings

### Exit Code 127 Meaning
- **Command not found**
- Common causes:
  - Missing `.ts` file extension
  - Wrong path to hook file
  - Hook not executable

### Hook Testing Syntax

**❌ Wrong:**
```bash
./user-prompt-submit-hook "test prompt"
```

**✅ Correct:**
```bash
echo '{"session_id":"test","prompt":"test prompt","transcript_path":"/tmp/test","hook_event_name":"UserPromptSubmit"}' | bun ${PAI_DIR}/hooks/user-prompt-submit-hook.ts
```

### Hook Input Format
All TypeScript hooks expect JSON via stdin:
```json
{
  "session_id": "string",
  "prompt": "string",
  "transcript_path": "string",
  "hook_event_name": "string"
}
```

---

## Verification Steps

After applying fixes, verify with:

```bash
# 1. Check symlink exists
ls -la ~/.claude/settings.json

# 2. Check hooks are executable
ls -la ${PAI_DIR}/hooks/*.ts

# 3. Test hook manually
echo '{"session_id":"test","prompt":"Plan something","transcript_path":"/tmp/test","hook_event_name":"UserPromptSubmit"}' | bun ${PAI_DIR}/hooks/load-dynamic-requirements.ts > /tmp/test-output.txt

# 4. Check debug log was created
tail ~/Library/Logs/hook_debug.log

# 5. Check hook output
head -20 /tmp/test-output.txt
```

Expected results:
- ✅ Symlink points to PAI settings
- ✅ All hooks show `-rwxr-xr-x` permissions
- ✅ Hook executes without errors
- ✅ Debug log shows hook execution
- ✅ Output shows markdown instructions with `**AGENT:**` directives

---

## Agent Selection System - How It Actually Works

**Status:** ✅ Working as Designed (Updated 2025-10-06)

### The Correct Flow

PAI uses **persona embodiment**, not Task tool invocation:

1. **User:** "Plan the implementation of X"
2. **Hook:** Outputs markdown with `**AGENT:** architect` directive
3. **Kai (Claude):** Reads the instructions and sees the agent directive
4. **Kai:** Uses Read tool to load `${PAI_DIR}/agents/architect.md`
5. **Kai:** Embodies the agent persona and responds AS that agent
6. **Result:** Response follows agent's format with `[AGENT:architect]` tag

### Key Understanding

**Agents are NOT separate processes.** Instead:
- Kai reads the agent markdown file directly
- Kai transforms into that agent's persona
- Context stays in the same session (no spawning)
- Agent personality, format, and voice ID are applied

### Available Agents

Located in `${PAI_DIR}/agents/`:
- `architect.md` - Atlas (Principal Software Architect)
- `researcher.md` - Research specialist
- `pentester.md` - Security testing specialist
- `designer.md` - UI/UX designer
- `engineer.md` - Software engineer

### Verification

Agent system is working when:
- ✅ Hook outputs markdown with `AGENT:` directives
- ✅ Kai reads the agent file from `${PAI_DIR}/agents/`
- ✅ Response includes `[AGENT:name]` tag in COMPLETED line
- ✅ Agent's voice ID is used for notifications

---

## Quick Setup Script

Save this as `${PAI_DIR}/verify-setup.sh`:

```bash
#!/bin/bash
echo "🔍 PAI Setup Verification"
echo ""

# PAI_DIR
[ -z "$PAI_DIR" ] && echo "❌ PAI_DIR not set" || echo "✅ PAI_DIR: $PAI_DIR"

# Symlink
[ -L ~/.claude/settings.json ] && echo "✅ Settings symlink exists" || echo "❌ Settings symlink missing"

# Hooks executable
echo "📋 Checking hook permissions..."
for hook in ${PAI_DIR}/hooks/*.ts; do
    if [ -x "$hook" ]; then
        echo "✅ $(basename $hook)"
    else
        echo "❌ $(basename $hook) - not executable"
    fi
done

# Bun
command -v bun &> /dev/null && echo "✅ Bun installed" || echo "❌ Bun not found"

echo ""
echo "Run: chmod +x ${PAI_DIR}/verify-setup.sh"
echo "Then: ${PAI_DIR}/verify-setup.sh"
```

---

## For GitHub Documentation

### Summary for README or Issues

When documenting these fixes for GitHub:

**Title:** Setup Requirements and Common Issues

**Essential Changes:**
1. **Symlink settings.json** to `~/.claude/settings.json`
2. **Make hooks executable** with `chmod +x hooks/*.ts`
3. **Set PAI_DIR** environment variable

**Common Pitfalls:**
- Hook testing requires JSON via stdin, not command arguments
- File extensions (.ts) are required when testing hooks
- Exit code 127 = command not found (wrong path or permissions)

**Verification:**
- Check `~/Library/Logs/hook_debug.log` after submitting prompts
- Hook should show successful execution with markdown output

---

## Additional Notes

### Why user-prompt-submit-hook.ts Shows Exit Code 0 But Does Nothing

The TypeScript hook at `hooks/user-prompt-submit-hook.ts` has all functionality commented out (lines 263-286). It executes successfully (exit 0) but performs no actions. This is intentional - voice greetings were disabled.

The active hook for dynamic context and agent loading is `load-dynamic-requirements.ts`, which:
- ✅ Reads `commands/load-dynamic-requirements.md`
- ✅ Outputs markdown instructions to stdout
- ✅ Includes `**AGENT:** [name]` directives
- ✅ Provides explicit instructions for agent embodiment
- ✅ Agent loading works via persona embodiment (not Task tool)

---

## Voice Configuration Changes

**Date:** 2025-10-06
**Status:** ✅ Completed

### Issue
Voice system had multiple configuration issues:
1. Voice speeds were too fast (1.3-1.35x / 228-236 WPM)
2. Voices were hardcoded in multiple hook files
3. Session startup used old ElevenLabs voice ID (caused female voice instead of male Jamie)
4. System didn't follow DRY principle - voices configured in 3 different places

### Changes Made

#### 1. Centralized Voice Configuration
**All hooks now load from:** `${PAI_DIR}/voice-server/voices.json`

**Files updated:**
- `hooks/stop-hook.ts` - Fixed path from iCloud to `${PAI_DIR}/voice-server/voices.json`
- `hooks/session-start-hook.ts` - Removed hardcoded voice, now loads from voices.json
- `hooks/subagent-stop-hook.ts` - Removed hardcoded AGENT_VOICE_IDS, now loads from voices.json

#### 2. Voice Speed Adjustment
Set all voices to 1.2x speed (210 WPM) for comfortable, efficient pace:

```json
{
  "default_rate": 175,
  "voices": {
    "kai": {
      "voice_name": "Jamie (Premium)",
      "rate_multiplier": 1.2,
      "rate_wpm": 210
    }
    // ... all other voices also at 1.2x / 210 WPM
  }
}
```

**Previous speeds:**
- Kai: 263 WPM (1.5x) - too fast
- Agents: 236 WPM (1.35x) - too fast

**New speed:**
- All voices: 210 WPM (1.2x) - comfortable middle ground

#### 3. Fixed Voice Gender Mismatch
**Problem:** Session startup used ElevenLabs voice ID that no longer works, causing wrong voice

**Solution:** Updated `session-start-hook.ts` to load Jamie (Premium) from voices.json

**Result:** Startup voice is now correctly male (Jamie) matching Kai's main voice

### Benefits

✅ **Single Source of Truth** - Edit one file (`voices.json`) to change all voices
✅ **Easy Customization** - Users can modify voice preferences in one place
✅ **Consistent Speed** - All voices speak at same comfortable pace
✅ **Correct Gender** - Kai's voice is male (Jamie) at both startup and completion
✅ **Maintainable** - No more hunting through 3 files to change voice settings
✅ **No ElevenLabs Dependency** - System uses macOS native voices only

### How to Customize Voices

To change voice speed or voices used:

1. **Edit one file:**
   ```bash
   nano ${PAI_DIR}/voice-server/voices.json
   ```

2. **Adjust rate_multiplier and rate_wpm:**
   ```json
   "kai": {
     "rate_multiplier": 1.2,  // Change this (1.0 = normal, 1.2 = slightly faster)
     "rate_wpm": 210          // Or change WPM directly
   }
   ```

3. **Save file** - Changes take effect on next completion (no restart needed)

### Voice Configuration Reference

Current voices (all at 210 WPM / 1.2x):

| Agent | Voice | Type | Accent | Gender |
|-------|-------|------|--------|--------|
| Kai | Jamie (Premium) | Premium | UK | Male |
| Architect | Serena (Premium) | Premium | UK | Female |
| Researcher | Ava (Premium) | Premium | US | Female |
| Engineer | Tom (Enhanced) | Enhanced | US | Male |
| Designer | Isha (Premium) | Premium | Indian | Female |
| Pentester | Oliver (Enhanced) | Enhanced | UK | Male |
| Writer | Samantha (Enhanced) | Enhanced | US | Female |

---

## Claude Sonnet 4.5 Context Loading Fix

**Date:** 2025-10-06
**Status:** ✅ Refactored for Claude Sonnet 4.5

### Issue: Agent Loading Stopped Working

**Root Cause:** Claude Sonnet 4.5 changed how it interprets instructions:
- Old behavior: Followed literal "MUST" and "ALWAYS" commands
- New behavior: Contextually evaluates whether following instructions serves the user's goal
- Result: Agent loading directives were being ignored because Sonnet 4.5 decided it could serve the user's goal without loading specialized agents

**Symptom:**
- User requests architecture work
- Hook properly outputs `**AGENT:** architect` directive
- Claude sees the directive but skips loading
- Reasoning: "I can provide architecture documentation without needing to load a special file"
- Output lacks agent-specific format, voice ID, and specialized expertise

### Changes Made

#### 1. Refactored `commands/load-dynamic-requirements.md`

**Old Approach (Drill Sergeant):**
```markdown
🚨🚨🚨 YOU MUST IMMEDIATELY READ THE AGENT FILE 🚨🚨🚨
**AGENT:** architect
```

**New Approach (Systems Designer):**
```markdown
## Category 1: Architecture & System Design

**Decision Tree:**

1. **Is this an architecture/design task?** → YES
   - User asked you to plan or design something
   - They want specifications, not just implementation

2. **Do you have architect agent context loaded?** → Check your current state
   - **IF NO:** You're missing critical context

3. **Why loading the architect agent serves the user's goal:**
   - User expects Atlas (Principal Software Architect) with 15+ years of experience
   - Standard responses lack: comprehensive PRD structure, detailed checklists, risk analysis
   - Atlas provides: systematic feature breakdown, implementation sequences, dependency mapping
   - Voice system expects: Serena voice + [AGENT:architect] tag for proper notifications

4. **Required Action:**
```bash
read ${PAI_DIR}/agents/architect.md
```
```

#### 2. Key Refactoring Principles

Following [The Agent Architect's guidance](https://theagentarchitect.substack.com/p/claude-sonnet-4-prompts-stopped-working):

**✅ DO:**
- Use IF-THEN-BECAUSE logic instead of MUST/ALWAYS commands
- Explain WHY context loading serves the user's goal
- Provide decision trees with clear rationale
- Include escape hatches for edge cases ("skip the agent")
- Add explicit state verification checklists
- Give Sonnet 4.5 decision frameworks, not absolute orders

**❌ DON'T:**
- Use aggressive emoji-laden commands
- Assume literal instruction following
- Skip rationale for why actions matter
- Ignore contextual reasoning
- Use "drill sergeant" style prompting

#### 3. Structural Changes

**Added to load-dynamic-requirements.md:**

1. **Decision Trees for Each Category** - Explicit logic flow explaining:
   - When to load an agent
   - Why it serves the user's goal
   - What's missing without it
   - How to verify you have the right context

2. **State Verification Protocol** - Checklist before responding:
   - Base context loaded?
   - Agent context needed?
   - Domain context needed?
   - Output format correct?

3. **Escape Hatches** - User can override:
   - "Skip the agent" → Proceed without loading
   - "Just give me a quick answer" → Use general knowledge
   - Explicit acknowledgment of quality implications

4. **Decision Summary Table** - Quick reference:
   - Request type → Agent needed → Why it matters

5. **Final Decision Framework** - 5 questions to ask before responding:
   - What does user ACTUALLY want?
   - What context/expertise do I need?
   - Do I have that context?
   - What's the expected output format?
   - Am I set up to deliver what they expect?

#### 4. What Changed for Each Category

**Architecture & System Design:**
- Explains user expects "Atlas the Principal Software Architect"
- Details what's missing without agent: PRD structure, checklists, risk analysis
- Specifies voice system requirements: Serena voice + [AGENT:architect] tag

**Research:**
- Explains systematic research methodology expectation
- Details: multi-source investigation, source verification, depth

**Security Testing:**
- Explains professional pentesting methodology expectation
- Details: systematic vuln scanning, risk ratings, remediation steps

**Engineering:**
- Explains production-ready code expectation
- Details: test coverage, error handling, best practices

**Design:**
- Explains professional UI/UX evaluation expectation
- Details: visual hierarchy analysis, accessibility checks, iterative testing

**Conversational:**
- Explains when NOT to load an agent
- Why over-structure hurts conversational flow
- User wants relationship-oriented, not task-oriented

### Benefits of New Approach

✅ **Works with Sonnet 4.5's contextual reasoning** - Doesn't fight the model, works with it
✅ **Self-documenting** - Clear decision logic visible to both AI and humans
✅ **Flexible** - Escape hatches for edge cases
✅ **Educational** - Explains the "why" for future refinement
✅ **Maintainable** - Logic-based instead of emotion-based (fewer emojis to update)
✅ **Robust** - Explicit state verification prevents context gaps

### Testing the Fix

**Test Scenario 1: Architecture Request**
```
User: "Plan the implementation of a REST API service"
Expected: Loads architect agent, embodies Atlas, uses PRD format
```

**Test Scenario 2: Quick Question**
```
User: "Quick question - what's 2+2?"
Expected: Answers directly without loading any agents (conversational mode)
```

**Test Scenario 3: Explicit Override**
```
User: "Plan this feature but skip the agent"
Expected: Acknowledges using general knowledge, warns about quality, proceeds
```

### How to Customize

To adjust agent loading logic:

1. **Edit decision trees** in `commands/load-dynamic-requirements.md`
2. **Add new categories** using the template structure
3. **Adjust escape hatches** to change override behavior
4. **Modify state verification checklist** to add new requirements

### Why This Works

**The key insight:** Claude Sonnet 4.5 is smarter about contextual reasoning. Instead of fighting this with louder commands, we:
- Provide clear decision logic
- Explain why each action serves the user's goal
- Trust the model to reason about what's needed
- Give frameworks instead of orders

**Result:** The model understands WHY it should load context and WHEN, making the right decisions based on user goals rather than blind compliance.

### References

- Blog post: [Claude Sonnet 4 Prompts Stopped Working](https://theagentarchitect.substack.com/p/claude-sonnet-4-prompts-stopped-working)
- Key quote: "Think like a systems designer, not a drill sergeant"
- Principle: "Replace absolute commands with conditional logic"

---

*Created: 2025-10-06*
*Last Updated: 2025-10-06 (Sonnet 4.5 Context Loading Fix)*
*For full troubleshooting guide, see: [TROUBLESHOOTING.md](./documentation/TROUBLESHOOTING.md)*
