<!--
================================================================================
PAI CORE - SYSTEM/THEDELEGATIONSYSTEM.md
================================================================================

PURPOSE:
Delegation and agent parallelization patterns. How to launch multiple agents,
when to use different agent types, and model selection for optimal performance.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/THEDELEGATIONSYSTEM.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/THEDELEGATIONSYSTEM.md

CUSTOMIZATION:
- These patterns are generic and apply to all PAI implementations
- User-specific agent rosters go in AGENTS.md
- Voice configurations go in USER/IDENTITY.md or AGENTS.md

RELATED FILES:
- AGENTS.md - Agent configuration and traits
- CORE/SKILL.md - Quick delegation reference

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Delegation & Parallelization Reference

**Quick reference in SKILL.md** → For full details, see this file

---

## Delegation & Parallelization (Always Active)

**WHENEVER A TASK CAN BE PARALLELIZED, USE MULTIPLE AGENTS!**

### Model Selection for Agents (CRITICAL FOR SPEED)

**The Task tool has a `model` parameter - USE IT.**

Agents default to inheriting the parent model (often Opus). This is SLOW for simple tasks. Each inference with 30K+ context takes 5-15 seconds on Opus. A simple 10-tool-call task = 1-2+ minutes of pure thinking time.

**Model Selection Matrix:**

| Task Type | Model | Why |
|-----------|-------|-----|
| Deep reasoning, complex architecture, strategic decisions | `opus` | Maximum intelligence needed |
| Standard implementation, moderate complexity, most coding | `sonnet` | Good balance of speed + capability |
| Simple lookups, file reads, quick checks, parallel grunt work | `haiku` | 10-20x faster, sufficient intelligence |

**Examples:**

```typescript
// WRONG - defaults to Opus, takes minutes
Task({ prompt: "Check if blue bar exists on website", subagent_type: "Intern" })

// RIGHT - Haiku for simple visual check
Task({ prompt: "Check if blue bar exists on website", subagent_type: "Intern", model: "haiku" })

// RIGHT - Sonnet for standard coding task
Task({ prompt: "Implement the login form validation", subagent_type: "Engineer", model: "sonnet" })

// RIGHT - Opus for complex architectural planning
Task({ prompt: "Design the distributed caching strategy", subagent_type: "Architect", model: "opus" })
```

**Rule of Thumb:**
- If it's grunt work or verification → `haiku`
- If it's implementation or research → `sonnet`
- If it requires deep strategic thinking → `opus` (or let it default)

**Parallel tasks especially benefit from haiku** - launching 5 haiku agents is faster AND cheaper than 1 Opus agent doing sequential work.

### Agent Types

The Intern Agent is your high-agency genius generalist - perfect for parallel execution:
- Updating multiple files simultaneously
- Researching multiple topics at once
- Testing multiple approaches in parallel
- Processing multiple items from a list

**How to launch:**
- Use a SINGLE message with MULTIPLE Task tool calls
- Each intern gets FULL CONTEXT and DETAILED INSTRUCTIONS
- Launch as many as needed (no artificial limit)
- **ALWAYS launch a spotcheck intern after parallel work completes**

**CRITICAL: Interns vs Engineers:**
- **INTERNS:** Research, analysis, investigation, file reading, testing, coordinating
- **ENGINEERS:** Writing ANY code (TypeScript, Python, etc.), building features, implementing changes
- If task involves writing code → Use Development Skill with Engineer Agents
- Interns can delegate to engineers when code changes are needed

### Custom Agents vs Generic Agents

**The word "custom" is the KEY trigger:**

| User Says | What to Use | Why |
|-------------|-------------|-----|
| "**custom agents**", "spin up **custom** agents" | **AgentFactory** | Unique prompts, unique voices |
| "spin up agents", "bunch of agents", "launch agents" | **Intern agents** | Generic parallel workers |
| "interns", "use interns" | **Intern agents** | Obviously |

**When user says "custom agents":**
1. Invoke the Agents skill → CreateCustomAgent workflow
2. Use DIFFERENT trait combinations to get unique voices
3. Launch with the full AgentFactory-generated prompt
4. Each agent gets a personality-matched voice

**When user says "spin up agents" (no "custom"):**
1. Use simple Intern agents
2. All get the same voice (fine for grunt work)
3. No AgentFactory needed

**Full Context Requirements:**
When delegating, ALWAYS include:
1. WHY this task matters (business context)
2. WHAT the current state is (existing implementation)
3. EXACTLY what to do (precise actions, file paths, patterns)
4. SUCCESS CRITERIA (what output should look like)

---

**See Also:**
- SKILL.md > Delegation (Quick Reference) - Condensed trigger table
- Workflows/Delegation.md - Operational delegation procedures
- Workflows/BackgroundDelegation.md - Background agent patterns
- skills/Agents/SKILL.md - Custom agent creation system
