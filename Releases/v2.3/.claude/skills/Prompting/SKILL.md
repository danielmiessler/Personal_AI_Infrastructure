---
name: Prompting
description: Meta-prompting system for dynamic prompt generation using templates, standards, and patterns. USE WHEN meta-prompting, template generation, prompt optimization, or programmatic prompt composition.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Prompting/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# Prompting - Meta-Prompting & Template System

**Invoke when:** meta-prompting, template generation, prompt optimization, programmatic prompt composition, creating dynamic agents, generating structured prompts from data.

## Overview

The Prompting skill owns ALL prompt engineering concerns:
- **Standards** - Anthropic best practices, Claude 4.x patterns, empirical research
- **Templates** - Handlebars-based system for programmatic prompt generation
- **Tools** - Template rendering, validation, and composition utilities
- **Patterns** - Reusable prompt primitives and structures

This is the "standard library" for prompt engineering - other skills reference these resources when they need to generate or optimize prompts.

## Core Components

### 1. Standards.md
Complete prompt engineering documentation based on:
- Anthropic's Claude 4.x Best Practices (November 2025)
- Context engineering principles
- The Fabric prompt pattern system
- 1,500+ academic papers on prompt optimization

**Key Topics:**
- Markdown-first design (NO XML tags)

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the Prompting skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **Prompting** skill...
   ```

**Full documentation:** `~/.claude/skills/CORE/SkillNotifications.md`

- Claude 4.x behavioral characteristics
- Multi-context window workflows
- Agentic coding best practices
- Output format control
- The Ultimate Prompt Template

### 2. Templates/ - Five Core Primitives

The templating system enables **prompts that write prompts** - dynamic composition where structure is fixed but content is parameterized.

**Directory Structure:**
```
Templates/
├── Primitives/       # Five core template patterns
│   ├── Roster.hbs    # Agent/skill definitions from data
│   ├── Voice.hbs     # Personality calibration settings
│   ├── Structure.hbs # Multi-step workflow patterns
│   ├── Briefing.hbs  # Agent context handoff
│   └── Gate.hbs      # Validation checklists
├── Examples/         # Sample data and usage
└── (Evals/)          # Eval-specific templates (from Evals skill)
```

**The Five Primitives:**

| Primitive | Purpose | Use Case |
|-----------|---------|----------|
| **ROSTER** | Data-driven definitions | 32 RedTeam agents, 83 skills, voice configs |
| **VOICE** | Personality calibration | Voice parameters, rate, archetype mapping |
| **STRUCTURE** | Workflow patterns | Phased analysis, round-based debate, pipelines |
| **BRIEFING** | Agent context handoff | Research queries, delegation, task assignment |
| **GATE** | Validation checklists | Quality gates, completion checks, verification |

### 3. Tools/

**RenderTemplate.ts** - Core rendering engine
```bash
bun run ~/.claude/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data path/to/data.yaml \
  --output path/to/output.md
```

**ValidateTemplate.ts** - Template syntax checker
```bash
bun run ~/.claude/skills/Prompting/Tools/ValidateTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data path/to/sample-data.yaml
```

### 4. Template Syntax

The system uses Handlebars notation (Anthropic's official syntax):

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{{variable}}` | Simple interpolation | `Hello {{name}}` |
| `{{object.property}}` | Nested access | `{{agent.voice_id}}` |
| `{{#each items}}...{{/each}}` | Iteration | List generation |
| `{{#if condition}}...{{/if}}` | Conditional | Optional sections |
| `{{> partial}}` | Include partial | Reusable components |

## Usage Examples

### Example 1: Using Briefing Template (Agent Skill)

```typescript
// skills/Agents/Tools/AgentFactory.ts
import { renderTemplate } from '~/.claude/skills/Prompting/Tools/RenderTemplate.ts';

const prompt = renderTemplate('Primitives/Briefing.hbs', {
  briefing: { type: 'research' },
  agent: { id: 'EN-1', name: 'Skeptical Thinker', personality: {...} },
  task: { description: 'Analyze security architecture', questions: [...] },
  output_format: { type: 'markdown' }
});
```

### Example 2: Using Structure Template (Workflow)

```yaml
# Data: phased-analysis.yaml
phases:
  - name: Discovery
    purpose: Identify attack surface
    steps:
      - action: Map entry points
        instructions: List all external interfaces...
  - name: Analysis
    purpose: Assess vulnerabilities
    steps:
      - action: Test boundaries
        instructions: Probe each entry point...
```

```bash
bun run RenderTemplate.ts \
  --template Primitives/Structure.hbs \
  --data phased-analysis.yaml
```

### Example 3: Custom Agent with Voice Mapping

```typescript
// Generate specialized agent with appropriate voice
const agent = composeAgent(['security', 'skeptical', 'thorough'], task, traits);
// Returns: { name, traits, voice: 'default', voiceId: 'VOICE_ID...' }
```

## Integration with Other Skills

### Agents Skill
- Uses `Templates/Primitives/Briefing.hbs` for agent context handoff
- Uses `RenderTemplate.ts` to compose dynamic agents
- Maintains agent-specific template: `Agents/Templates/DynamicAgent.hbs`

### Evals Skill
- Uses eval-specific templates: Judge, Rubric, TestCase, Comparison, Report
- Leverages `RenderTemplate.ts` for eval prompt generation
- Eval templates may be stored in `Evals/Templates/` but use Prompting's engine

### Development Skill
- References `Standards.md` for prompt best practices
- Uses `Structure.hbs` for workflow patterns
- Applies `Gate.hbs` for validation checklists

## Token Efficiency

The templating system eliminated **~35,000 tokens (65% reduction)** across PAI:

| Area | Before | After | Savings |
|------|--------|-------|---------|
| SKILL.md Frontmatter | 20,750 | 8,300 | 60% |
| Agent Briefings | 6,400 | 1,900 | 70% |
| Voice Notifications | 6,225 | 725 | 88% |
| Workflow Steps | 7,500 | 3,000 | 60% |
| **TOTAL** | ~53,000 | ~18,000 | **65%** |

## Best Practices

### 1. Separation of Concerns
- **Templates**: Structure and formatting only
- **Data**: Content and parameters (YAML/JSON)
- **Logic**: Rendering and validation (TypeScript)

### 2. Keep Templates Simple
- Avoid complex logic in templates
- Use Handlebars helpers for transformations
- Business logic belongs in TypeScript, not templates

### 3. DRY Principle
- Extract repeated patterns into partials
- Use presets for common configurations
- Single source of truth for definitions

### 4. Version Control
- Templates and data in separate files
- Track changes independently
- Enable A/B testing of structures

## References

**Primary Documentation:**
- `Standards.md` - Complete prompt engineering guide
- `Templates/README.md` - Template system overview (if preserved)
- `Tools/RenderTemplate.ts` - Implementation details

**Research Foundation:**
- Anthropic: "Claude 4.x Best Practices" (November 2025)
- Anthropic: "Effective Context Engineering for AI Agents"
- Anthropic: "Prompt Templates and Variables"
- The Fabric System (January 2024)
- "The Prompt Report" - arXiv:2406.06608
- "The Prompt Canvas" - arXiv:2412.05127

**Related Skills:**
- Agents - Dynamic agent composition
- Evals - LLM-as-Judge prompting
- Development - Spec-driven development patterns

---

**Philosophy:** Prompts that write prompts. Structure is code, content is data. Meta-prompting enables dynamic composition where the same template with different data generates specialized agents, workflows, and evaluation frameworks. This is core PAI DNA - programmatic prompt generation at scale.
