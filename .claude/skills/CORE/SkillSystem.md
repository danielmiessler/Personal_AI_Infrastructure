# Custom Skill System

**The MANDATORY configuration system for ALL PAI skills.**

---

## THIS IS THE AUTHORITATIVE SOURCE

This document defines the **required structure** for every skill in the PAI system.

**ALL skill creation MUST follow this structure.**

**"Canonicalize a skill"** = Restructure it to match this exact format, including TitleCase naming.

---

## TitleCase Naming Convention (MANDATORY)

**All naming in the skill system MUST use TitleCase (PascalCase).**

| Component | Wrong | Correct |
|-----------|-------|---------|
| Skill directory | `createskill`, `create-skill` | `Createskill` |
| Workflow files | `create.md`, `update-info.md` | `Create.md`, `UpdateInfo.md` |
| Reference docs | `prosody-guide.md` | `ProsodyGuide.md` |
| Tool files | `manage-server.ts` | `ManageServer.ts` |
| YAML name | `name: create-skill` | `name: Createskill` |

**Exception:** `SKILL.md` is always uppercase (convention for the main skill file).

---

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
- `USE WHEN` keyword is **MANDATORY** (Claude Code parses this for skill activation)
- Use intent-based triggers with `OR` for multiple conditions
- Max 1024 characters (Anthropic hard limit)

### 2. Markdown Body

```markdown
# SkillName

[Brief description]

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName SkillName
```

| Workflow | Trigger | File |
|----------|---------|------|
| **WorkflowOne** | "trigger phrase" | `workflows/WorkflowOne.md` |
| **WorkflowTwo** | "another trigger" | `workflows/WorkflowTwo.md` |

## Examples

**Example 1: [Common use case]**
```
User: "[Typical user request]"
→ Invokes WorkflowOne workflow
→ [What skill does]
→ [What user gets back]
```

## [Additional Sections]
```

---

## Examples Section (REQUIRED)

**Every skill MUST have an `## Examples` section** showing 2-3 concrete usage patterns.

**Why Examples Matter:**
- Anthropic research shows examples improve tool selection accuracy from 72% to 90%
- Descriptions tell Claude WHEN to activate; examples show HOW the skill works

**Example Format:**
```markdown
## Examples

**Example 1: [Use case name]**
```
User: "[Actual user request]"
→ Invokes WorkflowName workflow
→ [What the skill does]
→ [What user receives back]
```
```

---

## Intent Matching, Not String Matching

We use **intent matching**, not exact phrase matching.

**Example description:**
```yaml
description: Complete blog workflow. USE WHEN user mentions doing anything with their blog, website, site, including things like update, proofread, write, edit, publish, preview, blog posts, or website pages.
```

**Key Principles:**
- Use intent language: "user mentions", "user wants to", "including things like"
- Don't list exact phrases in quotes
- Cover the domain conceptually
- Use `OR` to combine multiple trigger conditions

---

## Directory Structure

Every skill follows this structure:

```
SkillName/                    # TitleCase directory name
├── SKILL.md                  # Main skill file (always uppercase)
├── ReferenceDoc.md           # Optional: Reference docs (TitleCase)
├── tools/                    # CLI tools (ALWAYS present, even if empty)
│   ├── ToolName.ts           # TypeScript CLI tool (TitleCase)
│   └── ToolName.help.md      # Tool documentation (TitleCase)
└── workflows/
    ├── Create.md             # Work execution workflow (TitleCase)
    └── Update.md             # Work execution workflow (TitleCase)
```

---

## Workflows vs Reference Documentation

**CRITICAL DISTINCTION:**

### Workflows (`workflows/` directory)
- Operational procedures (create, update, delete, deploy)
- Step-by-step execution instructions
- Actions that change state or produce output
- Things you "run" or "execute"

### Reference Documentation (skill root)
- Guides and how-to documentation
- Specifications and schemas
- Information you "read" or "reference"

---

## Complete Checklist

Before a skill is complete:

### Naming (TitleCase)
- [ ] Skill directory uses TitleCase
- [ ] All workflow files use TitleCase
- [ ] All reference docs use TitleCase
- [ ] YAML `name:` uses TitleCase

### YAML Frontmatter
- [ ] Single-line description with embedded `USE WHEN` clause
- [ ] No separate `triggers:` or `workflows:` arrays
- [ ] Description under 1024 characters

### Markdown Body
- [ ] `## Workflow Routing` section with table format
- [ ] `## Examples` section with 2-3 concrete patterns
- [ ] All workflows have routing entries

### Structure
- [ ] `tools/` directory exists (even if empty)
- [ ] No `backups/` directory inside skill
- [ ] Workflows contain ONLY execution procedures
- [ ] Reference docs live at skill root

---

## Summary

| Component | Purpose | Naming |
|-----------|---------|--------|
| **Skill directory** | Contains all skill files | TitleCase (e.g., `Blogging`) |
| **SKILL.md** | Main skill file | Always uppercase |
| **Workflow files** | Execution procedures | TitleCase (e.g., `Create.md`) |
| **Reference docs** | Information to read | TitleCase (e.g., `ApiReference.md`) |
| **Tool files** | CLI automation | TitleCase (e.g., `ManageServer.ts`) |

This system ensures:
1. Skills invoke properly based on intent (USE WHEN in description)
2. Specific functionality executes accurately (Workflow Routing in body)
3. All skills have consistent, predictable structure
4. **All naming follows TitleCase convention**
