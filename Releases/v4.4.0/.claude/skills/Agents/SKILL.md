---
name: Agents
description: Compose CUSTOM agents from Base Traits + Voice + Specialization for specialized perspectives. USE WHEN create custom agents, spin up agents, specialized agents, agent personalities, available traits, list traits, agent voices, compose agent, load agent context, agent profile, spawn parallel agents, launch agents. NOT for agent teams/swarms (use Delegation skill → TeamCreate).
---

## 🚨 SCOPE BOUNDARY — This Skill vs Agent Teams

| {PRINCIPAL.NAME} Says | Which System | NOT This Skill? |
|-------------|-------------|-----------------|
| "**custom agents**", "spin up agents", "launch agents" | **THIS SKILL** (Agents) → ComposeAgent → `Task(subagent_type="general-purpose")` | |
| "**create an agent team**", "**agent team**", "**swarm**" | **Delegation skill** → `TeamCreate` tool | **YES — NOT this skill** |

**If {PRINCIPAL.NAME} says "agent team" or "swarm", do NOT use this skill. Use the Delegation skill which routes to `TeamCreate`.**

- **This skill** = one-shot parallel workers with unique identities, NO shared state, fire-and-forget
- **Agent teams** (Delegation → TeamCreate) = persistent coordinated teams with shared task lists, messaging, multi-turn collaboration

---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
        > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Agents** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# Agents - Custom Agent Composition System

**Auto-routes when user mentions custom agents, agent creation, or specialized personalities.**
**Does NOT handle agent teams/swarms — that's Delegation skill → TeamCreate.**

## Configuration: Base + User Merge

The Agents skill uses the standard PAI SYSTEM/USER two-tier pattern:

| Location | Purpose | Updates With PAI? |
|----------|---------|-------------------|
| `Data/Traits.yaml` | Base traits, example voices | Yes |
| `USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml` | Your voices, prosody, agents | No |

**How it works:** ComposeAgent.ts loads base traits, then merges user customizations over them. Your customizations are never overwritten by PAI updates.

### User Customization Directory

Create your customizations at:
```
~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents/
├── Traits.yaml       # Your traits, voices, prosody settings
├── NamedAgents.md    # Your named agent backstories (optional)
└── Traits.yaml       # User trait overrides (optional)
```



## Overview

The Agents skill is a complete agent composition and management system:
- Dynamic agent composition from traits (expertise + personality + approach)
- Voice mappings with full prosody control
- Custom agent creation with unique voices
- Parallel agent orchestration patterns

## Workflow Routing

**Available Workflows:**
- **CREATECUSTOMAGENT** - Create specialized custom agents → `Workflows/CreateCustomAgent.md`
- **LISTTRAITS** - Show available agent traits → `Workflows/ListTraits.md`
- **SPAWNPARALLEL** - Launch parallel agents → `Workflows/SpawnParallelAgents.md`

## Route Triggers

**CRITICAL: The word "custom" is the KEY trigger for unique agent identities:**

| User Says | What to Use | Why |
|-----------|-------------|-----|
| "**custom agents**", "create **custom** agents" | ComposeAgent + `general-purpose` | Unique personalities, voices, colors |
| "agents", "launch agents", "bunch of agents" | SpawnParallel workflow | Same identity, parallel grunt work |
| "use [named agent]" | Named agent | Pre-defined personality from USER config |

**NEVER use static agent types (Architect, Engineer, etc.) for custom agents — always use `general-purpose` with ComposeAgent prompts.**

## Components

### Data

**Traits.yaml** (`Data/Traits.yaml`) - Base configuration:
- Core expertise areas: security, technical, research
- Core personalities: skeptical, analytical, enthusiastic
- Core approaches: thorough, rapid, systematic
- Example voice mappings with prosody

### Tools

**ComposeAgent.ts** (`Tools/ComposeAgent.ts`)
- Dynamic agent composition engine
- Merges base + user configurations
- Outputs complete agent prompt with voice settings
- Supports persistent custom agents via `--save` / `--load` / `--delete`

```bash
# Compose and use immediately
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --task "Review security"
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --traits "security,skeptical,thorough"

# Persistent custom agents
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --task "Security review" --save
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --list-saved
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --load "security-expert-skeptical-thorough"
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --delete "security-expert-skeptical-thorough"

# Other options
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --list
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --output json
```

**JSON output includes:**
```json
{
  "name": "Security Expert Skeptical Thorough",
  "color": "#4A90D9",
  "traits": ["security", "skeptical", "thorough"],
  "prompt": "..."
}
```

### Templates

**DynamicAgent.hbs** (`Templates/DynamicAgent.hbs`)
- Handlebars template for dynamic agent prompts
- Composes: expertise + personality + approach + voice assignment
- Includes operational guidelines and response format

## Architecture

### Hybrid Agent Model

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities defined in USER config | Recurring work, relationships |
| **Dynamic Agents** | Task-specific specialists composed from traits | One-off tasks, parallel work |

### The Agent Spectrum

```
┌─────────────────────────────────────────────────────────────────────┐
│   NAMED AGENTS          HYBRID USE          DYNAMIC AGENTS          │
│   (Relationship)        (Best of Both)      (Task-Specific)         │
├──────────────────────────────────────────────────────────────────────┤
│ Defined in USER     "Security expert       Ephemeral specialist     │
│ NamedAgents.md      with [named agent]'s   composed from traits     │
│                      skepticism"                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Examples

**Example 1: Create custom agents**
```
User: "Spin up 3 custom security agents"
→ Invokes CREATECUSTOMAGENT workflow
→ Runs ComposeAgent 3 times with DIFFERENT trait combinations
→ Each agent gets unique personality + matched voice + prosody
→ Launches agents in parallel
```

**Example 2: List available traits**
```
User: "What agent personalities can you create?"
→ Invokes LISTTRAITS workflow
→ Shows merged base + user traits
→ Displays voices with prosody settings
```

## Extending the Skill

### Adding Your Own Traits

In `USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml`:

```yaml
# Add new expertise areas
expertise:
  marketing:
    name: "Marketing Expert"
    description: "Brand strategy, campaigns, market positioning"
    keywords:
      - marketing
      - brand
      - campaign
      - positioning

# Add new personalities
personality:
  visionary:
    name: "Visionary"
    description: "Forward-thinking, sees the big picture"
    prompt_fragment: |
      You think in terms of future possibilities and long-term vision.
      Connect today's work to tomorrow's potential.
```

### Adding Named Agents

In `USER/SKILLCUSTOMIZATIONS/Agents/NamedAgents.md`:

```markdown
## Alex - The Strategist

**Voice ID:** your-voice-id
**Prosody:** stability: 0.55, style: 0.20, speed: 0.95

Alex is a strategic thinker who sees patterns others miss...
```

## Model Selection

| Task Type | Model | Speed |
|-----------|-------|-------|
| Grunt work, simple checks | `haiku` | 10-20x faster |
| Standard analysis, research | `sonnet` | Balanced |
| Deep reasoning, architecture | `opus` | Maximum quality |

## Version History

- **v2.0.0** (2026-01): Restructured to base + user merge pattern, added prosody support
- **v1.0.0** (2025-12): Initial creation
