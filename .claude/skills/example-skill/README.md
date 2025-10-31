# Example Skill

**Purpose:** Demonstrate the Skills-as-Containers pattern from PAI v1.2.0

## Overview

This skill exists purely for educational purposes - to show users the complete Skills-as-Containers architecture pattern. It's a template you can copy and customize for your own skills.

## What's Included

### Core Files
- **SKILL.md** - Main skill definition with routing logic and documentation
- **README.md** - This file (overview and instructions)

### Workflows
- **simple-task.md** - Basic single-step workflow demonstration
- **complex-task.md** - Multi-step workflow with validation and error handling
- **parallel-task.md** - Agent orchestration for parallel execution

### Assets
- **template.md** - Example template file showing reusable patterns
- **reference.md** - Example reference material for quick lookup

## Architecture Demonstrated

This skill shows the complete v1.2.0 pattern:

```
example-skill/
├── SKILL.md              # Core definition + routing
├── README.md             # This overview
├── workflows/            # Specific tasks
│   ├── simple-task.md
│   ├── complex-task.md
│   └── parallel-task.md
└── assets/               # Supporting resources
    ├── template.md
    └── reference.md
```

## Key Concepts

### 1. Skills-as-Containers
Skills are self-contained modules packaging:
- Domain expertise (SKILL.md)
- Specific workflows (workflows/)
- Supporting resources (assets/)

### 2. Progressive Disclosure
Load only what you need, when you need it:
- Metadata always loaded (YAML frontmatter)
- SKILL.md loaded when skill activates
- Workflows loaded when selected
- Assets loaded when referenced

### 3. Natural Language Routing
```
User: "Show me a simple example"
    ↓
example-skill activates
    ↓
simple-task.md selected
    ↓
Workflow executes
```

No memorizing commands - just natural language!

### 4. Workflow Organization
- Each workflow = one specific task
- Self-contained with clear steps
- Can be invoked directly or auto-selected
- Include trigger phrases for routing

## How to Use This as a Template

### 1. Copy the Structure
```bash
cp -r ~/.claude/skills/example-skill ~/.claude/skills/your-skill-name
```

### 2. Customize SKILL.md
- Update name in frontmatter
- Change description and triggers
- Replace example content with your domain
- Update workflow documentation

### 3. Create Your Workflows
- Replace example workflows with your tasks
- Name them descriptively
- Keep each focused on one operation
- Include clear trigger phrases

### 4. Add Your Assets
- Templates specific to your domain
- Reference materials you'll need
- Helper scripts or data files
- Keep organized by type

### 5. Test It
- Test natural language triggers
- Verify workflow routing works
- Check asset loading
- Ensure everything is clear

## When to Create a Skill

**Create a skill when:**
- You have domain-specific expertise to package
- Multiple related tasks in same area
- Want reusable workflows across conversations
- Need to organize complex capabilities

**Don't create a skill for:**
- One-off tasks (use prompts instead)
- Simple single-step operations
- Tasks covered by existing skills
- Temporary/experimental work

## Integration with PAI

This skill integrates with:
- **Natural Language System:** Activates on trigger phrases
- **Other Skills:** Can reference this skill's workflows
- **Agents:** Can invoke specific workflows
- **Commands:** Can route to workflows

## Learning Path

1. **Read SKILL.md** - Understand the core skill structure
2. **Explore workflows/** - See different workflow patterns
3. **Check assets/** - Understand supporting resources
4. **Try natural language** - Test trigger phrases
5. **Copy and customize** - Make your own skill

## Documentation

- **Full Architecture:** `~/Projects/PAI/docs/ARCHITECTURE.md`
- **Migration Guide:** `~/Projects/PAI/docs/MIGRATION.md`
- **Skill Creation:** `~/.claude/skills/create-skill/`
- **Anthropic Docs:** https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview

## Support

- **GitHub:** https://github.com/danielmiessler/Personal_AI_Infrastructure
- **Issues:** https://github.com/danielmiessler/Personal_AI_Infrastructure/issues
- **Discussions:** https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions

---

**This is a teaching tool - customize it to create your own powerful skills!**
