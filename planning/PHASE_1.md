# Phase 1: Plugin Structure Cleanup (Foundation)

**Duration:** ~1 hour 10 minutes (includes Task 1.0 critical bug fix)
**Priority:** Critical (Blocking)
**Dependencies:** None
**⚠️ IMPORTANT:** Start with Task 1.0 to fix unhandled promise rejections

---

## Objective

Establish proper Claude Code plugin structure by updating manifest files, registering hooks correctly, and separating user configuration from plugin code.

---

## Tasks

### Task 1.0: Fix Unhandled Promise Rejections in Hooks (CRITICAL)

**Priority:** CRITICAL - Do this FIRST before any other Phase 1 tasks
**Duration:** ~10 minutes (6 files to update)
**Impact:** Prevents intermittent "unhandled promise rejection" errors

**Problem:**
Multiple hooks call `main()` without a `.catch()` handler. When `main()` is an async function and errors occur, this causes unhandled promise rejections that crash hooks and display error messages to users.

**Affected Files (6 hooks missing .catch() handlers):**
1. `pai-plugin/hooks/capture-session-summary.ts`
2. `pai-plugin/hooks/capture-tool-output.ts`
3. `pai-plugin/hooks/initialize-pai-session.ts`
4. `pai-plugin/hooks/load-core-context.ts`
5. `pai-plugin/hooks/load-dynamic-requirements.ts`
6. `pai-plugin/hooks/update-tab-titles.ts`

**Already Fixed (3 hooks with proper handlers):**
- ✅ `context-compression-hook.ts` - has `.catch(() => { process.exit(0); })`
- ✅ `stop-hook.ts` - has `.catch(() => {})`
- ✅ `subagent-stop-hook.ts` - has `.catch(console.error)`

**Fix Required:**

Change from:
```typescript
main();
```

To:
```typescript
main().catch(error => {
  console.error('Error:', error);
  process.exit(0);
});
```

**Files to Update:**
- [ ] `pai-plugin/hooks/capture-session-summary.ts` - Add .catch() handler
- [ ] `pai-plugin/hooks/capture-tool-output.ts` - Add .catch() handler
- [ ] `pai-plugin/hooks/initialize-pai-session.ts` - Add .catch() handler
- [ ] `pai-plugin/hooks/load-core-context.ts` - Add .catch() handler
- [ ] `pai-plugin/hooks/load-dynamic-requirements.ts` - Add .catch() handler
- [ ] `pai-plugin/hooks/update-tab-titles.ts` - Add .catch() handler

**Why This Matters:**
- Prevents "unhandled promise rejection" errors during hook execution
- Ensures hooks fail gracefully without disrupting Claude Code
- Critical for Phase 1 since we're restructuring hooks configuration

**Verification:**
After fixing, test by:
1. Triggering UserPromptSubmit hook (type any prompt)
2. Triggering PostToolUse hook (use any tool)
3. Verify no unhandled promise rejection errors appear

---

### Task 1.1: Update plugin.json

**File:** `pai-plugin/.claude-plugin/plugin.json`

**Current State:**
```json
{
  "name": "PAI-Boilerplate",
  "description": "Open-source personal AI infrastructure for orchestrating your life and work",
  "version": "0.6.0",
  "author": {
    "name": "evenromo"
  }
}
```

**Target State:**
```json
{
  "name": "PAI-Boilerplate",
  "description": "Open-source personal AI infrastructure for orchestrating your life and work. Includes research agents, specialized skills, hooks system, and MCP integrations.",
  "version": "0.7.0",
  "author": {
    "name": "evenromo"
  },
  "homepage": "https://github.com/[username]/PAI-Boilerplate",
  "repository": {
    "type": "git",
    "url": "https://github.com/[username]/PAI-Boilerplate.git"
  },
  "license": "MIT",
  "keywords": [
    "pai",
    "personal-ai",
    "infrastructure",
    "research",
    "automation",
    "claude-code",
    "ai-assistant"
  ],
  "hooks": "./hooks/hooks.json"
}
```

**Changes:**
- ✅ Extended description with key features
- ✅ Version bump: 0.6.0 → 0.7.0
- ✅ Added homepage URL (update with actual repo)
- ✅ Added repository information
- ✅ Added MIT license declaration
- ✅ Added keywords for discoverability
- ✅ Added hooks reference pointing to hooks.json

---

### Task 1.2: Create hooks/hooks.json

**File:** `pai-plugin/hooks/hooks.json` (NEW)

**Purpose:** Register all plugin hooks in Claude Code plugin format

**Content:**
```json
{
  "PreToolUse": [],
  "PostToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/capture-tool-output.ts"
        }
      ]
    }
  ],
  "SessionEnd": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/capture-session-summary.ts"
        }
      ]
    }
  ],
  "Notification": [],
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/update-tab-titles.ts"
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/load-core-context.ts"
        },
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/initialize-pai-session.ts"
        }
      ]
    }
  ],
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.ts"
        }
      ]
    }
  ],
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/subagent-stop-hook.ts"
        }
      ]
    }
  ],
  "PreCompact": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/context-compression-hook.ts"
        }
      ]
    }
  ]
}
```

**Notes:**
- Extracted from `settings.json` lines 65-143
- Changed all paths from `${PAI_DIR}` to `${CLAUDE_PLUGIN_ROOT}`
- Maintains all 8 hook types
- Preserves exact hook execution order

---

### Task 1.3: Create settings.example.json

**File:** `pai-plugin/settings.example.json` (NEW)

**Purpose:** Template for users to create their own settings.json

