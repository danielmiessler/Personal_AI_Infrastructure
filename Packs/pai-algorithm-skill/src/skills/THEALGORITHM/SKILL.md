---
name: THEALGORITHM
description: Universal execution engine using scientific method to achieve ideal state. USE WHEN complex tasks, multi-step work, "run the algorithm", "use the algorithm", OR any non-trivial request that benefits from structured execution with ISC (Ideal State Criteria) tracking.
---

# THE ALGORITHM - Universal Execution Engine

**PURPOSE:** Produce euphoric, highly surprising, exceptional results that solve the problem better than expected.

**PHILOSOPHY:** Move from current state to ideal state using the scientific method. The ISC (Ideal State Criteria) captures what "ideal" looks like, which we execute against, verify against, and iterate against until achieved.

**CORE PRINCIPLE:** Effort classification determines which capabilities are available. Higher effort unlocks more powerful tools.

## Visual Display & Voice Notifications

**Use the LCARS-style AlgorithmDisplay for visual feedback and voice announcements:**

```bash
# Start algorithm with effort level (shows banner + announces via voice)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts start THOROUGH -r "your request"

# Transition phases (updates display + voice announcement)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase THINK
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase EXECUTE

# Show current status anytime
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts show

# Show just the effort banner
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts effort DETERMINED
```

**The display shows:**
- Current effort level (TRIVIAL to DETERMINED) with color-coded banner
- Phase progression bar (7 phases with completion status)
- ISC summary (rows pending/active/done)
- Voice announcements when transitioning phases

**Phase Icons:** OBSERVE -> THINK -> PLAN -> BUILD -> EXECUTE -> VERIFY -> LEARN

## Quick Start

```bash
# 1. START WITH VISUAL DISPLAY (shows banner + voice announcement)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts start STANDARD -r "your request"

# 2. CLASSIFY EFFORT (if not using display start)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "your request"
# Or with override: --override DETERMINED
# Or inline: "algorithm effort THOROUGH: your request"

# 3. LOAD CAPABILITIES for effort level
bun run $PAI_DIR/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort STANDARD

# 4. CREATE ISC
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts create --request "your request"

# 5. TRANSITION PHASES (voice + visual update)
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase THINK
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase PLAN
# ... continues through EXECUTE, VERIFY, LEARN

# 6. MANAGE ISC during EXECUTE
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts capability --row 1 -c research.perplexity
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts update --row 1 --status DONE
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts show
```

## Effort to Capability Matrix

**Capabilities.yaml is the source of truth.** See `Data/Capabilities.yaml`.

| Effort | Models | Thinking | Debate | Research | Agents | Parallel |
|--------|--------|----------|--------|----------|--------|----------|
| **TRIVIAL** | - | - | - | - | - | 0 |
| **QUICK** | haiku | - | - | - | Intern | 1 |
| **STANDARD** | haiku, sonnet | UltraThink, FirstPrinciples | - | 1 agent | Engineer, QA, Designer | 1-3 |
| **THOROUGH** | haiku, sonnet | All | Council | parallel | All + Architect, Pentester | 3-5 |
| **DETERMINED** | all + opus | All | Council + RedTeam | all | unlimited | 10 |

## ISC Scale (CRITICAL)

**The ISC is NOT limited to a small number of rows.** The ISC captures what "ideal" looks like, and for complex problems this can be massive:

| Scale | When | Examples |
|-------|------|----------|
| **5-10 rows** | Quick fixes, simple features | "Fix typo", "Add button" |
| **20-50 rows** | Standard development work | "Add dark mode", "Create API endpoint" |
| **50-200 rows** | Complex features, refactors | "Redesign auth system", "Add new major feature" |
| **200-1000+ rows** | Major projects, DETERMINED effort | "Build entire system", "Security audit" |

**ISC rows come from:**
- **EXPLICIT requirements** - What user literally asked for
- **INFERRED requirements** - From context (tech stack preferences, past work, etc.)
- **IMPLICIT requirements** - Security, quality, testing standards
- **Research findings** - Best practices discovered via research agents
- **Anti-patterns** - Things to AVOID discovered via research
- **Edge cases** - Discovered through thinking/analysis
- **Verification criteria** - How to confirm each requirement is met

**The algorithm's capabilities EXPAND the ISC:**
- Research agents find best practices -> add ISC rows
- Research agents find anti-patterns -> add "avoid X" ISC rows
- Council debate surfaces edge cases -> add ISC rows
- FirstPrinciples analysis reveals assumptions -> add ISC rows
- Verification requirements -> add ISC rows for each testable criterion

