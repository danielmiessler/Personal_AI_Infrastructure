# CreateSkill Workflow

Create a new skill following the canonical structure with proper TitleCase naming.

## Step 1: Read the Authoritative Sources

**REQUIRED FIRST:**

1. Read the skill system documentation: `${PAI_DIR}/skills/CORE/SkillSystem.md`
2. Read the canonical example: `${PAI_DIR}/skills/Blogging/SKILL.md`

## Step 2: Understand the Request

Ask the user:
1. What does this skill do?
2. What should trigger it?
3. What workflows does it need?

## Step 3: Determine TitleCase Names

**All names must use TitleCase (PascalCase).**

| Component | Format | Example |
|-----------|--------|---------|
| Skill directory | TitleCase | `Blogging`, `Daemon`, `CreateSkill` |
| Workflow files | TitleCase.md | `Create.md`, `UpdateDaemonInfo.md` |
| Reference docs | TitleCase.md | `ProsodyGuide.md`, `ApiReference.md` |
| Tool files | TitleCase.ts | `ManageServer.ts` |
| Help files | TitleCase.help.md | `ManageServer.help.md` |

**Wrong naming (NEVER use):**
- `create-skill`, `create_skill`, `CREATESKILL` → Use `CreateSkill`
- `create.md`, `CREATE.md`, `create-info.md` → Use `Create.md`, `CreateInfo.md`

## Step 4: Create the Skill Directory

```bash
mkdir -p ${PAI_DIR}/skills/[SkillName]/workflows
mkdir -p ${PAI_DIR}/skills/[SkillName]/tools
```

**Example:**
```bash
mkdir -p ${PAI_DIR}/skills/Daemon/workflows
mkdir -p ${PAI_DIR}/skills/Daemon/tools
```

## Step 5: Create SKILL.md

Follow this exact structure:

```yaml
---
name: SkillName
description: [What it does]. USE WHEN [intent triggers using OR]. [Additional capabilities].
---

# SkillName

[Brief description]

## Workflow Routing

**When executing a workflow, output this notification:**

```
Running the **WorkflowName** workflow from the **SkillName** skill...
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

**Example 2: [Another use case]**
```
User: "[Different request]"
→ [Process]
→ [Output]
```

## [Additional Documentation]

[Any other relevant info]
```

## Step 6: Create Workflow Files

For each workflow in the routing section:

```bash
touch ${PAI_DIR}/skills/[SkillName]/workflows/[WorkflowName].md
```

**Examples (TitleCase):**
```bash
touch ${PAI_DIR}/skills/Daemon/workflows/UpdateDaemonInfo.md
touch ${PAI_DIR}/skills/Daemon/workflows/UpdatePublicRepo.md
touch ${PAI_DIR}/skills/Blogging/workflows/Create.md
touch ${PAI_DIR}/skills/Blogging/workflows/Publish.md
```

## Step 7: Verify TitleCase

Run this check:
```bash
ls ${PAI_DIR}/skills/[SkillName]/
ls ${PAI_DIR}/skills/[SkillName]/workflows/
ls ${PAI_DIR}/skills/[SkillName]/tools/
```

Verify ALL files use TitleCase:
- `SKILL.md` ✓ (exception - always uppercase)
- `WorkflowName.md` ✓
- `ToolName.ts` ✓
- `ToolName.help.md` ✓

## Step 8: Final Checklist

### Naming (TitleCase)
- [ ] Skill directory uses TitleCase (e.g., `Blogging`, `Daemon`)
- [ ] All workflow files use TitleCase (e.g., `Create.md`, `UpdateInfo.md`)
- [ ] All reference docs use TitleCase (e.g., `ProsodyGuide.md`)
- [ ] All tool files use TitleCase (e.g., `ManageServer.ts`)
- [ ] Routing table workflow names match file names exactly

### YAML Frontmatter
- [ ] `name:` uses TitleCase
- [ ] `description:` is single-line with embedded `USE WHEN` clause
- [ ] No separate `triggers:` or `workflows:` arrays
- [ ] Description uses intent-based language
- [ ] Description is under 1024 characters

### Markdown Body
- [ ] `## Workflow Routing` section with table format
- [ ] All workflow files have routing entries
- [ ] `## Examples` section with 2-3 concrete usage patterns

### Structure
- [ ] `tools/` directory exists (even if empty)
- [ ] No `backups/` directory inside skill

## Done

Skill created following canonical structure with proper TitleCase naming throughout.
