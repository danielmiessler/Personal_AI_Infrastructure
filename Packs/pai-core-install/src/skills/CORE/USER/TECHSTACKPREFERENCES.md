<!--
================================================================================
PAI CORE - USER/TECHSTACKPREFERENCES.md
================================================================================

PURPOSE:
Your technology stack preferences. Your AI uses this to make consistent
technology choices across all development work - languages, package managers,
formats, and workflow patterns.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/USER/TECHSTACKPREFERENCES.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/USER/TECHSTACKPREFERENCES.md

CUSTOMIZATION:
- [ ] Adjust language preferences to match your stack
- [ ] Update package manager preferences
- [ ] Modify format standards as needed
- [ ] Add your own workflow patterns

RELATED FILES:
- SYSTEM/TOOLS.md - CLI utilities reference
- SYSTEM/CLIFIRSTARCHITECTURE.md - CLI-first design patterns
- ALGOPREFS.md - AI behavior customizations

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Stack Preferences

**Your Technology Stack Preferences - Definitive Reference**

This document captures your core technology stack preferences for PAI infrastructure and all development work.

---

## Languages

### Primary Language: [TypeScript/Python/etc.]

**Primary Rule:** [Your preference statement]

**When to Use [Primary Language]:**
- All new infrastructure development
- Web services and APIs
- Command-line tools and utilities
- Default choice for all new projects

**When [Secondary Language] is Acceptable:**
- Explicitly approved for specific use case
- Existing codebase that requires maintenance
- Specialized libraries with no equivalent in primary language

---

## Package Managers

### JavaScript/TypeScript: [bun/npm/yarn/pnpm]

**Commands:**
```bash
# Install dependencies
bun install

# Add a new package
bun add express

# Run a TypeScript file directly
bun run src/file.ts
```

### Python: [uv/pip/poetry/conda]

**Commands:**
```bash
# Install packages
uv pip install package-name

# Create virtual environment
uv venv
source .venv/bin/activate
```

---

## Formats & Standards

### Documentation Format: [Markdown/etc.]

**Primary Rule:** Use Markdown for all documentation.

**Acceptable HTML:**
- Custom components (`<aside>`, `<details>`, `<summary>`)
- Interactive elements requiring specific behavior

**Avoid HTML for:**
- Basic paragraphs, headers, lists
- Links and emphasis
- Code blocks and tables

---

## Workflow Patterns

### Analysis vs Action: Explicit Intent Required

**Analysis Tasks (Read-Only):**
- "Analyze the authentication flow"
- "Review this code for issues"
- "What's wrong with this implementation?"

**Action Tasks (Modifications Allowed):**
- "Fix the authentication bug"
- "Refactor this code"
- "Implement the new feature"

**Rule:** If asked to analyze, do analysis ONLY - don't change things unless explicitly asked.

### Temporary vs Permanent Storage

**Scratchpad (Temporary):**
- Tests and experiments
- Draft outputs before finalization
- Files you'll delete when done

**History (Permanent):**
- Research findings and analyses
- Learnings and insights
- Important decisions and specifications

---

## Terminal & Browser

### Terminal: [Kitty/iTerm2/Terminal.app]

[Your terminal preference and why]

### Browser: [Browser Name]

```bash
# Open a URL
open -a "[Browser]" "http://localhost:5200"
```

---

## Additional Preferences

### File Naming Conventions

**Dates in filenames:**
- Use ISO format: `YYYY-MM-DD`
- Example: `2025-11-01_stack-preferences.md`

**Descriptive names:**
- Use kebab-case: `stack-preferences.md`
- Be specific: `oauth2-implementation-guide.md`

### Git Practices

**Commit Messages:**
- Start with verb: "Add", "Update", "Fix", "Remove"
- Be specific about what changed
- Example: "Add stack preferences reference to CORE documentation"

---

## Summary Reference Card

```
LANGUAGES:
  Primary: [Your primary language]
  Secondary: [Your secondary language]

PACKAGE MANAGERS:
  JS/TS: [Your choice]
  Python: [Your choice]

FORMATS:
  Documentation: Markdown
  Config: JSON/YAML

WORKFLOW:
  Analysis → Read only, report findings
  Action → Modify with confidence
```

---

**This is the definitive reference for stack preferences. When in doubt, consult this document.**
