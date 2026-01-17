# CreateCustomAgent Workflow

**Creates custom agents with unique personalities and voice IDs using AgentFactory.**

## When to Use

{principal.name} says:
- "Create custom agents to do X"
- "Spin up custom agents for Y"
- "I need specialized agents with Z expertise"
- "Generate N custom agents to analyze..."

**KEY TRIGGER: The word "custom" is critical - this distinguishes from generic Intern agents.**

## The Workflow

### Step 1: Determine Agent Count & Requirements

Extract from {principal.name}'s request:
- How many agents? (Default: 1 if not specified)
- What's the task?
- Are specific traits mentioned? (security, legal, skeptical, thorough, etc.)

### Step 2: For EACH Agent, Run AgentFactory with DIFFERENT Traits

**CRITICAL: Each agent MUST have different trait combinations to get unique voices.**

```bash
# Example for 3 custom research agents:

# Agent 1 - Enthusiastic Explorer
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,enthusiastic,exploratory" \
  --task "Research quantum computing applications" \
  --output json

# Agent 2 - Skeptical Analyst
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,skeptical,systematic" \
  --task "Research quantum computing applications" \
  --output json

# Agent 3 - Thorough Synthesizer
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,analytical,synthesizing" \
  --task "Research quantum computing applications" \
  --output json
```

### Step 3: Extract Prompt and Voice ID from Each

AgentFactory returns JSON with:
```json
{
  "name": "Research Enthusiastic Explorer",
  "voice": "Jeremy",
  "voice_id": "bVMeCyTHy58xNoL34h3p",
  "traits": ["research", "enthusiastic", "exploratory"],
  "prompt": "# Dynamic Agent: Research Enthusiastic Explorer\n\nYou are a specialized agent..."
}
```

### Step 4: Launch Agents with Task Tool

**Use a SINGLE message with MULTIPLE Task calls for parallel execution:**

```typescript
// Send all in ONE message:
Task({
  description: "Research agent 1 - enthusiastic",
  prompt: <agent1_full_prompt>,
  subagent_type: "Intern",
  model: "sonnet"  // or "haiku" for speed
})
Task({
  description: "Research agent 2 - skeptical",
  prompt: <agent2_full_prompt>,
  subagent_type: "Intern",
  model: "sonnet"
})
Task({
  description: "Research agent 3 - analytical",
  prompt: <agent3_full_prompt>,
  subagent_type: "Intern",
  model: "sonnet"
})
```

**Note:** Store the voice_id from AgentFactory output - you'll need it to voice the agent's results.

### Step 5: Voice Agent Results

**CRITICAL: The parent session voices agent output, not the agents themselves.**

After receiving agent results:
1. Extract the `🎯 COMPLETED:` line from each agent's output
2. Send voice notification using that agent's voice_id:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"<COMPLETED line content>","voice_id":"<agent_voice_id>","title":"<agent_name>"}'
```

This is more reliable than having agents voice themselves (they often skip curl commands).

### Step 6: Spotcheck (Optional but Recommended)

After all agents complete, launch one more to verify consistency:

```typescript
Task({
  description: "Spotcheck custom agent results",
  prompt: "Review these results for consistency and completeness: [results]",
  subagent_type: "Intern",
  model: "haiku"
})
```

## Trait Variation Strategies

When creating multiple custom agents, vary traits to ensure different voices:

**For Research Tasks:**
- Agent 1: research + enthusiastic + exploratory → Jeremy (energetic)
- Agent 2: research + skeptical + thorough → George (intellectual)
- Agent 3: research + analytical + systematic → Drew (professional)
- Agent 4: research + creative + bold → Fin (charismatic)
- Agent 5: research + empathetic + synthesizing → Thomas (gentle)

**For Security Analysis:**
- Agent 1: security + adversarial + bold → Callum (edgy hacker)
- Agent 2: security + skeptical + meticulous → Sam (gritty authentic)
- Agent 3: security + cautious + systematic → Bill (trustworthy)

**For Business Strategy:**
- Agent 1: business + bold + rapid → Domi (assertive CEO)
- Agent 2: business + analytical + comparative → Drew (balanced news)
- Agent 3: business + pragmatic + consultative → Charlie (casual laid-back)

## Model Selection

| Task Complexity | Model | Reason |
|----------------|-------|--------|
| Simple checks, quick research | `haiku` | 10-20x faster, sufficient for grunt work |
| Standard analysis, investigation | `sonnet` | Balanced speed + capability |
| Deep reasoning, strategic planning | `opus` | Maximum intelligence |

**Parallel custom agents benefit from `sonnet` or `haiku` for speed.**

## Example Execution

**{principal.name}:** "Create 5 custom science agents to analyze this climate data"

**{daidentity.name}'s Internal Execution:**
```bash
# Agent 1 - Climate Science Enthusiast
bun run AgentFactory.ts --traits "research,enthusiastic,thorough" --task "Analyze climate data patterns" --output json
# Returns: voice="Jeremy", voice_id="bVMeCyTHy58xNoL34h3p"

