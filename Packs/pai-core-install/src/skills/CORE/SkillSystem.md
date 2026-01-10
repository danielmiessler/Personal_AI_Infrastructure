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
- `USE WHEN` keyword is **MANDATORY**
- Max 1024 characters

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
\`\`\`
User: "[Request]"
→ Invokes WorkflowOne workflow
→ [Result]
\`\`\`
```

## Directory Structure

```
SkillName/
├── SKILL.md              # Main skill file
├── QuickStartGuide.md    # Context files in root (TitleCase)
├── Tools/                # CLI tools (ALWAYS present)
│   └── ToolName.ts
└── Workflows/            # Work execution workflows
    └── Create.md
```

## Complete Checklist

- [ ] Skill directory uses TitleCase
- [ ] YAML `name:` uses TitleCase
- [ ] Single-line `description` with `USE WHEN` clause
- [ ] `## Workflow Routing` section with table format
- [ ] `## Examples` section with 2-3 usage patterns
- [ ] `Tools/` directory exists (even if empty)
- [ ] All workflow files use TitleCase
