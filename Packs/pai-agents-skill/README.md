---
name: PAI Agents Skill
pack-id: danielmiessler-pai-agents-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Dynamic agent composition and management system with custom personalities, voice mappings, and parallel orchestration
type: skill
purpose-type: [agent-management, orchestration, personality-system]
platform: claude-code
dependencies: [pai-core-install]
keywords: [agents, custom-agents, personalities, voices, parallel, orchestration]
---

# PAI Agents Skill Pack v2.3.0

**Dynamic agent composition and management system for PAI.**

---

## What This Pack Provides

The Agents skill is a complete agent composition and management system that enables:

- **Dynamic Agent Composition** - Create specialized agents from trait combinations (expertise + personality + approach)
- **Personality-Based Voice Mapping** - Each unique trait combination maps to a distinct ElevenLabs voice
- **Named Agent Templates** - Pre-configured agents for common roles (Engineer, Architect, Designer, etc.)
- **Parallel Agent Orchestration** - Launch multiple agents simultaneously for parallel work
- **Context Loading System** - Simple markdown-based context files for agent specialization

---

## Key Features

### Hybrid Agent Model

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories | Recurring work, voice output, relationships |
| **Dynamic Agents** | Task-specific specialists from traits | One-off tasks, novel combinations, parallel work |

### Trait Categories

**Expertise** (10 domains):
- security, legal, finance, medical, technical, research, creative, business, data, communications

**Personality** (10 styles):
- skeptical, enthusiastic, cautious, bold, analytical, creative, empathetic, contrarian, pragmatic, meticulous

**Approach** (8 methods):
- thorough, rapid, systematic, exploratory, comparative, synthesizing, adversarial, consultative

### Voice Integration

Each trait combination automatically maps to an appropriate ElevenLabs voice:
- Skeptical + analytical -> George (intellectual warmth)
- Enthusiastic + creative -> Jeremy (high energy)
- Bold + business -> Domi (assertive CEO)
- 45+ voices with characteristics defined

---

## Named Agents Included

| Agent | Role | Voice ID |
|-------|------|----------|
| Engineer | Elite principal engineer with TDD focus | iLVmqjzCGGvqtMCk6vVQ |
| Architect | System design with PhD-level expertise | muZKMsIDGYtIkjjiUS82 |
| Designer | UX/UI specialist with design school pedigree | 2f09SZ8gvYo2C1S98dOr |
| QATester | Quality validation using browser automation | 4JeAhLWWF31aL3Xfm6LQ |
| Pentester | Security specialist, reformed grey hat | n9TLi5s4c4P3zV4Kgf3C |
| Artist | Visual content creator | f6DmA3m8JRwzf1qgkITQ |
| Intern | Fast parallel grunt work | d3MFdIuCfbAIwiu7jC4a |

---

## Usage Examples

### Create Custom Agents
```
User: "Spin up 5 custom science agents to analyze this data"
-> Creates 5 agents with DIFFERENT trait combinations
-> Each gets unique personality + matched voice
-> All run in parallel
```

### List Available Traits
```
User: "What agent personalities can you create?"
-> Shows expertise, personality, and approach options
-> Explains composition system
```

### Spawn Parallel Workers
```
User: "Launch 10 agents to research these companies"
-> Creates 10 generic Intern agents
-> Uses haiku model for speed
-> Spotchecks results automatically
```

---

## Pack Contents

```
pai-agents-skill/
|-- README.md              # This file
|-- INSTALL.md             # AI agent installation guide
|-- VERIFY.md              # Post-installation verification
+-- src/
    |-- agents/            # Named agent template files (11 total)
    |   |-- Engineer.md
    |   |-- Architect.md
    |   |-- Designer.md
    |   |-- QATester.md
    |   |-- Pentester.md
    |   |-- Artist.md
    |   |-- Intern.md
    |   |-- ClaudeResearcher.md
    |   |-- GeminiResearcher.md
    |   |-- GrokResearcher.md
    |   +-- CodexResearcher.md
    +-- skills/Agents/     # Agents skill directory
        |-- SKILL.md       # Main skill routing
        |-- AgentPersonalities.md
        |-- AgentProfileSystem.md
        |-- ArchitectContext.md
        |-- ArtistContext.md
        |-- ClaudeResearcherContext.md
        |-- CodexResearcherContext.md
        |-- DesignerContext.md
        |-- EngineerContext.md
        |-- GeminiResearcherContext.md
        |-- GrokResearcherContext.md
        |-- QATesterContext.md
        |-- Data/
        |   +-- Traits.yaml
        |-- Templates/
        |   +-- DynamicAgent.hbs
        |-- Tools/
        |   |-- AgentFactory.ts
        |   |-- LoadAgentContext.ts
        |   |-- SpawnAgentWithProfile.ts
        |   +-- package.json
        +-- Workflows/
            |-- CreateCustomAgent.md
            |-- ListTraits.md
            +-- SpawnParallelAgents.md
```

---

## Requirements

- **pai-core-install** - Required (provides CORE skill infrastructure)
- **bun** - For running TypeScript tools
- **ElevenLabs API** (optional) - For voice output via voice server

---

## Model Selection

| Task Type | Model | Speed |
|-----------|-------|-------|
| Grunt work, simple checks | haiku | 10-20x faster |
| Standard analysis | sonnet | Balanced |
| Deep reasoning | opus | Maximum intelligence |

---

## Related Packs

- **pai-core-install** - Required foundation (provides CORE skill)
- **pai-development-pack** - Uses Engineer and Architect agents

---

## Version History

- **v2.3.0** (2026-01-14): Initial pack release for PAI v2.3
- Based on Agents skill v1.0.0 (2025-12-16)
