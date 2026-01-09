# Verification Checklist - mai-project-core

## Package Structure

- [x] package.json with correct metadata
- [x] tsconfig.json with strict settings
- [x] README.md with package documentation
- [x] INSTALL.md with installation instructions
- [x] Bun as runtime and test runner

## Types (src/types/)

### task.ts
- [ ] TaskType union defined
- [ ] TaskStatus union defined
- [ ] Task interface with all fields
- [ ] TaskList interface
- [ ] calculateProgress function
- [ ] createTask function
- [ ] updateTaskStatus function
- [ ] isTaskBlocked function
- [ ] getReadyTasks function
- [ ] sortTasksByPriority function

### gate.ts
- [ ] GateStatus type defined
- [ ] Gate interface defined
- [ ] SoftwareGate, PhysicalGate, etc. types
- [ ] GATE_CONFIGS constant
- [ ] createGatesForProject function
- [ ] approveGate function
- [ ] rejectGate function
- [ ] allGatesApproved function
- [ ] getNextPendingGate function
- [ ] getCurrentPhase function

### budget.ts
- [ ] BudgetItemStatus type defined
- [ ] BudgetItem interface
- [ ] PhysicalBudget interface
- [ ] SoftwareBudget interface
- [ ] Budget union type
- [ ] createBudgetItem function
- [ ] calculateSpent function
- [ ] calculateRemaining function
- [ ] isOverBudget function
- [ ] createPhysicalBudget function
- [ ] createSoftwareBudget function

### project.ts
- [ ] ProjectType type defined
- [ ] ProjectPhase type defined
- [ ] ProjectIdentity interface
- [ ] ProjectState interface
- [ ] Type-specific state interfaces
- [ ] createProjectState function
- [ ] updateProjectPhase function
- [ ] serializeProjectState function

## Templates (src/templates/)

- [ ] software.md template
- [ ] physical.md template
- [ ] documentation.md template
- [ ] infrastructure.md template
- [ ] local.md template
- [ ] loadTemplate function
- [ ] renderTemplate function
- [ ] generateClaudeMd function
- [ ] generateLocalMd function

## Tests (tests/)

- [ ] task.test.ts (all task functions)
- [ ] gate.test.ts (all gate functions)
- [ ] budget.test.ts (all budget functions)
- [ ] All tests passing

## Verification Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Expected output:
# All tests passing
# tsc --noEmit (no errors)
```

## Date Verified

_Not yet verified_

## Notes

- Templates use {{PLACEHOLDER}} syntax for variable substitution
- All dates are ISO 8601 format
- Task IDs are generated with timestamp + random suffix
