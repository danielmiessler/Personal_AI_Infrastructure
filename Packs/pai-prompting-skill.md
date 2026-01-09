---
name: Kai Prompting Skill
pack-id: danielmiessler-kai-prompting-skill-v1.0.0
version: 1.0.0
author: danielmiessler
description: Meta-prompting system for dynamic prompt generation using Handlebars templates, Claude 4.x best practices, and the Fabric pattern system. Includes the Ultimate Prompt Template, five core primitives (Roster, Voice, Structure, Briefing, Gate), and CLI tools for rendering and validation.
type: feature
purpose-type: [productivity, development, automation]
platform: claude-code
dependencies:
  - kai-core-install (required) - Skills directory structure and routing
  - kai-hook-system (optional) - For session startup context loading
keywords: [prompting, templates, handlebars, meta-prompting, prompt-engineering, fabric, claude-4, context-engineering, templating]
---

<p align="center">
  <img src="icons/kai-prompting-skill.png" alt="Kai Prompting Skill" width="256">
</p>

# Kai Prompting Skill (kai-prompting-skill)

> Prompts that write prompts. Meta-prompting enables dynamic composition where structure is fixed but content is parameterized.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

This Pack provides a complete prompt engineering system:

**Prompt Engineering Standards**
- Claude 4.x Best Practices (behavioral characteristics, tool patterns)
- Context engineering principles (token efficiency, signal optimization)
- The Ultimate Prompt Template (modular, validated structure)
- Fabric pattern integration (248 reusable prompts)

