# ViewLogs Workflow

**Purpose:** View job logs for debugging failures or monitoring build progress.

**Triggers:** "show build logs", "why did it fail", "job output", "what went wrong", "debug the build", "show error logs", "view logs for"

---

## Steps

1. **Identify which logs to fetch**
   - If run ID provided, get run details to find jobs
   - If "last build" or "recent failure", find the run first

2. **Get run details with jobs**
   ```bash
   bun run Tools/run.ts <repo> <run-id> --jobs
   ```

3. **Identify the relevant job**
   - For failures: find job with conclusion "failure"
   - For specific job: match by name
   - If multiple failed jobs: show list and ask which to view

4. **Fetch job logs**
   ```bash
   bun run Tools/logs.ts <repo> <job-id> [--tail <lines>]
   ```

5. **Present logs with context**
   - Highlight error messages
   - Show relevant section around failures
   - Suggest fixes if error is recognizable

---

## Examples

**Example 1: Why did the build fail? (Multi-step)**
```
User: "Why did the last build fail?"

Process:
1. Find recent failed run:
   bun run Tools/runs.ts owner/repo --limit 10
   (Look for first run with failure conclusion)

2. Get run details with jobs:
   bun run Tools/run.ts owner/repo abc12345 --jobs

   Output:
   Run: abc12345
   ------------------------------------------------------------
   Pipeline:    CI
   Status:      completed (failure)
   Branch:      feature/auth

   Jobs:
   ------------------------------------------------------------
   ID        Status       Duration    Name
   ------------------------------------------------------------
   job123    success      45s         build
   job456    failure      1m 2s       test
   job789    skipped      -           deploy

3. Fetch failed job logs:
   bun run Tools/logs.ts owner/repo job456 --tail 100

4. Return: Logs with error highlighted, e.g.:
   "Test failed in auth.test.ts:45 - Expected 200, got 401"
```

**Example 2: View specific job logs**
```
User: "Show me the logs for the build job"

Process:
1. Get latest run: bun run Tools/runs.ts owner/repo --limit 1
2. Get jobs: bun run Tools/run.ts owner/repo <run-id> --jobs
3. Find job named "build"
4. Fetch logs: bun run Tools/logs.ts owner/repo <build-job-id>
5. Return: Full build logs
```

**Example 3: Tail recent logs**
```
User: "Show last 50 lines of the test logs"

Process:
1. Find relevant run and job
2. Fetch with tail: bun run Tools/logs.ts owner/repo <job-id> --tail 50
3. Return: Last 50 lines of logs
```

**Example 4: Debug specific run**
```
User: "What happened in run abc12345?"

Process:
1. Get run details: bun run Tools/run.ts owner/repo abc12345 --jobs
2. If failed: identify failed job(s)
3. Fetch logs for failed job(s)
4. Return: Summary of run with relevant log excerpts
```

**Example 5: Multiple failed jobs**
```
User: "The build failed, show me what went wrong"

Process:
1. Find failed run
2. Get jobs: bun run Tools/run.ts owner/repo <run-id> --jobs
3. Find multiple failed jobs (e.g., "lint" and "test")
4. Present options: "Two jobs failed: 'lint' and 'test'. Which logs do you want to see?"
   OR fetch both if reasonable size
5. Return: Logs with clear separation between jobs
```

---

## Error Handling

- **Run not found** -> Verify run ID, suggest listing recent runs
- **Job not found** -> List available jobs in the run
- **Logs not available** -> Job may still be running or logs expired
- **Logs too large** -> Use --tail to limit output, or suggest downloading
- **No failed runs** -> Report "No recent failures found" with last successful run info

---

## Notes

- Job IDs are different from run IDs; a run contains multiple jobs
- Use `--jobs` flag with run.ts to see all jobs in a run
- Logs may be unavailable for very old runs (retention policies vary)
- For currently running jobs, logs stream incrementally
- Common failure patterns to recognize:
  - Test failures: "FAIL", "AssertionError", "Expected X got Y"
  - Build failures: "error:", "Error:", compilation errors
  - Timeout: "exceeded", "timeout", "killed"
  - OOM: "out of memory", "ENOMEM"
  - Permission: "permission denied", "EACCES", "403"
