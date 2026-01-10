# Custom Skill System

**The MANDATORY configuration system for ALL skills.**

## THIS IS THE AUTHORITATIVE SOURCE

This document defines the **required structure** for every skill in the system.

## TitleCase Naming Convention (MANDATORY)

**All naming in the skill system MUST use TitleCase (PascalCase).**

| Component | Wrong | Correct |
|-----------|-------|---------|
| Skill directory | `createskill`, `create-skill` | `CreateSkill` |
| Workflow files | `create.md`, `update-info.md` | `Create.md`, `UpdateInfo.md` |
| Tool files | `manage-server.ts` | `ManageServer.ts` |
| YAML name | `name: create-skill` | `name: CreateSkill` |

## The Required Structure

Every SKILL.md has two parts:

### 1. YAML Frontmatter (Single-Line Description)

```yaml
---
name: SkillName
description: [What it does]. USE WHEN [intent triggers using OR]. [Additional capabilities].
---
```

**Rules:**
- `name` uses **TitleCase**
- `description` is a **single line** (not multi-line with `|`)
- `USE WHEN` keyword is **MANDATORY** (exception: internal disciplines)
- Max 1024 characters
- Optional `tier: internal` for discipline skills

### 2. Markdown Body (Workflow Routing + Examples)

```markdown
# SkillName

[Brief description]

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **WorkflowOne** | "trigger phrase" | `Workflows/WorkflowOne.md` |

## Examples

**Example 1: [Use case]**
```
User: "[Request]"
→ Invokes WorkflowOne workflow
→ [Result]
```
```

## Directory Structure

```
SkillName/
├── SKILL.md              # Main skill file
├── QuickStartGuide.md    # Context files in root (TitleCase)
├── Tools/                # CLI tools (ALWAYS present)
│   └── ToolName.ts
└── Workflows/            # Work execution workflows
    └── WorkflowName.md
```

## Workflow File Pattern

Each workflow in the routing table MUST have a corresponding file:

```markdown
# WorkflowName Workflow

> **Trigger:** [What triggers this workflow]
> **Input:** [What it receives]
> **Output:** [What it produces]

## Step 1: [First Step]
...

## Completion

[How this workflow ends and hands off]

## Skills Invoked

| Step | Skill |
|------|-------|
| [Step N] | [OtherSkill] |
```

Workflow files document:
- Clear entry/exit criteria
- Step-by-step execution
- Cross-skill handoffs
- What other skills are invoked

## Skill Tiers

| Tier | Description | Example |
|------|-------------|---------|
| `always` | Loaded at session start | CORE |
| `deferred` | Loaded on demand via triggers | Brainstorming, AskDaniel |
| `internal` | Called by other skills only | TestDrivenDevelopment, VerificationBeforeCompletion |

Internal skills don't have user-facing triggers - they're invoked by the methodology.

## Complete Checklist

### SKILL.md Requirements
- [ ] Skill directory uses TitleCase
- [ ] YAML `name:` uses TitleCase
- [ ] Single-line `description` with `USE WHEN` clause (or `tier: internal`)
- [ ] `## Workflow Routing` section with table format
- [ ] `## Examples` section with 2-3 usage patterns
- [ ] `## Related Skills` section with calls/called by
- [ ] `Tools/` directory exists (even if empty)
- [ ] All workflow files use TitleCase

### Workflow File Requirements
- [ ] Each workflow in routing table has a file in `Workflows/`
- [ ] Trigger/Input/Output header block at top
- [ ] Multiple phases/steps with clear actions
- [ ] `## Completion` section with handoff
- [ ] `## Skills Invoked` table at bottom

### Cross-Skill References
- [ ] All skill references are valid (skill exists)
- [ ] References are bidirectional (if A calls B, B lists A as caller)
- [ ] No circular dependencies that would cause infinite loops
