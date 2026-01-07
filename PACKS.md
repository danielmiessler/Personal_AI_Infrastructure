# PAI Pack System

Complete documentation for creating, installing, and managing PAI packs.

---

## What is PAI?

**PAI (Personal AI Infrastructure)** is a framework for building your own AI-powered system through modular, self-contained functionality packs.

Instead of copying someone else's entire AI setup, you install individual **packs** that add specific capabilities - like learning kung-fu in The Matrix. Each pack is a complete, tested upgrade that works with Claude Code, OpenCode, or any AI agent system.

**Core philosophy:**
- **Modular** - Pick what you need, leave the rest
- **Complete** - Each pack has everything to go from zero to working
- **Platform-agnostic** - Works with any AI agent platform
- **Battle-tested** - Extracted from production systems

---

## What is a Pack?

A **pack** (short for "package") is a self-contained markdown file that gives your AI everything it needs to implement a specific capability.

### What's Inside a Pack

Every pack contains:

| Component | Description |
|-----------|-------------|
| **Icon** | 256x256 transparent PNG identifying the pack |
| **Metadata** | Version, author, dependencies, keywords |
| **Problem Statement** | What challenge this solves |
| **Solution** | How it works |
| **Complete Code** | All hooks, tools, scripts - nothing left out |
| **Configuration** | Exact settings.json entries, env vars |
| **Installation Steps** | Directory creation, file placement |
| **Verification** | How to confirm it's working |
| **Examples** | Real usage scenarios |
| **Troubleshooting** | Common issues and fixes |

### The Key Insight

**A pack must be complete enough that someone with a fresh Claude Code installation can get it fully working without asking for help.**

If you need to look something up, figure something out, or fill in gaps - the pack is incomplete.

---

## Pack Types

PAI has two fundamentally different pack types. Understanding this distinction is critical.

### Skill Packs (🎯)

**AI-invoked capabilities** that Claude routes to via SKILL.md:

| Requirement | Description |
|-------------|-------------|
| SKILL.md | **Required** - defines triggers and routing |
| Workflows/ | Contains workflow definitions |
| Validation | All workflow refs must resolve |

Skill packs are invoked BY the AI when it detects relevant triggers.

### System Packs (⚙️)

**Human-installed infrastructure** that runs in the background:

| Requirement | Description |
|-------------|-------------|
| SKILL.md | **Not required** - these are infrastructure |
| src/ | Contains hooks, servers, configs |
| Validation | Must install and run correctly |

System packs are installed BY humans and provide infrastructure. They are NOT incomplete for lacking SKILL.md - that's by design.

**System packs:** kai-hook-system, kai-history-system, kai-voice-system, kai-observability-server

---

### Feature Packs (Legacy Term)

**Architectural systems** that add infrastructure capabilities:

- History systems (automatic documentation)
- Skill routing (capability management)
- Agent orchestration (multi-agent coordination)
- Hook systems (event-driven automation)

**Example:** The Kai History System pack adds automatic context-tracking with 4 hooks, 3 library files, and complete settings.json configuration.

### Skill Packs

**Action-oriented capabilities** your AI can invoke:

- Visual content generation
- Research orchestration
- Security analysis
- Content processing

**Example:** The Art pack adds visual content generation with charcoal architectural sketch aesthetic.

---

## Installing a Pack

### Option 1: AI-Assisted (Recommended)

1. Open the pack file from [Packs/](Packs/)
2. Give the entire file to your AI
3. Say: "Install this pack into my system"

Your AI will:
- Create required directories
- Save all code files
- Configure settings.json
- Set up hooks
- Verify installation

### Option 2: Manual Installation

Each pack has detailed manual steps. Follow the "Installation" section in the pack file.

### Option 3: Cherry-Pick

Packs are readable markdown. Copy what you need, adapt to your system.

---

## Creating a Pack

### Step 1: Identify What to Pack

Good pack candidates:
- Solve a real problem
- Are self-contained
- Work independently
- Provide clear value

### Step 2: Follow the Template

Use the pack template: see [Tools/PAIPackTemplate.md](Tools/PAIPackTemplate.md) or the example packs in [Packs/](Packs/).

**Required elements:**
1. YAML frontmatter with metadata
2. 256x256 transparent icon (blue/purple palette)
3. All 13 required sections
4. Complete code (no snippets)
5. Verification steps

