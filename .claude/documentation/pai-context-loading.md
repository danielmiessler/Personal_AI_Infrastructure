# PAI Context Loading System

## Overview

The PAI context loading system automatically injects your personal AI context from the `skills/CORE/SKILL.md` file into every Claude Code session at startup. This ensures your AI has immediate access to your preferences, contacts, security guidelines, and custom instructions without requiring manual skill activation.

## How It Works

PAI uses a **two-hook session initialization system**:

### 1. Context Loading (`load-core-context.ts`)
**Runs FIRST** - Loads your PAI skill context into the session

- Reads `~/.claude/skills/CORE/SKILL.md`
- Injects content as a `<system-reminder>` into Claude's context
- Makes your complete PAI configuration immediately available
- Skips execution for subagent sessions (they don't need PAI context)

### 2. Session Initialization (`initialize-pai-session.ts`)
**Runs SECOND** - Sets up your session environment

- Tests stop-hook configuration
- Sets terminal tab title (e.g., "Kai Ready")
- Sends voice notification if voice server is running
- Skips for subagent sessions

## Architecture Benefits

### Automatic Context Loading
Before this system, you had to manually activate the PAI skill in each session. Now your AI has your complete context from the first message.

### Modular Design
Separating context loading from session setup provides:
- **Easier maintenance** - Each hook has a single responsibility
- **Better debugging** - Issues with context vs session setup are isolated
- **Flexibility** - You can disable voice notifications while keeping context loading

### Subagent Awareness
Both hooks detect subagent sessions and skip unnecessary operations:
- Subagents don't need PAI context (they have their own specialized instructions)
- Subagents don't need voice notifications or tab title updates
- Reduces overhead and prevents duplicate notifications

## Configuration

### Settings.json

The hooks are configured in your `settings.json` SessionStart section:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/load-core-context.ts"
          },
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/initialize-pai-session.ts"
          }
        ]
      }
    ]
  }
}
```

**Order matters!** `load-core-context.ts` must run before `initialize-pai-session.ts`.

### Environment Variables

Set these in your `settings.json` `env` section:

```json
{
  "env": {
    "DA": "Kai",                    // Your AI's name (used in tab titles and notifications)
    "DA_VOICE_ID": "your-voice-id", // ElevenLabs voice ID (optional, for voice notifications)
    "PAI_DIR": "$HOME/.claude"      // Path to your PAI directory
  }
}
```

## File Structure

```
~/.claude/
├── skills/
│   └── PAI/
│       └── SKILL.md              ← Your customized PAI context
├── hooks/
│   ├── load-core-context.ts      ← Context loading hook
│   └── initialize-pai-session.ts ← Session initialization hook
└── settings.json                 ← Hook configuration
```

## Customizing Your PAI Context

### Edit skills/CORE/SKILL.md

This file contains your complete AI context. Customize these sections:

1. **Core Identity**
   - AI name and personality
   - Operating environment preferences

2. **Stack Preferences**
   - Preferred languages (TypeScript, Python, etc.)
   - Package managers (bun, npm, uv, pip)
   - Frameworks and tools

3. **Response Format**
   - How you want responses structured
   - Use emojis or plain text
   - Verbosity level

4. **Key Contacts**
   - People you reference frequently
   - Email addresses for quick lookup

5. **Security Guidelines**
   - Repository safety rules
   - Sensitive file patterns to avoid
   - Infrastructure caution

6. **Social Media Accounts**
   - Your online presence
   - Account handles and URLs

7. **Voice IDs** (Optional)
   - ElevenLabs voice assignments for agents
   - Only needed if using voice system

### Template Files

The `skills/CORE/` directory includes template files for organization:
- `contacts.md` - Contact list template
- `preferences.md` - Stack and tool preferences template
- `response-format.md` - Response formatting template
- `security-detailed.md` - Security guidelines template
- `voice-ids.md` - Voice ID assignments template

These are **templates for reference only**. The actual context loaded comes from `SKILL.md`.

## How Context Loading Works (Technical)

### 1. Hook Execution
When you start a Claude Code session, `settings.json` SessionStart hooks execute in order.

### 2. Subagent Detection
```typescript
const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                  process.env.CLAUDE_AGENT_TYPE !== undefined;
```

If subagent detected, hook exits silently (subagents don't need PAI context).

### 3. File Reading
```typescript
const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
const paiSkillPath = join(paiDir, 'skills/CORE/SKILL.md');
const paiContent = readFileSync(paiSkillPath, 'utf-8');
```

### 4. Context Injection
```typescript
const message = `<system-reminder>
PAI CORE CONTEXT (Auto-loaded at Session Start)

The following context has been loaded from ${paiSkillPath}:

---
${paiContent}
---

This context is now active for this session.
</system-reminder>`;

