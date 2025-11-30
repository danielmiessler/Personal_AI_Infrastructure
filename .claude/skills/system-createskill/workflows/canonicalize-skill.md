# Canonicalize Skill Workflow

**Purpose:** Analyze existing skill and rebuild it according to canonical PAI architectural standards while preserving functionality

**When to Use:**
- User says "canonicalize skill", "canonicalize this skill", "canonicalize [skill-name]"
- Existing skill doesn't follow current architectural standards
- Need to refactor skill to comply with SKILL-STRUCTURE-AND-ROUTING.md
- Skill structure is inconsistent or non-compliant

**Prerequisites:**
- Target skill exists in ${PAI_DIR}/skills/
- Access to SKILL-STRUCTURE-AND-ROUTING.md
- Understanding of current skill functionality

---

## Workflow Steps

### Step 1: Identify Target Skill

**If user says "canonicalize this skill":**
- Determine current working directory
- If in a skill directory (contains SKILL.md), use that skill
- Otherwise, ask user to specify skill name or navigate to skill directory

**If user specifies skill name:**
- Verify skill exists at ${PAI_DIR}/skills/[skill-name]/
- Read SKILL.md to understand current structure

**Output:** Target skill path identified

---

### Step 2: Read Canonical Architecture

**REQUIRED:** Read the source of truth before any analysis:
```bash
${PAI_DIR}/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
```

**What to extract:**
- The 3 archetypes (Minimal, Standard, Complex)
- Mandatory structural requirements
- Workflow routing rules (FIRST section requirement)
- Naming conventions
- Routing patterns
- Quality checklist
- 8-category activation pattern

**Output:** Canonical architecture loaded into context

---

### Step 3: Analyze Current Skill Structure

**Read all skill files:**
```bash
# Read SKILL.md
${PAI_DIR}/skills/[skill-name]/SKILL.md

# List all files in skill directory
ls -R ${PAI_DIR}/skills/[skill-name]/

# Identify all workflow files
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md"

# Identify all documentation files
find ${PAI_DIR}/skills/[skill-name]/ -name "*.md" ! -path "*/workflows/*"
```

**Analyze structure:**
- Current directory structure
- File count and organization
- YAML frontmatter content
- Presence/absence of Workflow Routing section
- Location of Workflow Routing section (is it FIRST?)
- Workflow files and their routing status
- Documentation files and their linkage
- Activation trigger comprehensiveness
- Naming convention compliance

**Output:** Complete structural assessment

---

### Step 4: Identify Compliance Gaps

**Run through mandatory requirements:**

1. **Workflow Routing Section**
   - ❓ Present? (yes/no)
   - ❓ Is it FIRST after YAML? (yes/no)
   - ❓ Are ALL workflows routed? (yes/no)
   - ❓ Are file paths absolute? (yes/no)
   - ❓ Are examples provided? (yes/no)

2. **File Linkage**
   - ❓ Are all secondary files referenced in SKILL.md main body? (yes/no)
   - ❓ Are all workflow files linked? (yes/no)
   - ❓ Are all documentation files linked? (yes/no)

3. **Activation Triggers**
   - ❓ USE WHEN in YAML description? (yes/no)
   - ❓ "When to Activate This Skill" section present? (yes/no)
   - ❓ 8-category pattern coverage? (score 0-8)

4. **Archetype Compliance**
   - Current archetype: [Minimal/Standard/Complex/Unknown]
   - Workflow count: [N]
   - Should be archetype: [Minimal/Standard/Complex]
   - ❓ Directory structure matches archetype? (yes/no)

5. **Naming Conventions**
   - ❓ SKILL.md uppercase? (yes/no)
   - ❓ Workflows kebab-case? (yes/no)
   - ❓ Directories proper naming? (yes/no)

**Output:** Gap analysis report with specific violations

---

### Step 5: Preserve Functionality

**Critical: Do NOT lose functionality during canonicalization**

**Extract and preserve:**
- All workflow content (steps, tools, commands)
- All domain knowledge and context
- All integration points (MCPs, agents, external services)
- All examples and use cases
- All reference documentation
- Special configurations or state

**Create backup:**
```bash
# Create backup before modifying
cp -r ${PAI_DIR}/skills/[skill-name]/ ${PAI_DIR}/skills/[skill-name]/.backup-$(date +%Y%m%d-%H%M%S)/
```

