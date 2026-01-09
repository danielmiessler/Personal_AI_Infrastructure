---
name: CreateSkill
description: Create and validate skills. USE WHEN create skill, new skill, skill structure, canonicalize. SkillSearch('createskill') for docs.
---

# CreateSkill

MANDATORY skill creation framework for ALL skill creation requests.

## Authoritative Source

**Before creating ANY skill, READ:** `$PAI_DIR/skills/CORE/SkillSystem.md`

This document contains the complete specification for:
- Skill directory structure
- SKILL.md format and required sections
- Workflow file conventions
- Naming conventions (TitleCase)
- Examples section requirements

## How to Create a Skill

1. **Read the spec:** `$PAI_DIR/skills/CORE/SkillSystem.md`
2. **Create directory:** `$PAI_DIR/skills/SkillName/`
3. **Create SKILL.md** with required frontmatter and sections
4. **Add Workflows/** directory if needed
5. **Validate** by checking all workflow references resolve

## How to Validate a Skill

Run the pack validator:
```bash
bun run $PAI_DIR/Tools/validate-pack.ts
```

Or manually check:
- SKILL.md exists with valid frontmatter
- All `Workflows/*.md` references in SKILL.md exist
- Examples section is present

## How to Canonicalize a Skill

1. Rename files/directories to TitleCase
2. Ensure SKILL.md has required sections
3. Verify workflow references resolve
4. Add Examples section if missing

## Examples

**Example 1: Create a new skill**
```
User: "Create a skill for managing my recipes"
→ Read SkillSystem.md for structure
→ Create $PAI_DIR/skills/Recipes/SKILL.md
→ Use TitleCase naming throughout
```

**Example 2: Fix an existing skill**
```
User: "Canonicalize the daemon skill"
→ Rename files to TitleCase
→ Ensure Examples section exists
→ Validate workflow references
```
