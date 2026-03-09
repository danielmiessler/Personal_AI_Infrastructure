# Custom Skill System

**The MANDATORY configuration system for ALL PAI skills.**

*Full spec: [PAI/dev/SKILLSYSTEM-Reference.md](dev/SKILLSYSTEM-Reference.md)*

---

## TitleCase Naming Convention (MANDATORY)

All naming in the skill system MUST use TitleCase (PascalCase).

- Skill directory: `CreateSkill` (not `create-skill`)
- Workflow files: `UpdateInfo.md` (not `update-info.md`)
- Tool files: `ManageServer.ts`
- YAML name field: `name: CreateSkill`
- Exception: `SKILL.md` is always uppercase

---

## Personal vs System Skills

| Type | Naming | Sharing |
|------|--------|---------|
| **System** | TitleCase: `Research`, `Browser` | Exported to public PAI repo |
| **Personal** | `_ALLCAPS`: `_METRICS`, `_COMMS` | Never shared — contains personal data |

Personal skills sort first (underscore prefix) and are auto-excluded from PAI pack exports.

---

## Skill Customization Pattern

All system skills check for user customizations before executing:
```
~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/{SkillName}/
```
If that directory exists, load and apply any files found there before running the default workflow.

---

## YAML Frontmatter Rules (USE WHEN, routing, 1024 char limit)

Every `SKILL.md` starts with:
```yaml
---
name: SkillName
description: "One sentence. Triggers and purpose."
use_when: "Specific trigger conditions. Excludes. Max 1024 chars."
workflows:
  - WorkflowName: "One-line description"
---
```

**`use_when`** is the routing key — written for the LLM that reads it, not humans.

---

## Directory Structure

```
skills/{SkillName}/
├── SKILL.md          # Frontmatter + routing table (required)
├── Workflows/        # One .md per workflow
│   └── WorkflowName.md
└── Tools/            # Supporting TypeScript tools (optional)
    └── ToolName.ts
```

No other top-level files or directories. No subdirectories under Workflows/.

---

## Workflow Routing Table Format

Inside `SKILL.md`, after frontmatter:
```markdown
## Workflows

| Workflow | When to Use |
|----------|-------------|
| WorkflowName | Trigger condition — what makes this the right choice |
```

---

*Full spec with examples, canonicalization guide, and advanced patterns: [PAI/dev/SKILLSYSTEM-Reference.md](dev/SKILLSYSTEM-Reference.md)*