# Agent 2 - Skeptical Data Analyst
bun run AgentFactory.ts --traits "data,skeptical,systematic" --task "Analyze climate data patterns" --output json
# Returns: voice="Daniel", voice_id="onwK4e9ZLuTAKqWW03F9"

# Agent 3 - Creative Pattern Finder
bun run AgentFactory.ts --traits "data,creative,exploratory" --task "Analyze climate data patterns" --output json
# Returns: voice="Freya", voice_id="jsCqWAovK2LkecY7zXl4"

# Agent 4 - Meticulous Validator
bun run AgentFactory.ts --traits "research,meticulous,comparative" --task "Analyze climate data patterns" --output json
# Returns: voice="Charlotte", voice_id="XB0fDUnXU5powFXDhCwa"

# Agent 5 - Synthesizing Strategist
bun run AgentFactory.ts --traits "research,analytical,synthesizing" --task "Analyze climate data patterns" --output json
# Returns: voice="Charlotte", voice_id="XB0fDUnXU5powFXDhCwa"

# Launch all 5 in parallel (single message, 5 Task calls)
# Each agent has unique personality and voice
```

**Result:** 5 distinct agents with different analytical approaches and unique voices analyzing the data from different perspectives.

## Common Mistakes to Avoid

**❌ WRONG: Using same traits for all agents**
```bash
# All agents get same voice!
bun run AgentFactory.ts --traits "research,analytical" # Agent 1
bun run AgentFactory.ts --traits "research,analytical" # Agent 2 (same voice!)
bun run AgentFactory.ts --traits "research,analytical" # Agent 3 (same voice!)
```

**✅ RIGHT: Varying traits for unique voices**
```bash
# Each agent gets different voice
bun run AgentFactory.ts --traits "research,enthusiastic,exploratory"  # Jeremy
bun run AgentFactory.ts --traits "research,skeptical,systematic"      # George
bun run AgentFactory.ts --traits "research,creative,synthesizing"     # Freya
```

**❌ WRONG: Launching agents sequentially**
```typescript
// Slow - waits for each to finish
await Task({ ... }); // Agent 1
await Task({ ... }); // Agent 2 (waits for 1)
await Task({ ... }); // Agent 3 (waits for 2)
```

**✅ RIGHT: Launching agents in parallel**
```typescript
// Fast - all run simultaneously (single message, multiple calls)
Task({ ... })  // Agent 1
Task({ ... })  // Agent 2
Task({ ... })  // Agent 3
```

## Voice Assignment Logic

AgentFactory automatically maps trait combinations to voices:

1. **Exact combination matches** (highest priority)
   - `["contrarian", "skeptical"]` → Clyde (gravelly intensity)
   - `["enthusiastic", "creative"]` → Jeremy (high energy)

2. **Personality fallbacks** (medium priority)
   - `skeptical` → George (academic warmth)
   - `enthusiastic` → Jeremy (excited)
   - `bold` → Domi (assertive CEO)

3. **Expertise fallbacks** (low priority)
   - `security` → Callum (hacker character)
   - `legal` → Alice (news authority)
   - `research` → Adam (narratorial)

4. **Default** (no matches)
   - Daniel (BBC anchor authority)

## Related Workflows

- **ListTraits** - Show available traits for composition
- **SpawnParallelAgents** - Launch generic Intern agents (not custom)

## References

- Trait definitions: `~/.claude/skills/Agents/Data/Traits.yaml`
- Agent template: `~/.claude/skills/Agents/Templates/DynamicAgent.hbs`
- AgentFactory tool: `~/.claude/skills/Agents/Tools/AgentFactory.ts`
- Voice mappings: `~/.claude/skills/Agents/AgentPersonalities.md`
