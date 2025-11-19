# Update Skill Workflow

**Purpose:** Update existing skill with new workflows, documentation, or features while maintaining architectural compliance

**When to Use:**
- User says "update skill", "add workflow to skill", "extend skill"
- Need to add new workflow to existing skill
- Need to refactor workflow organization (flat → nested)
- Need to add documentation or references
- Need to add state management or tools
- Skill needs incremental enhancement

**Prerequisites:**
- Target skill exists and is functional
- Access to SKILL-STRUCTURE-AND-ROUTING.md
- Understanding of changes needed
- Backup created (recommended)

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED:** Read the source of truth before updating:
```bash
~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
```

**What to extract:**
- Current archetype requirements
- Workflow routing rules
- File organization patterns
- Naming conventions
- Quality standards

**Output:** Architecture standards loaded

---

### Step 2: Identify Update Scope

**Ask user to clarify what needs updating:**

**Type 1: Add New Workflow**
- What does the new workflow do?
- What triggers it?
- Where should it fit in existing structure?

**Type 2: Reorganize Workflows**
- Current organization (flat/nested)?
- Target organization?
- Reason for change (too many flat files, clearer categories)?

**Type 3: Add Documentation**
- What documentation is needed?
- Where should it go (documentation/, references/)?
- What does it document?

**Type 4: Add Features**
- State management?
- Tool integration?
- Agent integration?
- MCP integration?

**Type 5: Fix Compliance Issues**
- What issues identified (from validate-skill)?
- What needs fixing?

**Output:** Update scope defined

---

### Step 3: Assess Current State

**Read current SKILL.md:**
```bash
~/.claude/skills/[skill-name]/SKILL.md
```

**Analyze:**
- Current archetype (Minimal/Standard/Complex)
- Current workflow count
- Current directory structure
- Current routing patterns

**Check for upgrade triggers:**
- Adding workflow to Minimal → Should become Standard?
- Adding 5+ workflows to Standard → Should become Complex?
- Adding state management → Bump up archetype?

**Determine if archetype change needed:**
```
Current: Minimal (2 workflows) + Adding 3 new → Standard (5 total)
Current: Standard (12 workflows) + Adding 8 new → Complex (20 total)
Current: Standard (no state) + Adding state → Consider Complex
```

**Output:** Current state assessment + archetype decision

---

### Step 4: Create Backup

**ALWAYS backup before modifying:**
```bash
# Create timestamped backup
cp -r ~/.claude/skills/[skill-name]/ \
      ~/.claude/skills/[skill-name]/.backup-$(date +%Y%m%d-%H%M%S)/

# Verify backup
ls -la ~/.claude/skills/[skill-name]/.backup-*/
```

**Output:** Backup created

---

### Step 5: Implement Changes

**For Type 1: Add New Workflow**

**Create workflow file:**
```bash
touch ~/.claude/skills/[skill-name]/workflows/[new-workflow].md
```

**Write workflow content** (use standard template from create-skill.md)

**Update SKILL.md Workflow Routing section:**
```markdown
**When user requests [new action]:**
Examples: "phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"
→ **READ:** ~/.claude/skills/[skill-name]/workflows/[new-workflow].md
→ **EXECUTE:** Description of what this workflow does
```

**Update "When to Activate This Skill" section:**
- Add triggers for new workflow
- Expand category coverage if needed

**Update Workflow Overview section:**
- Add new workflow to appropriate category
- Provide description and when-to-use

**Output:** New workflow added and routed

---

**For Type 2: Reorganize Workflows (Flat → Nested)**

**When:** 10+ workflows in flat structure

**Create category directories:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/workflows/{category1,category2,category3}
```

**Move workflows to categories:**
```bash
# Move workflows by category
mv ~/.claude/skills/[skill-name]/workflows/category1-*.md \
   ~/.claude/skills/[skill-name]/workflows/category1/

mv ~/.claude/skills/[skill-name]/workflows/category2-*.md \
   ~/.claude/skills/[skill-name]/workflows/category2/
