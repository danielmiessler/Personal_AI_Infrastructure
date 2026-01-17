---
name: PAI RedTeam Skill
pack-id: danielmiessler-pai-redteam-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Military-grade adversarial analysis using 32 parallel agents. Breaks arguments into atomic components, attacks from diverse expert perspectives (engineers, architects, pentesters, interns), synthesizes findings, and produces devastating counter-arguments with steelman representations.
type: feature
purpose-type: [analysis, critical-thinking, decision-making]
platform: claude-code
dependencies:
  - pai-core-install (required) - Skills directory structure and routing
  - pai-firstprinciples-skill (optional) - Enhanced constraint classification
keywords: [red-team, adversarial, analysis, critique, stress-test, steelman, counter-argument, debate, parallel-agents]
---

<p align="center">
  <img src="../icons/pai-redteam-skill.png" alt="PAI RedTeam Skill" width="256">
</p>

# PAI RedTeam Skill (pai-redteam-skill)

> Military-grade adversarial analysis. Find the fundamental flaw that collapses the entire structure.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What This Pack Does

This Pack provides military-grade adversarial analysis capabilities:

**Parallel Analysis (ParallelAnalysis.md)**
- Decomposes arguments into 24 atomic claims
- Deploys 32 specialized agents (8 each: engineers, architects, pentesters, interns)
- Each agent examines BOTH strengths AND weaknesses
- Synthesizes convergent insights
- Produces 8-point Steelman and Counter-Argument

**Adversarial Validation (AdversarialValidation.md)**
- Three-round protocol: Competing Proposals, Brutal Critique, Collaborative Synthesis
- Produces superior output through adversarial refinement
- Best for decisions where quality matters more than speed

**Core Philosophy:** The goal is NOT destruction - it's finding the ONE fundamental flaw that, if challenged, causes the entire structure to collapse.

## Architecture

```
pai-redteam-skill/
├── README.md                    # This file
├── INSTALL.md                   # Installation wizard
├── VERIFY.md                    # Verification checklist
└── src/
    └── skills/
        └── RedTeam/
            ├── SKILL.md         # Skill routing and overview
            ├── Philosophy.md    # Core philosophy and agent types
            ├── Integration.md   # Skill integration guide
            └── Workflows/
                ├── ParallelAnalysis.md       # 32-agent stress-test
                └── AdversarialValidation.md  # Battle of bots
```

## The 32 Agent Types

| Type | Count | Focus |
|------|-------|-------|
| **Engineers** | 8 | Technical and logical rigor |
| **Architects** | 8 | Structural and systemic issues |
| **Pentesters** | 8 | Adversarial thinking |
| **Interns** | 8 | Fresh perspectives |

Each agent has a unique personality and attack angle - see `Philosophy.md` for the complete roster.

## The Problem This Solves

### Without Red Teaming

1. **Confirmation Bias** - Only see evidence supporting your view
2. **Blind Spots** - Miss obvious flaws experts would catch
3. **Strawman Attacks** - Defeat weak versions of arguments
4. **Group Think** - Everyone agrees without critical examination
5. **Overconfidence** - Launch plans that fail predictably

### The Core Insight

The most powerful critique is usually ONE core issue:
- A hidden assumption that's actually false
- A logical step that doesn't follow
- A category error (treating X like Y)
- An ignored precedent that directly contradicts

This skill surfaces that core issue through diverse expert perspectives.

## Quick Reference

| Workflow | Purpose | Output |
|----------|---------|--------|
| **ParallelAnalysis** | Stress-test existing content | Steelman + Counter-argument (8-points each) |
| **AdversarialValidation** | Produce new content via competition | Synthesized solution from competing proposals |

## Success Criteria

- Steelman is strong enough that a proponent would say "yes, that's my argument"
- Counter-argument defeats the steelman, not a weaker strawman
- Multiple agents converged on same insights
- Reader says "I hadn't thought of that"

## Quick Start

```
# Red team an architecture proposal
"red team this microservices migration plan"
--> Uses ParallelAnalysis
--> Returns steelman + devastating counter-argument

# Adversarial validation for feature design
"battle of bots - which approach is better for this feature?"
--> Uses AdversarialValidation
--> Synthesizes best solution from competing ideas
```

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system (2024-2026)
- **License:** MIT

## Acknowledgments

- **Military Red Teaming** - Origin of adversarial analysis methodology
- **Network Chuck** - "Battle of Bots" adversarial validation concept
- **Academic Research** - Convergent insight synthesis patterns
