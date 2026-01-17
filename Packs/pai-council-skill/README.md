---
name: PAI Council Skill
pack-id: danielmiessler-pai-council-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Multi-agent debate system where specialized agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction.
type: skill
purpose-type: [decision-making, collaboration, multi-agent, debate, synthesis]
platform: claude-code
dependencies: [pai-core-install]
keywords: [council, debate, multi-agent, perspectives, synthesis, decision, architect, designer, engineer, researcher]
---

<p align="center">
  <img src="../icons/pai-council-skill.png" alt="PAI Council Skill" width="256">
</p>

# PAI Council Skill

> Multi-agent debate system where specialized agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What This Pack Provides

- **Multi-Agent Debate System** - Structured 3-round debates between specialized agents
- **Quick Consensus Check** - Fast single-round perspective gathering
- **Council Members** - Architect, Designer, Engineer, Researcher (with optional Security, Intern, Writer)
- **Visible Transcripts** - Full conversation history showing intellectual friction
- **Synthesis Engine** - Convergence detection and recommendation generation

## Key Differentiator

**Council vs RedTeam:**
- **Council** is collaborative-adversarial (debate to find best path)
- **RedTeam** is purely adversarial (attack the idea)
- Council produces visible conversation transcripts
- RedTeam produces steelman + counter-argument

## Architecture

```
Council Skill
├── SKILL.md              # Main entry point and routing
├── CouncilMembers.md     # Agent roles, perspectives, voices
├── RoundStructure.md     # 3-round debate structure
├── OutputFormat.md       # Transcript format templates
└── Workflows/
    ├── Debate.md         # Full 3-round structured debate
    └── Quick.md          # Fast single-round check
```

## Workflows

| Workflow | Purpose | Rounds | Output |
|----------|---------|--------|--------|
| **DEBATE** | Full structured discussion | 3 | Complete transcript + synthesis |
| **QUICK** | Fast perspective check | 1 | Initial positions only |

## Default Council Members

| Agent | Perspective | Voice |
|-------|-------------|-------|
| **Architect** | System design, patterns, long-term | Serena Blackwood |
| **Designer** | UX, user needs, accessibility | Aditi Sharma |
| **Engineer** | Implementation reality, tech debt | Marcus Webb |
| **Researcher** | Data, precedent, external examples | Ava Chen |

## Three-Round Debate Structure

1. **Round 1 - Initial Positions**: Each agent states their perspective
2. **Round 2 - Responses & Challenges**: Agents respond to each other's points
3. **Round 3 - Synthesis**: Identify convergence, disagreements, final recommendations

**Total Time:** 30-90 seconds for full debate (parallel execution within rounds)

## Usage Examples

```
"Council: Should we use WebSockets or SSE?"
-> Invokes DEBATE workflow -> 3-round transcript

"Quick council check: Is this API design reasonable?"
-> Invokes QUICK workflow -> Fast perspectives

"Council with security: Evaluate this auth approach"
-> DEBATE with Security agent added
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill | src/skills/Council/SKILL.md | Entry point and workflow routing |
| Council Members | src/skills/Council/CouncilMembers.md | Agent roles and voice mapping |
| Round Structure | src/skills/Council/RoundStructure.md | Debate timing and phases |
| Output Format | src/skills/Council/OutputFormat.md | Transcript templates |
| Debate Workflow | src/skills/Council/Workflows/Debate.md | Full 3-round debate |
| Quick Workflow | src/skills/Council/Workflows/Quick.md | Fast consensus check |

## Integration

**Works well with:**
- **RedTeam** - Pure adversarial attack after collaborative discussion
- **Development** - Before major architectural decisions
- **Research** - Gather context before convening the council

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system
- **License:** MIT

## Changelog

### 2.3.0 - 2026-01-14
- Initial public release
- Complete debate and quick workflows
- Full council member definitions
- Voice integration support
