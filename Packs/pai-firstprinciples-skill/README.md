---
name: FirstPrinciples Skill
pack-id: danielmiessler-firstprinciples-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: First principles analysis methodology based on Elon Musk's physics-based thinking framework. Deconstructs problems to fundamental truths rather than reasoning by analogy.
type: skill
purpose-type: [analysis, reasoning, problem-solving, methodology]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v1.0.0]
keywords: [first-principles, deconstruct, challenge, reconstruct, constraints, physics, assumptions, fundamentals, elon-musk, reasoning]
---

<p align="center">
  <img src="../icons/pai-firstprinciples-skill.png" alt="FirstPrinciples Skill" width="256">
</p>

# FirstPrinciples Skill

> Foundational reasoning methodology based on Elon Musk's physics-based thinking framework - deconstruct problems to fundamental truths rather than reasoning by analogy.

> **Version 2.3.0** - Stable release with three core workflows for systematic first principles analysis.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill definition | `src/skills/FirstPrinciples/SKILL.md` | Main skill file with routing and framework overview |
| Deconstruct workflow | `src/skills/FirstPrinciples/Workflows/Deconstruct.md` | Break problems into constituent parts and fundamental truths |
| Challenge workflow | `src/skills/FirstPrinciples/Workflows/Challenge.md` | Classify constraints as hard/soft/assumption |
| Reconstruct workflow | `src/skills/FirstPrinciples/Workflows/Reconstruct.md` | Build optimal solutions from fundamentals only |

## The Problem

AI assistants (and humans) often fall into reasoning traps:

**Reasoning by Analogy:**
- "How did we solve something similar?"
- "What do others do?"
- Copies existing solutions with slight variations
- Accepts inherited constraints without questioning

**Constraint Worship:**
- "That's just how it's done"
- "It costs $X because that's the market price"
- Treats soft constraints as immutable physics
- Optimizes form instead of function

**Local Maxima:**
- Incremental improvements to existing solutions
- Never questioning fundamental assumptions
- Missing breakthrough solutions that require starting fresh

## The Solution

### The 3-Step Framework

```
DECONSTRUCT → CHALLENGE → RECONSTRUCT
     ↓            ↓            ↓
  (Parts)    (Classify)    (Build new)
```

**Step 1: DECONSTRUCT**
- "What is this really made of?"
- Break down to constituent parts and fundamental truths
- Find the actual cost/value of each component

**Step 2: CHALLENGE**
- "Is this a real constraint or an assumption?"
- Classify each element as hard (physics), soft (choice), or assumption (unvalidated)
- Ask: "What if we removed this constraint entirely?"

**Step 3: RECONSTRUCT**
- "Given only the truths, what's optimal?"
- Build new solution from fundamentals, ignoring form
- Optimize function, not tradition

### Constraint Classification

| Type | Definition | Example | Can Change? |
|------|------------|---------|-------------|
| **HARD** | Physics/reality | "Data can't travel faster than light" | No |
| **SOFT** | Policy/choice | "We always use REST APIs" | Yes |
| **ASSUMPTION** | Unvalidated belief | "Users won't accept that UX" | Maybe false |

**Rule**: Only hard constraints are truly immutable. Everything else should be challenged.

## Example Usage

### From Claude Code

```
"Use first principles on: Our cloud costs are $10,000/month"
"Challenge the assumptions behind our microservices architecture"
"Deconstruct our security model - what are the real constraints?"
```

### Example Analysis: Rocket Launch Costs

**What We're Told:** "Launching a rocket costs $65 million"

**Deconstruct:**
- Rocket materials (aluminum, titanium, carbon fiber): ~$1M
- Fuel (LOX + kerosene): ~$200K
- Launch operations: Variable

**Challenge:**
- "Rockets are expensive" - ASSUMPTION (materials say otherwise)
- "Aerospace-grade required" - SOFT (often convention, not physics)
- "Must reach orbit" - HARD (physics requires 9.4 km/s delta-v)

**Reconstruct:**
- 98% of vehicle cost is NOT materials
- Vertical integration recaptures margin
- **This insight created SpaceX**

## Core Principles

1. **Physics First** - Real constraints come from physics/reality, not convention
2. **Function Over Form** - Optimize what you're trying to accomplish, not how it's traditionally done
3. **Question Everything** - Every assumption is guilty until proven innocent
4. **Cross-Domain Synthesis** - Solutions from unrelated fields often apply
5. **Rebuild, Don't Patch** - When assumptions are wrong, start fresh rather than fixing

## Integration with Other Skills

FirstPrinciples integrates naturally with:

- **THE ALGORITHM** - Challenge assumptions during THINK phase
- **RedTeam** - Attack ideas by deconstructing their assumptions
- **Council** - Debate constraint classifications from multiple perspectives
- **Architect** - Challenge architectural constraints before design
- **Engineer** - When stuck, rebuild from fundamentals

## Anti-Patterns to Avoid

- **Reasoning by Analogy**: "Company X does it this way, so should we"
- **Accepting Market Prices**: "Batteries cost $600/kWh" without checking material costs
- **Form Fixation**: Improving the suitcase instead of inventing wheels
- **Soft Constraint Worship**: Treating policies as physics
- **Premature Optimization**: Optimizing before understanding fundamentals

## Changelog

### 2.3.0 - 2026-01-14
- Initial PAI v2.3 release
- Three complete workflows: Deconstruct, Challenge, Reconstruct
- Constraint classification framework (HARD/SOFT/ASSUMPTION)
- Integration with PAI skill system
- Voice notification support

---

**Attribution**: Framework derived from Elon Musk's first principles methodology as documented by James Clear, Mayo Oshin, and public interviews.
