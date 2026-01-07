---
name: Agents
description: Dynamic agent composition and management system. USE WHEN user says create custom agents, spin up custom agents, specialized agents, OR asks for agent personalities, available traits, agent voices, OR needs named agents like The Engineer or The Architect. Handles custom agent creation, personality assignment, voice mapping, and parallel agent orchestration.
---

# Agents - Custom Agent Composition System

**Auto-routes when user mentions custom agents, agent creation, named agents (The Engineer, The Architect), or specialized personalities.**

---

## MANDATORY: AgentFactory Execution (Constitutional Rule)

**BEFORE launching ANY agent (custom OR named), you MUST execute AgentFactory.ts via Bash.**

### For Named Agents (The Engineer, The Architect, The Intern)

```bash
# Use --named for persistent agent identities:
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named engineer \
  --task "<task description>" \
  --output json

# Or use --role to map a role to a named agent:
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --role implementer \
  --task "<task description>" \
  --output json
```

### For Custom/Dynamic Agents

```bash
# Use --traits for custom agents:
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "<expertise>,<personality>,<approach>" \
  --task "<task description>" \
  --output json
```

### Validation Checklist

Before calling `Task()` for any agent, confirm:

- [ ] I executed `AgentFactory.ts` via Bash
- [ ] I captured the JSON output (prompt + voice_id + model)
- [ ] I am using the factory's `prompt` field verbatim
- [ ] I am using `subagent_type: "general-purpose"`
- [ ] I am using the `model` field from the output

### What is FORBIDDEN

| Action | Why It's Wrong |
|--------|----------------|
| Manually composing prompts from personality docs | Bypasses voice mapping and template |
| Using Task without AgentFactory | No voice, no consistent format |
| Guessing agent names or traits | Use `--list-named` or `--list` instead |

**If you haven't run AgentFactory.ts in this conversation, you have NOT properly invoked an agent.**

---

## Named Agents

Persistent identities with backstories and pre-defined personalities.

| Agent | Key | Model | Use For |
|-------|-----|-------|---------|
| **The Engineer** | `engineer` | sonnet | Implementation, code quality review |
| **The Architect** | `architect` | opus | Design review, spec compliance |
| **The Intern** | `intern` | haiku | Grunt work, simple tasks |

**For detailed usage, role mappings, and examples, see `Workflows/UseNamedAgent.md`.**

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **UseNamedAgent** | "use The Engineer", "spawn The Architect" | `Workflows/UseNamedAgent.md` |
| **CreateCustomAgent** | "create custom agents", "spin up custom" | `Workflows/CreateCustomAgent.md` |
| **ListTraits** | "show traits", "list agents" | `Workflows/ListTraits.md` |
| **SpawnParallel** | "launch parallel agents" | `Workflows/SpawnParallelAgents.md` |

---

## Route Triggers

| User Says | What to Use | Example |
|-----------|-------------|---------|
| "use The Engineer", "get The Architect" | `--named engineer/architect` | Named agent with personality |
| "implementer", "spec reviewer" | `--role implementer/spec_reviewer` | Role-based agent selection |
| "custom agents", "create custom" | `--traits "..."` | Dynamic composition |
| "agents", "bunch of agents" | `--named intern` (multiple) | Parallel grunt work |

---

## Architecture

### Components

| File | Purpose |
|------|---------|
| `Data/Traits.yaml` | 28 composable traits with voice mappings |
| `Data/NamedAgents.yaml` | Named agent definitions (Engineer, Architect, Intern) |
| `Templates/DynamicAgent.hbs` | Template for custom agents |
| `Templates/NamedAgent.hbs` | Template for named agents |
| `Tools/AgentFactory.ts` | Unified composition engine |

### CLI Reference

```bash
# List available options
bun run AgentFactory.ts --list           # Show traits
bun run AgentFactory.ts --list-named     # Show named agents + roles

# Generate agent prompts
bun run AgentFactory.ts --named engineer --task "..." --output json
bun run AgentFactory.ts --role implementer --task "..." --output json
bun run AgentFactory.ts --traits "security,skeptical,thorough" --task "..." --output json
```

---

## Examples

**Example 1: Use The Engineer for implementation**
```
User: "Use The Engineer to implement this feature"
→ Run AgentFactory with --named engineer
→ Capture JSON output
→ Launch Task with prompt and model from output
```

**Example 2: Create custom security reviewer**
```
User: "Create a custom security agent to review this code"
→ Run AgentFactory with --traits "security,skeptical,adversarial"
→ Capture JSON output
→ Launch Task with prompt from output
```

**Example 3: Map role to agent**
```
User: "Get a spec reviewer to check compliance"
→ Run AgentFactory with --role spec_reviewer
→ Maps to The Architect
→ Launch Task with opus model
```
