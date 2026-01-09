# mai-project-core

Core interfaces and utilities for the PAI Project Management methodology.

## Overview

This package provides the foundation for managing projects of any type in the PAI ecosystem:

- **Task Management** - Universal work units with status tracking
- **Gate System** - Configurable checkpoints for quality control
- **Budget Tracking** - Cost tracking for physical and software projects
- **Templates** - CLAUDE.md templates for different project types

## Installation

```bash
bun add mai-project-core
```

Or link locally:

```bash
bun add file:../../packages/mai-project-core
```

## Usage

### Create a Project

```typescript
import { createProjectState, ProjectType } from 'mai-project-core';

const project = createProjectState(
  'My New Feature',
  'software',
  'Joey',
  'A new feature for the application'
);
```

### Manage Tasks

```typescript
import { createTask, updateTaskStatus, calculateProgress } from 'mai-project-core';

const task = createTask({
  title: 'Implement login form',
  type: 'implementation',
  successCriteria: 'User can log in with email and password',
});

const updated = updateTaskStatus(task, 'in_progress');
const progress = calculateProgress([task, updated]);
```

### Work with Gates

```typescript
import { createGatesForProject, approveGate, getNextPendingGate } from 'mai-project-core';

const gates = createGatesForProject('software');
const nextGate = getNextPendingGate(gates);

if (nextGate) {
  const approved = approveGate(nextGate, 'Joey', 'Looks good!');
}
```

### Generate CLAUDE.md

```typescript
import { generateClaudeMd, createProjectState } from 'mai-project-core';

const state = createProjectState('My Project', 'software', 'Joey');
const claudeMd = generateClaudeMd(state);
```

## Exports

### Types

- `Task`, `TaskType`, `TaskStatus`, `TaskList`
- `Gate`, `GateStatus`, `SoftwareGate`, `PhysicalGate`, etc.
- `Budget`, `PhysicalBudget`, `SoftwareBudget`, `BudgetItem`
- `ProjectState`, `ProjectType`, `ProjectPhase`, `ProjectIdentity`

### Functions

#### Task Functions
- `createTask()` - Create a new task
- `updateTaskStatus()` - Update task status
- `calculateProgress()` - Calculate completion percentage
- `isTaskBlocked()` - Check if task is blocked
- `getReadyTasks()` - Get tasks ready to work on

#### Gate Functions
- `createGatesForProject()` - Create gates for project type
- `approveGate()` - Approve a gate
- `rejectGate()` - Reject a gate
- `allGatesApproved()` - Check if all gates passed
- `getNextPendingGate()` - Get next pending gate
- `getCurrentPhase()` - Get current project phase

#### Budget Functions
- `createPhysicalBudget()` - Create physical budget
- `createSoftwareBudget()` - Create software budget
- `calculateSpent()` - Calculate total spent
- `calculateRemaining()` - Calculate remaining budget
- `isOverBudget()` - Check if over budget

#### Template Functions
- `loadTemplate()` - Load a template file
- `renderTemplate()` - Render template with variables
- `generateClaudeMd()` - Generate CLAUDE.md content
- `generateLocalMd()` - Generate CLAUDE.local.md content

## Project Types

| Type | Gates | Use Case |
|------|-------|----------|
| software | SPEC_APPROVED, DESIGN_APPROVED, TESTS_EXIST, TESTS_PASSING, SECURITY_REVIEW, QUALITY_CHECK | Code projects |
| physical | DESIGN_APPROVED, BUDGET_APPROVED, SAFETY_REVIEW, PERMIT_CHECK | Building/crafting |
| documentation | OUTLINE_APPROVED, DRAFT_REVIEW, FINAL_REVIEW | Docs, guides |
| infrastructure | DESIGN_APPROVED, SECURITY_REVIEW, ROLLBACK_PLAN | DevOps, IaC |

## Related Packages

- `mai-project-system` - Hooks and parsers
- `mai-project-skill` - User-facing workflows
