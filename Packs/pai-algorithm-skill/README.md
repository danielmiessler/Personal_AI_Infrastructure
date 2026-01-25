---
name: PAI Algorithm Skill
pack-id: danielmiessler-pai-algorithm-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Universal execution engine using scientific method to achieve ideal state with ISC (Ideal State Criteria) tracking
type: skill
purpose-type: [execution, orchestration, methodology, quality-assurance]
platform: claude-code
dependencies: [pai-core-install, pai-agents-skill]
keywords: [algorithm, ISC, ideal-state, execution, scientific-method, effort-classification, capabilities, verification, orchestration]
---

<p align="center">
  <img src="../icons/pai-algorithm-skill.png" alt="PAI Algorithm Skill" width="256">
</p>

# PAI Algorithm Skill (THE ALGORITHM)

> Universal execution engine using the scientific method to achieve ideal state. Produces euphoric, highly surprising, exceptional results that solve problems better than expected.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What This Pack Provides

THE ALGORITHM is the core execution methodology of PAI. It transforms any request into structured work toward an ideal state:

- **Effort Classification** - Automatically determine task complexity (TRIVIAL to DETERMINED)
- **Capability Loading** - Unlock appropriate tools based on effort level
- **ISC Management** - Track Ideal State Criteria as work progresses
- **7-Phase Execution** - OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN
- **Visual Display** - LCARS-style progress tracking with voice announcements
- **Agent Composition** - Dynamic agent selection based on task requirements

---

## Core Concept: Ideal State Criteria (ISC)

Every non-trivial task has an ISC table that captures what "ideal" looks like:

```markdown
## ISC Table

| # | What Ideal Looks Like | Source | Capability | Status |
|---|----------------------|--------|------------|--------|
| 1 | Research good patterns | INFERRED | research | PENDING |
| 2 | Toggle component works | EXPLICIT | engineer | ACTIVE |
| 3 | Theme state persists | EXPLICIT | engineer | PENDING |
| 4 | Uses TypeScript | INFERRED | - | DONE |
| 5 | Tests pass | IMPLICIT | qa_tester | PENDING |
```

The ISC grows as capabilities discover more requirements. Higher effort = larger, higher quality ISC.

---

## Effort Levels & Capabilities

| Effort | Models | Thinking | Debate | Research | Parallel |
|--------|--------|----------|--------|----------|----------|
| **TRIVIAL** | - | - | - | - | 0 |
| **QUICK** | haiku | - | - | - | 1 |
| **STANDARD** | haiku, sonnet | deep thinking | - | 1 agent | 1-3 |
| **THOROUGH** | haiku, sonnet | All | Council | parallel | 3-5 |
| **DETERMINED** | all + opus | All | Council + RedTeam | all | 10 |

---

## The 7 Phases

Execute IN ORDER. Each phase mutates the ISC:

```
OBSERVE  --> THINK --> PLAN --> BUILD --> EXECUTE --> VERIFY --> LEARN
   |           |         |        |          |           |          |
CREATE    COMPLETE   ORDER    REFINE    ADVANCE     CONFIRM    OUTPUT
 rows      rows      rows     rows      status      status    results
```

1. **OBSERVE** - Understand request + user context, create ISC rows
2. **THINK** - Ensure nothing missing, complete ISC rows
3. **PLAN** - Sequence and assign capabilities
4. **BUILD** - Make rows testable and specific
5. **EXECUTE** - Do the work with appropriate agents
6. **VERIFY** - Test each completed row skeptically
7. **LEARN** - Output results for user rating

---

## Architecture

```
THEALGORITHM/
+-- SKILL.md                    # Core documentation and workflow
+-- Data/
|   +-- Capabilities.yaml       # Source of truth for all capabilities
|   +-- VerificationMethods.yaml # Verification method registry
+-- Tools/
|   +-- AlgorithmDisplay.ts     # LCARS visual display + voice
|   +-- EffortClassifier.ts     # Classify TRIVIAL to DETERMINED
|   +-- CapabilityLoader.ts     # Load capabilities by effort
|   +-- CapabilitySelector.ts   # Select capabilities for ISC rows
|   +-- ISCManager.ts           # Create, update, track ISC tables
|   +-- TraitModifiers.ts       # Effort to trait mappings
|   +-- RalphLoopExecutor.ts    # Persistent iteration loops
+-- Phases/
|   +-- Observe.md              # Phase documentation
|   +-- Think.md
|   +-- Plan.md
|   +-- Build.md
|   +-- Execute.md
|   +-- Verify.md
|   +-- Learn.md
+-- Reference/
    +-- CapabilityMatrix.md     # Effort to capability documentation
    +-- EffortMatrix.md         # Detailed effort level guide
    +-- ISCFormat.md            # ISC table format specification
```

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill | src/skills/THEALGORITHM/SKILL.md | Complete algorithm documentation |
| Capabilities Registry | src/skills/THEALGORITHM/Data/Capabilities.yaml | All orchestratable capabilities |
| Verification Methods | src/skills/THEALGORITHM/Data/VerificationMethods.yaml | How to verify each ISC row |
| Algorithm Display | src/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts | Visual progress + voice |
| Effort Classifier | src/skills/THEALGORITHM/Tools/EffortClassifier.ts | TRIVIAL to DETERMINED classification |
| Capability Loader | src/skills/THEALGORITHM/Tools/CapabilityLoader.ts | Load capabilities by effort |
| Capability Selector | src/skills/THEALGORITHM/Tools/CapabilitySelector.ts | Select capabilities for ISC rows |
| ISC Manager | src/skills/THEALGORITHM/Tools/ISCManager.ts | Full ISC lifecycle management |
| Trait Modifiers | src/skills/THEALGORITHM/Tools/TraitModifiers.ts | Agent trait configuration |
| Ralph Loop Executor | src/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts | Persistent iteration until success |
| Phase Documentation | src/skills/THEALGORITHM/Phases/*.md | Detailed phase guidance |
| Reference Docs | src/skills/THEALGORITHM/Reference/*.md | Matrix and format documentation |

---

## Quick Start

```bash
# 1. START WITH VISUAL DISPLAY (shows banner + voice announcement)
bun run ~/.claude/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts start STANDARD -r "your request"

# 2. CLASSIFY EFFORT (if not using display start)
bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "your request"

# 3. LOAD CAPABILITIES for effort level
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort STANDARD

# 4. CREATE ISC
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts create --request "your request"

# 5. MANAGE ISC during EXECUTE
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts capability --row 1 -c research.perplexity
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts update --row 1 --status DONE
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts show
```

---

## Integration with Other Skills

THE ALGORITHM integrates with the broader PAI ecosystem:

- **Agents Skill** - AgentFactory for dynamic agent composition
- **CORE Skill** - User context for ISC inference
- **Browser Skill** - Web verification in VERIFY phase
- **BeCreative Skill** - Deep thinking for THINK phase
- **Council Skill** - Multi-perspective debate (THOROUGH+)
- **RedTeam Skill** - Adversarial analysis (DETERMINED)
- **FirstPrinciples Skill** - Assumption challenging

---

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system
- **License:** MIT

---

## Changelog

### 2.3.0 - 2026-01-14
- Initial pack release for PAI v2.3
- Includes full ISC management with verification pairing
- Agent claim system for parallel work
- Research override system
- Nested algorithm support
- Interview protocol for unclear requests
- LCARS-style visual display with voice announcements
- Ralph Loop executor for persistent iteration
