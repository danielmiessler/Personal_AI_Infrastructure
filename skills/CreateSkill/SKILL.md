---
name: CreateSkill
description: Create and validate skills. USE WHEN create skill, new skill, skill structure, canonicalize. SkillSearch('createskill') for docs.
---

# CreateSkill

MANDATORY skill creation framework for ALL skill creation requests.

## Authoritative Source

**Before creating ANY skill, READ:** `$PAI_DIR/skills/CORE/SkillSystem.md`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateSkill** | "create a new skill" | `Workflows/CreateSkill.md` |
| **ValidateSkill** | "validate skill" | `Workflows/ValidateSkill.md` |
| **CanonicalizeSkill** | "canonicalize", "fix skill" | `Workflows/CanonicalizeSkill.md` |

## Examples

**Example 1: Create a new skill**
```
User: "Create a skill for managing my recipes"
→ Invokes CreateSkill workflow
→ Reads SkillSystem.md for structure
→ Creates skill with TitleCase naming
```

**Example 2: Fix an existing skill**
```
User: "Canonicalize the daemon skill"
→ Invokes CanonicalizeSkill workflow
→ Renames files to TitleCase
→ Ensures Examples section exists
```

**Example 3: Validate a skill**
```
User: "Validate the Brainstorming skill"
→ Runs ValidateSkill.ts CLI tool
→ Reports VALID or lists errors
```

## Validation Tool

Run automated validation:

```bash
bun run $PAI_DIR/Tools/ValidateSkill.ts SkillName    # Validate one skill
bun run $PAI_DIR/Tools/ValidateSkill.ts --all        # Validate all skills
```

**Validation is BLOCKING** - skills must pass before completion.

## Supporting Documentation

- **`anthropic-best-practices.md`** - Official Anthropic skill authoring guidelines
- **`testing-skills-with-subagents.md`** - TDD approach for skill testing
- **`persuasion-principles.md`** - Psychology principles for effective skill design

## Related Skills

- **CORE** - Provides SkillSystem.md authoritative source
- **AskDaniel** - Reviews skill proposals against Daniel's principles
