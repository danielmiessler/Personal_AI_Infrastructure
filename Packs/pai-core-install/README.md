---
name: Kai Core Install
pack-id: danielmiessler-kai-core-install-v1.0.1
version: 1.0.1
author: danielmiessler
description: Complete PAI core installation - skill routing, identity system, and architecture tracking. The foundation pack that makes everything else work.
type: feature
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies:
  - kai-hook-system (required) - Hooks enable session context loading and events
  - kai-history-system (optional) - History capture for skill usage and learnings
keywords: [core, identity, skills, routing, architecture, installation, foundation, personality, response-format, principles]
---

<p align="center">
  <img src="../icons/kai-core-install.png" alt="Kai Core Install" width="256">
</p>

# Kai Core Install (kai-core-install)

> The complete foundation for Personal AI Infrastructure - skill routing, identity framework, and architecture tracking in one unified pack.

## What This Pack Provides

**Part 1: Skill System**
- **SKILL.md Format**: Standardized structure for all capabilities
- **Intent Matching**: AI activates skills based on natural language triggers
- **Workflow Routing**: Skills route to specific step-by-step procedures
- **Dynamic Loading**: Only load context when actually needed
- **Skill Discovery**: Search and browse available skills

**Part 2: Identity Framework**
- **Mandatory Response Format**: Structured output with emoji sections
- **Personality Calibration**: Numeric precision for traits (enthusiasm, precision, etc.)
- **Operating Constitution**: Core values and non-negotiable principles
- **14 Founding Principles**: Architectural philosophy for building AI infrastructure
- **First-Person Voice**: Natural, embodied communication

**Part 3: Architecture Tracking**
- **PAI Architecture.md**: Auto-generated tracking of installed packs, bundles, plugins
- **Upgrade History**: Running record of all changes to your PAI system
- **System Health**: Status checks for all installed components

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              SKILL LOADING TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 0: CORE (Automatic)                                       │
│  ════════════════════════                                       │
│  • Loads at session start                                       │
│  • NO trigger required                                          │
│  • ALWAYS present                                               │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 1: Frontmatter Only (System Prompt)                       │
│  ════════════════════════════════════════                       │
│  • SKILL.md frontmatter always in context                       │
│  • USE WHEN triggers enable intent routing                      │
│  • Minimal token cost                                           │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 2: Full Skill (On Invoke)                                 │
│  ════════════════════════════════                               │
│  • SKILL.md body loads when triggered                           │
│  • Workflow routing table available                             │
│                                                                 │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                                 │
│  TIER 3: Workflow (On Route)                                    │
│  ════════════════════════════                                   │
│  • Specific workflow.md loads on routing                        │
│  • Step-by-step instructions                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| CORE skill template | `src/skills/CORE/SKILL.md` | Main identity and routing hub |
| Skill system docs | `src/skills/CORE/SkillSystem.md` | Skill routing architecture |
| CreateSkill skill | `src/skills/CreateSkill/SKILL.md` | Meta-skill for creating skills |
| UpdateDocumentation | `src/skills/CORE/Workflows/UpdateDocumentation.md` | Architecture refresh workflow |
| SkillSearch tool | `src/tools/SkillSearch.ts` | Search skill index |
| GenerateSkillIndex | `src/tools/GenerateSkillIndex.ts` | Build skill index |
| PaiArchitecture | `src/tools/PaiArchitecture.ts` | Generate architecture tracking |

**Summary:**
- **Files created:** 10+
- **Hooks registered:** 0 (uses hook system from kai-hook-system)
- **Dependencies:** kai-hook-system (required), kai-history-system (optional)

## The 14 Founding Principles

1. **Clear Thinking + Prompting is King** - Good prompts come from clear thinking
2. **Scaffolding > Model** - Architecture matters more than which model
3. **As Deterministic as Possible** - Same input → Same output
4. **Code Before Prompts** - Use AI only for what needs intelligence
5. **Spec / Test / Evals First** - Define expected behavior before building
6. **UNIX Philosophy** - Do one thing well, compose tools
7. **ENG / SRE Principles** - Apply software engineering to AI systems
8. **CLI as Interface** - Every operation accessible via command line
9. **Goal → Code → CLI → Prompts → Agents** - The proper pipeline
10. **Meta / Self Update System** - System should improve itself
11. **Custom Skill Management** - Skills are the organizational unit
12. **Custom History System** - Automatic capture of valuable work
13. **Custom Agent Personalities** - Different voices for different tasks
14. **Science as Cognitive Loop** - Hypothesis → Experiment → Measure → Iterate

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2025)
- **License:** MIT

## Works Well With

- **kai-hook-system** (required) - Enables automatic CORE loading at session start
- **kai-history-system** - Skills can reference past learnings and capture new ones
- **kai-voice-system** - Response format drives voice output

## Changelog

### 1.0.1 - 2026-01-03
- Fixed CreateSkill SKILL.md - removed broken workflow references, now points to SkillSystem.md
- Improved skill validation compliance

### 1.0.0 - 2025-12-29
- Initial release
