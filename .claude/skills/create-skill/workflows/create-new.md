# Create New Skill Workflow

## Trigger
User says: "create a new skill", "build a skill for", "add a skill"

## Purpose
Create a new skill from scratch following PAI/Anthropic standards.

## Workflow

### 1. Define Skill Purpose
Ask user:
- What does this skill do?
- When should it activate?
- What tools/commands will it use?
- Simple or complex?

### 2. Choose Structure

**Simple Skill** (single SKILL.md):
```
skills/skill-name/
└── SKILL.md
```

**Complex Skill** (with workflows):
```
skills/skill-name/
├── SKILL.md
└── workflows/
    ├── workflow-1.md
    └── workflow-2.md
```

### 3. Create SKILL.md

```markdown
---
name: skill-name
description: Clear description with USE WHEN triggers
---

# Skill Name

## When to Activate This Skill
- Trigger 1
- Trigger 2
- User phrase examples

## Core Workflow
[Main content]

## Examples
[Demonstrations]

## Reference
For complex skills: See workflows/ directory
```

### 4. Add Workflows (if needed)
Create workflows/ subdirectory with specific task workflows.

### 5. Test Activation
- Test trigger phrases
- Verify skill loads correctly
- Check workflow routing

## Templates
See create-skill/SKILL.md for complete templates and examples.