**Higher effort = larger, higher quality ISC.** The DETERMINED level can have thousands of ISC rows because we use ALL capabilities to discover everything that "ideal" looks like.

## The 7 Phases

Execute IN ORDER. Each phase mutates the ISC:

| Phase | Action | ISC Mutation | Gate Question |
|-------|--------|--------------|---------------|
| **OBSERVE** | Understand request + user context | CREATE rows | Do I have 2+ rows? Used context to infer? |
| **THINK** | Ensure nothing missing | COMPLETE rows | All rows clear, testable? |
| **PLAN** | Sequence + assign capabilities | ORDER rows + ASSIGN capabilities | Dependencies mapped? Capabilities assigned? |
| **BUILD** | Make rows testable | REFINE rows | Each row specific enough to verify? |
| **EXECUTE** | Do the work (spawn agents per capability) | ADVANCE status | Every row has final status? |
| **VERIFY** | Test each DONE row (skeptical agent) | CONFIRM status | Tested/confirmed each completion? |
| **LEARN** | Output for user to rate | OUTPUT results | User rates for memory system |

**CRITICAL:** The LEARN phase does NOT self-rate. User rates outputs for the memory system.

## The ISC Table (FRONT AND CENTER)

Every non-trivial task has an ISC. **Display this prominently throughout execution:**

```markdown
## ISC: Request Summary

**Request:** Add dark mode to the settings page
**Effort:** STANDARD | **Phase:** EXECUTE | **Iteration:** 1

| # | What Ideal Looks Like | Source | Capability | Status |
|---|----------------------|--------|------------|--------|
| 1 | Research good patterns | INFERRED | research.perplexity | PENDING |
| 2 | Toggle component works | EXPLICIT | execution.engineer | ACTIVE |
| 3 | Theme state persists | EXPLICIT | execution.engineer | PENDING |
| 4 | Uses TypeScript | INFERRED | - | DONE |
| 5 | Tests pass | IMPLICIT | verification.qa | PENDING |
| 6 | Browser-verified | IMPLICIT | verification.browser | PENDING |

**Legend:** Research | Thinking | Debate | Analysis | Execution | Verify | x Parallel
```

**Source types:**
- `EXPLICIT` - User literally said this
- `INFERRED` - Derived from user context (tech stack preferences, etc.)
- `IMPLICIT` - Universal standards (security, quality)

**Status progression:**
- `PENDING` -> `ACTIVE` -> `DONE`
- `ADJUSTED` - Modified with reason
- `BLOCKED` - Cannot achieve, triggers loop-back

## Execution Flow

### Step 1: EFFORT CLASSIFICATION (REQUIRED FIRST)

```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "your request"
```

**Override methods:**
- CLI flag: `--override THOROUGH`
- Inline pattern: `"algorithm effort DETERMINED: build this feature"`

The effort level determines ALL available capabilities.

### Step 2: CAPABILITY LOADING

```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort STANDARD
```

Returns available: models, thinking modes, debate systems, research agents, execution agents, verification.

### Step 3: ISC CREATION + CAPABILITY ASSIGNMENT

For each ISC row, select appropriate capability:

```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/CapabilitySelector.ts --row "Research best practices" --effort STANDARD
# Returns: research.perplexity as primary, with icon

bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts capability --row 1 -c research.perplexity
```

### Step 4: ORCHESTRATED EXECUTION

Execute in phases based on capability assignments:

```
PHASE A: RESEARCH (parallel for independent queries)
- Row with research.perplexity -> Spawn PerplexityResearcher
- Row with research.gemini -> Spawn GeminiResearcher
- Row with research.grok -> Spawn GrokResearcher

PHASE B: THINKING (for creative/analysis needs)
- Row with thinking.ultrathink -> Invoke BeCreative skill
- Row with analysis.first_principles -> Invoke FirstPrinciples skill
- Row with debate.council -> Invoke Council skill

PHASE C: EXECUTION (parallel agents)
- Row with execution.engineer -> Spawn Engineer agent
- Row with execution.architect -> Spawn Architect agent (THOROUGH+)
- Rows marked x -> Run in parallel

PHASE D: VERIFICATION (skeptical, different from executor)
- Row with verification.browser -> Browser skill validation
- All rows -> Skeptical verifier agent (skeptical,meticulous,adversarial traits)
```

### For TRIVIAL (skip algorithm):
Direct response, no ISC, no capability loading. Just answer.

## Capability Categories

### Models (compute resources)
- `models.haiku` - Fast, cheap (QUICK+)
- `models.sonnet` - Balanced reasoning (STANDARD+)
- `models.opus` - Maximum intelligence (DETERMINED)

