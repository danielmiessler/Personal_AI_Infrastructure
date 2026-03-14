# PAI Repository Summary

## Overview

**PAI (Personal AI Infrastructure)** is an open-source framework for building personalized AI systems that democratizes access to enterprise-grade AI infrastructure. It transforms generic AI assistants (like Claude Code) into personalized systems with persistent memory, custom skills, and intelligent automation.

## Core Philosophy

**Mission:** "AI should magnify everyone—not just the top 1%"

The most powerful AI systems are built inside companies for companies. PAI makes that same infrastructure available to everyone through modular, self-contained "packs" that can be installed independently.

## The Algorithm (Universal Pattern)

At PAI's foundation is a universal algorithm that works at every scale:
**Current State → Ideal State** via verifiable iteration

The 7 phases:
1. **OBSERVE** - Gather context, understand current state
2. **THINK** - Generate ideas and hypotheses
3. **PLAN** - Pick approach, sequence work
4. **BUILD** - Define success criteria
5. **EXECUTE** - Do the work
6. **VERIFY** - Test against criteria
7. **LEARN** - Harvest insights, iterate or complete

## Architecture

### Three-Tier System

```
PAI System
└── Bundles (curated collections)
    └── Packs (individual capabilities)
        └── Contents (code, hooks, tools, workflows)
```

### Pack Structure (v2.0 - Directory-Based)

Each pack is now a directory containing:
- `README.md` - Overview, architecture, problem/solution
- `INSTALL.md` - Wizard-style installation steps
- `VERIFY.md` - Mandatory verification checklist
- `src/` - Actual source code files (TypeScript, YAML, etc.)

## Available Packs (10 Total)

### Foundation & Infrastructure
1. **pai-hook-system** (v1.0.0) - Event-driven automation framework
2. **pai-history-system** (v1.0.0) - Automatic context-tracking and memory
3. **pai-core-install** (v1.2.0) - Skills, identity, routing, and architecture

### Optional Capabilities
4. **pai-voice-system** (v1.1.0) - Voice notifications with ElevenLabs TTS
5. **pai-observability-server** (v1.0.0) - Real-time multi-agent monitoring dashboard
6. **pai-art-skill** (v1.0.0) - Visual content generation (diagrams, comics)
7. **pai-agents-skill** (v1.0.0) - Dynamic agent composition with personalities
8. **pai-prompting-skill** (v1.0.0) - Meta-prompting system with templates
9. **pai-browser-skill** (v1.2.0) - Debug-first browser automation with Playwright
10. **pai-upgrades-skill** (v1.0.0) - Track and manage PAI system upgrades
11. **pai-algorithm-skill** - The Universal Algorithm implementation (in development)

## Key Primitives & Systems

### 1. Memory System
Three-tier architecture at `$PAI_DIR/MEMORY/`:
- **CAPTURE** (Hot) - Active work with real-time traces (`Work/`)
- **SYNTHESIS** (Warm) - Learnings organized by algorithm phase (`Learning/`)
- **APPLICATION** (Cold) - Immutable historical archive (`History/`)

### 2. Hook System
Event-driven automation that responds to:
- `SessionStart` - Load context, set up environment
- `SessionEnd` - Capture summary, archive learnings
- `UserPromptSubmit` - Update tab title, detect sentiment
- `Stop` - Voice notification, capture completion
- `PreToolUse` / `PostToolUse` - Security validation, logging

### 3. Security System
Defense-in-depth across multiple layers:
- Command validation (blocks dangerous commands)
- Repository separation (private vs public)
- Prompt injection defense
- Secret management (all keys in `$PAI_DIR/.env`)

### 4. TELOS (Deep Goal Capture)
Framework for understanding you—your goals, beliefs, strategies:
- MISSION.md, GOALS.md, PROJECTS.md
- BELIEFS.md, MODELS.md, STRATEGIES.md
- Connects today's tasks to your bigger picture

## The 15 PAI Principles

