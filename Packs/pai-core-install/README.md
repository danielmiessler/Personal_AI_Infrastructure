---
name: PAI Core Install
pack-id: danielmiessler-pai-core-install-v2.3.0
version: 2.3.0
author: danielmiessler
description: Complete CORE skill installation - the foundational skill that governs PAI system operation, architecture, and all system-level configuration
type: skill
purpose-type: [infrastructure, configuration, foundation]
platform: claude-code
dependencies: []
keywords: [core, foundation, system, architecture, configuration, response-format, workflows, delegation, skills, memory, hooks, security, pai]
---

<p align="center">
  <img src="../icons/pai-core-install.png" alt="PAI Core Install" width="256">
</p>

# PAI Core Install

> The foundational skill that governs PAI system operation - auto-loads at session start to provide architecture documentation, response formats, workflow routing, and system-level configuration.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../../README.md#the-journey-pai-v1x--v20)

This pack installs the **CORE skill** - the brain of PAI. CORE is:

- **Auto-loading** - Activates at every session start
- **Authoritative** - The single source of truth for how PAI operates
- **Foundational** - Other skills depend on CORE for configuration and routing

Without CORE, your PAI system has no:
- Response format standards
- Workflow routing
- System architecture documentation
- Security protocols
- Memory system integration

**Core principle:** CORE is the operating system of PAI - everything else builds on it.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | Location | Purpose |
|-----------|----------|---------|
| SKILL.md | `skills/CORE/SKILL.md` | Main skill definition with routing and configuration |
| SYSTEM docs | `skills/CORE/SYSTEM/` | 19 architecture and system documentation files |
| USER templates | `skills/CORE/USER/` | Empty user customization structure with READMEs |
| WORK templates | `skills/CORE/WORK/` | Sensitive work directory placeholder |
| Workflows | `skills/CORE/Workflows/` | 4 core workflows (Delegation, SessionContinuity, etc.) |
| Tools | `skills/CORE/Tools/` | 4 CLI tools (Inference, SessionProgress, etc.) |

**Summary:**
- **Files created:** 34
- **SYSTEM docs:** 19 architecture files
- **Workflows:** 4
- **Tools:** 4
- **Dependencies:** None (foundation pack)

---

## The Concept and/or Problem

AI agents are powerful but lack structure. Without a foundational system:

**Without Response Standards:**
- Every response has different format
- No consistent way to communicate
- Voice integration impossible
- Users can't predict what they'll get

**Without Architecture Documentation:**
- No single source of truth
- Configuration scattered everywhere
- New features break old ones
- Debugging is guesswork

**Without Workflow Routing:**
- User intent to action is fuzzy
- Same request handled differently each time
- No way to extend functionality predictably
- Integration points undefined

**Without SYSTEM/USER Separation:**
- Updates overwrite customizations
- Personal data leaks to public repos
- No safe way to personalize

**The Fundamental Problem:**

AI systems need scaffolding - not just capabilities, but the organizational structure that makes capabilities reliable, extensible, and maintainable. CORE provides that scaffolding.

---

## The Solution

CORE solves this through **layered architecture with explicit contracts**:

### Layer 1: Response Format
Every AI response follows a predictable structure:
- SUMMARY for quick understanding
- ANALYSIS for findings
- ACTIONS for what was done
- RESULTS for outcomes
- Voice output for TTS integration

### Layer 2: SYSTEM/USER Two-Tier
Configuration that never conflicts:
- SYSTEM: Base defaults, updated with PAI
- USER: Your customizations, never touched

### Layer 3: Workflow Routing
Intent maps to action predictably:
- Triggers in SKILL.md route to workflows
- Workflows document exact procedures
- Tools provide CLI interfaces

### Layer 4: Documentation as Code
Architecture docs that stay current:
- PAISYSTEMARCHITECTURE.md: Founding principles
- SKILLSYSTEM.md: How skills work
- MEMORYSYSTEM.md: How history works
- And 16 more specialized docs

---

## What Makes This Different

This sounds similar to "system prompts" which also configure AI behavior. What makes this approach different?

CORE is not a prompt - it's an operating system. While system prompts are static text that gets prepended to conversations, CORE is a dynamic skill with routing tables, documentation hierarchies, and tool integrations. It loads selectively based on context, routes intent to specific workflows, and maintains separation between system defaults and user customizations.

- System prompts are static; CORE routes dynamically
- Prompts overwrite on update; USER tier is protected
- Instructions are flat; CORE has explicit layer hierarchy
- Configuration is scattered; CORE centralizes everything

---

## Configuration

**Environment variables (add to shell profile or .env):**

```bash
# Required
export PAI_DIR="$HOME/.claude"

# Optional - for voice integration
export DA="YourAIName"
export TIME_ZONE="America/Los_Angeles"
```

**settings.json configuration:**

```json
{
  "daidentity": {
    "name": "YourAIName",
    "fullName": "Your AI Full Name",
    "voiceId": "your-elevenlabs-voice-id"
  },
  "principal": {
    "name": "YourName",
    "timezone": "America/Los_Angeles"
  }
}
```

---

## Customization

### Recommended Customization

**Populate your USER directory:**

After installing CORE, personalize your PAI by creating files in `USER/`:

1. **ABOUTME.md** - Tell your AI about yourself
2. **BASICINFO.md** - Name, timezone, location
3. **DAIDENTITY.md** - Customize your AI's personality
4. **RESPONSEFORMAT.md** - Override default response format

**Why:** USER files make PAI *yours*. Without them, you get generic defaults.

**Process:**
1. Read the README.md files in each USER subdirectory
2. Create the recommended files with your personal content
3. Your AI will use this context in every session

**Expected Outcome:** An AI that knows you, speaks in your preferred style, and maintains your preferences across sessions.

### Optional Customization

| Customization | Location | Impact |
|---------------|----------|--------|
| Security patterns | `USER/PAISECURITYSYSTEM/patterns.yaml` | Custom sensitive data detection |
| Skill preferences | `USER/SKILLCUSTOMIZATIONS/{Skill}/` | Per-skill behavior overrides |
| Banner config | `USER/BANNER/config.yaml` | Session start display |
| Terminal settings | `USER/TERMINAL/preferences.yaml` | Terminal appearance |

---

## Credits

- **Original concept**: Daniel Miessler - developed as the foundation of PAI (Personal AI Infrastructure)
- **Inspired by**: Unix philosophy (modular tooling), Anthropic's agent harness patterns, and engineering best practices

---

## Changelog

### 2.3.0 - 2026-01-14
- Initial pack release for PAI v2.3
- Includes complete SYSTEM documentation (19 files)
- USER directory templates with README guides
- WORK directory template for sensitive content
- 4 core workflows (Delegation, SessionContinuity, ImageProcessing, Transcription)
- 4 CLI tools (Inference, SessionProgress, FeatureRegistry, SkillSearch)
- CRITICAL: USER directory is empty template - populate with your personal content
