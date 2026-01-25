<p align="center">
  <img src="utilities-icon.png" alt="PAI Utilities" width="128">
</p>

# Utilities

> **FOR AI AGENTS:** This directory contains tools and templates for building and maintaining PAI installations. When a user asks about checking their PAI state, creating packs, or creating bundles, reference the appropriate file from this directory.

---

## AI Usage Guide

**When to use these files:**

| User Request | File to Reference |
|--------------|-------------------|
| "Check my PAI installation" | `CheckPAIState.md` |
| "Create a new pack" | `PAIPackTemplate.md` |
| "Create a new bundle" | `PAIBundleTemplate.md` |
| "What's wrong with my PAI setup?" | `CheckPAIState.md` |
| "Help me make a pack for X" | `PAIPackTemplate.md` |

**How to use:**
1. Read the relevant file completely
2. Follow the instructions in the file
3. The files contain detailed AI-readable instructions

---

## Contents

This directory contains two types of resources:

- **Diagnostic Tools** - Utilities you run to check, analyze, or manage a PAI installation
- **Creation Templates** - Specifications for creating new packs and bundles

---

## Diagnostic Tools

### CheckPAIState.md

**PAI Installation Diagnostic**

A comprehensive diagnostic workflow for assessing PAI installation health. Give this file to an AI and ask it to check the system.

**What it does:**
- Inventories installed packs and their status
- Verifies core systems are working (hooks, history, skills)
- Detects broken, misconfigured, or missing dependencies
- Compares the installation to the latest Kai bundle
- Provides actionable recommendations for improvements

**AI invocation:**
```
Read CheckPAIState.md and check my PAI state. Give me recommendations.
```

**Output:** A health report with installed packs, issues found, and suggested next steps.

---

## Creation Templates

### PAIPackTemplate.md

**Pack Creation Specification**

The complete specification for creating PAI packs. A pack is a **directory** containing README.md, INSTALL.md, VERIFY.md, and a src/ folder with actual code files.

**What it covers:**
- Pack directory structure (README.md, INSTALL.md, VERIFY.md, src/)
- YAML frontmatter schema (metadata, versioning, dependencies)
- Required sections and their purposes
- Icon generation requirements (256x256 transparent PNG)
- End-to-end completeness requirements
- Pre-installation system analysis
- Verification and testing guidance

**Key principle:** Packs must be COMPLETE. Everything needed to go from fresh AI agent to fully working system must be in the pack—no missing components, no "figure it out yourself."

**AI invocation:**
```
Read PAIPackTemplate.md and help me create a pack for [CAPABILITY].
```

---

### PAIBundleTemplate.md

**Bundle Creation Specification**

The complete specification for creating PAI bundles. A bundle is a curated collection of packs designed to work together as a cohesive system.

**What it covers:**
- Bundle directory structure
- AI Installation Wizard section (interactive setup)
- Architecture documentation (how packs work together)
- Installation order and dependencies
- Bundle-level verification
- Tier system (starter, intermediate, advanced, complete)

**Key principle:** Bundles document COMPLETE systems. They explain not just what packs to install, but WHY they work together and what emergent capabilities arise from the combination.

**AI invocation:**
```
Read PAIBundleTemplate.md and help me create a bundle for [USE CASE].
```

---

## Quick Reference

| File | Type | Purpose | AI Trigger |
|------|------|---------|------------|
| CheckPAIState.md | Diagnostic | Check PAI installation health | "check my PAI" |
| PAIPackTemplate.md | Template | Create new packs | "create a pack" |
| PAIBundleTemplate.md | Template | Create new bundles | "create a bundle" |

---

*Part of the [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) project.*