**Output:** Functionality inventory and backup created

---

### Step 6: Determine Target Structure

**Based on workflow count:**
- 0-3 workflows → Minimal archetype
- 3-15 workflows → Standard archetype
- 15+ workflows → Complex archetype

**Plan directory structure:**

**Minimal:**
```
skill-name/
├── SKILL.md
└── workflows/ OR assets/
    └── *.md
```

**Standard:**
```
skill-name/
├── SKILL.md
├── workflows/
│   └── *.md (flat if <10, nested if 10+)
└── [optional: documentation/, references/]
```

**Complex:**
```
skill-name/
├── SKILL.md
├── [CONSTITUTION.md, METHODOLOGY.md]
├── documentation/
├── workflows/ (nested)
├── references/
└── [optional: state/, tools/, testing/]
```

**Output:** Target canonical structure plan

---

### Step 7: Rebuild SKILL.md

**Create new SKILL.md following canonical template:**

```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.

  USE WHEN: user says "trigger phrase", "another trigger", or any related request.
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests [action 1]:**
Examples: "actual user phrases", "variations", "synonyms"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** What to do with this workflow

[Route EVERY workflow file - NO EXCEPTIONS]

---

## When to Activate This Skill

[Use 8-category pattern for comprehensive coverage]

### Direct [Skill Name] Requests
- [Category 1-4: Core name, verbs, modifiers, prepositions]

### [Use Case Category 1]
- [Category 5-7: Synonyms, use cases, results]

### [Use Case Category 2]
- [Category 8: Tool-specific if applicable]

---

## [Extended Context Sections]

[Main body with detailed information]
[Links to all secondary files]
[Examples and usage guidance]
```

**Key fixes:**
1. ✅ Workflow Routing section FIRST
2. ✅ ALL workflows explicitly routed
3. ✅ Absolute file paths
4. ✅ Comprehensive examples
5. ✅ 8-category activation pattern
6. ✅ All files linked in main body

**Output:** Compliant SKILL.md file

---

### Step 8: Reorganize Files

**Move/rename files to match target structure:**

```bash
# Example: Reorganizing workflows from flat to nested
mkdir -p ${PAI_DIR}/skills/skill-name/workflows/category1
mkdir -p ${PAI_DIR}/skills/skill-name/workflows/category2

mv ${PAI_DIR}/skills/skill-name/workflows/category1-*.md \
   ${PAI_DIR}/skills/skill-name/workflows/category1/

mv ${PAI_DIR}/skills/skill-name/workflows/category2-*.md \
   ${PAI_DIR}/skills/skill-name/workflows/category2/
```

**Naming convention fixes:**
- Rename files to kebab-case if needed
- Fix directory names (plural containers, singular content)
- Ensure UPPERCASE for root docs

**Output:** Files organized according to canonical structure

---

### Step 9: Validate Canonicalized Skill

**Run complete validation (use validate-skill workflow):**

**Structural Validation:**
- ✅ Correct archetype directory structure
- ✅ All required files present
- ✅ Naming conventions followed

**Routing Validation:**
- ✅ Workflow Routing section present and FIRST
- ✅ All workflows explicitly routed
- ✅ Examples provided for each route

**Documentation Validation:**
- ✅ All files referenced in SKILL.md
- ✅ Clear purpose and when-to-use guidance
- ✅ Examples provided

**Integration Validation:**
- ✅ No duplication of CORE context
- ✅ Compatible with agent workflows

**Quality Validation:**
- ✅ 8-category activation pattern coverage
- ✅ Progressive disclosure maintained
- ✅ Self-contained but inherits CORE

**Output:** Validation report (PASS/FAIL with details)

---

### Step 10: Generate Migration Report

**Create canonicalization report:**