**Steps:**
1. Copy `pai-plugin/settings.json` to `pai-plugin/settings.example.json`
2. Replace sensitive values with placeholders:
   ```json
   "MCP_API_KEY": "[YOUR_MCP_API_KEY_HERE]"
   ```
3. Add comments explaining customization:
   ```json
   "DA": "[YOUR_ASSISTANT_NAME]",
   "PAI_DIR": "$HOME/.claude"
   ```
4. Remove the `hooks` section (now in hooks.json)
5. Add header comment:
   ```json
   {
     "_comment": "Copy this file to ~/.claude/settings.json and customize the values",
     "$schema": "https://json.schemastore.org/claude-code-settings.json",
     ...
   }
   ```

**Template Sections:**
- Environment variables with placeholders
- Permissions (keep as-is, good defaults)
- Enable MCP servers flag
- Status line configuration (keep)
- Remove hooks configuration
- Remove feedbackSurveyState

---

### Task 1.4: Create .mcp.example.json

**File:** `pai-plugin/.mcp.example.json` (NEW)

**Purpose:** Template for MCP server configuration

**Steps:**
1. Copy `pai-plugin/.mcp.json` to `pai-plugin/.mcp.example.json`
2. Replace all API keys/tokens with placeholders:
   ```json
   "x-api-key": "[YOUR_API_KEY]"
   "API_TOKEN": "[YOUR_BRIGHTDATA_TOKEN]"
   "APIFY_TOKEN": "[YOUR_APIFY_TOKEN]"
   ```
3. Keep all server configurations as examples
4. Add comments for optional vs required servers:
   ```json
   {
     "_comment": "Copy this file to ~/.claude/.mcp.json and configure your API keys",
     "_required": ["brightdata", "playwright"],
     "_optional": ["httpx", "content", "daemon", "naabu", "stripe", "Ref", "apify"],
     "mcpServers": {
       ...
     }
   }
   ```

---

### Task 1.5: Delete Original Config Files

**Files to Delete:**
1. `pai-plugin/settings.json`
2. `pai-plugin/.mcp.json`

**Reason:** These contain personal configuration and should not be in the plugin repository. Users will create their own from the .example templates.

**Safety:**
- These files are already in `~/.claude/` for your personal use
- Plugin will reference the examples
- Installation script will copy examples to `~/.claude/`

---

### Task 1.6: Update .gitignore

**File:** `pai-plugin/.gitignore` or root `.gitignore`

**Add:**
```gitignore
# User configuration (use .example templates instead)
settings.json
.mcp.json
.env

# Personal data
**/REDACTED*
**/*secret*
**/*private*

# Voice server state
voice-server/*.log
voice-server/node_modules

# Test artifacts
test-output/
.claude-test/

# OS files
.DS_Store
Thumbs.db
```

---

## Verification Checklist

After completing Phase 1, verify:

- [ ] **Task 1.0:** All hooks have `.catch()` handlers on `main()` calls
- [ ] **Task 1.0:** No unhandled promise rejections when testing hooks
- [ ] `plugin.json` contains all required and recommended fields
- [ ] `plugin.json` has `"hooks": "./hooks/hooks.json"` reference
- [ ] `hooks/hooks.json` exists and contains all 8 hook types
- [ ] All hook paths use `${CLAUDE_PLUGIN_ROOT}`
- [ ] `settings.example.json` exists with placeholders
- [ ] `.mcp.example.json` exists with placeholders
- [ ] Original `settings.json` deleted from plugin
- [ ] Original `.mcp.json` deleted from plugin
- [ ] `.gitignore` updated to exclude user configs
- [ ] Your personal `~/.claude/settings.json` still exists (unchanged)
- [ ] Your personal `~/.claude/.mcp.json` still exists (unchanged)

---

## Rollback Plan

If issues arise:

1. **Restore original files:**
   ```bash
   git checkout pai-plugin/settings.json
   git checkout pai-plugin/.mcp.json
   ```

2. **Remove new files:**
   ```bash
   rm pai-plugin/hooks/hooks.json
   rm pai-plugin/settings.example.json
   rm pai-plugin/.mcp.example.json
   ```

3. **Revert plugin.json:**
   ```bash
   git checkout pai-plugin/.claude-plugin/plugin.json
   ```

---

## Files Created/Modified Summary

**Created (3):**
- `pai-plugin/hooks/hooks.json`
- `pai-plugin/settings.example.json`
- `pai-plugin/.mcp.example.json`

**Modified (7):**
- `pai-plugin/.claude-plugin/plugin.json`
- `pai-plugin/hooks/capture-session-summary.ts` (Task 1.0 - Add .catch() handler)
- `pai-plugin/hooks/capture-tool-output.ts` (Task 1.0 - Add .catch() handler)
- `pai-plugin/hooks/initialize-pai-session.ts` (Task 1.0 - Add .catch() handler)
- `pai-plugin/hooks/load-core-context.ts` (Task 1.0 - Add .catch() handler)
- `pai-plugin/hooks/load-dynamic-requirements.ts` (Task 1.0 - Add .catch() handler)
- `pai-plugin/hooks/update-tab-titles.ts` (Task 1.0 - Add .catch() handler)

**Deleted (2):**
- `pai-plugin/settings.json`
- `pai-plugin/.mcp.json`

---

## Next Phase

Once Phase 1 is complete and verified, proceed to:
→ [Phase 2: Variable Migration](./PHASE_2.md)

This will update all file references from `${PAI_DIR}` to `${CLAUDE_PLUGIN_ROOT}`.