```

**Update SKILL.md Workflow Routing paths:**
```markdown
OLD: → **READ:** ~/.claude/skills/[skill-name]/workflows/workflow1.md
NEW: → **READ:** ~/.claude/skills/[skill-name]/workflows/category1/workflow1.md
```

**Update Workflow Overview with nested structure:**
```markdown
## Workflow Overview

**Category 1**
- **category1/workflow1.md** - Description
- **category1/workflow2.md** - Description

**Category 2**
- **category2/workflow1.md** - Description
```

**Output:** Workflows reorganized into nested structure

---

**For Type 3: Add Documentation**

**Create documentation directory if needed:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/documentation
```

**Create documentation file:**
```bash
touch ~/.claude/skills/[skill-name]/documentation/[topic].md
```

**Write documentation content**

**Link from SKILL.md Extended Context section:**
```markdown
## Extended Context

### [Topic Name]

For detailed information about [topic], see:
`~/.claude/skills/[skill-name]/documentation/[topic].md`

[Brief summary of what this doc contains]
[When to use this documentation]
```

**Output:** Documentation added and linked

---

**For Type 4: Add Features**

**Add State Management:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/state
touch ~/.claude/skills/[skill-name]/.gitignore

# Add to .gitignore
echo "state/*.json" >> ~/.claude/skills/[skill-name]/.gitignore
echo "state/*.cache" >> ~/.claude/skills/[skill-name]/.gitignore
```

**Add Tools:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/tools
touch ~/.claude/skills/[skill-name]/tools/[tool-name].ts
```

**Add Testing:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/testing
touch ~/.claude/skills/[skill-name]/testing/test-[feature].md
```

**Document in SKILL.md:**
- Explain state management approach
- Document tool usage
- Link testing procedures

**Output:** Features added and documented

---

**For Type 5: Fix Compliance Issues**

**Use issues from validate-skill report:**
- Fix Workflow Routing section placement
- Add missing workflow routes
- Expand activation triggers
- Link orphan files
- Fix naming conventions

**Run validation after each fix:**
- Verify issue resolved
- Check no new issues introduced

**Output:** Compliance issues fixed

---

### Step 6: Update Archetype (If Needed)

**If workflow count or complexity changed archetype:**

**Minimal → Standard:**
```bash
# Add optional directories
mkdir -p ~/.claude/skills/[skill-name]/documentation
mkdir -p ~/.claude/skills/[skill-name]/references
```

**Standard → Complex:**
```bash
# Add full directory tree
mkdir -p ~/.claude/skills/[skill-name]/{documentation,references,state,tools,testing}

# Optionally add methodology docs
touch ~/.claude/skills/[skill-name]/METHODOLOGY.md
```

**Update SKILL.md to reflect complexity:**
- Expand Extended Context sections
- Add methodology references if applicable
- Document new capabilities

**Output:** Archetype upgraded if needed

---

### Step 7: Validate Changes

**Run validate-skill workflow:**
```bash
# Use validate-skill.md to check compliance
```

**Check:**
- ✅ Structural validation (archetype correct)
- ✅ Routing validation (new workflows routed)
- ✅ Activation triggers (expanded if needed)
- ✅ Documentation (new files linked)
- ✅ Integration (no regressions)
- ✅ Quality (standards maintained)

**Fix any issues found**

**Output:** Validation passed

---

### Step 8: Test Updated Skill

**Test new workflows:**
```bash
# Test activation with natural language
"do [new-workflow-action]"
"quick [new-workflow-action]"
"[result from new workflow]"
```

**Test existing workflows:**
```bash
# Ensure no regressions
"do [existing-workflow-action]"
```

**Test reorganized paths (if applicable):**
- Verify routed paths correct
- Check no broken links

**Output:** All workflows functional

---

### Step 9: Document Changes

**Create update record:**

```markdown
# Skill Update: [skill-name]

**Date:** [YYYY-MM-DD]
**Update Type:** [Add Workflow / Reorganize / Add Documentation / Add Features / Fix Compliance]
**Previous Archetype:** [archetype]
**New Archetype:** [archetype if changed]

## Changes Made

### New Workflows
- [new-workflow-1].md - Purpose and triggers
- [new-workflow-2].md - Purpose and triggers

