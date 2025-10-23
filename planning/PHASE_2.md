# Phase 2: Variable Migration (Standards Compliance)

**Duration:** ~1-2 hours
**Priority:** Critical (Standards compliance)
**Dependencies:** Phase 1 complete

---

## Objective

Replace all instances of custom `${PAI_DIR}` variable with Claude Code standard `${CLAUDE_PLUGIN_ROOT}` across all plugin components to ensure portability and standards compliance.

---

## Background

**Current State:** Plugin uses `${PAI_DIR}` pointing to `$HOME/.claude`
**Target State:** Plugin uses `${CLAUDE_PLUGIN_ROOT}` (Claude Code standard)
**Benefit:** Plugins work regardless of installation location

**Why This Matters:**
- `${CLAUDE_PLUGIN_ROOT}` is automatically set by Claude Code to the plugin's installation directory
- Makes plugin portable and reusable
- Follows official Claude Code plugin standards
- Allows plugin to work from marketplace installations

---

## Tasks

### Task 2.1: Global Variable Replacement

**Find:** `${PAI_DIR}`
**Replace:** `${CLAUDE_PLUGIN_ROOT}`

**Affected Files (~45 files):**

#### Agents (8 files)
- `pai-plugin/agents/architect.md`
- `pai-plugin/agents/engineer.md`
- `pai-plugin/agents/designer.md`
- `pai-plugin/agents/pentester.md`
- `pai-plugin/agents/researcher.md`
- `pai-plugin/agents/perplexity-researcher.md`
- `pai-plugin/agents/claude-researcher.md`
- `pai-plugin/agents/gemini-researcher.md`

**Common Pattern in Agents:**
```yaml
---
name: engineer
description: ...
---

# MANDATORY FIRST ACTION
read ~/.claude/context/CLAUDE.md  # ← May reference ${PAI_DIR}
```

#### Commands (5 files)
- `pai-plugin/commands/conduct-research.md`
- `pai-plugin/commands/web-research.md`
- `pai-plugin/commands/capture-learning.md`
- `pai-plugin/commands/create-hormozi-pitch.md`
- `pai-plugin/commands/load-dynamic-requirements.md`

**Common Pattern in Commands:**
```markdown
For complete step-by-step instructions: `read ${PAI_DIR}/commands/conduct-research.md`
```

#### Skills (7 files)
- `pai-plugin/skills/PAI/SKILL.md`
- `pai-plugin/skills/research/SKILL.md`
- `pai-plugin/skills/fabric/SKILL.md`
- `pai-plugin/skills/create-skill/SKILL.md`
- `pai-plugin/skills/alex-hormozi-pitch/SKILL.md`
- `pai-plugin/skills/ffuf/SKILL.md`
- `pai-plugin/skills/prompting/SKILL.md`

**Common Pattern in Skills:**
```markdown
For complete step-by-step instructions: `read ${PAI_DIR}/commands/conduct-research.md`
```

#### Hooks (hooks.json already updated in Phase 1)
Hook TypeScript files may contain references - check:
- `pai-plugin/hooks/load-core-context.ts`
- `pai-plugin/hooks/initialize-pai-session.ts`
- Any hook that loads files from the plugin directory

#### Documentation (11 files)
- `pai-plugin/documentation/architecture.md`
- `pai-plugin/documentation/agent-system.md`
- `pai-plugin/documentation/command-system.md`
- `pai-plugin/documentation/hook-system.md`
- `pai-plugin/documentation/skills-system.md`
- `pai-plugin/documentation/pai-context-loading.md`
- `pai-plugin/documentation/ufc-context-system.md`
- `pai-plugin/documentation/voice-system.md`
- `pai-plugin/documentation/how-to-start.md`
- `pai-plugin/documentation/QUICK-REFERENCE.md`
- `pai-plugin/documentation/README.md`

---

### Task 2.2: Context Path Updates

**Problem:** Agents reference `~/.claude/context/CLAUDE.md` which may not exist

**Options:**

#### Option A: Make Context Files Part of Plugin (Recommended)
Create `pai-plugin/templates/context/` with template files:
```
pai-plugin/templates/context/
├── CLAUDE.md
└── tools/
    └── CLAUDE.md
```

Update agent references:
```markdown
# OLD
read ~/.claude/context/CLAUDE.md

# NEW
read ${CLAUDE_PLUGIN_ROOT}/templates/context/CLAUDE.md
```

#### Option B: Document External Requirement
Keep references to `~/.claude/context/` but document in INSTALL.md that users need to create this structure.

**Recommendation:** Use Option A for better user experience

---

### Task 2.3: Update Hook Script Paths

**File:** `pai-plugin/hooks/hooks.json` (Already done in Phase 1)

Already updated in Phase 1, but verify:
```json
{
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/load-core-context.ts"
        }
      ]
    }
  ]
}
```

---

