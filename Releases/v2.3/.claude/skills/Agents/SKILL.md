---
name: Agents
description: Dynamic agent composition and management system. USE WHEN user says create custom agents, spin up custom agents, specialized agents, OR asks for agent personalities, available traits, agent voices. Handles custom agent creation, personality assignment, voice mapping, and parallel agent orchestration.
---

# Agents - Custom Agent Composition System

**Auto-routes when user mentions custom agents, agent creation, or specialized personalities.**

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Agents/`

If this directory exists, load and apply:
- `PREFERENCES.md` - Named agent roster summary
- `VoiceConfig.json` - Voice server configuration with ElevenLabs voice IDs
- `NamedAgents.md` - Full agent backstories and character definitions (optional)

These define user-specific named agents with persistent identities. If the directory does not exist, use only dynamic agent composition from traits.

## Overview

The Agents skill is a complete agent composition and management system. It consolidates all agent-related infrastructure:
- Dynamic agent composition from traits (expertise + personality + approach)
- Personality definitions and voice mappings
- Custom agent creation with unique voices
- Parallel agent orchestration patterns


## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the Agents skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **Agents** skill...
   ```

**Full documentation:** `~/.claude/skills/CORE/SkillNotifications.md`

## Workflow Routing

**Available Workflows:**
- **CREATECUSTOMAGENT** - Create specialized custom agents → `Workflows/CreateCustomAgent.md`
- **LISTTRAITS** - Show available agent traits → `Workflows/ListTraits.md`
- **SPAWNPARALLEL** - Launch parallel agents → `Workflows/SpawnParallelAgents.md`

## Examples

**Example 1: Create custom agents for analysis**
```
User: "Spin up 5 custom science agents to analyze this data"
→ Invokes CREATECUSTOMAGENT workflow
→ Runs AgentFactory 5 times with DIFFERENT trait combinations
→ Each agent gets unique personality + matched voice
→ Launches agents in parallel with model: "sonnet"
```

**Example 2: List available traits**
```
User: "What agent personalities can you create?"
→ Invokes LISTTRAITS workflow
→ Displays expertise (security, legal, finance, etc.)
→ Shows personality types (skeptical, enthusiastic, analytical, etc.)
→ Lists approach styles (thorough, rapid, systematic, etc.)
```

**Example 3: Spawn parallel researchers**
```
User: "Launch 10 agents to research these companies"
→ Invokes SPAWNPARALLEL workflow
→ Creates 10 Intern agents (generic, same voice)
→ Uses model: "haiku" for speed
→ Launches spotcheck agent after completion
```

## Architecture

### Hybrid Agent Model

The system uses two types of agents:

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories (Remy, Ava, Marcus) | Recurring work, voice output, relationships |
| **Dynamic Agents** | Task-specific specialists composed from traits | One-off tasks, novel combinations, parallel work |

### The Agent Spectrum

