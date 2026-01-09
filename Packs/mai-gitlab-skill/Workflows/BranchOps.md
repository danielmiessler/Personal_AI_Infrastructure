# BranchOps Workflow

**Purpose:** Manage Git branches including creation, comparison, protection rules, and cleanup.

**Triggers:** create branch, delete branch, compare branches, protect branch, branch rules, list branches, branch diff, unprotect branch, merge base, branch behind

---

## Steps

1. Identify the branch operation (create, delete, protect, compare)
2. Verify project path and branch names
3. For protected branches: confirm protection level settings
4. Execute branch operation
5. Verify the change was applied correctly

---

## Commands Reference

**List all branches:**
```bash
bun run Tools/Branches.ts list <project>
```

**Get branch details:**
```bash
bun run Tools/Branches.ts get <project> <branch_name>
```

**Create new branch:**
```bash
bun run Tools/Branches.ts create <project> <branch_name> --ref=<source_branch_or_commit>
```

**Delete branch:**
```bash
bun run Tools/Branches.ts delete <project> <branch_name>
```

**Protect branch:**
```bash
bun run Tools/Branches.ts protect <project> <branch_name> [--push_access=maintainers|developers|no_one] [--merge_access=maintainers|developers]
```

**Compare branches:**
```bash
bun run Tools/Branches.ts compare <project> <from_branch> <to_branch>
```

---

## Examples

**Example 1: Create feature branch**
```
User: "Create a branch called feature/user-dashboard from main in webapp/frontend"

Process:
1. Verify main exists: bun run Tools/Branches.ts get webapp/frontend main
2. Create branch: bun run Tools/Branches.ts create webapp/frontend feature/user-dashboard --ref=main
3. Return: "Created branch 'feature/user-dashboard' from 'main' at commit abc1234"
```

**Example 2: Compare branches for release**
```
User: "What's the diff between develop and main in platform/api?"

Process:
1. Compare branches: bun run Tools/Branches.ts compare platform/api main develop
2. Parse response for:
   - Number of commits ahead/behind
   - Files changed summary
   - Merge base commit
3. Return:
   "develop is 12 commits ahead of main
    23 files changed (+1,245 / -387 lines)
    Key changes:
    - src/auth/: 8 files (new OAuth provider)
    - src/api/: 11 files (rate limiting)
    - tests/: 4 files
    No conflicts detected"
```

**Example 3: Protect production branch**
```
User: "Protect the main branch - only maintainers can push, developers can merge"

Process:
1. Apply protection:
   bun run Tools/Branches.ts protect myorg/backend main \
     --push_access=maintainers \
     --merge_access=developers
2. Verify: bun run Tools/Branches.ts get myorg/backend main
3. Return: "Protected 'main': push restricted to Maintainers, merge allowed for Developers+"
```

**Example 4: Cleanup stale branches**
```
User: "List branches that haven't been updated in 30 days in devteam/service"

Process:
1. List all branches: bun run Tools/Branches.ts list devteam/service
2. Filter locally for branches where last_commit.date > 30 days ago
3. Exclude protected branches from cleanup candidates
4. Return: List of stale branches with last commit date and author
```

**Example 5: Delete merged feature branch**
```
User: "Delete feature/auth-refactor from myapp/backend"

Process:
1. Check if branch exists: bun run Tools/Branches.ts get myapp/backend feature/auth-refactor
2. Verify not protected (refuse if protected)
3. Optionally verify merged into main via compare
4. Delete: bun run Tools/Branches.ts delete myapp/backend feature/auth-refactor
5. Return: "Deleted branch 'feature/auth-refactor'"
```

**Example 6: Check branch freshness**
```
User: "Is feature/new-ui up to date with main?"

Process:
1. Compare: bun run Tools/Branches.ts compare company/app main feature/new-ui
2. Check commits behind main
3. Return:
   "feature/new-ui is 3 commits behind main
    Missing commits:
    - abc123: Fix login redirect (2 days ago)
    - def456: Update dependencies (3 days ago)
    - ghi789: Security patch (5 days ago)

    Recommend: Rebase or merge main into feature/new-ui"
```

**Example 7: Create release branch**
```
User: "Create release/v2.5.0 from develop in platform/core"

Process:
1. Get develop head: bun run Tools/Branches.ts get platform/core develop
2. Create release: bun run Tools/Branches.ts create platform/core release/v2.5.0 --ref=develop
3. Protect release branch: bun run Tools/Branches.ts protect platform/core release/v2.5.0 --push_access=maintainers --merge_access=maintainers
4. Return: "Created protected release branch 'release/v2.5.0' at commit abc1234"
```

---

## Error Handling

- Branch already exists → Report current branch state; offer to update reference
- Branch not found → Check spelling; list similar branch names
- Cannot delete protected branch → Must unprotect first; confirm with user
- Permission denied → User may lack Developer+ role for branch operations
- Invalid ref → Source branch/commit doesn't exist; verify reference
- Branch has open MRs → Warn before deletion; list associated MRs

---

## Branch Naming Conventions

Common patterns to recognize and validate:

| Pattern | Purpose | Example |
|---------|---------|---------|
| `feature/*` | New functionality | feature/user-auth |
| `bugfix/*` | Bug fixes | bugfix/login-redirect |
| `hotfix/*` | Production fixes | hotfix/security-patch |
| `release/*` | Release preparation | release/v2.5.0 |
| `develop` | Integration branch | develop |
| `main`/`master` | Production code | main |

---

## Notes

- Branch names are case-sensitive
- Use URL-safe characters in branch names (avoid spaces, special chars)
- Protected branch patterns can use wildcards (e.g., `release/*`)
- Compare shows from→to direction; swap for reverse diff
- Deleting a branch does not delete associated MRs (they become orphaned)
- For fork workflows, specify fork project path separately
- Some organizations require linear history; check before merge vs rebase recommendations