**Template System**
- Five core primitives: Roster, Voice, Structure, Briefing, Gate
- Handlebars-based templating (Anthropic's official syntax)
- Data-driven prompt generation from YAML
- CLI tools for rendering and validation

**Core Philosophy:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Prompting skill | `skills/Prompting/SKILL.md` | Routing and quick reference |
| Standards guide | `skills/Prompting/Standards.md` | Claude 4.x best practices |
| Roster template | `skills/Prompting/Templates/Primitives/Roster.hbs` | Agent/skill definitions |
| Voice template | `skills/Prompting/Templates/Primitives/Voice.hbs` | Personality calibration |
| Structure template | `skills/Prompting/Templates/Primitives/Structure.hbs` | Workflow patterns |
| Briefing template | `skills/Prompting/Templates/Primitives/Briefing.hbs` | Agent context handoff |
| Gate template | `skills/Prompting/Templates/Primitives/Gate.hbs` | Validation checklists |
| Render tool | `skills/Prompting/Tools/RenderTemplate.ts` | Template rendering CLI |
| Validate tool | `skills/Prompting/Tools/ValidateTemplate.ts` | Template validation |

**Summary:**
- **Files created:** 12+ (skill, standards, templates, tools)
- **Hooks registered:** 0 (skill-based, not hook-based)
- **Dependencies:** kai-core-install (required)

---

# PART 1: THE PROBLEM

## Why You Need This

### Without Prompt Standards

1. **Inconsistent Quality** - Prompts vary wildly in effectiveness
2. **Reinventing Wheels** - Every prompt starts from scratch
3. **Token Waste** - Verbose prompts that don't improve results
4. **Model Confusion** - Using patterns that hurt Claude 4.x performance
5. **No Validation** - No way to verify prompt structure

### Without Templates

1. **Manual Repetition** - Copy-pasting similar structures
2. **Drift** - Agent definitions diverge over time
3. **Maintenance Burden** - Updating 30 agents means 30 edits
4. **No Separation** - Structure and content entangled
5. **Testing Difficulty** - Can't A/B test structure vs. content

### The Core Insight

Prompt engineering research shows:
- **10-90% performance variation** based on structure choices
- **Few-shot examples** add +25-90% improvement (1-3 optimal)
- **Clear instructions** reduce ambiguity and improve task completion
- **Structured organization** provides consistent performance gains

This isn't opinion—it's validated by 1,500+ academic papers and production systems.

---

# PART 2: THE SOLUTION

This pack provides two integrated components:

| Component | Purpose |
|-----------|---------|
| **Standards.md** | Complete prompt engineering guide based on Claude 4.x best practices |
| **Template System** | Handlebars-based dynamic prompt generation |

## The Standards

Based on:
- Anthropic's "Claude 4.x Best Practices" (November 2025)
- Anthropic's "Effective Context Engineering for AI Agents"
- Daniel Miessler's Fabric System (248 patterns)
- "The Prompt Report" (1,500+ papers, 58 techniques)
- "The Prompt Canvas" (100+ papers reviewed)

## The Templates

Five core primitives that cover 90% of prompt composition needs:

| Primitive | Purpose | Use Case |
|-----------|---------|----------|
| **ROSTER** | Data-driven definitions | Agent personalities, skill listings |
| **VOICE** | Personality calibration | Voice parameters, trait settings |
| **STRUCTURE** | Workflow patterns | Phased analysis, debate rounds |
| **BRIEFING** | Agent context handoff | Task delegation, research queries |
| **GATE** | Validation checklists | Quality checks, completion criteria |

---

# PART 3: ARCHITECTURE

## Component Overview

```
$PAI_DIR/skills/Prompting/
├── SKILL.md              # Skill routing and overview
├── Standards.md          # Complete prompt engineering guide
├── Templates/
│   ├── README.md         # Template system documentation
│   ├── Primitives/       # Core template files (.hbs)
│   │   ├── Roster.hbs
│   │   ├── Voice.hbs
│   │   ├── Structure.hbs
│   │   ├── Briefing.hbs
│   │   └── Gate.hbs
│   ├── Data/             # Example YAML data sources
│   │   └── Examples/
│   └── Compiled/         # Generated output (gitignored)
└── Tools/
    ├── RenderTemplate.ts
    └── ValidateTemplate.ts
```

## Token Efficiency

The templating system reduces duplication significantly:

| Area | Before | After | Savings |
|------|--------|-------|---------|
| Agent Briefings | 6,400 tokens | 1,900 tokens | 70% |
| SKILL.md Files | 20,750 tokens | 8,300 tokens | 60% |
| Workflow Steps | 7,500 tokens | 3,000 tokens | 60% |
| Voice Notifications | 6,225 tokens | 725 tokens | 88% |
| **TOTAL** | ~53,000 | ~18,000 | **65%** |

---

# PART 4: PROMPT ENGINEERING STANDARDS

## Claude 4.x Behavioral Characteristics

### Communication Style

- **More direct reporting** - Claude 4.5 provides fact-based progress updates
- **Conversational efficiency** - Natural language without unnecessary elaboration
- **Request verbosity explicitly** - Add "provide a quick summary of the work you've done"

### Attention to Detail

- **Example sensitivity** - Claude 4.x pays close attention to example details
- **Misaligned examples encourage unintended behaviors**
- Ensure examples match desired outcomes exactly

### Tool Usage Patterns

- **Opus 4.5 may overtrigger tools** - Use softer language
- **Change:** "CRITICAL: You MUST use this tool" → "Use this tool when..."

### Extended Thinking Sensitivity

When extended thinking is disabled:
- **Avoid:** "think", "think about", "think through"
- **Use instead:** "consider", "believe", "evaluate", "reflect", "assess"

---

## Key Principles

### 0. Markdown Only - NO XML Tags

**CRITICAL: Use markdown for ALL prompt structure. Never use XML tags.**

**NEVER use XML-style tags:**
```
<instructions>Do something</instructions>
<context>Some context</context>
```

**ALWAYS use markdown headers:**
```markdown
## Instructions

Do something

## Context

Some context
```

### 1. Be Explicit with Instructions

Claude 4.x requires clear, specific direction rather than vague requests.

- "Include as many relevant features as possible"
- "Go beyond basics"
- Quality modifiers enhance results

### 2. Add Context and Motivation

Explain *why* certain behavior matters to help Claude understand goals.

**Good:**
```
Your response will be read aloud by text-to-speech, so never use ellipses or incomplete sentences.
```

**Bad:**
```
NEVER use ellipses.
```

### 3. Tell Instead of Forbid

Frame instructions positively rather than as prohibitions.

**Good:**
```
Compose smoothly flowing prose paragraphs with natural transitions.
```

**Bad:**
```
Do not use markdown or bullet points.
```

### 4. Context is a Finite Resource

- LLMs have a limited "attention budget"
- As context length increases, model performance degrades
- Every token depletes attention capacity
- Treat context as precious and finite

### 5. Optimize for Signal-to-Noise Ratio

- Prefer clear, direct language over verbose explanations
- Remove redundant or overlapping information
- Focus on high-value tokens that drive desired outcomes

---

## The Ultimate Prompt Template

Synthesized from Anthropic's Claude 4.x Best Practices, context engineering principles, and 1,500+ academic papers.

### Full Template

```markdown
# [Task Name]

## Context & Motivation
[WHY this matters - Claude generalizes from reasoning provided]

## Background
[Minimal essential context - every token costs attention]

## Instructions
[Positive framing: tell what TO do. Imperative voice. Ordered by priority.]

1. [First clear, actionable directive]
2. [Second directive]
3. [Third directive]

## Examples
[1-3 examples optimal. Claude 4.x is HIGHLY sensitive to details.]

**Example 1: [Scenario]**
- Input: [Representative input]
- Output: [Exact desired output]

## Constraints
[Positive framing preferred. Define success/failure criteria.]

- **Success:** [What defines successful completion]
- **Failure:** [What defines failure]

## Output Format
[Explicit specification reduces format errors significantly]

## Tools
[SOFT LANGUAGE - avoid "MUST use"]

- `tool_name(params)` - Use when [specific condition]

## Action Bias
[Choose ONE based on task type]

### For Implementation Tasks
Implement changes rather than suggesting. Use tools to discover missing details.

### For Research Tasks
Default to information gathering and recommendations.
```

### Section Selection Matrix

| Task Type | Required | Recommended | Optional |
|-----------|----------|-------------|----------|
| **Simple Query** | Instructions, Output Format | Context | — |
| **Complex Implementation** | Context, Instructions, Output Format, Tools | Examples, Constraints | Action Bias |
| **Research/Analysis** | Context, Instructions, Constraints | Examples | State Tracking |
| **Agentic Coding** | Context, Instructions, Tools, Verification | Constraints, Parallel | State Tracking |

### Claude 4.x Transformations Quick Reference

| Avoid | Use Instead |
|-------|-------------|
| "CRITICAL: You MUST use this tool" | "Use this tool when..." |
| "Don't use markdown" | "Write in flowing prose paragraphs" |
| "NEVER do X" | "Do Y instead" (positive framing) |
| "Think about this carefully" | "Consider this carefully" |
| "You should probably..." | "Do X" (imperative, direct) |
| 10 examples | 1-3 examples (diminishing returns) |

---

## Agentic Coding Best Practices

### Read Before Edit

```markdown
## Verification

Never speculate about code you haven't opened. If a specific file is referenced, READ it before answering. Give grounded, hallucination-free answers based on actual code inspection.
```

### Prevent Overengineering

```
Avoid over-engineering. Only make directly requested or clearly necessary changes. Keep solutions simple and focused. Don't add unrequested features. Implement minimum complexity needed for current task.
```

### Parallel Tool Calling

```markdown
## Parallel Execution

If calling multiple tools with no dependencies, make all independent calls in parallel. Never guess parameters.
```

---

# PART 5: TEMPLATE SYSTEM

## Core Syntax

Handlebars notation (Anthropic's official syntax):

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{{variable}}` | Simple interpolation | `Hello {{name}}` |
| `{{object.property}}` | Nested access | `{{agent.voice_id}}` |
| `{{#each items}}...{{/each}}` | Iteration | List generation |
| `{{#if condition}}...{{/if}}` | Conditional | Optional sections |
| `{{> partial}}` | Include partial | Reusable components |

---

## Primitive Templates

### 1. ROSTER — Agent & Skill Definitions

**Purpose:** Generate structured definitions from YAML data sources.

**Use Cases:**
- Agent personality rosters
- Skill directory listings
- Voice configuration tables

**Data Structure:**
```yaml
agents:
  agent_id:
    id: string
    name: string
    display_name: string
    role: string
    emoji: string
    personality:
      traits: [string]
      perspective: string
      style: string
```

**Template:** `Primitives/Roster.hbs`

---

### 2. VOICE — Personality Calibration

**Purpose:** Generate voice configuration for agents and notifications.

**Use Cases:**
- ElevenLabs voice settings
- Agent personality calibration
- Voice preset documentation

**Data Structure:**
```yaml
agents:
  agent_id:
    voice:
      voice_id: string
      voice_name: string
      rate_wpm: number
      stability: number
      similarity_boost: number
presets:
  preset_name:
    stability: number
    similarity_boost: number
```

**Template:** `Primitives/Voice.hbs`

---

### 3. STRUCTURE — Workflow Patterns

**Purpose:** Generate standardized multi-step execution patterns.

**Use Cases:**
- Phased analysis workflows
- Round-based debate patterns
- Sequential pipelines

**Data Structure:**
```yaml
workflow:
  name: string
  description: string
  timing: string (optional)
  phases:
    - name: string
      purpose: string
      steps:
        - action: string
          instructions: string
          tools: [string] (optional)
```

**Template:** `Primitives/Structure.hbs`

---

### 4. BRIEFING — Agent Context Handoff

**Purpose:** Standardize how agents receive tasks and context.

**Use Cases:**
- Research agent queries
- RedTeam analyst prompts
- Delegation context packages

**Data Structure:**
```yaml
briefing:
  type: string (research | analysis | debate | task)
  context_level: string (minimal | standard | full)
agent:
  id: string
  name: string
  role: string
  personality:
    perspective: string
    traits: [string]
context:
  summary: string
  background: string (optional)
task:
  description: string
  questions: [string] (optional)
output_format:
  type: string (markdown | json | structured)
```

**Template:** `Primitives/Briefing.hbs`

---

### 5. GATE — Validation Checklists

**Purpose:** Generate reusable quality and completion checks.

**Use Cases:**
- Art mandatory elements
- Development completion gates
- Research source verification

**Data Structure:**
```yaml
gate:
  name: string
  category: string
  description: string
  action_on_fail: string
  mandatory:
    - name: string
      description: string
  recommended:
    - name: string
      description: string
```

**Template:** `Primitives/Gate.hbs`

---

# PART 6: INSTALLATION

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **kai-core-install Pack** installed (required for Skills directory)

---

## Step 1: Create Directory Structure

```bash
mkdir -p $PAI_DIR/skills/Prompting/Templates/Primitives
mkdir -p $PAI_DIR/skills/Prompting/Templates/Data/Examples
mkdir -p $PAI_DIR/skills/Prompting/Templates/Compiled
mkdir -p $PAI_DIR/skills/Prompting/Tools
```

---

## Step 2: Create SKILL.md

Save to `$PAI_DIR/skills/Prompting/SKILL.md`:

```markdown
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
\`\`\`bash
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data path/to/data.yaml \
  --output path/to/output.md
\`\`\`

**ValidateTemplate.ts** - Template syntax checker
\`\`\`bash
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template Primitives/Briefing.hbs
\`\`\`

## Examples

**Example 1: Generate agent roster**
\`\`\`
User: "Generate a roster from my agents.yaml"
→ Uses RenderTemplate with Roster.hbs
→ Outputs formatted agent definitions
\`\`\`

**Example 2: Create briefing for research agent**
\`\`\`
User: "Brief the research agent on this task"
→ Uses RenderTemplate with Briefing.hbs
→ Generates complete agent context handoff
\`\`\`

**Example 3: Validate template syntax**
\`\`\`
User: "Check my new template for errors"
→ Uses ValidateTemplate
→ Reports syntax issues, missing variables
\`\`\`

## Best Practices

1. **Separation of Concerns** - Templates for structure, YAML for content
2. **Keep Templates Simple** - Business logic in TypeScript, not templates
3. **DRY Principle** - Extract repeated patterns into partials
4. **Validate Before Rendering** - Check all required variables exist

## References

- `Standards.md` - Complete prompt engineering guide
- `Templates/README.md` - Template system overview
- `Tools/RenderTemplate.ts` - Implementation details
```

---

## Step 3: Create Standards.md

Save to `$PAI_DIR/skills/Prompting/Standards.md`:

```markdown
---
type: documentation
category: methodology
description: Prompt engineering standards based on Anthropic's Claude 4.x best practices, context engineering principles, and empirical research.
---

# Prompt Engineering Standards

**Foundation:** Based on Anthropic's Claude 4.x Best Practices (November 2025), context engineering principles, and 1,500+ academic papers.

**Philosophy:** Universal principles of semantic clarity and structure that work regardless of model, with specific optimizations for Claude 4.x behavioral patterns.

---

# Core Philosophy

**Context engineering** is the set of strategies for curating and maintaining the optimal set of tokens during LLM inference.

**Primary Goal:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

---

# Claude 4.x Behavioral Characteristics

## Communication Style Changes

- **More direct reporting:** Claude 4.5 provides fact-based progress updates
- **Conversational efficiency:** Natural language without unnecessary elaboration
- **Request verbosity explicitly:** Add "provide a quick summary of the work you've done"

## Attention to Detail

- **Example sensitivity:** Claude 4.x pays close attention to details in examples
- **Misaligned examples encourage unintended behaviors**
- Ensure examples match desired outcomes exactly

## Tool Usage Patterns

- **Opus 4.5 may overtrigger tools:** Dial back aggressive language
- **Change:** "CRITICAL: You MUST use this tool" → "Use this tool when..."

## Extended Thinking Sensitivity

When extended thinking is disabled:
- **Avoid:** "think", "think about", "think through"
- **Use instead:** "consider", "believe", "evaluate", "reflect", "assess"

---

# Key Principles

## 0. Markdown Only - NO XML Tags

**CRITICAL: Use markdown for ALL prompt structure. Never use XML tags.**

## 1. Be Explicit with Instructions

Claude 4.x requires clear, specific direction.

## 2. Add Context and Motivation

Explain *why* certain behavior matters.

## 3. Tell Instead of Forbid

Frame instructions positively rather than as prohibitions.

## 4. Context is a Finite Resource

Every token depletes attention capacity. Treat context as precious.

## 5. Optimize for Signal-to-Noise Ratio

Focus on high-value tokens that drive desired outcomes.

---

# Empirical Foundation

**Research validates that prompt structure has measurable, significant impact:**

- **Performance Range:** 10-90% variation based on structure choices
- **Few-Shot Examples:** +25% to +90% improvement (optimal: 1-3 examples)
- **Structured Organization:** Consistent performance gains
- **Full Component Integration:** +25% improvement on complex tasks

**Sources:** 1,500+ academic papers, Microsoft PromptBench, Amazon Alexa production testing.

---

# The Ultimate Prompt Template

## Full Template

\`\`\`markdown
# [Task Name]

## Context & Motivation
[WHY this matters - Claude generalizes from reasoning provided]

## Background
[Minimal essential context - every token costs attention]

## Instructions
1. [First clear, actionable directive]
2. [Second directive]
3. [Third directive]

## Examples
**Example 1: [Scenario]**
- Input: [Representative input]
- Output: [Exact desired output]

## Constraints
- **Success:** [What defines successful completion]
- **Failure:** [What defines failure]

## Output Format
[Explicit specification]

## Tools
- \`tool_name(params)\` - Use when [specific condition]
\`\`\`

## Section Selection Matrix

| Task Type | Required | Recommended |
|-----------|----------|-------------|
| Simple Query | Instructions, Output Format | Context |
| Complex Implementation | Context, Instructions, Output Format, Tools | Examples, Constraints |
| Research/Analysis | Context, Instructions, Constraints | Examples |
| Agentic Coding | Context, Instructions, Tools, Verification | Constraints |

---

# Anti-Patterns to Avoid

- **Verbose Explanations** - Be direct
- **Negative-Only Constraints** - Tell what TO do
- **Aggressive Tool Language** - Use soft framing
- **Misaligned Examples** - Check carefully
- **Example Overload** - 1-3 examples optimal
- **Using "Think" with Extended Thinking Disabled** - Use "consider" instead

---

# References

**Primary Sources:**
- Anthropic: "Claude 4.x Best Practices" (November 2025)
- Anthropic: "Effective Context Engineering for AI Agents"
- Daniel Miessler's Fabric System (January 2024)
- "The Prompt Report" - arXiv:2406.06608 (58 techniques)
- "The Prompt Canvas" - arXiv:2412.05127 (100+ papers)
```

---

## Step 4: Create RenderTemplate.ts

Save to `$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts`:

```typescript
#!/usr/bin/env bun
/**
 * RenderTemplate.ts - Template Rendering Engine
 *
 * Renders Handlebars templates with YAML data sources.
 *
 * Usage:
 *   bun run RenderTemplate.ts --template <path> --data <path> [--output <path>] [--preview]
 *
 * Examples:
 *   bun run RenderTemplate.ts --template Primitives/Roster.hbs --data Data/Agents.yaml
 *   bun run RenderTemplate.ts -t Primitives/Gate.hbs -d Data/Gates.yaml --preview
 */

import Handlebars from 'handlebars';
import { parse as parseYaml } from 'yaml';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { parseArgs } from 'util';

// ============================================================================
// Custom Handlebars Helpers
// ============================================================================

// Uppercase text
Handlebars.registerHelper('uppercase', (str: string) => {
  return str?.toUpperCase() ?? '';
});

// Lowercase text
Handlebars.registerHelper('lowercase', (str: string) => {
  return str?.toLowerCase() ?? '';
});

// Title case text
Handlebars.registerHelper('titlecase', (str: string) => {
  return str?.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  ) ?? '';
});

// Indent text by N spaces
Handlebars.registerHelper('indent', (str: string, spaces: number) => {
  if (!str) return '';
  const indent = ' '.repeat(typeof spaces === 'number' ? spaces : 2);
  return str.split('\n').map(line => indent + line).join('\n');
});

// Join array with separator
Handlebars.registerHelper('join', (arr: string[], separator: string) => {
  if (!Array.isArray(arr)) return '';
  return arr.join(typeof separator === 'string' ? separator : ', ');
});

// Check if value equals another
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

// Check if value is greater than
Handlebars.registerHelper('gt', (a: number, b: number) => a > b);

// Check if value is less than
Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

// Check if array includes value
Handlebars.registerHelper('includes', (arr: unknown[], value: unknown) => {
  return Array.isArray(arr) && arr.includes(value);
});

// Get current date/time
Handlebars.registerHelper('now', (format?: string) => {
  const now = new Date();
  if (format === 'date') return now.toISOString().split('T')[0];
  if (format === 'time') return now.toTimeString().split(' ')[0];
  return now.toISOString();
});

// Pluralize word based on count
Handlebars.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
  const pluralForm = typeof plural === 'string' ? plural : `${singular}s`;
  return count === 1 ? singular : pluralForm;
});

// Format number with commas
Handlebars.registerHelper('formatNumber', (num: number) => {
  return num?.toLocaleString() ?? '';
});

// Calculate percentage
Handlebars.registerHelper('percent', (value: number, total: number, decimals = 0) => {
  if (!total) return '0';
  return ((value / total) * 100).toFixed(typeof decimals === 'number' ? decimals : 0);
});

// Truncate text to length
Handlebars.registerHelper('truncate', (str: string, length: number) => {
  if (!str) return '';
  const maxLen = typeof length === 'number' ? length : 100;
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
});

// Default value if undefined
Handlebars.registerHelper('default', (value: unknown, defaultValue: unknown) => {
  return value ?? defaultValue;
});

// JSON stringify
Handlebars.registerHelper('json', (obj: unknown, pretty = false) => {
  return JSON.stringify(obj, null, pretty ? 2 : undefined);
});

// Markdown code block
Handlebars.registerHelper('codeblock', (code: string, language?: string) => {
  const lang = typeof language === 'string' ? language : '';
  return `\`\`\`${lang}\n${code}\n\`\`\``;
});

// Repeat helper for generating repeated content
Handlebars.registerHelper('repeat', (count: number, options: Handlebars.HelperOptions) => {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += options.fn({ index: i, first: i === 0, last: i === count - 1 });
  }
  return result;
});

// ============================================================================
// Template Engine
// ============================================================================

interface RenderOptions {
  templatePath: string;
  dataPath: string;
  outputPath?: string;
  preview?: boolean;
}

function resolveTemplatePath(path: string): string {
  if (path.startsWith('/')) return path;
  const templatesDir = dirname(dirname(import.meta.path));
  return resolve(templatesDir, path);
}

function loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
  const fullPath = resolveTemplatePath(templatePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Template not found: ${fullPath}`);
  }
  const templateSource = readFileSync(fullPath, 'utf-8');
  return Handlebars.compile(templateSource);
}

function loadData(dataPath: string): Record<string, unknown> {
  const fullPath = resolveTemplatePath(dataPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Data file not found: ${fullPath}`);
  }
  const dataSource = readFileSync(fullPath, 'utf-8');
  if (dataPath.endsWith('.json')) {
    return JSON.parse(dataSource);
  }
  return parseYaml(dataSource) as Record<string, unknown>;
}

