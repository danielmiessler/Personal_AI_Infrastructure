---
name: THE ALGORITHM Skill
pack-id: danielmiessler-algorithm-skill-core-v0.5.0
version: 0.5.0
author: danielmiessler
description: Universal execution engine using the scientific method to achieve ideal state. ISC (Ideal State Criteria) tracking, effort-based capability selection, and the Ralph Loop for persistent iteration.
type: skill
purpose-type: [productivity, automation, development, workflow]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v1.0.0, danielmiessler-agents-skill-core-v1.0.0]
keywords: [algorithm, execution, isc, ideal-state, effort, scientific-method, phases, ralph-loop, iteration, capability, orchestration]
---

<p align="center">
  <img src="../icons/pai-algorithm-skill.png" alt="THE ALGORITHM Skill" width="256">
</p>

# THE ALGORITHM Skill

> Universal execution engine using the scientific method to achieve ideal state - from current state to ideal state through structured phases and capability-driven execution.

> **Version 0.5.0** - Early release. Core concepts are solid, but expect refinements as the system evolves.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill definition | `src/skills/THEALGORITHM/SKILL.md` | Main skill file with routing and quick reference |
| Capabilities registry | `src/skills/THEALGORITHM/Data/Capabilities.yaml` | Source of truth for all orchestratable capabilities |
| Algorithm display | `src/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts` | LCARS-style visual display with voice support |
| Effort classifier | `src/skills/THEALGORITHM/Tools/EffortClassifier.ts` | Classify requests by effort level |
| Capability loader | `src/skills/THEALGORITHM/Tools/CapabilityLoader.ts` | Load capabilities by effort level |
| Capability selector | `src/skills/THEALGORITHM/Tools/CapabilitySelector.ts` | Select capabilities for ISC rows |
| ISC manager | `src/skills/THEALGORITHM/Tools/ISCManager.ts` | Create, update, query ISC tables |
| Trait modifiers | `src/skills/THEALGORITHM/Tools/TraitModifiers.ts` | Effort-to-trait mappings |
| Ralph loop executor | `src/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts` | Persistent iteration until success |
| Phase docs | `src/skills/THEALGORITHM/Phases/*.md` | Detailed documentation for each phase |
| Reference docs | `src/skills/THEALGORITHM/Reference/*.md` | Capability and effort matrices |

## The Problem

AI assistants often approach tasks with a one-size-fits-all mentality:

**Inconsistent Effort:**
- Simple tasks get over-engineered
- Complex tasks get under-analyzed
- No clear framework for matching effort to task complexity

**Missing Structure:**
- No systematic way to track progress toward ideal state
- Unclear success criteria
- Verification is an afterthought

**Limited Iteration:**
- Tasks are "done" after first attempt
- No persistent iteration until truly complete
- No feedback loop for continuous improvement

## The Solution

### Effort-Based Capability Selection

Match computational resources to task complexity:

| Effort | When | Capabilities |
|--------|------|--------------|
| **TRIVIAL** | Greetings, acknowledgments | Skip algorithm entirely |
| **QUICK** | Simple fixes, lookups | haiku, Intern agents |
| **STANDARD** | Most development work | sonnet, research, Engineer, verification |
| **THOROUGH** | Complex architectural work | Council debate, Architect, parallel research |
| **DETERMINED** | Mission-critical, unlimited | opus, RedTeam, unlimited iteration |

### The 7 Phases

Execute in order, each phase mutates the ISC:

```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

1. **OBSERVE** - CREATE ISC rows from request + context
2. **THINK** - COMPLETE rows, ensure nothing missing
3. **PLAN** - ORDER rows, identify dependencies and parallelization
4. **BUILD** - REFINE rows to be testable
5. **EXECUTE** - DO the work, spawn agents by capability
6. **VERIFY** - TEST each row against success criteria
7. **LEARN** - OUTPUT results for user evaluation

### ISC (Ideal State Criteria)

The ISC is the central artifact - a living document tracking the gap between current and ideal state:

```markdown
## ISC: Add dark mode

**Effort:** STANDARD | **Phase:** EXECUTE | **Iteration:** 1

| # | What Ideal Looks Like | Source | Capability | Status |
|---|----------------------|--------|------------|--------|
| 1 | Research good patterns | INFERRED | research.perplexity | DONE |
| 2 | Toggle component works | EXPLICIT | execution.engineer | ACTIVE |
| 3 | Theme state persists | EXPLICIT | execution.engineer | PENDING |
| 4 | Uses TypeScript | INFERRED | - | DONE |
| 5 | Tests pass | IMPLICIT | verification.qa | PENDING |
```

### The Ralph Loop

Persistent iteration until success criteria are met:

```bash
# Start a Ralph loop
bun run RalphLoopExecutor.ts \
  --prompt "Fix the auth bug" \
  --completion-promise "All tests pass" \
  --max-iterations 15
```

The Ralph Loop continues iterating until:
- Completion promise is detected in output
- Max iterations reached

Named after the persistent, never-give-up spirit of iteration.

## Example Usage

```bash
# 1. START with visual display
bun run AlgorithmDisplay.ts start STANDARD -r "Add dark mode toggle"

# 2. CLASSIFY effort (or use display start)
bun run EffortClassifier.ts --request "Add dark mode toggle"

# 3. CREATE ISC
bun run ISCManager.ts create --request "Add dark mode toggle"

# 4. TRANSITION phases with voice
bun run AlgorithmDisplay.ts phase THINK
bun run AlgorithmDisplay.ts phase EXECUTE

# 5. MANAGE ISC during execution
bun run ISCManager.ts update --row 1 --status DONE
bun run ISCManager.ts show
```

## Core Concepts

### Capability Categories

- **Models:** haiku, sonnet, opus - compute resources
- **Thinking:** UltraThink, TreeOfThought - enhanced reasoning
- **Debate:** Council (4 agents), RedTeam (32 agents)
- **Analysis:** FirstPrinciples, Science - structured analysis
- **Research:** Perplexity, Gemini, Grok, Claude, Codex
- **Execution:** Intern, Engineer, Designer, Architect, Pentester
- **Verification:** Browser, Skeptical Verifier

### Source Types

- **EXPLICIT** - User literally said this
- **INFERRED** - Derived from user context/preferences
- **IMPLICIT** - Universal standards (security, quality)

### Status Progression

```
PENDING → ACTIVE → DONE
                 → ADJUSTED (acceptable deviation)
                 → BLOCKED (cannot proceed)
```

## Philosophy

**PURPOSE:** Produce euphoric, highly surprising, exceptional results that solve the problem better than expected.

**METHOD:** Scientific method applied to execution:
1. Observe the problem
2. Form hypothesis (ISC rows)
3. Plan experiments (capability selection)
4. Execute and measure
5. Verify results
6. Learn and iterate

**PRINCIPLE:** The ISC captures what "ideal" looks like. Execute against it. Verify against it. Iterate until achieved.

## Changelog

### 0.5.0 - 2026-01-08
- Initial public release
- Core 7-phase execution engine
- ISC (Ideal State Criteria) tracking
- Effort-based capability selection (TRIVIAL → DETERMINED)
- Ralph Loop for persistent iteration
- LCARS-style visual display with voice support
- Capability registry with 30+ orchestratable capabilities
- Integration with Agents skill for dynamic agent composition
