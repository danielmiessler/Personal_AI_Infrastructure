<!--
================================================================================
PAI CORE - SYSTEM/README.md
================================================================================

PURPOSE:
Overview of the SYSTEM directory. Contains system-level documentation for how
your AI infrastructure operates - architecture, delegation, hooks, memory, etc.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/README.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/README.md

CUSTOMIZATION:
- [ ] Update based on which system files you've installed
- [ ] Add/remove entries as your infrastructure grows
- [ ] This is system documentation - customize for your setup

RELATED FILES:
- USER/README.md - User-specific configuration
- CORE/SKILL.md - Main skill definition

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# SYSTEM

System-level documentation for your AI infrastructure. Unlike USER/ (personal data), SYSTEM/ contains architectural patterns, tools, and operational guidelines.

## Core Architecture

| File | Purpose |
|------|---------|
| PAISYSTEMARCHITECTURE.md | Founding principles and philosophy |
| SKILLSYSTEM.md | How skills are structured and routed |
| MEMORYSYSTEM.md | Memory, history, and context tracking |
| THEHOOKSYSTEM.md | Event-driven automation |

## Delegation & Agents

| File | Purpose |
|------|---------|
| THEDELEGATIONSYSTEM.md | Parallel agent patterns |
| AGENTS.md | Agent configuration and traits |

## Tools & Workflows

| File | Purpose |
|------|---------|
| TOOLS.md | CLI utilities reference |
| ACTIONS.md | Multi-step workflows |
| PIPELINES.md | Pipeline architecture |
| BROWSERAUTOMATION.md | Browser testing patterns |

## Reference

| File | Purpose |
|------|---------|
| CLIFIRSTARCHITECTURE.md | CLI-first design principles |
| THENOTIFICATIONSYSTEM.md | Notification channels |
| SCRAPINGREFERENCE.md | Web scraping reference |
| TERMINALTABS.md | Terminal tab management |
| THEFABRICSYSTEM.md | Fabric pattern integration |
| BACKUPS.md | Backup strategies |
| DOCUMENTATIONINDEX.md | Index of all documentation |

## Usage

Your AI references this directory for:
- How to execute multi-step tasks
- Where to store different types of data
- How to delegate work to other agents
- When to use which tools

## Customization

These files define HOW your AI operates. Customize them to match your infrastructure and preferences. Unlike USER/ files (which are personal data), SYSTEM/ files can often be shared or used as templates.