```
┌─────────────────────────────────────────────────────────────────────┐
│   NAMED AGENTS          HYBRID USE          DYNAMIC AGENTS          │
│   (Relationship)        (Best of Both)      (Task-Specific)         │
├──────────────────────────────────────────────────────────────────────┤
│ Remy, Ava, Marcus   "Security expert      Ephemeral specialist      │
│                      with Johannes's      composed from traits      │
│                      skepticism"                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Route Triggers

**CRITICAL: The word "custom" is the KEY trigger:**

| User Says | What to Use | Why |
|-----------|-------------|-----|
| "**custom agents**", "create **custom** agents" | AgentFactory | Unique prompts + unique voices |
| "agents", "launch agents", "bunch of agents" | Generic Interns | Same voice, parallel grunt work |
| "use Remy", "get Ava to" | Named agent | Pre-defined personality |

**Other triggers:**
- "agent personalities", "available traits" → LISTTRAITS workflow
- "specialized agents", "expert in X" → CREATECUSTOMAGENT workflow
- "parallel agents", "spawn 5 agents" → SPAWNPARALLEL workflow

## Components

### Data

**Traits.yaml** (`Data/Traits.yaml`)
- Expertise areas: security, legal, finance, medical, technical, research, creative, business, data, communications
- Personality dimensions: skeptical, enthusiastic, cautious, bold, analytical, creative, empathetic, contrarian, pragmatic, meticulous
- Approach styles: thorough, rapid, systematic, exploratory, comparative, synthesizing, adversarial, consultative
- Voice mappings: Trait combinations → ElevenLabs voices
- Voice registry: 45+ voices with characteristics

### Templates

**DynamicAgent.hbs** (`Templates/DynamicAgent.hbs`)
- Handlebars template for dynamic agent prompts
- Composes: expertise + personality + approach + voice assignment
- Includes operational guidelines and response format

### Tools

**AgentFactory.ts** (`Tools/AgentFactory.ts`)
- Dynamic agent composition engine
- Infers traits from task description
- Maps trait combinations to appropriate voices
- Outputs complete agent prompt ready for Task tool

```bash
# Usage examples
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --task "Review security architecture"
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --traits "legal,skeptical,meticulous"
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --list
```

### Personalities

**AgentPersonalities.md** (`AgentPersonalities.md`)
- Named agent definitions with full backstories
- Voice settings and personality traits
- Character development and communication styles
- JSON configuration for voice server

**Named Agents:**
- Jamie - Expressive eager buddy
- Rook Blackburn (Pentester) - Reformed grey hat
- Priya Desai (Artist) - Aesthetic anarchist
- Aditi Sharma (Designer) - Design school perfectionist
- Dev Patel (Intern) - Brilliant overachiever
- Ava Chen (Perplexity) - Investigative analyst
- Ava Sterling (Claude) - Strategic sophisticate
- Alex Rivera (Gemini) - Multi-perspective analyst
- Marcus Webb (Engineer) - Battle-scarred leader
- Serena Blackwood (Architect) - Academic visionary
- Emma Hartley (Writer) - Technical storyteller

## Integration Points

**Voice Server** (`~/.claude/VoiceServer/`)
- Reads agent personality configuration from AgentPersonalities.md
- Maps agent names to ElevenLabs voice IDs
- Delivers personality-driven voice notifications

**CORE Skill** (`~/.claude/skills/CORE/`)
- References Agents skill for custom agent creation
- Documents the custom vs generic distinction
- Includes agent creation in delegation patterns

## Usage Patterns

### For Users (Natural Language)

Users talk naturally:
- "I need a legal expert to review this contract" → System composes legal + analytical + thorough agent
- "Spin up 5 custom science agents" → System uses AgentFactory 5 times with different traits
- "Launch agents to research these companies" → System spawns generic Intern agents
- "Get me someone skeptical about security" → System composes security + skeptical + adversarial agent

### Internal Process

When user says "custom agents", the assistant:
1. Invokes CREATECUSTOMAGENT workflow
2. Runs AgentFactory for EACH agent with DIFFERENT trait combinations
3. Gets unique prompt + voice ID for each
4. Launches agents using Task tool with the composed prompt
5. Each agent has a distinct personality-matched voice

Example internal execution:
```bash
# User: "Create 3 custom research agents"

# Agent 1
bun run AgentFactory.ts --traits "research,enthusiastic,exploratory"
# Output: Prompt with voice "Jeremy" (energetic)

# Agent 2
bun run AgentFactory.ts --traits "research,skeptical,thorough"
# Output: Prompt with voice "George" (intellectual)

# Agent 3
bun run AgentFactory.ts --traits "research,analytical,systematic"
# Output: Prompt with voice "Drew" (professional)

# Launch all 3 with Task tool
Task({ prompt: <agent1_prompt>, subagent_type: "Intern", model: "sonnet" })
Task({ prompt: <agent2_prompt>, subagent_type: "Intern", model: "sonnet" })
Task({ prompt: <agent3_prompt>, subagent_type: "Intern", model: "sonnet" })
```

## Model Selection

Always specify the appropriate model:

| Task Type | Model | Speed Multiplier |
|-----------|-------|------------------|
| Grunt work, simple checks | `haiku` | 10-20x faster |
| Standard analysis, research | `sonnet` | Balanced |
| Deep reasoning, architecture | `opus` | Maximum intelligence |

**Rule:** Parallel agents especially benefit from `haiku` for speed.

## Related Skills

- **CORE** - Main system identity and delegation patterns
- **VoiceNarration** - Voice output for content (separate from agent notifications)
- **Development** - Uses Engineer and Architect agents

## Version History

- **v1.0.0** (2025-12-16): Initial creation - consolidated all agent infrastructure into discrete skill
