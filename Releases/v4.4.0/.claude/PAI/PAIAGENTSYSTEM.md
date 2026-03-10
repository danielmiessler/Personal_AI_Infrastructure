# PAI Agent System

**Authoritative reference for agent routing in PAI. Three distinct systems exist—never confuse them.**

---

## 🚨 THREE AGENT SYSTEMS — CRITICAL DISTINCTION

PAI has three agent systems that serve different purposes. Confusing them causes routing failures.

| System | What It Is | When to Use |
|--------|-----------|-------------|
| **Task Tool Subagent Types** | Pre-built agents in Claude Code (Architect, Designer, Engineer, Explore, etc.) | Internal workflow use ONLY |
| **Named Agents** | Persistent identities with backstories and unique personalities (Serena, Marcus, Rook, etc.) | Recurring work, specialized expertise, relationships |
| **Custom Agents** | Dynamic agents composed via ComposeAgent from traits | When user says "custom agents" |

---

## 🚫 FORBIDDEN PATTERNS

**When user says "custom agents":**

```typescript
// ❌ WRONG - These are Task tool subagent_types, NOT custom agents
Task({ subagent_type: "Architect", prompt: "..." })
Task({ subagent_type: "Designer", prompt: "..." })
Task({ subagent_type: "Engineer", prompt: "..." })

// ✅ RIGHT - Invoke the Agents skill for custom agents
Skill("Agents")  // → CreateCustomAgent workflow
// OR follow the workflow directly:
// 1. Run ComposeAgent with different trait combinations
// 2. Launch agents with the generated prompts
// 3. Each gets unique personality + voice
```

---

## Routing Rules

### The Word "Custom" Is the Trigger

| User Says | Action | Implementation |
|-----------|--------|----------------|
| "**custom agents**", "spin up **custom** agents" | Invoke Agents skill | `Skill("Agents")` → CreateCustomAgent workflow |
| "agents", "launch agents", "parallel agents" | Custom agents via Agents skill | `Skill("Agents")` → ComposeAgent → `Task({ subagent_type: "general-purpose" })` |
| "research X", "investigate Y" | Research skill | `Skill("Research")` → appropriate researcher agents |
| "use Remy", "get Ava to" | Named agent | Use appropriate researcher subagent_type |
| (Code implementation) | Engineer | `Task({ subagent_type: "Engineer" })` |
| (Architecture/design) | Architect | `Task({ subagent_type: "Architect" })` |

### Custom Agent Creation Flow

When user requests custom agents:

1. **Invoke Agents skill** via `Skill("Agents")` or follow CreateCustomAgent workflow
2. **Run ComposeAgent** for EACH agent with DIFFERENT trait combinations
3. **Extract prompt** from ComposeAgent output
4. **Launch agents** with Task tool using the composed prompts

```bash
# Example: 3 custom research agents
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --traits "research,enthusiastic,exploratory"
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --traits "research,skeptical,systematic"
bun run ~/.claude/skills/Agents/Tools/ComposeAgent.ts --traits "research,analytical,synthesizing"
```

---

## Task Tool Subagent Types (Internal Use Only)

These are pre-built agents in the Claude Code Task tool. They are for **internal workflow use**, not for user-requested "custom agents."

| Subagent Type | Purpose | When Used |
|---------------|---------|-----------|
| `Architect` | System design | Development skill workflows |
| `Designer` | UX/UI design | Development skill workflows |
| `Engineer` | Code implementation | Development skill workflows |
| `general-purpose` | Custom agents via ComposeAgent | Parallel work with task-specific prompts |
| `Explore` | Codebase exploration | Finding files, understanding structure |
| `Plan` | Implementation planning | Plan mode |
| `QATester` | Quality assurance | Browser testing workflows |
| `Pentester` | Security testing | WebAssessment workflows |
| `ClaudeResearcher` | Claude-based research | Research skill workflows |
| `GeminiResearcher` | Gemini-based research | Research skill workflows |
| `GrokResearcher` | Grok-based research | Research skill workflows |

**These do NOT have unique voices or ComposeAgent composition.**

---

## Named Agents (Persistent Identities)

Named agents have rich backstories and personality traits. They provide relationship continuity across sessions.

| Agent | Role | Personality | Use For |
|-------|------|-------------|---------|
| Serena Blackwood | Architect | Methodical, systems-focused | Long-term architecture decisions |
| Marcus Webb | Engineer | Strategic, pragmatic | Strategic technical leadership |
| Rook Blackburn | Pentester | Adversarial, thorough | Security testing with personality |
| Ava Sterling | Claude Researcher | Investigative, precise | Strategic research |
| Alex Rivera | Gemini Researcher | Multi-perspective, broad | Comprehensive analysis |

**Full backstories and voice settings:** Individual `agents/*.md` files (persona frontmatter + body)

---

## Custom Agents (Dynamic Composition)

Custom agents are composed on-the-fly from traits using ComposeAgent. Each unique trait combination produces a distinct personality and expertise profile.

### Trait Categories

**Expertise** (domain knowledge):
`security`, `legal`, `finance`, `medical`, `technical`, `research`, `creative`, `business`, `data`, `communications`

**Personality** (behavior style):
`skeptical`, `enthusiastic`, `cautious`, `bold`, `analytical`, `creative`, `empathetic`, `contrarian`, `pragmatic`, `meticulous`

**Approach** (work style):
`thorough`, `rapid`, `systematic`, `exploratory`, `comparative`, `synthesizing`, `adversarial`, `consultative`

**Full trait definitions:** `skills/Agents/Data/Traits.yaml`

---

## Model Selection

Always specify the appropriate model for agent work:

| Task Type | Model | Speed |
|-----------|-------|-------|
| Simple checks, grunt work | `haiku` | 10-20x faster |
| Standard analysis, implementation | `sonnet` | Balanced |
| Deep reasoning, architecture | `opus` | Maximum intelligence |

```typescript
// Parallel custom agents benefit from haiku/sonnet for speed
Task({ prompt: agentPrompt, subagent_type: "general-purpose", model: "sonnet" })
```

---

## Spotcheck Pattern

**Always launch a spotcheck agent after parallel work:**

```typescript
Task({
  prompt: "Verify consistency across all agent outputs: [results]",
  subagent_type: "general-purpose",
  model: "haiku"
})
```

---

## References

- **Agents Skill:** `skills/Agents/SKILL.md` — Custom agent creation, workflows
- **ComposeAgent:** `skills/Agents/Tools/ComposeAgent.ts` — Dynamic composition tool
- **Traits:** `skills/Agents/Data/Traits.yaml` — Trait definitions and voice mappings
- **Agent Personalities:** Individual `agents/*.md` files — Named agent backstories and voice settings

---

*Last updated: 2026-01-14*