### Reorganization
- Moved workflows from flat to nested structure
- Categories: [list categories]

### New Documentation
- documentation/[topic].md - What it covers

### New Features
- State management added
- Tool integration: [tool name]

### Compliance Fixes
- Fixed: [issue 1]
- Fixed: [issue 2]

## Updated Activation Triggers

**New triggers added:**
- "phrase 1"
- "phrase 2"
- "phrase 3"

## Validation Results

✅ Structural: PASS
✅ Routing: PASS
✅ Activation: PASS
✅ Documentation: PASS
✅ Integration: PASS
✅ Quality: PASS

## Testing Performed

- Tested new workflow activations
- Tested existing workflows (no regressions)
- Verified reorganized paths work
- Confirmed all features functional

## Backup Location

Original skill backed up to:
~/.claude/skills/[skill-name]/.backup-[timestamp]/

## Next Steps

[Any follow-up work needed]
```

**Optional:** Add to MIGRATION-YYYY-MM-DD.md if major update

**Output:** Changes documented

---

### Step 10: User Review

**Present to user:**
- Summary of changes made
- New capabilities available
- Updated activation triggers
- Validation results
- Testing confirmation

**Confirm:**
- "Changes meet expectations?"
- "Ready to use updated skill?"
- "Delete backup after confirming functionality?"

**Output:** User approval obtained

---

## Success Criteria

**Update is complete when:**
- ✅ Changes implemented as specified
- ✅ SKILL.md updated (routing, triggers, documentation)
- ✅ New files created in correct locations
- ✅ All new files linked from SKILL.md
- ✅ Archetype updated if needed
- ✅ Validation passed
- ✅ Functionality tested (new + existing)
- ✅ Changes documented
- ✅ Backup created
- ✅ User approval obtained

---

## Common Update Patterns

### Pattern 1: Adding Single Workflow

**Scenario:** Add "export data" workflow to existing skill

**Steps:**
1. Create workflows/export-data.md
2. Add routing in SKILL.md Workflow Routing section
3. Add triggers to "When to Activate" section
4. Add to Workflow Overview
5. Validate and test

**Time:** 10-15 minutes

---

### Pattern 2: Reorganizing Workflows (Flat → Nested)

**Scenario:** Skill has 15 workflows, moving from flat to nested

**Steps:**
1. Create category directories
2. Move workflows to categories
3. Update all routing paths in SKILL.md
4. Update Workflow Overview to show nested structure
5. Test all workflow activations
6. Validate

**Time:** 20-30 minutes

---

### Pattern 3: Archetype Upgrade (Minimal → Standard)

**Scenario:** Minimal skill growing to 5 workflows

**Steps:**
1. Add documentation/ directory
2. Move extended docs from SKILL.md to documentation/
3. Link docs from SKILL.md
4. Update SKILL.md to be routing hub
5. Validate archetype compliance

**Time:** 30-45 minutes

---

### Pattern 4: Adding Integration (MCP/Agent)

**Scenario:** Add MCP integration to existing skill

**Steps:**
1. Document integration in SKILL.md Extended Context
2. Create tools/ directory if needed
3. Add integration scripts
4. Update workflows to use integration
5. Test integration functionality
6. Document configuration

**Time:** 30-60 minutes

---

## Related Workflows

- **create-skill.md** - Create new skill from scratch
- **validate-skill.md** - Validate updated skill compliance
- **canonicalize-skill.md** - Major refactoring for compliance

---

## Notes

**Incremental vs Major Updates:**
- **Incremental:** Add 1-3 workflows, minor features → Use update-skill
- **Major:** 10+ workflow additions, archetype change, complete refactor → Consider canonicalize-skill

**Safety First:**
- ALWAYS create backup
- ALWAYS validate after changes
- ALWAYS test existing functionality
- Get user approval before finalizing

**Maintain Quality:**
- Follow canonical architecture
- Keep activation triggers comprehensive
- Route all new workflows
- Link all new files
- Update documentation

**One Source of Truth:**
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

---

**Last Updated:** 2025-11-17