### Thinking Modes
- `thinking.ultrathink` - BeCreative skill for creative solutions (STANDARD+)
- `thinking.tree_of_thought` - Branching exploration (THOROUGH+)
- `thinking.plan_mode` - EnterPlanMode for complex implementations (THOROUGH+)

### Debate Systems
- `debate.council` - 4 agents, collaborative analysis (THOROUGH+)
- `debate.redteam` - 32 agents, adversarial stress-testing (DETERMINED)

### Analysis Modes
- `analysis.first_principles` - Challenge assumptions (STANDARD+)
- `analysis.science` - Hypothesis-driven exploration (STANDARD+)

### Research Agents
- `research.perplexity` - Web research, current events (STANDARD+)
- `research.gemini` - Multi-perspective research (STANDARD+)
- `research.grok` - Contrarian fact-checking (STANDARD+)
- `research.claude` - Academic/scholarly sources (STANDARD+)
- `research.codex` - Technical code pattern research (STANDARD+)

### Execution Agents
- `execution.intern` - Parallel grunt work (QUICK+)
- `execution.engineer` - Implementation/coding (STANDARD+)
- `execution.qa_tester` - Testing/validation (STANDARD+)
- `execution.designer` - UX/UI design (STANDARD+)
- `execution.architect` - System design (THOROUGH+)
- `execution.pentester` - Security testing (THOROUGH+)
- `execution.ralph_loop` - Persistent iteration until success (QUICK+)

### Verification
- `verification.browser` - Web application validation (STANDARD+)
- `verification.skeptical_verifier` - Different agent than executor (STANDARD+)

## The Ralph Loop

For persistent iteration until success criteria are met:

```bash
# Start a Ralph loop
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts \
  --prompt "Fix the auth bug" \
  --completion-promise "All tests pass" \
  --max-iterations 15

# Check status
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --status

# Cancel loop
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --cancel
```

**Keywords that trigger Ralph Loop:**
- "iterate until", "keep trying", "until tests pass"
- "until it works", "persistent", "retry until"
- "loop until", "ralph", "keep iterating"

## Iteration Loop

When VERIFY finds issues:

```
BLOCKED row
    |
    +- Unclear what ideal looks like? -> Loop to THINK
    +- Wrong approach? -> Loop to PLAN
    +- Execution error? -> Loop to EXECUTE

Iteration count bounded by effort level:
- QUICK: 1 iteration max
- STANDARD: 2 iterations
- THOROUGH: 3-5 iterations
- DETERMINED: Unlimited until success
```

## Integration

### Uses
- **Agents Skill** - AgentFactory for dynamic agent composition
- **CORE Skill** - User context for ISC inference
- **Browser Skill** - Web verification in VERIFY phase
- **BeCreative Skill** - UltraThink for THINK phase
- **Council Skill** - Multi-perspective debate (THOROUGH+)
- **RedTeam Skill** - Adversarial analysis (DETERMINED)
- **FirstPrinciples Skill** - Assumption challenging
- **Research Skill** - Multi-source research agents

### Memory
- ISC artifacts: `$PAI_DIR/MEMORY/Work/{session}/ISC.md`
- Learnings: `$PAI_DIR/MEMORY/learnings/ALGORITHM/`
- Patterns: `$PAI_DIR/MEMORY/Signals/algorithm-patterns.jsonl`

## Workflow Routing

| Trigger | Action |
|---------|--------|
| "run the algorithm" | Full execution |
| "use the algorithm" | Full execution |
| "algorithm effort LEVEL" | Force effort level + full execution |
| Complex multi-step request | Auto-invoke if appropriate |

## Files

| File | Purpose |
|------|---------|
| `Data/Capabilities.yaml` | **Source of truth** for all capabilities |
| `Tools/AlgorithmDisplay.ts` | **LCARS visual display** + voice announcements |
| `Tools/EffortClassifier.ts` | Classify TRIVIAL->DETERMINED |
| `Tools/CapabilityLoader.ts` | Load + filter capabilities by effort |
| `Tools/CapabilitySelector.ts` | Select capabilities for ISC rows |
| `Tools/ISCManager.ts` | Create/update/query ISC with capabilities |
| `Tools/TraitModifiers.ts` | Effort -> trait mappings |
| `Tools/RalphLoopExecutor.ts` | Persistent iteration until success |
| `Phases/*.md` | Detailed phase documentation |
| `Reference/CapabilityMatrix.md` | Effort -> capability documentation |

## The Purpose

**Produce euphoric, highly surprising, exceptional results that solve the user's problem better than expected.**

The ISC captures what "ideal" looks like. Effort determines available capabilities. Execute against it. Verify against it. Iterate until achieved.

**This is not documentation. This is a command. Execute the algorithm.**
