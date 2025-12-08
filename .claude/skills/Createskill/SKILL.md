---
name: Createskill
description: MANDATORY skill creation framework for ALL skill creation requests. USE WHEN user wants to create, validate, update, or canonicalize a skill, OR user mentions skill creation, skill development, new skill, build skill, OR user references skill compliance, skill structure, or skill architecture.
---

# Createskill

MANDATORY skill creation framework for ALL skill creation requests.

## Authoritative Source

**Before creating ANY skill, READ:** `${PAI_DIR}/skills/CORE/SkillSystem.md`

**Canonical example to follow:** `${PAI_DIR}/skills/Blogging/SKILL.md`

## TitleCase Naming Convention

**All naming must use TitleCase (PascalCase).**

| Component | Format | Example |
|-----------|--------|---------|
| Skill directory | TitleCase | `Blogging`, `Daemon`, `CreateSkill` |
| Workflow files | TitleCase.md | `Create.md`, `UpdateDaemonInfo.md` |
| Reference docs | TitleCase.md | `ProsodyGuide.md`, `ApiReference.md` |
| Tool files | TitleCase.ts | `ManageServer.ts` |
| Help files | TitleCase.help.md | `ManageServer.help.md` |

**Wrong (NEVER use):**
- `createskill`, `create-skill`, `CREATE_SKILL`
- `create.md`, `update-info.md`, `SYNC_REPO.md`

## Workflow Routing

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow from the **Createskill** skill...
```

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateSkill** | "create a new skill" | `workflows/CreateSkill.md` |
| **ValidateSkill** | "validate skill", "check skill" | `workflows/ValidateSkill.md` |
| **UpdateSkill** | "update skill", "add workflow" | `workflows/UpdateSkill.md` |
| **CanonicalizeSkill** | "canonicalize", "fix skill structure" | `workflows/CanonicalizeSkill.md` |

## Examples

**Example 1: Create a new skill from scratch**
```
User: "Create a skill for managing my recipes"
→ Invokes CreateSkill workflow
→ Reads SkillSystem.md for structure requirements
→ Creates skill directory with TitleCase naming
→ Creates SKILL.md, workflows/, tools/
→ Generates USE WHEN triggers based on intent
```

**Example 2: Fix an existing skill that's not routing properly**
```
User: "The research skill isn't triggering - validate it"
→ Invokes ValidateSkill workflow
→ Checks SKILL.md against canonical format
→ Verifies TitleCase naming throughout
→ Verifies USE WHEN triggers are intent-based
→ Reports compliance issues with fixes
```

**Example 3: Canonicalize a skill with old naming**
```
User: "Canonicalize the daemon skill"
→ Invokes CanonicalizeSkill workflow
→ Renames workflow files to TitleCase
→ Updates routing table to match
→ Ensures Examples section exists
→ Verifies all checklist items
```
