---
name: Kai Joplin Skill
pack-id: joey-joplin-skill-core-v1.0.0
version: 1.0.0
author: banjoey
description: Direct Joplin REST API integration for notes, notebooks, tags, tasks, search - CLI-first with token-efficient smart display, no MCP server
type: skill
purpose-type: [productivity, automation, documentation]
platform: claude-code
dependencies: []
keywords: [joplin, notes, notebooks, tags, tasks, todos, search, documentation, knowledge-base, context-loading, smart-display, token-efficient]
---

<p align="center">
  <img src="icons/joplin-skill.png" alt="Kai Joplin Skill" width="256">
</p>

# Kai Joplin Skill

> Direct Joplin REST API integration with CLI-first design and token-efficient smart display

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds Joplin note-taking integration to your AI infrastructure. Unlike MCP-based approaches, it uses direct REST API calls for:

- **Lower context usage** - No MCP schema overhead
- **Higher reliability** - Deterministic CLI execution
- **Token efficiency** - Smart display filters data before returning

Use cases include: workshop context management, task tracking, documentation, knowledge base queries, and note organization.

Please follow the installation instructions in INSTALL.md to integrate this pack.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| API Client | `Tools/Client.ts` | Shared REST client with Keychain auth |
| Ping | `Tools/Ping.ts` | Connection test |
| Notes | `Tools/Notes.ts` | Note CRUD + smart display (TOC for long notes) |
| Notebooks | `Tools/Notebooks.ts` | Notebook/folder management |
| Tags | `Tools/Tags.ts` | Tag management |
| Search | `Tools/Search.ts` | Text, tag, and regex search |
| Links | `Tools/Links.ts` | Outgoing links and backlinks |
| TaskManagement | `Workflows/TaskManagement.md` | Working with todos |
| ContextLoading | `Workflows/ContextLoading.md` | Efficient note loading |
| QuickCapture | `Workflows/QuickCapture.md` | Creating notes quickly |
| NoteOrganization | `Workflows/NoteOrganization.md` | Moving, renaming, archiving |
| SearchDiscovery | `Workflows/SearchDiscovery.md` | Finding information |

**Summary:**
- **Tools created:** 7
- **Workflows included:** 5
- **Dependencies:** None (standalone)

---

## The Problem

Joplin MCP servers add significant overhead:
- MCP schema loaded into every session (~15K tokens)
- Indirect execution through MCP protocol
- All note content returned without filtering

Additionally, MCP servers don't support:
- Note/notebook rename operations
- Note moving between notebooks
- Regex search within notes
- Smart display (TOC for long notes)
- Link/backlink analysis

## The Solution

Direct REST API calls via deterministic TypeScript CLI tools:

```bash
# Instead of MCP calls through schema
bun run $PAI_DIR/skills/Joplin/Tools/Notes.ts get <id>
```

**Smart Display** prevents dumping thousands of lines into context:
- Notes <100 lines → Full content returned
- Notes ≥100 lines → TOC returned, request specific sections

**Token Savings:** ~99% compared to MCP (no schema, filtered content)

## What Makes This Different

This sounds similar to joplin-mcp which also provides Joplin access. What makes this approach different?

Direct REST API calls with smart display filtering provide dramatically better token efficiency than MCP-based solutions. The CLI-first design means pre-written TypeScript executes deterministically with zero schema overhead, while smart display automatically returns TOCs for long notes instead of dumping full content.

- Direct API calls eliminate MCP protocol overhead
- Smart display filters content before model context
- CLI tools are deterministic and debuggable
- Supports operations MCP servers cannot provide

---

## Configuration

**Authentication:** macOS Keychain

```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
```

Get token from: Joplin Desktop → Tools → Options → Web Clipper → Advanced Options

**No environment variables required.**

---

## Credits

- **Original concept:** Joey Barkley - Joplin integration for PAI workshop management
- **Inspired by:** PAI's file-based MCP pattern, token-efficient design principles

---

## Changelog

### 1.0.0 - 2026-01-05
- Initial release
- 7 CLI tools for complete Joplin integration
- Smart display (TOC) for token efficiency
- 5 workflows for common patterns
- macOS Keychain authentication
