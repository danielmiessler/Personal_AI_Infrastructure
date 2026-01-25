---
name: PAI CreateSkill Skill
pack-id: danielmiessler-createskill-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Skill creation and validation framework - create new skills, validate existing skills, canonicalize skill structure, and update skills following PAI conventions
type: skill
purpose-type: [development, productivity, system-management]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v2.3.0]
keywords: [skill, create, validate, canonicalize, update, structure, TitleCase, naming, workflows, routing]
---

<p align="center">
  <img src="../icons/createskill-skill.png" alt="PAI CreateSkill Skill" width="256">
</p>

# PAI CreateSkill Skill

> Mandatory skill creation and validation framework for all PAI skill development

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| CreateSkill skill | `src/skills/CreateSkill/SKILL.md` | Main skill routing and documentation |
| CreateSkill workflow | `src/skills/CreateSkill/Workflows/CreateSkill.md` | Create new skills with proper structure |
| ValidateSkill workflow | `src/skills/CreateSkill/Workflows/ValidateSkill.md` | Validate existing skills against canonical format |
| CanonicalizeSkill workflow | `src/skills/CreateSkill/Workflows/CanonicalizeSkill.md` | Fix and restructure non-compliant skills |
| UpdateSkill workflow | `src/skills/CreateSkill/Workflows/UpdateSkill.md` | Add workflows or modify existing skills |

## The Problem

PAI skills must follow a specific canonical structure to ensure:
- Consistent skill routing and discovery
- Proper trigger-based invocation
- Maintainable and navigable skill directories
- Interoperability across the PAI ecosystem

**Without standards:**
- Skills become inconsistent and hard to discover
- Routing fails due to malformed frontmatter
- TitleCase violations break file references
- Missing Examples sections make skills unusable

## The Solution

### Canonical Skill Structure

Every skill follows this exact pattern:

```
skills/SkillName/
  SKILL.md              # Main skill definition (TitleCase name in frontmatter)
  ContextFile.md        # Optional context files at root level
  Workflows/            # Execution workflows ONLY
    WorkflowName.md     # TitleCase workflow files
  Tools/                # Executable scripts/tools ONLY
    ToolName.ts         # TitleCase tool files
```

### TitleCase Naming Convention

| Component | Format | Example |
|-----------|--------|---------|
| Skill directory | TitleCase | `Blogging`, `Daemon`, `CreateSkill` |
| Workflow files | TitleCase.md | `Create.md`, `UpdateDaemonInfo.md` |
| Reference docs | TitleCase.md | `ProsodyGuide.md`, `ApiReference.md` |
| Tool files | TitleCase.ts | `ManageServer.ts` |

### Flat Folder Structure

Maximum depth: `skills/SkillName/Category/` (2 levels max)

**Allowed subdirectories:**
- `Workflows/` - Execution workflows ONLY
- `Tools/` - Executable scripts/tools ONLY

Context files (documentation, guides, references) go in the skill ROOT, NOT in subdirectories.

### Dynamic Loading Pattern

For skills with SKILL.md > 100 lines:
- **SKILL.md** = Minimal (30-50 lines) - loads on skill invocation
- **Additional .md files** = Context files loaded on-demand

## Four Core Workflows

### 1. CreateSkill
Create new skills with proper structure from scratch.

```
"Create a skill for managing my recipes"
```

### 2. ValidateSkill
Check if an existing skill follows canonical structure.

```
"Validate the research skill"
```

### 3. CanonicalizeSkill
Restructure non-compliant skills to match canonical format.

```
"Canonicalize the daemon skill"
```

### 4. UpdateSkill
Add workflows or modify existing skills while maintaining structure.

```
"Add a new workflow to the blogging skill"
```

## Example Usage

```
# Create a new skill
"Create a skill for managing my recipes"

# Validate an existing skill
"The research skill isn't triggering - validate it"

# Fix a non-compliant skill
"Canonicalize the daemon skill"

# Add to an existing skill
"Add a deploy workflow to the blogging skill"
```

## Changelog

### 2.3.0 - 2026-01-14
- Initial PAI pack release
- Extracted from PAI skills directory
- Full CreateSkill framework with 4 workflows
- TitleCase naming enforcement
- Flat folder structure validation
- Dynamic loading pattern documentation
