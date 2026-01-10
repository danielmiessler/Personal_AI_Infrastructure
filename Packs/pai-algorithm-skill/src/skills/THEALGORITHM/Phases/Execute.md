# EXECUTE Phase

**Purpose:** DO the work - spawn agents based on assigned capabilities for each ISC row.

**ISC Mutation:** STATUS changes (PENDING → ACTIVE → DONE/ADJUSTED/BLOCKED)

**Gate Question:** All rows addressed? Capabilities executed properly?

## What Happens

1. **Execute by capability phase** - Research first, then thinking, then execution
2. **Update status in real-time** - Mark ACTIVE when starting, DONE when complete
3. **Spawn agents based on assigned capabilities** - Use Task tool with appropriate subagent_type
4. **Handle blockers** - Mark BLOCKED with reason if stuck
5. **Run parallel rows simultaneously** - Rows marked × execute concurrently

## Capability-Based Execution Flow

Execute ISC rows in phases based on their assigned capabilities:

```
PHASE A: RESEARCH (first - parallel)
├─ 🔬 research.perplexity → Task(subagent_type: PerplexityResearcher)
├─ 🔬 research.gemini → Task(subagent_type: GeminiResearcher)
├─ 🔬 research.grok → Task(subagent_type: GrokResearcher)
├─ 🔬 research.claude → Task(subagent_type: ClaudeResearcher)
└─ 🔬 research.codex → Task(subagent_type: CodexResearcher)

PHASE B: THINKING (synthesis - sequential)
├─ 💡 thinking.ultrathink → Skill(BeCreative)
├─ 💡 thinking.tree_of_thought → Skill(BeCreative, workflow: TreeOfThoughts)
├─ 🔍 analysis.first_principles → Skill(FirstPrinciples)
├─ 🔍 analysis.science → Skill(Science)
└─ 🗣️ debate.council → Skill(Council)

PHASE C: EXECUTION (implementation - parallel where marked)
├─ 🤖 execution.intern → Task(subagent_type: Intern, model: haiku)
├─ 🤖 execution.engineer → Task(subagent_type: Engineer)
├─ 🤖 execution.designer → Task(subagent_type: Designer)
├─ 🤖 execution.architect → Task(subagent_type: Architect, model: opus)
├─ 🤖 execution.pentester → Task(subagent_type: Pentester)
└─ 🔄 execution.ralph_loop → RalphLoopExecutor (iterative until success)

PHASE D: VERIFICATION (validation - last)
├─ ✅ verification.browser → Skill(Browser)
└─ ✅ verification.skeptical_verifier → Task with skeptical,meticulous,adversarial traits
```

## Spawning Agents by Capability

### Research Agents

```typescript
// For rows with research.* capability
Task({
  description: "Research: [ISC row description]",
  prompt: "[Row description] - find current best practices, cite sources",
  subagent_type: "PerplexityResearcher", // or GeminiResearcher, GrokResearcher, etc.
  model: "sonnet",
  run_in_background: true // for parallel research
})
```

### Execution Agents

```typescript
// For rows with execution.* capability
Task({
  description: "Execute: [ISC row description]",
  prompt: "[Row description] - implement this requirement",
  subagent_type: "Engineer", // or Architect, Designer, etc.
  model: "sonnet" // or opus for Architect
})
```

### Skills (Thinking/Debate/Analysis)

```typescript
// For rows with thinking.*, analysis.*, or debate.* capability
Skill({
  skill: "BeCreative", // or Council, FirstPrinciples, etc.
  args: "[Row description]"
})
```

### Ralph Loop Execution (🔄)

For ISC rows assigned `execution.ralph_loop` - persistent iteration until success:

```bash
# Start a Ralph loop for an ISC row
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts \
  --prompt "Fix the auth bug until all tests pass" \
  --completion-promise "All tests pass" \
  --max-iterations 15 \
  --isc-row 3
```

**How Ralph Loop works:**
1. Creates state file with prompt and completion criteria
2. Claude works on the task, tries to exit
3. Stop hook intercepts exit and feeds SAME prompt back
4. Claude sees previous work in files/git history
5. Loop continues until:
   - Completion promise detected in `<promise>PROMISE_TEXT</promise>` tags
   - Max iterations reached

**When to use Ralph Loop:**
- Tasks requiring iteration until tests pass
- Bug fixes that need multiple attempts
- Refactoring that benefits from progressive improvement
- Any task with clear, verifiable success criteria

**ISC Status for Ralph rows:**
- `⏳ PENDING` - Not started
- `🔄 LOOPING` - Ralph loop active (custom status)
- `✅ DONE` - Completion promise detected
- `🚫 BLOCKED` - Max iterations exhausted without success

