---
name: Agents
description: Dynamic agent composition and management system. USE WHEN user says create custom agents, spin up custom agents, specialized agents, OR asks for agent personalities, available traits, agent voices. Handles custom agent creation, personality assignment, voice mapping, and parallel agent orchestration.
---

# Agents - Custom Agent Composition System

**Auto-routes when user mentions custom agents, agent creation, or specialized personalities.**

---

## MANDATORY: AgentFactory Execution (Constitutional Rule)

**BEFORE launching ANY custom agent, you MUST execute AgentFactory.ts via Bash.**

```bash
# REQUIRED for each custom agent:
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "<expertise>,<personality>,<approach>" \
  --task "<task description>" \
  --output json
```

### Validation Checklist

Before calling `Task()` for custom agents, confirm:

- [ ] I executed `AgentFactory.ts` via Bash for EACH agent
- [ ] I captured the JSON output (prompt + voice_id)
- [ ] I am using the factory's `prompt` field verbatim
- [ ] I am using `subagent_type: "general-purpose"`
- [ ] Each agent has DIFFERENT trait combinations

### What is FORBIDDEN

| Action | Why It's Wrong |
|--------|----------------|
| Reading Traits.yaml and manually composing prompts | Bypasses voice mapping and template |
| Copy-pasting trait descriptions into Task prompts | Creates inconsistent agent format |
| Using `subagent_type: "Intern"` for custom agents | Overrides custom voice assignment |
| Same traits for multiple agents | All agents get same voice |

**If you haven't run AgentFactory.ts in this conversation, you have NOT created custom agents.**

### Error Recovery Protocol

**If AgentFactory returns "Unknown traits" error:**

1. **DO NOT guess again** - Don't try different trait names randomly
2. **Read the error output** - AgentFactory now lists all available traits on error
3. **Select valid traits** - Choose from EXPERTISE, PERSONALITY, and APPROACH categories
4. **Retry with correct traits** - Use the valid trait names from the error message

**Example error output:**
```
Error: Unknown traits: typescript, bash

Available traits:
  EXPERTISE:   security, legal, finance, medical, technical, research, creative, business, data, communications
  PERSONALITY: skeptical, enthusiastic, cautious, bold, analytical, creative, empathetic, contrarian, pragmatic, meticulous
  APPROACH:    thorough, rapid, systematic, exploratory, comparative, synthesizing, adversarial, consultative

Run with --list to see full trait descriptions
```

**Pro tip:** Use `--task` instead of `--traits` to let AgentFactory infer valid traits automatically:
```bash
bun run AgentFactory.ts --task "TypeScript transformation with careful type checking" --output json
```

---

## Overview

The Agents skill provides complete agent composition and management:
- Dynamic agent composition from traits (expertise + personality + approach)
- Personality definitions and voice mappings
- Custom agent creation with unique voices
- Parallel agent orchestration patterns

## Workflow Routing

**Available Workflows:**
- **CREATECUSTOMAGENT** - Create specialized custom agents -> `Workflows/CreateCustomAgent.md`
- **LISTTRAITS** - Show available agent traits -> `Workflows/ListTraits.md`
- **SPAWNPARALLEL** - Launch parallel agents -> `Workflows/SpawnParallelAgents.md`

## Route Triggers

**CRITICAL: The word "custom" is the ABSOLUTE trigger - NO EXCEPTIONS:**

| User Says | What to Use | subagent_type | Why |
|-----------|-------------|---------------|-----|
| "**custom agents**", "create **custom** agents", "spin up **custom**" | AgentFactory | `general-purpose` | Unique prompts + unique voices |
| "agents", "launch agents", "bunch of agents" | Generic prompt | `Intern` | Same voice, parallel grunt work |
| "use [agent name]", "get [agent name] to" | Direct call | Named agent type | Pre-defined personality |

**CONSTITUTIONAL RULE FOR CUSTOM AGENTS:**
When user says "custom agents", you MUST:
1. Execute AgentFactory.ts via Bash for EACH agent with DIFFERENT traits
2. Capture and use the JSON output (prompt + voice_id)
3. Use `subagent_type: "general-purpose"` - **NEVER** "Intern", "Designer", "Architect", etc.
4. Each agent gets their own voice from the trait-to-voice mapping

## Architecture

### Hybrid Agent Model

Two types of agents:

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories | Recurring work, voice output |
| **Dynamic Agents** | Task-specific specialists from traits | One-off tasks, parallel work |

### Components

**Data/Traits.yaml** - 28 composable traits with voice mappings
**Templates/DynamicAgent.hbs** - Agent prompt template
**Tools/AgentFactory.ts** - Dynamic composition engine
**AgentPersonalities.md** - Named agent definitions

## Usage

Just ask naturally:
- "I need a legal expert to review this contract"
- "Spin up 5 custom science agents"
- "Get me someone skeptical about security"

The skill routes to appropriate workflow automatically.

## Model Selection

| Task Type | Model | Why |
|-----------|-------|-----|
| Grunt work | `haiku` | 10-20x faster |
| Standard analysis | `sonnet` | Balanced |
| Deep reasoning | `opus` | Maximum intelligence |