function registerPartials(templatesDir: string): void {
  const partialsDir = resolve(templatesDir, 'Partials');
  if (!existsSync(partialsDir)) return;

  const files = Bun.spawnSync(['ls', partialsDir]).stdout.toString().trim().split('\n');
  for (const file of files) {
    if (file.endsWith('.hbs')) {
      const partialName = basename(file, '.hbs');
      const partialPath = resolve(partialsDir, file);
      const partialSource = readFileSync(partialPath, 'utf-8');
      Handlebars.registerPartial(partialName, partialSource);
    }
  }
}

export function renderTemplate(options: RenderOptions): string {
  const templatesDir = dirname(dirname(import.meta.path));
  registerPartials(templatesDir);

  const template = loadTemplate(options.templatePath);
  const data = loadData(options.dataPath);
  const rendered = template(data);

  if (options.preview) {
    console.log('\n=== PREVIEW ===\n');
    console.log(rendered);
    console.log('\n=== END PREVIEW ===\n');
  }

  if (options.outputPath) {
    const outputFullPath = resolveTemplatePath(options.outputPath);
    writeFileSync(outputFullPath, rendered);
    console.log(`✓ Rendered to: ${outputFullPath}`);
  }

  return rendered;
}

// ============================================================================
// CLI Interface
// ============================================================================

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      template: { type: 'string', short: 't' },
      data: { type: 'string', short: 'd' },
      output: { type: 'string', short: 'o' },
      preview: { type: 'boolean', short: 'p' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help || !values.template || !values.data) {
    console.log(`
Template Renderer

Usage:
  bun run RenderTemplate.ts --template <path> --data <path> [options]

Options:
  -t, --template <path>  Template file (.hbs)
  -d, --data <path>      Data file (.yaml or .json)
  -o, --output <path>    Output file (optional)
  -p, --preview          Show preview in console
  -h, --help             Show this help

Available Helpers:
  {{uppercase str}}           - Convert to uppercase
  {{lowercase str}}           - Convert to lowercase
  {{titlecase str}}           - Convert to title case
  {{indent str spaces}}       - Indent text
  {{join arr separator}}      - Join array
  {{eq a b}}                  - Check equality
  {{gt a b}} / {{lt a b}}     - Greater/less than
  {{now format}}              - Current date/time
  {{pluralize count word}}    - Pluralize
  {{formatNumber num}}        - Format with commas
  {{percent value total}}     - Calculate percentage
  {{truncate str length}}     - Truncate to length
  {{default value fallback}}  - Default value
  {{json obj pretty}}         - JSON stringify
  {{codeblock code lang}}     - Markdown code block
`);
    process.exit(values.help ? 0 : 1);
  }

  try {
    renderTemplate({
      templatePath: values.template,
      dataPath: values.data,
      outputPath: values.output,
      preview: values.preview,
    });
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
```

---

## Step 5: Create ValidateTemplate.ts

Save to `$PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts`:

```typescript
#!/usr/bin/env bun
/**
 * ValidateTemplate.ts - Template Syntax Validator
 *
 * Validates Handlebars templates for syntax errors and missing variables.
 *
 * Usage:
 *   bun run ValidateTemplate.ts --template <path> [--data <path>] [--strict]
 */

import Handlebars from 'handlebars';
import { parse as parseYaml } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseArgs } from 'util';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
  helpers: string[];
  partials: string[];
}