**Monitoring Ralph loops:**
```bash
# Check status
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --status

# Cancel loop
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --cancel
```

**Keywords that trigger Ralph Loop assignment:**
- "iterate until", "keep trying", "until tests pass"
- "until it works", "persistent", "retry until"
- "loop until", "ralph", "keep iterating"

## Parallel Execution

Rows marked with × (parallel) can be executed simultaneously:

```typescript
// Multiple agents in single response = parallel execution
Task({ description: "Row 1", subagent_type: "Engineer", run_in_background: true })
Task({ description: "Row 2", subagent_type: "Engineer", run_in_background: true })
Task({ description: "Row 3", subagent_type: "Designer", run_in_background: true })
```

**Max concurrent by effort level:**
| Effort | Max Parallel |
|--------|--------------|
| QUICK | 1 |
| STANDARD | 3 |
| THOROUGH | 5 |
| DETERMINED | 10 |

**Parallelization rules:**
- Research tasks = usually parallelizable
- Independent implementation tasks = parallelizable
- Sequential dependencies = NOT parallelizable
- Rows with × suffix on capability = parallelizable

## Status Updates

```bash
# Mark row as active (starting work)
bun run ISCManager.ts update --row 1 --status ACTIVE

# Mark row as done
bun run ISCManager.ts update --row 1 --status DONE

# Mark row as blocked
bun run ISCManager.ts update --row 1 --status BLOCKED --reason "Missing API key"

# Mark row as adjusted (scope changed)
bun run ISCManager.ts update --row 1 --status ADJUSTED --reason "Used REST instead of GraphQL"
```

## Example Execution

**ISC before EXECUTE:**
```markdown
| # | What Ideal Looks Like | Capability | Status |
|---|----------------------|------------|--------|
| 1 | Research good patterns | 🔬 perplexity× | ⏳ PENDING |
| 2 | Research competitor impl | 🔬 gemini× | ⏳ PENDING |
| 3 | Synthesize findings | 💡 ultrathink | ⏳ PENDING |
| 4 | Design component | 🤖 designer | ⏳ PENDING |
| 5 | Implement component | 🤖 engineer× | ⏳ PENDING |
| 6 | Implement styling | 🤖 engineer× | ⏳ PENDING |
| 7 | Browser verify | ✅ browser | ⏳ PENDING |
```

**Execution flow:**

**Phase A: Research (parallel)**
```typescript
// Both run in background simultaneously
Task({ description: "Research patterns", subagent_type: "PerplexityResearcher", run_in_background: true })
Task({ description: "Research competitors", subagent_type: "GeminiResearcher", run_in_background: true })
```
→ Wait for both to complete → Mark rows 1, 2 DONE

**Phase B: Thinking**
```typescript
Skill({ skill: "BeCreative", args: "Synthesize research findings into design approach" })
```
→ Mark row 3 DONE

**Phase C: Execution (parallel where marked)**
```typescript
Task({ description: "Design component", subagent_type: "Designer" })
```
→ Mark row 4 DONE

```typescript
// Parallel implementation
Task({ description: "Implement component", subagent_type: "Engineer", run_in_background: true })
Task({ description: "Implement styling", subagent_type: "Engineer", run_in_background: true })
```
→ Wait for both → Mark rows 5, 6 DONE

**Phase D: Verification**
```typescript
Skill({ skill: "Browser", args: "Verify component renders correctly" })
```
→ Mark row 7 DONE

**ISC after EXECUTE:**
```markdown
| # | What Ideal Looks Like | Capability | Status |
|---|----------------------|------------|--------|
| 1 | Research good patterns | 🔬 perplexity× | ✅ DONE |
| 2 | Research competitor impl | 🔬 gemini× | ✅ DONE |
| 3 | Synthesize findings | 💡 ultrathink | ✅ DONE |
| 4 | Design component | 🤖 designer | ✅ DONE |
| 5 | Implement component | 🤖 engineer× | ✅ DONE |
| 6 | Implement styling | 🤖 engineer× | ✅ DONE |
| 7 | Browser verify | ✅ browser | ✅ DONE |
```

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p EXECUTE

# Start a row
bun run ISCManager.ts update --row 1 --status ACTIVE

# Complete a row
bun run ISCManager.ts update --row 1 --status DONE

# Check progress
bun run ISCManager.ts summary

# View current ISC
bun run ISCManager.ts show
```

## Exit Criteria

- All rows have been attempted
- Capabilities executed in correct phase order
- Each row is DONE, ADJUSTED, or BLOCKED
- No row left in PENDING or ACTIVE state
- Ready for VERIFY phase
