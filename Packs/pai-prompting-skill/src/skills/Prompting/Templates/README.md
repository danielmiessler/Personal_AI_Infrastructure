# PAI Templating System

**Version:** 1.0.0

## Overview

The templating system enables **prompts that write prompts** - dynamic composition where structure is fixed but content is parameterized.

## Directory Structure

```
Templates/
├── Primitives/       # Core template files (.hbs)
│   ├── Roster.hbs    # Agent/skill definitions
│   ├── Voice.hbs     # Personality calibration
│   ├── Structure.hbs # Workflow patterns
│   ├── Briefing.hbs  # Agent context handoff
│   └── Gate.hbs      # Validation checklists
├── Data/             # YAML data sources
│   └── Examples/     # Example data files
├── Compiled/         # Generated output (gitignored)
└── README.md         # This file
```

## Core Syntax

Handlebars notation (Anthropic's official syntax):

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{{variable}}` | Simple interpolation | `Hello {{name}}` |
| `{{object.property}}` | Nested access | `{{agent.voice_id}}` |
| `{{#each items}}...{{/each}}` | Iteration | List generation |
| `{{#if condition}}...{{/if}}` | Conditional | Optional sections |
| `{{> partial}}` | Include partial | Reusable components |

## Usage

### Basic Rendering

```bash
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Roster.hbs \
  --data Data/Examples/Agents.yaml \
  --output Compiled/AgentRoster.md
```

### Preview Without Writing

```bash
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data Data/Examples/Briefing.yaml \
  --preview
```

## Best Practices

1. **Separation of Concerns** - Templates for structure, YAML for content
2. **Keep Templates Simple** - Business logic in TypeScript
3. **Version Control** - Templates and data in separate files
4. **Validate Before Rendering** - Check all required variables exist
5. **DRY Principle** - Extract repeated patterns into partials