interface ValidateOptions {
  templatePath: string;
  dataPath?: string;
  strict?: boolean;
}

function resolveTemplatePath(path: string): string {
  if (path.startsWith('/')) return path;
  const templatesDir = dirname(dirname(import.meta.path));
  return resolve(templatesDir, path);
}

function extractVariables(source: string): string[] {
  const variables: Set<string> = new Set();
  const simpleVars = source.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g);
  for (const match of simpleVars) {
    variables.add(match[1]);
  }
  const blockVars = source.matchAll(/\{\{#(?:each|if|unless|with)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g);
  for (const match of blockVars) {
    variables.add(match[1]);
  }
  return Array.from(variables).sort();
}

function extractHelpers(source: string): string[] {
  const helpers: Set<string> = new Set();
  const helperCalls = source.matchAll(/\{\{([a-z][a-zA-Z]+)\s/g);
  for (const match of helperCalls) {
    const name = match[1];
    if (!['if', 'unless', 'each', 'with', 'else'].includes(name)) {
      helpers.add(name);
    }
  }
  return Array.from(helpers).sort();
}

function extractPartials(source: string): string[] {
  const partials: Set<string> = new Set();
  const partialCalls = source.matchAll(/\{\{>\s*([a-zA-Z_][a-zA-Z0-9_-]*)/g);
  for (const match of partialCalls) {
    partials.add(match[1]);
  }
  return Array.from(partials).sort();
}

function checkUnbalancedBlocks(source: string): string[] {
  const errors: string[] = [];
  const blockStack: { name: string; line: number }[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const opens = line.matchAll(/\{\{#([a-z]+)/g);
    for (const match of opens) {
      blockStack.push({ name: match[1], line: lineNum });
    }

    const closes = line.matchAll(/\{\{\/([a-z]+)\}\}/g);
    for (const match of closes) {
      const closer = match[1];
      if (blockStack.length === 0) {
        errors.push(`Line ${lineNum}: Unexpected closing block {{/${closer}}}`);
      } else {
        const opener = blockStack.pop()!;
        if (opener.name !== closer) {
          errors.push(
            `Line ${lineNum}: Mismatched block - expected {{/${opener.name}}} (opened on line ${opener.line}), got {{/${closer}}}`
          );
        }
      }
    }
  }

  for (const opener of blockStack) {
    errors.push(`Line ${opener.line}: Unclosed block {{#${opener.name}}}`);
  }

  return errors;
}

export function validateTemplate(options: ValidateOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    variables: [],
    helpers: [],
    partials: [],
  };

  const fullPath = resolveTemplatePath(options.templatePath);
  if (!existsSync(fullPath)) {
    result.valid = false;
    result.errors.push(`Template not found: ${fullPath}`);
    return result;
  }

  const source = readFileSync(fullPath, 'utf-8');

  result.variables = extractVariables(source);
  result.helpers = extractHelpers(source);
  result.partials = extractPartials(source);

  try {
    Handlebars.compile(source);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Syntax error: ${(error as Error).message}`);
    return result;
  }

  const blockErrors = checkUnbalancedBlocks(source);
  if (blockErrors.length > 0) {
    result.valid = false;
    result.errors.push(...blockErrors);
  }

  return result;
}

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      template: { type: 'string', short: 't' },
      data: { type: 'string', short: 'd' },
      strict: { type: 'boolean', short: 's' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help || !values.template) {
    console.log(`
Template Validator

Usage:
  bun run ValidateTemplate.ts --template <path> [options]

Options:
  -t, --template <path>  Template file (.hbs)
  -d, --data <path>      Data file for variable checking
  -s, --strict           Treat missing variables as errors
  -h, --help             Show this help
`);
    process.exit(values.help ? 0 : 1);
  }

  const result = validateTemplate({
    templatePath: values.template,
    dataPath: values.data,
    strict: values.strict,
  });

  console.log('\n=== Template Validation ===\n');
  console.log(`Template: ${values.template}`);
  console.log(`Status: ${result.valid ? '✓ Valid' : '✗ Invalid'}`);

  if (result.variables.length > 0) {
    console.log(`\nVariables (${result.variables.length}):`);
    result.variables.forEach(v => console.log(`  - ${v}`));
  }

  if (result.helpers.length > 0) {
    console.log(`\nHelpers Used (${result.helpers.length}):`);
    result.helpers.forEach(h => console.log(`  - ${h}`));
  }

  if (result.errors.length > 0) {
    console.log(`\n✗ Errors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠ Warnings (${result.warnings.length}):`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }

  console.log('');
  process.exit(result.valid ? 0 : 1);
}

if (import.meta.main) {
  main();
}
```

---

## Step 6: Create Template Primitives

### Roster.hbs

Save to `$PAI_DIR/skills/Prompting/Templates/Primitives/Roster.hbs`:

```handlebars
{{!--
  ROSTER Template - Agent & Skill Definitions

  Purpose: Generate structured definitions from YAML data sources.

  Input Data Structure:
  ```yaml
  agents:
    agent_id:
      id: string
      name: string
      display_name: string
      role: string
      emoji: string
      personality:
        traits: [string]
        perspective: string
  ```
--}}

# Agent Roster

{{#if version}}
**Version:** {{version}}
{{/if}}

---

{{#each agents}}
## {{emoji}} {{display_name}} ({{role}})

**ID:** `{{id}}`
{{#if name}}
**Character Name:** {{name}}
{{/if}}

{{#if personality}}
### Personality

**Perspective:** "{{personality.perspective}}"

**Traits:**
{{#each personality.traits}}
- {{this}}
{{/each}}
{{/if}}

---

{{/each}}
```

### Briefing.hbs

Save to `$PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs`:

```handlebars
{{!--
  BRIEFING Template - Agent Context Handoff

  Purpose: Standardize how agents receive tasks and context.

  Input Data Structure:
  ```yaml
  briefing:
    type: string (research | analysis | debate | task)
  agent:
    id: string
    name: string
    personality:
      perspective: string
      traits: [string]
  context:
    summary: string
  task:
    description: string
    questions: [string] (optional)
  output_format:
    type: string (markdown | json | structured)
  ```
--}}

# {{uppercase briefing.type}} BRIEFING — {{agent.name}}

{{#if agent.role}}
**Role:** {{agent.role}}
{{/if}}

---

## Your Identity

You are **{{agent.name}}**{{#if agent.personality.perspective}}, and your perspective is: "{{agent.personality.perspective}}"{{/if}}

{{#if agent.personality.traits}}
**Your Traits:**
{{#each agent.personality.traits}}
- {{this}}
{{/each}}
{{/if}}

---

## Context

{{context.summary}}

---

## Your Task

{{task.description}}

{{#if task.questions}}
### Questions to Address

{{#each task.questions}}
{{@index}}. {{this}}
{{/each}}
{{/if}}

---

## Output Format

{{#if output_format.type}}
**Format:** {{output_format.type}}
{{/if}}

{{#if output_format.structure}}
{{output_format.structure}}
{{/if}}

---

**Begin your analysis now.**
```

### Structure.hbs

Save to `$PAI_DIR/skills/Prompting/Templates/Primitives/Structure.hbs`:

```handlebars
{{!--
  STRUCTURE Template - Workflow Patterns

  Purpose: Generate standardized multi-step execution patterns.

  Input Data Structure:
  ```yaml
  workflow:
    name: string
    description: string
    phases:
      - name: string
        purpose: string
        steps:
          - action: string
            instructions: string
  ```
--}}

# {{workflow.name}}

{{#if workflow.description}}
{{workflow.description}}
{{/if}}

---

{{#each workflow.phases}}
## Phase {{@index}}: {{name}}

{{#if purpose}}
**Purpose:** {{purpose}}
{{/if}}

{{#each steps}}
### Step {{@index}}: {{action}}

{{instructions}}

{{/each}}

---

{{/each}}

{{#if workflow.completion_criteria}}
## Completion Criteria

{{#each workflow.completion_criteria}}
- [ ] {{this}}
{{/each}}
{{/if}}
```

### Voice.hbs

Save to `$PAI_DIR/skills/Prompting/Templates/Primitives/Voice.hbs`:

```handlebars
{{!--
  VOICE Template - Personality Calibration

  Purpose: Generate voice configuration for agents.

  Input Data Structure:
  ```yaml
  agents:
    agent_id:
      voice:
        voice_id: string
        voice_name: string
        rate_wpm: number
        stability: number
        similarity_boost: number
  ```
--}}

{
  "version": "{{default version '1.0.0'}}",
  "generated": "{{now 'date'}}",
  "default_rate": {{default defaults.rate_wpm 175}},
  "voices": {
{{#each agents}}
    "{{@key}}": {
      "voice_id": "{{voice.voice_id}}",
      "voice_name": "{{voice.voice_name}}",
      "name": "{{name}}",
      "rate_wpm": {{voice.rate_wpm}},
      "stability": {{voice.stability}},
      "similarity_boost": {{voice.similarity_boost}}
    }{{#unless @last}},{{/unless}}
{{/each}}
  }
}
```

### Gate.hbs

Save to `$PAI_DIR/skills/Prompting/Templates/Primitives/Gate.hbs`:

```handlebars
{{!--
  GATE Template - Validation Checklists

  Purpose: Generate reusable quality and completion checks.

  Input Data Structure:
  ```yaml
  gate:
    name: string
    category: string
    action_on_fail: string
    mandatory:
      - name: string
        description: string
    recommended:
      - name: string
        description: string
  ```
--}}

## {{gate.name}} Checklist

{{#if gate.category}}
**Category:** `{{gate.category}}`
{{/if}}
{{#if gate.description}}
{{gate.description}}
{{/if}}

{{#if gate.mandatory}}
### MANDATORY

{{#if gate.action_on_fail}}
*If ANY item below fails → **{{gate.action_on_fail}}***
{{/if}}

{{#each gate.mandatory}}
- [ ] **{{name}}** — {{description}}
{{/each}}
{{/if}}

{{#if gate.recommended}}
### RECOMMENDED

{{#each gate.recommended}}
- [ ] {{name}} — {{description}}
{{/each}}
{{/if}}
```

---

## Step 7: Create Templates README

Save to `$PAI_DIR/skills/Prompting/Templates/README.md`:

```markdown
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
```

---

## Step 8: Install Dependencies

```bash
cd $PAI_DIR/skills/Prompting/Tools
bun init -y
bun add handlebars yaml
```

---

## Step 9: Generate Skill Index (If Using kai-core-install)

```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
```

---

## Step 10: Update Architecture

```bash
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Installed kai-prompting-skill v1.0.0" pack
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
```

---

# PART 7: VERIFICATION

After installation, verify:

```bash
# Check directory structure
ls $PAI_DIR/skills/Prompting/
# Should show: SKILL.md Standards.md Templates/ Tools/

ls $PAI_DIR/skills/Prompting/Templates/Primitives/
# Should show: Roster.hbs Voice.hbs Structure.hbs Briefing.hbs Gate.hbs

# Test template rendering
echo 'agents:
  test:
    id: "T-1"
    name: "Test Agent"
    display_name: "Test"
    role: "Tester"
    emoji: "🧪"
    personality:
      perspective: "Testing perspective"
      traits:
        - "Thorough"
        - "Precise"' > /tmp/test-agents.yaml

bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Primitives/Roster.hbs \
  --data /tmp/test-agents.yaml \
  --preview

# Validate a template
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs
```

---

# PART 8: CUSTOMIZATION

## Recommended Customization

### Create Your Own Templates

The five primitives cover most use cases, but you can create custom templates:

1. Create a new `.hbs` file in `Templates/Primitives/` or a new subdirectory
2. Follow Handlebars syntax
3. Document the expected data structure in the template header
4. Test with sample data before production use

### Extend the Helpers

Add custom Handlebars helpers in `Tools/RenderTemplate.ts`:

```typescript
Handlebars.registerHelper('myHelper', (value: string) => {
  // Your custom logic
  return transformedValue;
});
```

---

## Optional Customization

| Customization | Location | Impact |
|---------------|----------|--------|
| **Add Eval Templates** | `Templates/Evals/` | LLM-as-Judge patterns |
| **Create Partials** | `Templates/Partials/` | Reusable template fragments |
| **Add Data Files** | `Templates/Data/` | Pre-configured YAML sources |
| **Extend Standards** | `Standards.md` | Project-specific guidelines |

---

# PART 9: INTEGRATION

## With Other Skills

### Agents Skill
```typescript
import { renderTemplate } from '$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts';

const prompt = renderTemplate({
  templatePath: 'Primitives/Briefing.hbs',
  dataPath: 'path/to/briefing-data.yaml'
});
```

### Evals Skill
The Prompting skill can host eval-specific templates (`Judge.hbs`, `Rubric.hbs`) that the Evals skill references.

### Development Skill
Reference `Standards.md` for prompt best practices during spec-driven development.

---

# PART 10: EXAMPLES

## Example 1: Generate Agent Briefing

**Data (briefing.yaml):**
```yaml
briefing:
  type: research
agent:
  id: "R-1"
  name: "Research Analyst"
  personality:
    perspective: "What does the data actually show?"
    traits:
      - "Evidence-based"
      - "Skeptical of claims"
context:
  summary: "Investigating the impact of prompt structure on LLM performance."
task:
  description: "Analyze the academic literature on prompt engineering."
  questions:
    - "What structures have empirical validation?"
    - "What is the optimal number of examples?"
output_format:
  type: markdown
```

**Command:**
```bash
bun run RenderTemplate.ts -t Primitives/Briefing.hbs -d briefing.yaml -p
```

---

## Example 2: Create Validation Gate

**Data (security-gate.yaml):**
```yaml
gate:
  name: "Security Review"
  category: "security"
  action_on_fail: "BLOCK deployment"
  mandatory:
    - name: "No hardcoded credentials"
      description: "Scan for API keys, passwords, tokens in code"
    - name: "Input validation"
      description: "All user inputs sanitized"
  recommended:
    - name: "Rate limiting"
      description: "API endpoints have rate limits configured"
```

**Command:**
```bash
bun run RenderTemplate.ts -t Primitives/Gate.hbs -d security-gate.yaml -o security-checklist.md
```

---

## Example 3: Phased Workflow

**Data (research-workflow.yaml):**
```yaml
workflow:
  name: "Research Methodology"
  description: "Structured approach to technical research"
  phases:
    - name: "Discovery"
      purpose: "Identify scope and sources"
      steps:
        - action: "Define research question"
          instructions: "Write a specific, answerable question."
        - action: "Identify sources"
          instructions: "List 5-10 authoritative sources."
    - name: "Analysis"
      purpose: "Extract and synthesize information"
      steps:
        - action: "Extract key findings"
          instructions: "Document main claims with evidence."
        - action: "Identify patterns"
          instructions: "Look for agreements and contradictions."
  completion_criteria:
    - "Research question answered"
    - "Sources cited"
    - "Confidence level stated"
```

---

# PART 11: TROUBLESHOOTING

## Template Not Rendering

1. Verify template path is correct (relative to Templates directory)
2. Check YAML syntax in data file
3. Run ValidateTemplate.ts to check for errors
4. Ensure all required variables exist in data

## Missing Helpers

If a helper isn't working:
1. Check spelling (helpers are case-sensitive)
2. Verify it's registered in RenderTemplate.ts
3. Check the helper signature matches usage

## Variable Not Found

1. Run ValidateTemplate.ts with `--data` to check
2. Verify nested property paths are correct
3. Check for typos in variable names

---

# PART 12: CREDITS

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2025)
- **License:** MIT

## Acknowledgments

- **Anthropic** - Claude 4.x Best Practices, context engineering research
- **IndyDevDan** - Meta-prompting concepts and inspiration for templated prompt generation
- **Daniel Miessler** - Fabric pattern system (248 reusable prompts)
- **Academic Community** - "The Prompt Report", "The Prompt Canvas"

---

# PART 13: RELATIONSHIPS

## Works Well With

- **kai-core-install** - Required; provides Skills directory and routing
- **kai-hook-system** - Optional; enables session startup loading
- **kai-voice-system** - Templates can generate voice configurations

## Parent Of

- **Agents Skill** - Uses Briefing templates for context handoff
- **Evals Skill** - Uses Judge/Rubric templates for evaluations

## Child Of

- **kai-core-install** - Uses Skills directory structure

## Sibling Of

- **Development Skill** - Both reference Standards.md
- **Research Skill** - Both use Briefing templates

## Part Of Collection

**Kai Productivity Bundle** - Meta-capabilities for building better prompts and workflows.

---

# PART 14: CHANGELOG

## v1.0.0 (2025-12-29)

- Initial release
- Complete prompt engineering standards (Claude 4.x)
- Five core template primitives
- RenderTemplate.ts and ValidateTemplate.ts tools
- Full documentation and examples
