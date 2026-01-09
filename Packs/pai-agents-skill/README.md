---
name: Kai Agents Skill
pack-id: danielmiessler-agents-skill-core-v1.1.1
version: 1.1.1
author: danielmiessler
description: Dynamic agent composition and orchestration system - create custom agents with unique personalities, voices, and trait combinations on-the-fly
type: skill
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v1.0.0]
keywords: [agents, delegation, parallel, traits, personalities, voice, composition, dynamic, factory, custom, orchestration, subagents]
---

# Kai Agents Skill

> Dynamic agent composition system - create specialized agents with unique personalities and voices, composed from traits on-the-fly

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Agents skill | `src/skills/Agents/SKILL.md` | Routing and agent definitions |
| Agent factory | `src/skills/Agents/Tools/AgentFactory.ts` | Dynamic agent composition |
| Trait definitions | `src/skills/Agents/Data/Traits.yaml` | Expertise, personality, approach traits |
| Agent template | `src/skills/Agents/Templates/DynamicAgent.hbs` | Prompt template for composed agents |
| Create agent | `src/skills/Agents/Workflows/CreateCustomAgent.md` | Custom agent workflow |
| List traits | `src/skills/Agents/Workflows/ListTraits.md` | Show available traits |
| Personalities | `src/skills/Agents/AgentPersonalities.md` | Named agent examples |

## The Problem

AI agent systems typically offer one-size-fits-all agents. You spawn "an agent" but they all have the same personality, same approach, same voice.

**Cognitive Monoculture:**
- Every analysis comes from the same perspective
- No natural devil's advocacy or alternative viewpoints
- Blind spots become systematic

**Lack of Specialization:**
- A security review agent should think differently than a creative brainstorming agent
- Generic agents lack focused expertise and behavioral patterns
- "Jack of all trades" means master of none

**Voice Confusion:**
- When multiple agents speak, they're indistinguishable
- No personality differentiation in outputs

## The Solution

### Hybrid Agent Model

Two types of agents working together:

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories | Recurring work, voice output, relationships |
| **Dynamic Agents** | Task-specific specialists composed from traits | One-off tasks, novel combinations, parallel work |

### Trait Composition System

Agents are composed by combining three trait categories:

```
AGENT = Expertise + Personality + Approach
```

**Expertise (10 types):** security, legal, finance, medical, technical, research, creative, business, data, communications

**Personality (10 dimensions):** skeptical, enthusiastic, cautious, bold, analytical, creative, empathetic, contrarian, pragmatic, meticulous

**Approach (8 styles):** thorough, rapid, systematic, exploratory, comparative, synthesizing, adversarial, consultative

**Total combinations:** 10 x 10 x 8 = **800 unique agent compositions**

### Voice Mapping

Each trait combination maps to a distinct voice automatically.

## Example Usage

```bash
# Infer traits from task
bun run AgentFactory.ts --task "Review this security architecture"
# Result: security + skeptical + thorough agent with appropriate voice

# Specify explicitly
bun run AgentFactory.ts --traits "legal,meticulous,systematic"
# Result: Legal expert with careful systematic approach

# List all traits
bun run AgentFactory.ts --list
```

## Changelog

### 1.1.1 - 2026-01-03
- Added missing `SpawnParallelAgents.md` workflow (was referenced but didn't exist)
- Fixed workflow validation

### 1.1.0 - 2025-12-30
- **CRITICAL FIX**: Custom agents now use `subagent_type: "general-purpose"` instead of "Intern"
- Added constitutional rule for custom agent creation

### 1.0.0 - 2025-12-29
- Initial release
- 28 composable traits (10 expertise, 10 personality, 8 approach)
- AgentFactory CLI tool with trait inference
