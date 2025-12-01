# Refactor Notes Workflow

**Purpose:** Break large notes into smaller, linked notes for better organization.

## Trigger Phrases
- "break up this note"
- "split into smaller notes"
- "refactor notes"
- "this note is too long"

## When to Refactor

A note should be refactored when:
- It covers multiple distinct topics
- It's longer than ~500 lines
- Different sections could be useful independently
- It's hard to find specific information

## Workflow Steps

### 1. Analyze Note Structure
```bash
obs read "long-note-name"
```

Identify:
- Major sections (H2 headings)
- Distinct topics
- Natural split points

### 2. Plan Split
Present a refactoring plan:

```
Note: 2024-11-15-Project-Overview.md (850 lines)

Proposed split:
1. "Project Goals" (lines 1-150) → 2024-11-15-Project-Goals.md
2. "Technical Architecture" (lines 151-400) → 2024-11-15-Technical-Architecture.md
3. "Implementation Plan" (lines 401-650) → 2024-11-15-Implementation-Plan.md
4. "Team Responsibilities" (lines 651-850) → 2024-11-15-Team-Responsibilities.md

Original note becomes index with links to all parts.

Proceed? [y/n]
```

### 3. Create Child Notes
For each section:
```bash
obs write "Technical Architecture" \
  --tags "projects/x,type/design" \
  --content "${SECTION_CONTENT}"
```

### 4. Update Original Note
Replace sections with links:

**Before:**
```markdown
# Project Overview

## Goals
[200 lines of content]

## Technical Architecture
[250 lines of content]
```

**After:**
```markdown
# Project Overview

## Goals
→ [[2024-11-15-Project-Goals]]

## Technical Architecture
→ [[2024-11-15-Technical-Architecture]]
```

### 5. Add Backlinks
Each child note gets a backlink:
```markdown
---
tags: projects/x type/design
parent: [[2024-11-15-Project-Overview]]
---

# Technical Architecture

[content]
```

## Example

**Input:**
```
2024-11-15-Kubernetes-Deep-Dive.md (600 lines)
├── Introduction
├── Core Concepts
│   ├── Pods
│   ├── Services
│   └── Deployments
├── Networking
├── Storage
└── Best Practices
```

**Output:**
```
2024-11-15-Kubernetes-Deep-Dive.md (index, 50 lines)
├── 2024-11-15-Kubernetes-Core-Concepts.md
├── 2024-11-15-Kubernetes-Networking.md
├── 2024-11-15-Kubernetes-Storage.md
└── 2024-11-15-Kubernetes-Best-Practices.md
```

## Configuration

- Minimum lines for suggesting refactor (default: 300)
- Split at H2 or H3 level
- Whether to keep original or convert to index
- Tag inheritance from parent

## Notes

- Preserve all links in content
- Update any incoming links to point to correct child
- Keep original note as index/table of contents
- Child notes inherit parent's project tags
- Add `#status/refactored` to parent
