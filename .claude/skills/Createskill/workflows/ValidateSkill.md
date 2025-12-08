# ValidateSkill Workflow

**Purpose:** Check if an existing skill follows the canonical structure with proper TitleCase naming.

---

## Step 1: Read the Authoritative Source

**REQUIRED FIRST:** Read the canonical structure:

```
${PAI_DIR}/skills/CORE/SkillSystem.md
```

---

## Step 2: Read the Target Skill

```bash
${PAI_DIR}/skills/[SkillName]/SKILL.md
```

---

## Step 3: Check TitleCase Naming

### Skill Directory
```bash
ls ${PAI_DIR}/skills/ | grep -i [skillname]
```

Verify TitleCase:
- ✓ `Blogging`, `Daemon`, `CreateSkill`
- ✗ `createskill`, `create-skill`, `CREATE_SKILL`

### Workflow Files
```bash
ls ${PAI_DIR}/skills/[SkillName]/workflows/
```

Verify TitleCase:
- ✓ `Create.md`, `UpdateDaemonInfo.md`, `SyncRepo.md`
- ✗ `create.md`, `update-daemon-info.md`, `SYNC_REPO.md`

### Tool Files
```bash
ls ${PAI_DIR}/skills/[SkillName]/tools/
```

Verify TitleCase:
- ✓ `ManageServer.ts`, `ManageServer.help.md`
- ✗ `manage-server.ts`, `MANAGE_SERVER.ts`

---

## Step 4: Check YAML Frontmatter

Verify the YAML has:

### Single-Line Description with USE WHEN
```yaml
---
name: SkillName
description: [What it does]. USE WHEN [intent triggers using OR]. [Additional capabilities].
---
```

**Check for violations:**
- Multi-line description using `|` (WRONG)
- Missing `USE WHEN` keyword (WRONG)
- Separate `triggers:` array in YAML (OLD FORMAT - WRONG)
- Separate `workflows:` array in YAML (OLD FORMAT - WRONG)
- `name:` not in TitleCase (WRONG)

---

## Step 5: Check Markdown Body

Verify the body has:

### Workflow Routing Section
```markdown
## Workflow Routing

**When executing a workflow, output this notification:**

```
Running the **WorkflowName** workflow from the **SkillName** skill...
```

| Workflow | Trigger | File |
|----------|---------|------|
| **WorkflowOne** | "trigger phrase" | `workflows/WorkflowOne.md` |
```

**Check for violations:**
- Missing `## Workflow Routing` section
- Workflow names not in TitleCase
- File paths not matching actual file names

### Examples Section
```markdown
## Examples

**Example 1: [Use case]**
```
User: "[Request]"
→ [Action]
→ [Result]
```
```

**Check:** Examples section required (WRONG if missing)

---

## Step 6: Check Workflow Files

```bash
ls ${PAI_DIR}/skills/[SkillName]/workflows/
```

Verify:
- Every file uses TitleCase naming
- Every file has a corresponding entry in `## Workflow Routing` section
- Every routing entry points to an existing file
- Routing table names match file names exactly

---

## Step 7: Check Structure

```bash
ls -la ${PAI_DIR}/skills/[SkillName]/
```

Verify:
- `tools/` directory exists (even if empty)
- No `backups/` directory inside skill
- Reference docs at skill root (not in workflows/)

---

## Step 8: Report Results

**COMPLIANT** if all checks pass:

### Naming (TitleCase)
- [ ] Skill directory uses TitleCase
- [ ] All workflow files use TitleCase
- [ ] All reference docs use TitleCase
- [ ] All tool files use TitleCase
- [ ] Routing table names match file names

### YAML Frontmatter
- [ ] `name:` uses TitleCase
- [ ] `description:` is single-line with `USE WHEN`
- [ ] No separate `triggers:` or `workflows:` arrays
- [ ] Description under 1024 characters

### Markdown Body
- [ ] `## Workflow Routing` section present
- [ ] `## Examples` section with 2-3 patterns
- [ ] All workflows have routing entries

### Structure
- [ ] `tools/` directory exists
- [ ] No `backups/` inside skill

**NON-COMPLIANT** if any check fails. Recommend using CanonicalizeSkill workflow.
