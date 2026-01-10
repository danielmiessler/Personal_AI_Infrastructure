---
name: FinishingBranch
description: Complete development work with structured options. USE WHEN implementation is complete OR all tests pass OR ready to merge OR ready to create PR OR need to decide how to integrate work.
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the FinishingBranch skill to complete this work."

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CompleteBranch** | Work done, tests pass | Present integration options |

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
bun test
```

**If tests fail:**
```
Tests failing (N failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

STOP. Don't proceed to Step 2. Use **SystematicDebugging** skill.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. All tests pass.

What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
bun test

# If tests pass, delete feature branch
git branch -d <feature-branch>
```

Report: "Merged to <base-branch>. Feature branch deleted."

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR with auto-merge enabled (squash)
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <bullet points of changes>

## Test Plan
- [ ] <verification steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Enable auto-merge with squash
gh pr merge --squash --auto
```

Report: "PR created: <URL> (auto-merge enabled)"

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. You can return to it later."

**Don't cleanup.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch: <name>
- Commits: <list>

Type 'discard' to confirm.
```

Wait for exact confirmation "discard".

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Report: "Branch <name> deleted."

## Quick Reference

| Option | Merge | Push | Keep Branch |
|--------|-------|------|-------------|
| 1. Merge locally | ✓ | - | Delete |
| 2. Create PR | - | ✓ | Keep |
| 3. Keep as-is | - | - | Keep |
| 4. Discard | - | - | Force delete |

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without typed confirmation
- Force-push without explicit request
- Skip the 4-option presentation

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed "discard" confirmation for Option 4
- Report outcome clearly

## Examples

**Example 1: Happy path to PR**
```
-> Verify: "bun test" - 47/47 pass
-> Present 4 options
-> User: "2"
-> Push, create PR
-> Report: "PR created: https://github.com/..."
```

**Example 2: Tests fail**
```
-> Verify: "bun test" - 3 failures
-> Report failures
-> STOP - don't present options
-> Use SystematicDebugging to fix
-> Return to Step 1
```

**Example 3: Discard**
```
-> Present 4 options
-> User: "4"
-> Show confirmation with commit list
-> User: "discard"
-> Delete branch
-> Report: "Branch deleted"
```

## Related Skills

- **ExecutingPlans** - Calls this after all tasks complete
- **SystematicDebugging** - When tests fail at Step 1
- **VerificationBeforeCompletion** - Embedded in Step 1
- **RequestingCodeReview** - Alternative to Option 2