1. **The Algorithm** - Current → Ideal via verifiable iteration
2. **Clear Thinking First** - Clarify the problem before prompting
3. **Scaffolding > Model** - System architecture matters more than model choice
4. **Deterministic Infrastructure** - AI is probabilistic; infrastructure shouldn't be
5. **Code Before Prompts** - Use bash scripts when possible
6. **Spec / Test / Evals First** - Measure if the system works
7. **UNIX Philosophy** - Do one thing well, composable tools
8. **ENG / SRE Principles** - Version control, automation, monitoring
9. **CLI as Interface** - Faster, more scriptable, more reliable
10. **Goal → Code → CLI → Prompts → Agents** - Decision hierarchy
11. **Self-Updating System** - System modifies itself, encodes learnings
12. **Skill Management** - Modular capabilities with intelligent routing
13. **History System** - Everything captured, feeds future context
14. **Agent Personalities** - Specialized agents with unique voices
15. **Science as Meta-Loop** - Hypothesis → Experiment → Measure → Iterate

## Installation Methods

### 1. AI-First Installation (Recommended)
Give your AI the repository URL and say:
```
"Look at this system and walk me through installing it. Customize it for me."
```

Your AI reads the documentation and conducts an interactive wizard:
- Analyzes your current state
- Asks smart questions about your setup
- Adapts installation to your environment
- Verifies everything works

### 2. Bundle Installation
```bash
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Bundles/Official
bun run install.ts
```

### 3. Individual Pack Installation
Each pack can be installed independently via its `INSTALL.md`.

## Platform Compatibility

| Platform | Status |
|----------|--------|
| **macOS** | ✅ Fully Supported |
| **Linux** | ✅ Fully Supported |
| **Windows** | ❌ Community contributions welcome |
| **Claude Code** | ✅ Native integration |
| **OpenCode** | ✅ Compatible |
| **Cursor/Windsurf** | ✅ Works with adaptation |

## Journey: v1.x → v2.0

**v1.x Problem:** Attempted to mirror entire personal AI system as installable template - created a Jenga tower of dependencies

**v2.0 Solution:** Modular packs that are:
- Self-contained (works independently)
- Independently installable (pick what you need)
- Platform-agnostic (works across AI platforms)
- AI-installable (your AI sets it up)

**v2.1 (Current):** Directory-based pack structure
- Solved token limit issues (single files exceeded 25k tokens)
- Real code files can be linted and tested
- Eliminates "helpful simplification" by AI agents

## Key Features

- **Modular Design** - Install only what you need
- **AI-First** - Designed for AI agents to install and configure
- **Production-Tested** - Extracted from Daniel Miessler's production "Kai" system
- **Open Source** - MIT License, free forever
- **Platform Agnostic** - Works with multiple AI coding assistants
- **Secure** - Multi-layer security with command validation
- **Self-Improving** - System learns and modifies itself over time

## Directory Structure

```
PAI/
├── Bundles/          # Curated pack collections
│   └── Official/     # The complete PAI bundle
├── Packs/            # Individual capability packs (10 available)
├── Tools/            # Pack templates and diagnostic tools
├── README.md         # Main documentation
├── INSTALL.md        # Installation guide for AI assistants
├── PACKS.md          # Pack system documentation
├── PLATFORM.md       # Platform compatibility status
└── .env.example      # Environment variable template
```

## Resources & Community

- **GitHub**: https://github.com/danielmiessler/PAI
- **Blog**: [The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things)
- **Author**: Daniel Miessler ([@danielmiessler](https://twitter.com/danielmiessler))
- **Related Project**: [Fabric](https://github.com/danielmiessler/fabric) - AI prompt patterns

---

**In essence:** PAI is a complete, production-ready framework for transforming generic AI assistants into personalized AI systems with memory, skills, automation, and self-improvement capabilities—democratizing access to enterprise-grade AI infrastructure through modular, battle-tested packs.
