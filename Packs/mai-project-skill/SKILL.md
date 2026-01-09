---
name: project
description: Project creation and management using MAI methodology
version: 1.0.0
type: skill
depends_on:
  - mai-project-core >= 1.0.0
author: MAI
license: MIT
---

# Project Skill

User-facing interface for project creation and management.

## Triggers

| Trigger Pattern | Example | Workflow |
|-----------------|---------|----------|
| `new project` | "new project" | CreateProject |
| `init project` | "init project for chicken coop" | CreateProject |
| `create project` | "create project" | CreateProject |
| `project status` | "project status" | ProjectStatus |
| `update project` | "update project goals" | UpdateProject |
| `mai gate` | "mai gate status" | GateManagement |

## Workflow Routing

```yaml
workflows:
  CreateProject:
    file: Workflows/CreateProject.md
    triggers:
      - new project
      - init project *
      - create project *
    default: true

  ProjectStatus:
    file: Workflows/ProjectStatus.md
    triggers:
      - project status
      - show project

  UpdateProject:
    file: Workflows/UpdateProject.md
    triggers:
      - update project *

  GateManagement:
    file: Workflows/GateManagement.md
    triggers:
      - mai gate *
```

## CLI Tools

### mai-init

Interactive project creation wizard:

```bash
mai-init                    # Start interactive wizard
mai-init --existing         # Initialize in existing directory
mai-init --type software    # Pre-select project type
```

### mai-gate

Gate management for projects:

```bash
mai-gate status             # Show all gates and status
mai-gate pass <gate>        # Mark a gate as passed
mai-gate fail <gate>        # Mark a gate as failed
mai-gate current            # Show current gate
```

## Integration

This skill uses `mai-project-core` for:
- Project templates
- Gate definitions
- Task types

And `mai-project-system` for:
- PreCompact hook integration
- Session state persistence
