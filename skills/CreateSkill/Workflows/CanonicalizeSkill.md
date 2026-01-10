# CanonicalizeSkill Workflow

> **Trigger:** "canonicalize", "fix skill"
> **Input:** Skill with structural issues
> **Output:** Skill conforming to SkillSystem.md standards

## Prerequisites

First run ValidateSkill to identify issues:
```
Using ValidateSkill workflow to identify issues...
```

## Step 1: Fix Directory Naming

If directory not TitleCase:
```bash
# Rename directory
mv $PAI_DIR/skills/oldname $PAI_DIR/skills/NewName
```

## Step 2: Fix YAML Frontmatter

### 2.1 Fix name Field

```yaml
# WRONG
name: create-skill
name: createSkill

# RIGHT
name: CreateSkill
```

### 2.2 Fix description Field

```yaml
# WRONG - multi-line
description: |
  This skill does something.
  USE WHEN creating things.

# RIGHT - single line
description: Creates things. USE WHEN creating, making, building. Supports templates.
```

### 2.3 Add USE WHEN Clause

If missing:
```yaml
# WRONG
description: Manages recipes and cooking instructions.

# RIGHT
description: Manages recipes and cooking instructions. USE WHEN recipe, cooking, ingredient, meal planning.
```

## Step 3: Fix Markdown Body

### 3.1 Add Workflow Routing Section

If missing:
```markdown
## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **MainWorkflow** | "main trigger" | `Workflows/MainWorkflow.md` |
```

### 3.2 Add Examples Section

If missing:
```markdown
## Examples

**Example 1: Basic usage**
```
User: "Do the thing"
→ Invokes MainWorkflow
→ Thing is done
```
```

## Step 4: Fix File Naming

Rename any non-TitleCase files:

```bash
# Workflows
mv Workflows/create.md Workflows/Create.md
mv Workflows/update-info.md Workflows/UpdateInfo.md

# Tools
mv Tools/manage-server.ts Tools/ManageServer.ts
```

## Step 5: Create Missing Directories

```bash
# Ensure Tools/ exists
mkdir -p $PAI_DIR/skills/SkillName/Tools

# Ensure Workflows/ exists (if routing table has entries)
mkdir -p $PAI_DIR/skills/SkillName/Workflows
```

## Step 6: Create Missing Workflow Files

For each workflow in routing table without a file:
1. Create the file with standard structure
2. Extract content from SKILL.md if inline
3. Add workflow header, steps, completion

## Step 7: Re-validate

```
Using ValidateSkill to confirm all issues resolved...
```

## Completion

If all issues fixed:
```
Skill SkillName canonicalized. All checks now pass.

Changes made:
- [List of changes]

Run skill index regeneration to update registry.
```

If issues remain:
```
Skill SkillName partially canonicalized. [N] issues remain:
- [List remaining issues]
```

## Skills Invoked

| Step | Skill |
|------|-------|
| Prerequisites | ValidateSkill |
| Step 7 | ValidateSkill |
