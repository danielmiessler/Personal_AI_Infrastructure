# ListRuns Workflow

**Purpose:** List recent pipeline runs with optional status, branch, and limit filtering.

**Triggers:** "recent builds", "pipeline status", "what's running", "show runs", "build history", "latest builds", "what failed recently"

---

## Steps

1. **Determine repository context**
   - Extract repo from user request (e.g., "owner/repo")
   - If not specified, infer from current working directory or ask user

2. **Parse filter criteria from request**
   - Status filter: pending, queued, running, completed
   - Branch filter: specific branch name
   - Limit: number of results (default 20)

3. **Run the runs command**
   ```bash
   bun run Tools/runs.ts <repo> [--status <status>] [--branch <branch>] [--limit <num>]
   ```

4. **Format and present results**
   - Table format shows: ID, Status, Branch, Duration, Pipeline
   - Highlight any failures or currently running builds
   - Include run URLs if available for quick access

---

## Examples

**Example 1: Check recent builds**
```
User: "What's the status of recent builds?"

Process:
1. Determine repo from context
2. Run: bun run Tools/runs.ts owner/repo --limit 10
3. Return: Formatted table of recent runs with status indicators

Output:
ID        Status       Branch       Duration    Pipeline
----------------------------------------------------------------------------------
a1b2c3d4  success      main         2m 34s      CI
e5f6g7h8  failed       feature/x    1m 12s      CI
i9j0k1l2  running      develop      45s         CI
```

**Example 2: Show failed builds only**
```
User: "Show me what's failed recently"

Process:
1. Parse intent: user wants failed runs
2. Note: --status completed filters completion state, not conclusion
3. Run: bun run Tools/runs.ts owner/repo --limit 20
4. Filter results to show only runs with conclusion "failure"
5. Return: Formatted list of failed runs

Note: The API returns conclusion (success/failure) within completed runs.
Use the full list and filter client-side for specific conclusions.
```

**Example 3: Branch-specific builds**
```
User: "What's running on develop?"

Process:
1. Parse branch: "develop"
2. Run: bun run Tools/runs.ts owner/repo --branch develop
3. Return: Runs filtered to develop branch
```

**Example 4: Currently running builds**
```
User: "Is anything building right now?"

Process:
1. Parse intent: currently active builds
2. Run: bun run Tools/runs.ts owner/repo --status running
3. Return: List of in-progress runs, or "No builds currently running"
```

**Example 5: JSON format for processing**
```
User: "Get runs as JSON"

Process:
1. Run: bun run Tools/runs.ts owner/repo --format json
2. Return: Raw JSON array of run objects
```

---

## Error Handling

- **No repo specified** -> Ask user for repository (format: owner/repo)
- **Invalid status value** -> Explain valid values: pending, queued, running, completed
- **Authentication failure** -> Check GITHUB_TOKEN or GITLAB_TOKEN is set
- **Rate limit exceeded** -> Report rate limit, suggest waiting or using cached results
- **Repository not found** -> Verify repo name and access permissions

---

## Notes

- The `--status completed` filter returns all completed runs (both success and failure)
- To filter by conclusion (success/failure/cancelled), retrieve completed runs and filter client-side
- Run IDs are truncated to 8 characters in table output; use `--format json` for full IDs
- Duration shows "-" for runs that haven't started or are still in queue
