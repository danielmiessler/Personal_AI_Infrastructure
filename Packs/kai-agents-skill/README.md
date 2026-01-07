---
name: Kai Agents Skill
pack-id: danielmiessler-agents-skill-core-v1.2.0
version: 1.2.0
author: [danielmiessler, sti0]
description: Dynamic agent composition and orchestration system - create custom agents with unique personalities, voices, and trait combinations on-the-fly, plus named agents (The Engineer, The Architect, The Intern) with persistent identities
type: skill
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v1.0.0]
keywords: [agents, delegation, parallel, traits, personalities, voice, composition, dynamic, factory, custom, orchestration, subagents, named-agents, engineer, architect, intern]
---

# Kai Agents Skill

> Dynamic agent composition system - create specialized agents with unique personalities and voices, composed from traits on-the-fly, plus named agents with persistent identities

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Agents skill | `src/skills/Agents/SKILL.md` | Routing and agent definitions |
| Agent factory | `src/skills/Agents/Tools/AgentFactory.ts` | Dynamic + named agent composition |
| Trait definitions | `src/skills/Agents/Data/Traits.yaml` | Expertise, personality, approach traits |
| Named agents | `src/skills/Agents/Data/NamedAgents.yaml` | Engineer, Architect, Intern definitions |
| Dynamic template | `src/skills/Agents/Templates/DynamicAgent.hbs` | Prompt template for composed agents |
| Named template | `src/skills/Agents/Templates/NamedAgent.hbs` | Prompt template for named agents |
| Use named agent | `src/skills/Agents/Workflows/UseNamedAgent.md` | Named agent workflow |
| Create agent | `src/skills/Agents/Workflows/CreateCustomAgent.md` | Custom agent workflow |
| List traits | `src/skills/Agents/Workflows/ListTraits.md` | Show available traits |
| Spawn parallel | `src/skills/Agents/Workflows/SpawnParallelAgents.md` | Parallel agent orchestration |

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

### Named Agents

Three persistent agent identities with backstories, communication styles, and model preferences:

| Agent | Key | Model | Use For |
|-------|-----|-------|---------|
| **The Engineer** | `engineer` | sonnet | Implementation, code quality, technical decisions |
| **The Architect** | `architect` | opus | Design review, spec compliance, strategic vision |
| **The Intern** | `intern` | haiku | Grunt work, simple tasks, quick wins |

**Role Mappings:**
| Role | Maps To |
|------|---------|
| `implementer`, `developer`, `coder` | The Engineer |
| `spec_reviewer`, `architecture`, `design` | The Architect |
| `code_quality_reviewer`, `quality`, `reviewer` | The Engineer |
| `grunt_work`, `simple_task`, `quick_task` | The Intern |

### Trait Composition System

Dynamic agents are composed by combining three trait categories:

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
# Named agents
bun run AgentFactory.ts --named engineer --task "Implement the auth feature"
bun run AgentFactory.ts --named architect --task "Review the system design"
bun run AgentFactory.ts --role implementer --task "Build the API endpoint"

# List named agents
bun run AgentFactory.ts --list-named

# Infer traits from task (dynamic agent)
bun run AgentFactory.ts --task "Review this security architecture"
# Result: security + skeptical + thorough agent with appropriate voice

# Specify explicitly (dynamic agent)
bun run AgentFactory.ts --traits "legal,meticulous,systematic"
# Result: Legal expert with careful systematic approach

# List all traits
bun run AgentFactory.ts --list
```

## Changelog

### 1.2.0 - 2026-01-07
- **NEW**: Named agents (The Engineer, The Architect, The Intern)
- **NEW**: `UseNamedAgent.md` workflow for spawning named agents
- **NEW**: `--named` parameter for persistent agent identities
- **NEW**: `--role` parameter for role-to-agent mapping
- **NEW**: `--list-named` to show available named agents
- **NEW**: `NamedAgents.yaml` for agent definitions
- **NEW**: `NamedAgent.hbs` template for named agent prompts

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
