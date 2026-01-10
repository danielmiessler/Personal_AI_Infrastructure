# CreateCustomAgent Workflow

**Creates custom agents with unique personalities and voice IDs using AgentFactory.**

---

## Pre-flight Checklist (MANDATORY)

**STOP! Before proceeding, you MUST complete this checklist:**

- [ ] I understand I must run `AgentFactory.ts` via Bash
- [ ] I will NOT manually compose prompts from Traits.yaml
- [ ] I will capture JSON output and use the `prompt` field verbatim
- [ ] I will use `subagent_type: "general-purpose"` (NEVER "Intern")
- [ ] Each agent will have DIFFERENT trait combinations

**⚠️ VIOLATION: If you skip AgentFactory, you are NOT creating custom agents.**

---

## When to Use

User says:
- "Create custom agents to do X"
- "Spin up custom agents for Y"
- "I need specialized agents with Z expertise"

**KEY TRIGGER: The word "custom" distinguishes from generic agents.**

## The Workflow

### Step 1: Determine Requirements

Extract from user's request:
- How many agents? (Default: 1)
- What's the task?
- Are specific traits mentioned?

### Step 1.5: Choose Traits (RECOMMENDED) or Infer from Task

**⚠️ RECOMMENDED: Use explicit `--traits` for precise control**

Trait inference is convenient but may produce unexpected results for ambiguous tasks.

| Approach | Precision | Example |
|----------|-----------|---------|
| **Explicit** ✅ | High - you control exactly which traits | `--traits "technical,meticulous,systematic"` |
| **Inference** ⚠️ | Low - keywords may match wrong expertise | `--task "TypeScript transformation"` (might infer wrong traits) |

**When to use explicit traits:**
- Technical/programming tasks (avoid false matches with legal/medical)
- When you need specific personality/approach combinations
- When voice diversity matters

**When inference is OK:**
- Task description has very clear domain keywords
- You're comfortable with defaults (analytical + thorough)

**Pro tip:** Run `bun run AgentFactory.ts --list` to see all available traits before choosing.

### Step 2: Run AgentFactory for EACH Agent (MANDATORY)

**⚠️ THIS STEP IS NOT OPTIONAL - YOU MUST EXECUTE AGENTFACTORY.TS VIA BASH**

**RECOMMENDED: Use explicit `--traits` parameter**

```bash
# REQUIRED: Run for EACH agent with DIFFERENT traits

# Agent 1 - Enthusiastic Explorer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,enthusiastic,exploratory" \
  --task "Research quantum computing" \
  --output json

# Agent 2 - Skeptical Analyst
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,skeptical,systematic" \
  --task "Research quantum computing" \
  --output json

# Agent 3 - Thorough Synthesizer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,analytical,synthesizing" \
  --task "Research quantum computing" \
  --output json
```

**Alternative (inference - less precise):**
```bash
# AgentFactory will infer traits from task description
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --task "Research quantum computing with enthusiastic exploration" \
  --output json
```

**What AgentFactory returns (JSON output):**
```json
{
  "name": "Research Specialist Enthusiastic Exploratory",
  "traits": ["research", "enthusiastic", "exploratory"],
  "voice": "Energetic",
  "voice_id": "muSxG4dqYjBCkbpXqbEl",
  "prompt": "... full agent prompt ..."
}
```

**You MUST use the `prompt` field from this output in your Task call.**

### Step 3: Launch Agents in Parallel

**CRITICAL: Use `subagent_type: "general-purpose"` - NEVER "Intern" for custom agents!**

Using "Intern" would override the custom voice. We need "general-purpose" to respect the voice_id from AgentFactory.

Use a SINGLE message with MULTIPLE Task calls:

```typescript
Task({
  description: "Research agent 1 - enthusiastic",
  prompt: <agent1_full_prompt>,
  subagent_type: "general-purpose",  // NEVER "Intern" for custom agents!
  model: "sonnet"
})
Task({
  description: "Research agent 2 - skeptical",
  prompt: <agent2_full_prompt>,
  subagent_type: "general-purpose",  // NEVER "Intern" for custom agents!
  model: "sonnet"
})
```

## Trait Variation Strategies

**For Research Tasks:**
- Agent 1: research + enthusiastic + exploratory -> Energetic voice
- Agent 2: research + skeptical + thorough -> Academic voice
- Agent 3: research + analytical + systematic -> Professional voice

**For Security Analysis:**
- Agent 1: security + adversarial + bold -> Intense voice
- Agent 2: security + skeptical + meticulous -> Gritty voice
- Agent 3: security + cautious + systematic -> Professional voice

## Model Selection

| Task Type | Model | Reason |
|-----------|-------|--------|
| Quick checks | `haiku` | 10-20x faster |
| Standard analysis | `sonnet` | Balanced |
| Deep reasoning | `opus` | Maximum intelligence |

## Common Mistakes

**WRONG: Using named agent types for custom agents**
```typescript
// WRONG - forces same voice on all custom agents!
Task({ prompt: <custom_prompt>, subagent_type: "Intern" })
Task({ prompt: <custom_prompt>, subagent_type: "Designer" })
```

**RIGHT: Using general-purpose for custom agents**
```typescript
// CORRECT - respects the custom voice from AgentFactory
Task({ prompt: <custom_prompt>, subagent_type: "general-purpose" })
```

**WRONG: Same traits for all agents**
```bash
bun run AgentFactory.ts --traits "research,analytical"  # Agent 1
bun run AgentFactory.ts --traits "research,analytical"  # Same voice!
```

**RIGHT: Vary traits for unique voices**
```bash
bun run AgentFactory.ts --traits "research,enthusiastic,exploratory"
bun run AgentFactory.ts --traits "research,skeptical,systematic"
```
