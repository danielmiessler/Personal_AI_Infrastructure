---
name: PAI Council Skill
pack-id: danielmiessler-pai-council-skill-v2.5.0
version: 2.5.0
author: danielmiessler
description: Multi-agent debate system where specialized agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction. Now with adaptive rounds, file-first output, and recovery mode.
type: skill
purpose-type: [decision-making, collaboration, multi-agent, debate, synthesis, recovery, resilience]
platform: claude-code
dependencies: [pai-core-install]
keywords: [council, debate, multi-agent, perspectives, synthesis, decision, architect, designer, engineer, researcher, recovery, adaptive, patchlist]
---

<p align="center">
  <img src="../icons/pai-council-skill.png" alt="PAI Council Skill" width="256">
</p>

# PAI Council Skill

> Multi-agent debate system where specialized agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What This Pack Provides

- **Multi-Agent Debate System** - Structured 2-3 round debates between specialized agents
- **Adaptive Rounds** - Round 3 runs only when needed based on convergence detection
- **File-First Output** - Session state persists to `~/.claude/MEMORY/` for resilience
- **Recovery Mode** - Resume interrupted sessions from checkpoint
- **Quick Consensus Check** - Fast single-round perspective gathering
- **Council Members** - Architect, Designer, Engineer, Researcher (with optional Security, Intern, Writer)
- **Visible Transcripts** - Full conversation history showing intellectual friction
- **Output Modes** - Deliberative (conversational) or Patchlist (structured changes)
- **Model Tiering** - Automatic model selection per round for cost efficiency

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
├── Config.md             # Default settings, model tiering, output modes
├── CouncilMembers.md     # Agent roles, perspectives, voices
├── RoundStructure.md     # Round structure and timing
├── OutputFormat.md       # Transcript format templates
└── Workflows/
    ├── Debate.md         # Full 2-3 round structured debate (adaptive)
    ├── Quick.md          # Fast single-round check
    └── Recovery.md       # Resume interrupted sessions
```

## Workflows

| Workflow | Purpose | Rounds | Output |
|----------|---------|--------|--------|
| **DEBATE** | Full structured discussion | 2-3 (adaptive) | Complete transcript + synthesis |
| **QUICK** | Fast perspective check | 1 | Initial positions only |
| **RECOVERY** | Resume interrupted session | Remaining | Continue from checkpoint |

## Default Council Members

| Agent | Perspective | Voice |
|-------|-------------|-------|
| **Architect** | System design, patterns, long-term | Serena Blackwood |
| **Designer** | UX, user needs, accessibility | Aditi Sharma |
| **Engineer** | Implementation reality, tech debt | Marcus Webb |
| **Researcher** | Data, precedent, external examples | Ava Chen |

## Adaptive Round Debate Structure

1. **Round 1 - Initial Positions**: Each agent states their perspective (sonnet)
2. **Round 2 - Responses & Challenges**: Agents respond to each other's points (haiku)
3. **Round 3 - Synthesis** (conditional): Only runs if low convergence or blocking issues (sonnet)

**Convergence Check:** After Round 2, the orchestrator evaluates whether agents have reached consensus. Round 3 is skipped if 3+ agents agree and no blocking issues remain.

**Total Time:** 20-60 seconds (2 rounds) or 30-90 seconds (3 rounds)

## Usage Examples

```
"Council: Should we use WebSockets or SSE?"
-> Invokes DEBATE workflow -> 2-3 round transcript

"Quick council check: Is this API design reasonable?"
-> Invokes QUICK workflow -> Fast perspectives

"Council with security: Evaluate this auth approach"
-> DEBATE with Security agent added

"Council (patchlist): Review these specifications"
-> DEBATE with structured output format

"Council recovery: Resume session 20260202-143052-a1b2c3d4"
-> RECOVERY workflow -> Continue from checkpoint
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill | src/skills/Council/SKILL.md | Entry point and workflow routing |
| Configuration | src/skills/Council/Config.md | Default settings, model tiering, output modes |
| Council Members | src/skills/Council/CouncilMembers.md | Agent roles and voice mapping |
| Round Structure | src/skills/Council/RoundStructure.md | Debate timing and phases |
| Output Format | src/skills/Council/OutputFormat.md | Transcript templates |
| Debate Workflow | src/skills/Council/Workflows/Debate.md | Full 2-3 round adaptive debate |
| Quick Workflow | src/skills/Council/Workflows/Quick.md | Fast consensus check |
| Recovery Workflow | src/skills/Council/Workflows/Recovery.md | Resume interrupted sessions |

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

### 2.5.0 - 2026-02-02
- **Adaptive Rounds** - Round 3 now conditional based on convergence detection
- **File-First Output** - Session state persists to `~/.claude/MEMORY/` for resilience against context compaction and rate limits
- **Recovery Workflow** - Resume interrupted sessions with partial or full rerun options
- **Config.md** - Centralized configuration for rounds, agents, output modes, and model tiering
- **Output Modes** - Added `patchlist` mode for structured specification reviews
- **Model Tiering** - Automatic model selection (sonnet/haiku) per round for cost efficiency
- **Scope Limits** - Guidance on max items per council to prevent token explosion

### 2.3.0 - 2026-01-14
- Initial public release
- Complete debate and quick workflows
- Full council member definitions
- Voice integration support
