# CreateSkill Workflow

> **Trigger:** "create a new skill"
> **Input:** Skill purpose/requirements
> **Output:** Complete skill directory with SKILL.md

## Prerequisites

**Before creating ANY skill, READ:** `$PAI_DIR/skills/CORE/SkillSystem.md`

This is the authoritative source for skill structure.

## Step 1: Define Skill Purpose

Ask clarifying questions:
- What is the skill's single responsibility?
- What phrases should trigger it? (USE WHEN clause)
- What workflows will it contain?
- What tools (if any) does it need?

## Step 2: Choose TitleCase Name

```
WRONG: recipe-manager, recipeManager, recipe_manager
RIGHT: RecipeManager
```

Name must be:
- TitleCase (PascalCase)
- Descriptive of purpose
- Unique in skill registry

## Step 3: Create Directory Structure

```bash
mkdir -p $PAI_DIR/skills/SkillName/Tools
mkdir -p $PAI_DIR/skills/SkillName/Workflows
```

Structure:
```
SkillName/
├── SKILL.md              # Main skill file
├── Tools/                # CLI tools (always present)
└── Workflows/            # Work execution workflows
```

## Step 4: Write SKILL.md

### 4.1 YAML Frontmatter

```yaml
---
name: SkillName
description: [What it does]. USE WHEN [triggers using OR]. [Additional capabilities].
---
```

Rules:
- `name` uses TitleCase
- `description` is single line
- `USE WHEN` keyword is MANDATORY
- Max 1024 characters

### 4.2 Markdown Body

```markdown
# SkillName

[Brief description - 1-2 sentences]

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

### 4.3 Complete SKILL.md Template

```markdown
---
name: SkillName
description: [What it does]. USE WHEN [trigger1] OR [trigger2]. [Additional info].
---

# SkillName

[2-3 sentences about the skill]

**Announce at start:** "I'm using the SkillName skill to [action]."

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **WorkflowOne** | Trigger condition | What it does |

## [Main Content Sections]

...

## Examples

**Example 1: [Use case]**
```
User: "[Request]"
-> [Action taken]
-> [Result]
```

## Related Skills

- **OtherSkill** - [Relationship description]
```

## Step 5: Create Workflow Files

For each workflow in the routing table:

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

### 5.1 Complete Workflow Template

```markdown
# WorkflowName Workflow

> **Trigger:** [What triggers this]
> **Input:** [What it receives]
> **Output:** [What it produces]

## Step 1: [First Step]

[Description]

## Step 2: [Second Step]

[Description]

## Completion

[How this ends, handoff instructions]

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| [When X] | [SkillName] |
```

**For workflows that don't invoke other skills, use null state:**

```markdown
## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
```

## Step 6: Add Related Skills Section

Document skill composition in SKILL.md:

```markdown
## Related Skills

**Called by:**
- [SkillName] ([when/why])

**Calls:**
- [SkillName] ([when/why])
```

Every skill should integrate with at least one other skill.

## Step 7: Validate (MANDATORY - BLOCKING)

**This step MUST pass before claiming completion.**

Run automated validation:

```bash
bun run $PAI_DIR/Tools/ValidateSkill.ts SkillName
```

ValidateSkill.ts checks:
- [ ] Directory structure (TitleCase, Tools/, Workflows/)
- [ ] YAML frontmatter (name, description, USE WHEN)
- [ ] Markdown body (Workflow Routing, Examples, Related Skills)
- [ ] Workflow files (Trigger/Input/Output, Completion, Skills Invoked)
- [ ] Cross-skill references valid

**If validation fails:**
1. Read the error messages
2. Fix each issue
3. Re-run validation
4. Repeat until VALID

**DO NOT claim completion if validation fails.**

## Completion

After **ValidateSkill.ts passes with VALID result**:

```
Skill created: SkillName
Validation: PASSED

Files:
- skills/SkillName/SKILL.md
- skills/SkillName/Tools/
- skills/SkillName/Workflows/[WorkflowName].md
```

Then regenerate index:

```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
```

**If ValidateSkill.ts returns INVALID, the skill is NOT complete.**

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
