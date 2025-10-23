---
name: create-skill
description: Guide for creating new skills in Kai's personal AI infrastructure. Use when user wants to create, update, or structure a new skill that extends capabilities with specialized knowledge, workflows, or tool integrations. Follows both Anthropic skill standards and PAI-specific patterns.
---

# Create Skill - Skill Creation Framework

## When to Activate This Skill
- "Create a new skill for X"
- "Build a skill that does Y"
- "Add a skill for Z"
- "Update/improve existing skill"
- "Structure a skill properly"
- User wants to extend Kai's capabilities

## Core Skill Creation Workflow

### Step 1: Understand the Purpose
Ask these questions:
- **What does this skill do?** (Clear, specific purpose)
- **When should it activate?** (Trigger conditions)
- **What tools/commands does it use?** (Dependencies)
- **Is it simple or complex?** (Determines structure)

### Step 2: Choose Skill Type

**Simple Skill** (SKILL.md only):
- Single focused capability
- Minimal dependencies
- Quick reference suffices
- Examples: fabric-patterns, youtube-extraction

**Complex Skill** (SKILL.md + CLAUDE.md + supporting files):
- Multi-step workflows
- Extensive context needed
- Multiple sub-components
- Examples: development, website, consulting

### Step 3: Create Directory Structure

```bash
# Simple skill
${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/
└── SKILL.md

# Complex skill
${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/
├── SKILL.md           # Quick reference
├── CLAUDE.md          # Full context
└── [subdirectories]/  # Supporting resources
```

### Step 4: Write SKILL.md (Required)

Use this structure:
```markdown
---
name: skill-name
description: Clear description of what skill does and when to use it. Should match activation triggers.
---

# Skill Name

## When to Activate This Skill
- Trigger condition 1
- Trigger condition 2
- User phrase examples

## [Main Content Sections]
- Core workflow
- Key commands
- Examples
- Best practices

## Supplementary Resources
For detailed context: `read ${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/CLAUDE.md`
```

### Step 5: Write CLAUDE.md (If Complex)

Include:
- Comprehensive methodology
- Detailed workflows
- Component documentation
- Advanced usage patterns
- Integration instructions
- Troubleshooting guides

### Step 6: Add to Global Context

Update `${CLAUDE_PLUGIN_ROOT}/global/KAI.md` available_skills section to include the new skill so it shows up in the system prompt.

### Step 7: Test the Skill

1. Trigger it with natural language
2. Verify it loads correctly
3. Check all references work
4. Validate against examples

## Skill Naming Conventions

- **Lowercase with hyphens**: `create-skill`, `web-scraping`
- **Descriptive, not generic**: `fabric-patterns` not `text-processing`
- **Action or domain focused**: `ai-image-generation`, `chrome-devtools`

## Description Best Practices

Your description should:
- Clearly state what the skill does
- Include trigger phrases (e.g., "USE WHEN user says...")
- Mention key tools/methods used
- Be concise but complete (1-3 sentences)

**Good examples:**
- "Multi-source comprehensive research using perplexity-researcher, claude-researcher, and gemini-researcher agents. Launches up to 10 parallel research agents for fast results. USE WHEN user says 'do research', 'research X', 'find information about'..."
- "Chrome DevTools MCP for web application debugging, visual testing, and browser automation. The ONLY acceptable way to debug web apps - NEVER use curl, fetch, or wget."

## Templates Available

- `simple-skill-template.md` - For straightforward capabilities
- `complex-skill-template.md` - For multi-component skills
- `skill-with-agents-template.md` - For skills using sub-agents

## Supplementary Resources

For complete guide with examples: `read ${CLAUDE_PLUGIN_ROOT}/skills/create-skill/CLAUDE.md`
For templates: `ls ${CLAUDE_PLUGIN_ROOT}/skills/create-skill/templates/`

## Key Principles

1. **Progressive disclosure**: SKILL.md = quick reference, CLAUDE.md = deep dive
2. **Clear activation triggers**: User should know when skill applies
3. **Executable instructions**: Imperative/infinitive form (verb-first)
4. **Context inheritance**: Skills inherit global context automatically
5. **No duplication**: Reference global context, don't duplicate it
6. **Self-contained**: Skill should work independently
7. **Discoverable**: Description enables Kai to match user intent
