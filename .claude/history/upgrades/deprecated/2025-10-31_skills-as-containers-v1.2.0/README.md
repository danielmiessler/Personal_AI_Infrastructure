# Deprecated Commands - Skills-as-Containers Migration v1.2.0

**Date:** 2025-10-31
**Migration:** Skills-as-Containers Architecture Implementation
**Commands Archived:** 4

---

## Purpose

This directory contains commands deprecated during the Skills-as-Containers migration. Commands were moved into skill-specific `workflows/` subdirectories for better organization and discoverability.

---

## Commands Migrated

### Research Skill (1 workflow)
- `conduct-research.md` → `skills/research/workflows/conduct.md`

### Alex Hormozi Pitch Skill (1 workflow)
- `create-hormozi-pitch.md` → `skills/alex-hormozi-pitch/workflows/create-pitch.md`

### Archived (2 files)
- `capture-learning.md` - Generic learning capture
- `capture-learning.ts` - TypeScript implementation
- `load-dynamic-requirements.md` - Dynamic requirements loader
- `web-research.md` - Web research workflow

---

## Architecture Change

**Before:**
```
~/.claude/commands/
├── conduct-research.md
├── create-hormozi-pitch.md
├── capture-learning.md
└── [scattered commands]
```

**After:**
```
~/.claude/skills/
├── research/
│   └── workflows/
│       └── conduct.md
└── alex-hormozi-pitch/
    └── workflows/
        └── create-pitch.md
```

---

## Benefits

- ✅ Domain knowledge colocated with workflows
- ✅ Clear skill ownership
- ✅ Natural language routing to skills
- ✅ Better discoverability

---

**Last Updated:** 2025-10-31
**Status:** Archived for historical reference
