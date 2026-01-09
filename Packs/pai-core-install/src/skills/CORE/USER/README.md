<!--
================================================================================
PAI CORE - USER/README.md
================================================================================

PURPOSE:
Overview of the USER directory structure and contents. This directory contains
your personal knowledge base that enables your AI assistant to understand your
life, work, preferences, and goals.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/USER/README.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/USER/README.md

CUSTOMIZATION:
- [ ] Update directory descriptions to match your actual file organization
- [ ] Add or remove sections based on which files you've created
- [ ] This file is user-specific - customize freely

RELATED FILES:
- SYSTEM/README.md - System-level documentation
- CORE/SKILL.md - Main skill definition

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# USER

Personal knowledge base for your AI assistant. This directory contains information your AI needs to answer questions about your life, business, health, finances, and preferences.

## Directory Structure

| Directory/File | Purpose |
|----------------|---------|
| **BUSINESS/** | Business entities, consulting, contracts (create if needed) |
| **FINANCES/** | Banking, investments, expenses, taxes (create if needed) |
| **HEALTH/** | Medical history, providers, health tracking (create if needed) |
| **TELOS/** | Life goals, projects, dependencies (create if needed) |

## Key Files

| File | Purpose |
|------|---------|
| ABOUTME.md | Personal bio and background |
| BASICINFO.md | Contact information and identifiers |
| CONTACTS.md | Contact directory for people you work with |
| TECHSTACKPREFERENCES.md | Technology preferences and tooling |
| ASSETMANAGEMENT.md | Digital properties and domains |
| DEFINITIONS.md | Your canonical definitions and terminology |
| CORECONTENT.md | Essential content registry |
| RESUME.md | Professional background |
| REMINDERS.md | Active reminders and recurring items |
| ALGOPREFS.md | AI behavior customizations |
| ART.md | Visual style and branding guidelines |
| IDENTITY.md | AI identity configuration (name, personality) |
| SECURITYSYSTEM.md | Security protocols and policies |

## Usage

Your AI references this directory to answer questions like:
- "What's my contact at [company]?"
- "What's my preferred tech stack?"
- "What are my health goals?"
- "What are my business entities?"

This is your AI's knowledge base about you - keep it updated.

## Getting Started

1. Start with BASICINFO.md - your contact information
2. Add CONTACTS.md - people you work with
3. Create IDENTITY.md - name and configure your AI
4. Fill in other files as needed for your workflows

## Privacy

This directory contains sensitive personal information. In your private installation:
- Keep it in your private repo (never public)
- Use .gitignore for extremely sensitive subdirectories
- Reference SECURITYSYSTEM.md for security protocols