### Task 2.4: Update README.md References

**File:** `pai-plugin/README.md` or root `README.md`

Find and replace any references:
```markdown
# OLD
All PAI infrastructure is now in `.claude/` directory
ls -la .claude/

# NEW
All PAI infrastructure is in the plugin directory
Plugin components: agents/, skills/, commands/, hooks/
```

Update installation instructions:
```markdown
# OLD
export PAI_DIR="/path/to/PAI"

# NEW
Plugin automatically uses ${CLAUDE_PLUGIN_ROOT}
No manual path configuration needed
```

---

### Task 2.5: Update Your Personal Configuration

**File:** `~/.claude/settings.json` (Your personal file, not in plugin)

**Current hooks section (example):**
```json
"hooks": {
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/load-core-context.ts"
        }
      ]
    }
  ]
}
```

**Action Required:**
Since hooks are now registered by the plugin, you can either:
1. Remove the hooks section entirely (plugin will handle it)
2. Keep for backward compatibility during transition

**Environment Variable:**
You can keep `PAI_DIR` for backward compatibility:
```json
"env": {
  "PAI_DIR": "$HOME/.claude",
  "DA": "Kai"
}
```

---

## Automated Migration Script

For efficiency, create a migration script:

**File:** `pai-plugin/scripts/migrate-variables.sh`

```bash
#!/bin/bash

# Backup before migration
echo "Creating backup..."
git stash save "pre-migration-backup"

# Find and replace in all relevant files
echo "Migrating variables..."
find pai-plugin/agents -type f -name "*.md" -exec sed -i 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} +
find pai-plugin/commands -type f -name "*.md" -exec sed -i 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} +
find pai-plugin/skills -type f -name "*.md" -exec sed -i 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} +
find pai-plugin/hooks -type f -name "*.ts" -exec sed -i 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} +
find pai-plugin/documentation -type f -name "*.md" -exec sed -i 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} +

# Update context references
echo "Updating context paths..."
find pai-plugin/agents -type f -name "*.md" -exec sed -i 's|~/.claude/context/CLAUDE.md|\${CLAUDE_PLUGIN_ROOT}/templates/context/CLAUDE.md|g' {} +

echo "Migration complete!"
echo "Review changes with: git diff"
echo "If issues occur, restore with: git stash pop"
```

**Usage:**
```bash
chmod +x pai-plugin/scripts/migrate-variables.sh
./pai-plugin/scripts/migrate-variables.sh
```

---

## Verification Checklist

After migration, verify:

- [ ] No instances of `${PAI_DIR}` in plugin directory (except documentation explaining migration)
- [ ] All `${CLAUDE_PLUGIN_ROOT}` references are correct
- [ ] Context file paths updated appropriately
- [ ] Template context files created (if Option A)
- [ ] README updated with new instructions
- [ ] Personal `~/.claude/settings.json` updated if needed
- [ ] Git diff reviewed for any unexpected changes
- [ ] All agents still loadable
- [ ] All commands still executable
- [ ] All skills still discoverable

---

## Testing After Migration

### Test 1: Agent Loading
```bash
claude
# In Claude Code:
# Try invoking each agent by description
"Use the engineer agent to analyze this code"
```

### Test 2: Command Execution
```bash
claude
# In Claude Code:
/conduct-research
/capture-learning
```

### Test 3: Skill Discovery
```bash
claude
# In Claude Code:
"Do research on quantum computing"  # Should trigger research skill
"Create a pitch"  # Should trigger alex-hormozi-pitch skill
```

### Test 4: Hook Triggering
```bash
claude
# Start a session - SessionStart hooks should fire
# Submit a prompt - UserPromptSubmit hook should fire
# Exit - SessionEnd hook should fire
```

---

## Rollback Plan

If migration causes issues:

```bash
# Restore from stash
git stash pop

# Or reset to pre-migration commit
git reset --hard HEAD~1

# Verify restore
grep -r '${PAI_DIR}' pai-plugin/
```

---

## Files Modified Summary

**Modified (~45 files):**
- 8 agent files
- 5 command files
- 7 skill SKILL.md files
- ~12 hook TypeScript files (if they contain path references)
- 11 documentation files
- 1 README.md

**Created (if Option A for context):**
- `pai-plugin/templates/context/CLAUDE.md`
- `pai-plugin/templates/context/tools/CLAUDE.md`

**Script Created:**
- `pai-plugin/scripts/migrate-variables.sh`

---

## Expected Outcomes

✅ Plugin uses Claude Code standard variables
✅ Plugin is portable across installations
✅ No hardcoded paths remain
✅ Follows official plugin standards
✅ Your personal system still works (with minor settings update)

---

## Next Phase

Once Phase 2 is complete and tested, proceed to:
→ [Phase 3: Voice Server Integration](./PHASE_3.md)

This will make voice notifications optional and configurable.