```markdown
# Skill Canonicalization Report: [skill-name]

**Date:** [YYYY-MM-DD]
**Original Structure:** [archetype or non-compliant]
**Target Structure:** [archetype]

## Changes Made

### Structure Changes
- [List directory reorganization]
- [List file moves/renames]
- [List archetype transition]

### SKILL.md Changes
- Added Workflow Routing section (now FIRST)
- Routed [N] previously unrouted workflows
- Enhanced activation triggers ([N] categories covered)
- Linked [N] previously unlinked files

### Compliance Fixes
- ✅ Fixed: [specific violation 1]
- ✅ Fixed: [specific violation 2]
- ✅ Fixed: [specific violation 3]

### Files Modified
- [List all modified files]

### Files Created
- [List any new files]

### Files Deleted
- [List any removed files]
- Note: Originals preserved in .backup-[timestamp]/

## Functionality Preserved

✅ All [N] workflows maintained
✅ All domain knowledge preserved
✅ All integrations functional
✅ All examples retained

## Validation Results

✅ Structural: PASS
✅ Routing: PASS
✅ Documentation: PASS
✅ Integration: PASS
✅ Quality: PASS

## Before vs After

### Before:
[Description of non-compliant structure]

### After:
[Description of canonical structure]

## Next Steps

1. Test skill activation with natural language triggers
2. Verify all workflows execute correctly
3. Update any external references to this skill
4. Delete backup after confirming functionality

## Backup Location

Original skill backed up to:
${PAI_DIR}/skills/[skill-name]/.backup-[timestamp]/
```

**Output:** Complete migration report

---

### Step 11: User Review

**Present to user:**
1. Gap analysis (what was wrong)
2. Changes made (what was fixed)
3. Validation results (compliance status)
4. Migration report (complete documentation)
5. Backup location (safety net)

**Ask user:**
- "Review the changes - does the canonicalized skill meet expectations?"
- "Test the skill with natural language triggers to verify functionality"
- "Once confirmed working, you can delete the backup"

**Output:** User approval obtained

---

## Success Criteria

**Canonicalization is complete when:**
- ✅ Skill follows canonical archetype structure
- ✅ Workflow Routing section present and FIRST
- ✅ ALL workflows explicitly routed
- ✅ ALL files referenced in main body
- ✅ Activation triggers comprehensive (8-category pattern)
- ✅ Naming conventions followed
- ✅ Passes complete validation
- ✅ Functionality preserved (all workflows work)
- ✅ Migration report generated
- ✅ Backup created
- ✅ User has reviewed and approved

---

## Related Workflows

- **validate-skill.md** - Run after canonicalization to verify compliance
- **update-skill.md** - For incremental changes after canonicalization
- **create-skill.md** - For creating new skills from scratch (not refactoring)

---

## Common Canonicalization Patterns

### Pattern 1: Missing Workflow Routing Section

**Before:**
```markdown
---
name: skill-name
description: Some skill
---

## When to Use
...

## Workflows
- workflow1.md
- workflow2.md
```

**After:**
```markdown
---
name: skill-name
description: |
  Some skill.

  USE WHEN user says "trigger phrases"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests [action 1]:**
Examples: "phrase 1", "phrase 2"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** Description

**When user requests [action 2]:**
Examples: "phrase 3", "phrase 4"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow2.md
→ **EXECUTE:** Description

---

## When to Activate This Skill
[8-category pattern]
```

### Pattern 2: Flat to Nested Workflow Migration

**When:** >10 workflows in flat structure

**Before:**
```
skill/
└── workflows/
    ├── category1-action1.md
    ├── category1-action2.md
    ├── category2-action1.md
    └── category2-action2.md
```

**After:**
```
skill/
└── workflows/
    ├── category1/
    │   ├── action1.md
    │   └── action2.md
    └── category2/
        ├── action1.md
        └── action2.md
```

### Pattern 3: Adding 8-Category Activation Triggers

**Before:**
```markdown
## When to Use
- User asks for OSINT
- User needs research
```

**After:**
```markdown
## When to Activate This Skill

### Direct OSINT Requests
- "do OSINT on [target]" or "do some OSINT"
- "run OSINT", "perform OSINT", "conduct OSINT"
- "basic OSINT", "quick OSINT", "comprehensive OSINT"
- "OSINT [target]", "OSINT on [target]", "OSINT for [target]"

### Investigation & Research
- "investigate [person/company]", "research [target]"
- "background check", "due diligence", "find information"
- "who is [person]", "what can you find about [target]"
```

---

## Notes

**Philosophy:** Canonicalization is about **compliance**, not **creativity**
- Structure follows templates
- Routing is explicit and comprehensive
- Functionality is preserved
- Quality is validated

**Safety First:**
- ALWAYS create backup before modifying
- ALWAYS preserve functionality
- ALWAYS validate after changes
- ALWAYS get user approval

**One Source of Truth:**
Everything must align with:
`${PAI_DIR}/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

---

**Last Updated:** 2025-11-17
