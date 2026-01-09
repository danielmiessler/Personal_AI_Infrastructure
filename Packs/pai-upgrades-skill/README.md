---
name: PAI Upgrades Skill
pack-id: danielmiessler-pai-upgrades-skill-v1.0.0
version: 1.0.0
author: danielmiessler
description: Monitor Anthropic ecosystem (30+ sources) and AI development YouTube channels for updates that can improve your PAI infrastructure. Includes deep research workflows that spawn parallel agents to find documentation and generate prioritized upgrade recommendations.
type: feature
purpose-type: [productivity, research, automation]
platform: claude-code
dependencies:
  - pai-core-install (required) - Skills directory structure and routing
  - pai-hook-system (optional) - For automated startup checks
keywords: [upgrades, anthropic, claude-code, monitoring, changelog, youtube, release-notes, research, automation]
---

<p align="center">
  <img src="../icons/pai-upgrades-skill.png" alt="PAI Upgrades Skill" width="256">
</p>

# PAI Upgrades Skill (pai-upgrades-skill)

> Stay ahead of Claude Code, MCP, and Anthropic ecosystem updates. Monitor 30+ official sources and AI development YouTube channels, then get prioritized recommendations for your system.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state.

---

## What This Pack Does

**Anthropic Ecosystem Monitoring (30+ Sources)**
- Official blogs: Anthropic News, Alignment Science, Research
- GitHub repos: claude-code, skills, MCP, SDKs, cookbooks, courses
- Changelogs: Claude Code CHANGELOG, API release notes, MCP changelog
- Documentation: Claude docs, API docs, MCP spec, MCP registry
- Community: Discord server activity

**YouTube Channel Monitoring**
- Configurable channel list via customization layer
- Automatic new video detection
- Transcript extraction for analysis
- Prioritized by channel importance

**Release Notes Deep Dive**
- Parse `/release-notes` output
- Spawn parallel research agents per feature
- Search GitHub, docs, blogs for deeper documentation
- Generate prioritized upgrade roadmap with citations

**The Core Value:** Never miss an important Claude Code feature. Get actionable upgrade recommendations mapped to your specific system architecture.

## Architecture

```
pai-upgrades-skill/
├── README.md                    # This file
├── INSTALL.md                   # Installation instructions
├── VERIFY.md                    # Verification checklist
└── src/
    └── skills/
        └── Upgrades/
            ├── SKILL.md              # Main skill routing
            ├── sources.json          # 30+ Anthropic sources
            ├── youtube-channels.json # Base channels (empty)
            ├── Workflows/
            │   ├── Anthropic.md      # Check Anthropic updates
            │   ├── YouTube.md        # Check YouTube channels
            │   └── ReleaseNotesDeepDive.md # Deep research workflow
            ├── Tools/
            │   └── Anthropic.ts      # Source checking tool
            └── State/
                └── (runtime state files)
```

## Workflow Routing

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Anthropic** | "check Anthropic", "new Claude features" | Check all official sources |
| **YouTube** | "check YouTube", "new videos" | Monitor configured channels |
| **ReleaseNotesDeepDive** | "analyze release notes", "deep dive features" | Research each feature in depth |
| **All** | "check for updates", "check upgrades" | Run both Anthropic + YouTube |

## The Problem This Solves

### Without This Skill

1. **Missing Features** - Claude Code ships updates constantly, you miss most of them
2. **Manual Checking** - Have to manually visit 30+ sources
3. **No Context** - Release notes lack implementation details
4. **No Prioritization** - All features seem equally important
5. **No System Mapping** - No connection between features and your architecture

### With This Skill

1. **Automated Monitoring** - All sources checked with one command
2. **Deep Research** - Parallel agents find documentation you'd never find
3. **Prioritized Roadmap** - HIGH/MEDIUM/ASPIRATIONAL categorization
4. **System Integration** - Features mapped to your specific PAI components
5. **Customizable Sources** - Add your own YouTube channels via customization layer

## Customization Layer

Personal YouTube channels are configured via the skill customization layer, NOT in the skill itself:

```
~/.claude/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json
```

Example customization:
```json
{
  "_customization": {
    "description": "Your personal YouTube channels",
    "merge_strategy": "append"
  },
  "channels": [
    {
      "name": "Indy Dev Dan",
      "channel_id": "@indydevdan",
      "url": "https://www.youtube.com/@indydevdan",
      "priority": "HIGH",
      "description": "Claude Code tutorials and AI development"
    }
  ]
}
```

## Quick Start

```bash
# Check all Anthropic sources
"check for Anthropic updates"

# Check YouTube channels for new videos
"any new AI development videos?"

# Deep dive on release notes
"deep dive the latest Claude Code release notes"
```

## Sources Monitored

### Blogs & News (4)
- Anthropic Main Blog
- Alignment Science Blog
- Research Page
- Transformer Circuits

### GitHub Repositories (9+)
- anthropics/claude-code
- anthropics/skills
- modelcontextprotocol/modelcontextprotocol
- modelcontextprotocol/docs
- anthropics/claude-cookbooks
- anthropics/anthropic-sdk-python
- anthropics/anthropic-sdk-typescript
- anthropics/courses
- anthropics/claude-quickstarts

### Changelogs (4)
- Claude Code CHANGELOG.md
- Claude Docs Release Notes
- API Release Notes
- MCP Changelog

### Documentation (6)
- Claude Docs (docs.claude.com)
- Anthropic API Docs (docs.anthropic.com)
- MCP Docs (modelcontextprotocol.io)
- MCP Specification (spec.modelcontextprotocol.io)
- MCP Registry
- Skills Documentation

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2026)
- **License:** MIT

## Changelog

### 1.0.0 - 2026-01-08
- Initial release
- 30+ Anthropic sources configured
- YouTube monitoring with customization layer
- ReleaseNotesDeepDive workflow for parallel research
- State tracking to avoid duplicate notifications
