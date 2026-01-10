<!--
================================================================================
PAI CORE - SYSTEM/DOCUMENTATIONINDEX.md
================================================================================

PURPOSE:
Complete CORE documentation index with route triggers. Quick reference for
finding the right documentation file based on user queries.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/DOCUMENTATIONINDEX.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/DOCUMENTATIONINDEX.md

CUSTOMIZATION:
- [ ] Add entries for your custom documentation
- [ ] Update triggers as you add new files
- [ ] Keep in sync with actual file structure

RELATED FILES:
- PAISYSTEMARCHITECTURE.md - Core philosophy
- SKILLSYSTEM.md - Skill configuration

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

---
name: DocumentationIndex
description: Complete CORE documentation index with detailed descriptions. Reference material for on-demand loading.
---

# CORE Documentation Index

**Quick reference for finding the right documentation file.**

---

## Documentation Index & Route Triggers

**All documentation files are in `${PAI_DIR}/skills/CORE/` (flat structure). Read these files when you need deeper context.**

### Core Architecture & Philosophy

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/PAISYSTEMARCHITECTURE.md` | System architecture and philosophy, foundational principles | "system architecture", "how does the system work", "system principles" |
| `SYSTEM/CLIFIRSTARCHITECTURE.md` | CLI-First pattern details | "CLI-First", "deterministic tools" |
| `SYSTEM/SKILLSYSTEM.md` | Custom skill system with triggers and workflow routing | "how to structure a skill", "skill routing", "create new skill" |

### Skill Execution

When a skill is invoked, follow the SKILL.md instructions step-by-step: execute voice notifications, use the routing table to find the workflow, and follow the workflow instructions in order.

**🚨 MANDATORY USE WHEN FORMAT (Always Active):**

Every skill description MUST use this format:
```
description: [What it does]. USE WHEN [intent triggers using OR]. [Capabilities].
```

**Example:**
```
description: Complete blog workflow. USE WHEN user mentions their blog, website, or site, OR wants to write, edit, or publish content. Handles writing, editing, deployment.
```

**Rules:**
- `USE WHEN` keyword is MANDATORY (Claude Code parses this)
- Use intent-based triggers: `user mentions`, `user wants to`, `OR`
- Do NOT list exact phrases like `'write a blog post'`
- Max 1024 characters

See `SYSTEM/SKILLSYSTEM.md` for complete documentation.

### Development & Testing

| File | Purpose | Triggers |
|------|---------|----------|
| `USER/TECHSTACKPREFERENCES.md` | Core technology stack preferences | "what stack do I use", "TypeScript or Python", "bun or npm" |

### Agent System

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/AGENTS.md` | Agent configuration and personality system | "create agents", "agent traits" |
| `SYSTEM/THEDELEGATIONSYSTEM.md` | Delegation patterns | "parallel agents", "delegation" |

### Response & Communication

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/THENOTIFICATIONSYSTEM.md` | Notification channels (voice, push, desktop) | "notifications", "voice alerts" |
| `SYSTEM/THEHOOKSYSTEM.md` | Hook configuration | "hooks configuration", "create custom hooks" |

### Memory & History

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/MEMORYSYSTEM.md` | Memory and history documentation | "history system", "capture system", "memory system" |

### Reference Data

| File | Purpose | Triggers |
|------|---------|----------|
| `USER/ASSETMANAGEMENT.md` | Digital assets registry | "my site", "vulnerability", "what uses React", "tech stack" |
| `USER/CONTACTS.md` | Contact directory | "who is [name]", "show contacts" |
| `USER/DEFINITIONS.md` | Canonical definitions | "definition of AGI", "how do we define X" |
| `USER/SECURITYSYSTEM.md` | Security protocols | "security protocols", "sensitive data" |

### Workflows & Actions

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/ACTIONS.md` | Multi-step workflow patterns | "create action", "workflow patterns" |
| `SYSTEM/PIPELINES.md` | Pipeline orchestration | "pipeline", "chain actions" |
| `SYSTEM/TOOLS.md` | CLI utilities reference | "CLI tools", "utilities" |

### Specialized Systems

| File | Purpose | Triggers |
|------|---------|----------|
| `SYSTEM/THEFABRICSYSTEM.md` | Fabric patterns | "fabric patterns", "extract_wisdom" |
| `SYSTEM/SCRAPINGREFERENCE.md` | Web scraping | "scrape", "MCP", "Bright Data", "Apify" |
| `SYSTEM/TERMINALTABS.md` | Terminal tab management | "tab titles", "terminal" |

---

## File Naming Convention

### USER/ Directory (Personal Configuration)
- `BASICINFO.md` - Your name, email, social handles
- `CONTACTS.md` - Your contact directory
- `TECHSTACKPREFERENCES.md` - Your tech preferences
- `ASSETMANAGEMENT.md` - Your digital assets
- `SECURITYSYSTEM.md` - Your security protocols

### SYSTEM/ Directory (System Architecture)
- `PAISYSTEMARCHITECTURE.md` - Core principles
- `SKILLSYSTEM.md` - Skill configuration
- `MEMORYSYSTEM.md` - Memory system
- `THEHOOKSYSTEM.md` - Hook system
- `THENOTIFICATIONSYSTEM.md` - Notifications
- `THEDELEGATIONSYSTEM.md` - Delegation patterns
- `AGENTS.md` - Agent system
- `ACTIONS.md` - Action patterns
- `PIPELINES.md` - Pipeline orchestration
- `TOOLS.md` - CLI utilities
- `CLIFIRSTARCHITECTURE.md` - CLI-First pattern
- `THEFABRICSYSTEM.md` - Fabric patterns
- `SCRAPINGREFERENCE.md` - Web scraping
- `TERMINALTABS.md` - Terminal management
- `DOCUMENTATIONINDEX.md` - This file

---

## Quick Lookup

**"How do I create a skill?"** → `SYSTEM/SKILLSYSTEM.md`
**"What are my tech preferences?"** → `USER/TECHSTACKPREFERENCES.md`
**"How does delegation work?"** → `SYSTEM/THEDELEGATIONSYSTEM.md`
**"Where are my contacts?"** → `USER/CONTACTS.md`
**"How do hooks work?"** → `SYSTEM/THEHOOKSYSTEM.md`
**"What's the memory structure?"** → `SYSTEM/MEMORYSYSTEM.md`