### Step 3: Sanitize

If extracting from a private system:
- Replace personal paths with generic ones
- Remove API keys (use env vars)
- Anonymize names and examples
- Remove business-specific references

### Step 4: Validate

Test with a fresh system:
- Can you install it without asking questions?
- Does verification pass?
- Are all dependencies included?

### Step 5: Submit

Create a PR to the PAI repository with your pack.

---

## Pack Structure

```
Packs/
├── icons/
│   ├── history-system.png    # 256x256 transparent PNG
│   ├── art.png
│   └── {pack-name}.png
├── history-system.md         # Complete pack file
├── art.md
└── {pack-name}.md
```

### Pack File Format

```markdown
---
name: Pack Name
pack-id: author-packname-variant-v1.0.0
version: 1.0.0
author: githubusername
description: One-line description (128 words max)
type: feature | skill | hook | plugin | agent | mcp | workflow | template
purpose-type: [security, productivity, research, development, automation, integration, creativity, analysis]
platform: agnostic | claude-code | opencode | cursor
dependencies: []
keywords: [searchable, tags]
---

<p align="center">
  <img src="icons/{pack-name}.png" alt="Pack Name" width="256">
</p>

# Pack Name

> Brief description

## Installation Prompt
## The Concept and/or Problem
## The Solution
## Installation
## Invocation Scenarios
## Example Usage
## Configuration
## Credits
## Related Work
## Works Well With
## Recommended
## Relationships
## Changelog
```

---

## Pack Quality Standards

### Must Have

- [ ] Clear problem statement
- [ ] Complete working code (not snippets)
- [ ] 256x256 transparent icon
- [ ] All dependencies included
- [ ] settings.json configuration (if hooks)
- [ ] Directory creation commands
- [ ] Verification steps
- [ ] Real examples
- [ ] No hardcoded personal data

### Nice to Have

- Screenshots of output
- Video demo
- Multiple examples
- Integration notes with other packs

---

## Available Packs

Browse all packs: [Packs/](Packs/)

### Foundation Packs

| Pack | Type | Description |
|------|------|-------------|
| [kai-hook-system](Packs/kai-hook-system.md) | Foundation | Event-driven automation framework for hook-based capabilities |
| [kai-history-system](Packs/kai-history-system.md) | Infrastructure | Automatic context-tracking for all work, decisions, and learnings |
| [kai-core-install](Packs/kai-core-install.md) | Core | Skills + Identity + Architecture - complete foundation pack |
| [kai-voice-system](Packs/kai-voice-system.md) | Notifications | Voice output with ElevenLabs TTS and prosody enhancement |
| [kai-observability-server](Packs/kai-observability-server.md) | Observability | Real-time multi-agent monitoring dashboard |

### Skill Packs

| Pack | Type | Description |
|------|------|-------------|
| [kai-art-skill](Packs/kai-art-skill.md) | Skill | Visual content generation with charcoal architectural sketch aesthetic |
| [kai-agents-skill](Packs/kai-agents-skill.md) | Skill | Dynamic agent composition with specialized personalities and voices |
| [kai-prompting-skill](Packs/kai-prompting-skill.md) | Skill | Meta-prompting system for programmatic prompt generation |

**Installation order:** hooks → history → core-install → voice → observability (optional) → skill packs

**Or install the complete [Kai Bundle](Bundles/Kai/)** which handles ordering automatically.

---

## FAQ

### Can I use packs with systems other than Claude Code?

Yes. Packs are platform-agnostic by design. The code is standard TypeScript/Python/Bash. You may need to adapt integration points (hooks, skills) to your platform.

### How do I update a pack?

Re-run installation with the new pack version. Most packs include migration notes in the changelog.

### Can I modify a pack for my needs?

Absolutely. Packs are MIT licensed. Fork, modify, and adapt as needed.

### How do I report issues with a pack?

Open an issue on the PAI repository with the pack name in the title.

### Can I submit my own pack?

Yes! Follow the creation guide above and submit a PR.

---

## Resources

- [PAI Repository](https://github.com/danielmiessler/PAI)
- [Pack Template](Packs/) - See existing packs for examples
- [Security Guidelines](SECURITY.md)

---

*PAI Pack System v1.0 - Augment yourself.*
