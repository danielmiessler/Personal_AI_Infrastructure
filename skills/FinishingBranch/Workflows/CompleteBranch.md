# CompleteBranch Workflow

> **Trigger:** Implementation complete, all tests pass
> **Input:** Completed work on branch
> **Output:** Work integrated via chosen option

## Step 1: Verify All Tests Pass

Run full test suite:
```bash
bun test
```

**If tests fail:** Use **SystematicDebugging** skill, then return here.

## Step 2: Gather Context

Collect information:
```bash
# Current branch
git branch --show-current

# Commits since branching
git log origin/main..HEAD --oneline

# Changes summary
git diff origin/main --stat
```

## Step 3: Present 4 Options

Present to user:

```
Work complete. Choose how to proceed:

1. **Merge to main** - Merge directly (for small, reviewed changes)
2. **Create PR** - Open pull request for review
3. **Keep branch** - Leave as-is for later
4. **Discard** - Delete branch and changes

Which option?
```

## Step 4: Execute Choice

### Option 1: Merge to Main

```bash
git checkout main
git pull origin main
git merge <branch> --no-ff
git push origin main
git branch -d <branch>
```

### Option 2: Create PR

1. Push branch: `git push -u origin <branch>`
2. Create PR via `gh pr create`
3. Include summary of changes
4. Enable auto-merge with squash: `gh pr merge --squash --auto`
5. **Optional:** Use **RequestingCodeReview** for reviewer assignment

### Option 3: Keep Branch

- Confirm branch name
- Note any follow-up needed
- Exit workflow

### Option 4: Discard

```bash
git checkout main
git branch -D <branch>
```

Confirm before executing.

## Completion

After executing choice:
- Confirm action completed
- Provide summary
- Note any follow-up items

## Skills Invoked

| Situation | Skill |
|-----------|-------|
| Tests fail at Step 1 | SystematicDebugging |
| Option 2 (Create PR) | RequestingCodeReview (optional) |