console.log(message);  // Output to stdout (captured by Claude Code)
```

Claude Code captures this output and injects it into the conversation context as a system reminder, making it immediately available to Claude.

### 5. Success Logging
```
📚 Reading PAI core context from skill file...
✅ Read 12847 characters from PAI SKILL.md
✅ PAI context injected into session
```

## Troubleshooting

### PAI Context Not Loading

**Problem**: AI doesn't seem to have your PAI context

**Check**:
1. Verify `skills/CORE/SKILL.md` exists
2. Check `settings.json` has `load-core-context.ts` in SessionStart hooks
3. Look for errors in session startup output
4. Ensure `PAI_DIR` environment variable is set correctly

### Hook Not Executing

**Problem**: No "Reading PAI core context" message at session start

**Check**:
1. Hook file is executable: `chmod +x hooks/load-core-context.ts`
2. Hook is in correct location: `${PAI_DIR}/hooks/load-core-context.ts`
3. Bun is installed and accessible
4. SessionStart hooks are properly configured in settings.json

### Wrong Context Loaded

**Problem**: AI seems to have old or incorrect context

**Check**:
1. Edit `skills/CORE/SKILL.md` and save changes
2. Restart Claude Code session
3. Verify changes are in SKILL.md (not template files)
4. Check for multiple PAI installations

## Migration from Old System

### Before (Manual Skill Activation)
```
User: /PAI
Assistant: [Loads PAI skill context]
User: [Actual task]
```

### After (Automatic Context Loading)
```
[Session starts - PAI context automatically loaded]
User: [Actual task - AI already has context]
```

### Steps to Migrate

1. **Install new hooks**:
   ```bash
   chmod +x hooks/load-core-context.ts
   chmod +x hooks/initialize-pai-session.ts
   ```

2. **Update settings.json**:
   Replace:
   ```json
   "SessionStart": [
     {
       "hooks": [
         {
           "type": "command",
           "command": "${PAI_DIR}/hooks/session-start-hook.ts"
         }
       ]
     }
   ]
   ```

   With:
   ```json
   "SessionStart": [
     {
       "hooks": [
         {
           "type": "command",
           "command": "${PAI_DIR}/hooks/load-core-context.ts"
         },
         {
           "type": "command",
           "command": "${PAI_DIR}/hooks/initialize-pai-session.ts"
         }
       ]
     }
   ]
   ```

3. **Customize SKILL.md**:
   Edit `skills/CORE/SKILL.md` with your personal context

4. **Test**:
   Start a new Claude Code session and verify PAI context loads

5. **Remove old hook** (optional):
   ```bash
   rm hooks/session-start-hook.ts
   ```

## Best Practices

### Keep SKILL.md Updated
Your AI is only as good as the context you provide. Regularly update:
- New contacts and their roles
- Changed stack preferences
- Security guidelines for new projects
- Updated social media accounts

### Use Environment Variables
Don't hardcode paths or API keys. Use `settings.json` env section:
```json
{
  "env": {
    "PAI_DIR": "$HOME/.claude",
    "DA": "YourAIName",
    "DA_VOICE_ID": "your-voice-id"
  }
}
```

### Test After Changes
After editing SKILL.md, restart a session and verify:
1. Hook executes without errors
2. AI responds according to new preferences
3. New context is accessible

### Version Control
Keep your PAI configuration in git:
```bash
git add skills/CORE/SKILL.md
git commit -m "Update PAI context with new preferences"
```

But **NEVER commit sensitive data** like:
- Real contact email addresses
- API keys or credentials
- Personal/private information
- Company-specific data

For public repos, use generic placeholders.

## Related Documentation

- [Skills System](skills-system.md) - Overview of the PAI skills architecture
- [Hook System](hook-system.md) - Complete hook system documentation
- [Voice System](voice-system.md) - Voice notification setup
- [Quick Reference](QUICK-REFERENCE.md) - Fast reference for common tasks

## Summary

The PAI context loading system provides:

✅ **Automatic context injection** - No manual skill activation needed
✅ **Modular architecture** - Separate context loading from session setup
✅ **Subagent awareness** - Skips unnecessary operations for subagents
✅ **Easy customization** - Edit SKILL.md to update your AI's context
✅ **Voice integration** - Optional voice notifications at session start
✅ **Flexible configuration** - Environment variables for portability

Your AI now has your complete personal context from the moment each session starts.
