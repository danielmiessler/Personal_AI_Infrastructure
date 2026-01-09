---
name: specdev
description: Spec-first development workflows
version: 1.0.0
type: skill
depends_on:
  - mai-specdev-core >= 1.0.0
  - mai-project-core >= 1.0.0
author: MAI
license: MIT
---

# Spec-First Development Skill

User-facing interface for spec-driven software development. Guides users through specification creation, design breakdown, quality checks, and security reviews.

## Triggers

| Trigger Pattern | Example | Workflow |
|-----------------|---------|----------|
| `new spec` | "new spec" | CreateSpec |
| `create spec` | "create spec for auth system" | CreateSpec |
| `spec for *` | "spec for payment processing" | CreateSpec |
| `design breakdown` | "design breakdown" | CreateDesign |
| `create design` | "create design from spec" | CreateDesign |
| `quality check` | "quality check" | QualityCheck |
| `security review` | "security review for build phase" | SecurityReview |

## Workflow Routing

```yaml
workflows:
  CreateSpec:
    file: Workflows/CreateSpec.md
    triggers:
      - new spec
      - create spec *
      - spec for *
    default: true

  CreateDesign:
    file: Workflows/CreateDesign.md
    triggers:
      - design breakdown
      - create design *
      - design for *

  QualityCheck:
    file: Workflows/QualityCheck.md
    triggers:
      - quality check
      - run quality gates
      - check quality

  SecurityReview:
    file: Workflows/SecurityReview.md
    triggers:
      - security review *
      - security check *
```

## CLI Tools

### mai-spec

Interactive spec creation:

```bash
mai-spec                     # Start interactive wizard
mai-spec --title "Auth"      # Pre-fill title
mai-spec --from-claude       # Extract from CLAUDE.md
```

### mai-design

Design document creation:

```bash
mai-design                   # Start interactive wizard
mai-design --spec SPEC.md    # Link to existing spec
```

### mai-quality

Quality gate runner:

```bash
mai-quality                  # Run all gates
mai-quality --gate lint      # Run specific gate
mai-quality --report         # Generate report
```

## Integration

This skill uses:
- `mai-specdev-core` for document types and templates
- `mai-project-core` for project state

## Consolidated From

This skill consolidates capabilities from:
- PackDev (pack development workflow)
- TestArchitect (test-first methodology)
- Development (guardrails, quality gates)
- Security (security at every phase)
