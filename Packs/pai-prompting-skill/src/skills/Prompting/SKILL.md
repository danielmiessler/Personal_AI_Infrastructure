---
name: Prompting
description: Meta-prompting system for dynamic prompt generation using templates, standards, and patterns. USE WHEN meta-prompting, template generation, prompt optimization, or programmatic prompt composition.
---

# Prompting - Meta-Prompting & Template System

**Invoke when:** meta-prompting, template generation, prompt optimization, programmatic prompt composition, creating dynamic agents, generating structured prompts from data.

## Overview

The Prompting skill owns ALL prompt engineering concerns:
- **Standards** - Anthropic best practices, Claude 4.x patterns, empirical research
- **Templates** - Handlebars-based system for programmatic prompt generation
- **Tools** - Template rendering, validation, and composition utilities
- **Patterns** - Reusable prompt primitives and structures

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **RenderTemplate** | "render template", "generate from template" | CLI tool |
| **ValidateTemplate** | "validate template", "check template syntax" | CLI tool |
| **ApplyStandards** | "review prompt", "optimize prompt" | Reference Standards.md |

## Core Components

### 1. Standards.md
Complete prompt engineering documentation based on:
- Anthropic's Claude 4.x Best Practices (November 2025)
- Context engineering principles
- 1,500+ academic papers on prompt optimization

### 2. Templates/
Five core primitives for programmatic prompt generation:

| Primitive | Purpose |
|-----------|---------|
| **ROSTER** | Agent/skill definitions from data |
| **VOICE** | Personality calibration settings |
| **STRUCTURE** | Multi-step workflow patterns |
| **BRIEFING** | Agent context handoff |
| **GATE** | Validation checklists |

### 3. Tools/

**RenderTemplate.ts** - Core rendering engine
```bash
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data path/to/data.yaml \
  --output path/to/output.md
```

**ValidateTemplate.ts** - Template syntax checker
```bash
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template Primitives/Briefing.hbs
```

## Examples

**Example 1: Generate agent roster**
```
User: "Generate a roster from my agents.yaml"
-> Uses RenderTemplate with Roster.hbs
-> Outputs formatted agent definitions
```

**Example 2: Create briefing for research agent**
```
User: "Brief the research agent on this task"
-> Uses RenderTemplate with Briefing.hbs
-> Generates complete agent context handoff
```

**Example 3: Validate template syntax**
```
User: "Check my new template for errors"
-> Uses ValidateTemplate
-> Reports syntax issues, missing variables
```

## Best Practices

1. **Separation of Concerns** - Templates for structure, YAML for content
2. **Keep Templates Simple** - Business logic in TypeScript, not templates
3. **DRY Principle** - Extract repeated patterns into partials
4. **Validate Before Rendering** - Check all required variables exist

## References

- `Standards.md` - Complete prompt engineering guide
- `Templates/README.md` - Template system overview
- `Tools/RenderTemplate.ts` - Implementation details
