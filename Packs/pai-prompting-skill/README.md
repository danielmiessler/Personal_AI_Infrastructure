---
name: PAI Prompting Skill
pack-id: danielmiessler-pai-prompting-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Meta-prompting system for dynamic prompt generation using Handlebars templates, Claude 4.x best practices, and the Fabric pattern system. Includes the Ultimate Prompt Template, five core primitives (Roster, Voice, Structure, Briefing, Gate), eval templates for LLM-as-Judge, and CLI tools for rendering and validation.
type: feature
purpose-type: [productivity, development, automation]
platform: claude-code
dependencies:
  - pai-core-install (required) - Skills directory structure and routing
  - pai-hook-system (optional) - For session startup context loading
keywords: [prompting, templates, handlebars, meta-prompting, prompt-engineering, fabric, claude-4, context-engineering, templating, evals]
---

<p align="center">
  <img src="../icons/pai-prompting-skill.png" alt="PAI Prompting Skill" width="256">
</p>

# PAI Prompting Skill (pai-prompting-skill)

> Prompts that write prompts. Meta-prompting enables dynamic composition where structure is fixed but content is parameterized.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What This Pack Does

This Pack provides a complete prompt engineering system:

**Prompt Engineering Standards**
- Claude 4.x Best Practices (behavioral characteristics, tool patterns)
- Context engineering principles (token efficiency, signal optimization)
- The Ultimate Prompt Template (modular, validated structure)
- Fabric pattern integration (248 reusable prompts)

**Template System**
- Five core primitives: Roster, Voice, Structure, Briefing, Gate
- Five eval templates: Judge, Rubric, Comparison, Report, TestCase
- Handlebars-based templating (Anthropic's official syntax)
- Data-driven prompt generation from YAML
- Pre-configured data files (Agents, ValidationGates, VoicePresets)
- CLI tools for rendering and validation

**Core Philosophy:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

## Architecture

```
pai-prompting-skill/
├── README.md                    # This file
├── INSTALL.md                   # Installation instructions
├── VERIFY.md                    # Verification checklist
└── src/
    └── skills/
        └── Prompting/
            ├── SKILL.md         # Skill routing and overview
            ├── Standards.md     # Claude 4.x best practices
            ├── Templates/
            │   ├── README.md    # Template system docs
            │   ├── Primitives/  # Core templates (5 files)
            │   │   ├── Roster.hbs
            │   │   ├── Voice.hbs
            │   │   ├── Structure.hbs
            │   │   ├── Briefing.hbs
            │   │   └── Gate.hbs
            │   ├── Evals/       # LLM-as-Judge templates (5 files)
            │   │   ├── Judge.hbs
            │   │   ├── Rubric.hbs
            │   │   ├── Comparison.hbs
            │   │   ├── Report.hbs
            │   │   └── TestCase.hbs
            │   ├── Data/        # Pre-configured YAML data
            │   │   ├── Agents.yaml
            │   │   ├── ValidationGates.yaml
            │   │   └── VoicePresets.yaml
            │   └── Tools/       # Template CLI tools
            │       ├── RenderTemplate.ts
            │       ├── ValidateTemplate.ts
            │       └── package.json
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

## The Problem This Solves

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

## Five Core Primitives

| Primitive | Purpose | Use Case |
|-----------|---------|----------|
| **ROSTER** | Data-driven definitions | Agent personalities, skill listings |
| **VOICE** | Personality calibration | Voice parameters, trait settings |
| **STRUCTURE** | Workflow patterns | Phased analysis, debate rounds |
| **BRIEFING** | Agent context handoff | Task delegation, research queries |
| **GATE** | Validation checklists | Quality checks, completion criteria |

## Quick Start

```bash
# Render a template
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template Primitives/Briefing.hbs \
  --data path/to/data.yaml \
  --output path/to/output.md

# Validate template syntax
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template Primitives/Briefing.hbs
```

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system (2024-2026)
- **License:** MIT

## Acknowledgments

- **Anthropic** - Claude 4.x Best Practices, context engineering research
- **IndyDevDan** - Meta-prompting concepts and inspiration
- **Daniel Miessler** - Fabric pattern system (248 reusable prompts)
- **Academic Community** - "The Prompt Report", "The Prompt Canvas"
