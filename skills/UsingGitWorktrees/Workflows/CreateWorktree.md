# CreateWorktree Workflow

> **Trigger:** Starting feature work that needs isolation
> **Input:** Feature name or branch requirement
> **Output:** Isolated worktree with passing baseline tests

## Checklist

- [ ] Announce: "I'm using the UsingGitWorktrees skill to set up an isolated workspace."
- [ ] Check for existing worktree directories (.worktrees, worktrees)
- [ ] Check CLAUDE.md for preferences if no directory found
- [ ] Ask user for directory choice if ambiguous
- [ ] Verify directory is gitignored (for project-local)
- [ ] Create worktree with new branch
- [ ] Run project setup (bun install, npm install, etc.)
- [ ] Run tests to verify clean baseline
- [ ] Report worktree location and test status

## Process

### 1. Directory Selection
Follow priority: existing > CLAUDE.md > ask user

### 2. Safety Verification
For project-local directories, verify gitignored before creating.

### 3. Setup and Verify
Auto-detect project type, install dependencies, run tests.

### 4. Report Ready
```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Completion

Worktree creation is complete when:
1. Worktree directory exists and is clean
2. Dependencies installed
3. Baseline tests pass
4. Location reported to user

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Worktree ready | ExecutingPlans OR SubagentDrivenDevelopment |
| Work complete | FinishingBranch |
