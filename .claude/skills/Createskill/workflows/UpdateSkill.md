# UpdateSkill Workflow

**Purpose:** Add workflows or modify an existing skill while maintaining canonical structure and TitleCase naming.

---

## Step 1: Read the Authoritative Source

**REQUIRED FIRST:** Read the canonical structure:

```
${PAI_DIR}/skills/CORE/SkillSystem.md
```

---

## Step 2: Read the Current Skill

```bash
${PAI_DIR}/skills/[SkillName]/SKILL.md
```

Understand the current:
- Description (single-line with USE WHEN)
- Workflow routing (in markdown body)
- Existing TitleCase naming

---

## Step 3: Understand the Update

What needs to change?
- Adding a new workflow?
- Modifying the description/triggers?
- Updating documentation?

---

## Step 4: Make Changes

### To Add a New Workflow:

1. **Determine TitleCase name:**
   - ✓ `Create.md`, `UpdateDaemonInfo.md`, `SyncRepo.md`
   - ✗ `create.md`, `update-daemon-info.md`, `SYNC_REPO.md`

2. **Create the workflow file:**
```bash
touch ${PAI_DIR}/skills/[SkillName]/workflows/[WorkflowName].md
```

Example:
```bash
touch ${PAI_DIR}/skills/Daemon/workflows/UpdatePublicRepo.md
```

3. **Add entry to `## Workflow Routing` section in SKILL.md:**
```markdown
## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ExistingWorkflow** | "existing trigger" | `workflows/ExistingWorkflow.md` |
| **NewWorkflow** | "new trigger" | `workflows/NewWorkflow.md` |
```

4. **Write the workflow content**

### To Update Triggers:

Modify the single-line `description` in YAML frontmatter:
```yaml
description: [What it does]. USE WHEN [updated intent triggers using OR]. [Capabilities].
```

### To Add a Tool:

1. **Create TitleCase tool file:**
```bash
touch ${PAI_DIR}/skills/[SkillName]/tools/ToolName.ts
touch ${PAI_DIR}/skills/[SkillName]/tools/ToolName.help.md
```

2. **Ensure tools/ directory exists:**
```bash
mkdir -p ${PAI_DIR}/skills/[SkillName]/tools
```

---

## Step 5: Verify TitleCase

After making changes, verify naming:

```bash
ls ${PAI_DIR}/skills/[SkillName]/workflows/
ls ${PAI_DIR}/skills/[SkillName]/tools/
```

All files must use TitleCase:
- ✓ `WorkflowName.md`
- ✓ `ToolName.ts`, `ToolName.help.md`
- ✗ `workflow-name.md`, `tool_name.ts`

---

## Step 6: Final Checklist

### Naming
- [ ] New workflow files use TitleCase
- [ ] New tool files use TitleCase
- [ ] Routing table names match file names exactly

### Structure
- [ ] YAML still has single-line description with USE WHEN
- [ ] No separate `triggers:` or `workflows:` arrays in YAML
- [ ] Markdown body has `## Workflow Routing` section
- [ ] All routes point to existing files
- [ ] New workflow files have routing entries

---

## Done

Skill updated while maintaining canonical structure and TitleCase naming.
