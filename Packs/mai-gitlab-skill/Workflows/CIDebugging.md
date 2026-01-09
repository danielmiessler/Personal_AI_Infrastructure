# CIDebugging Workflow

**Purpose:** Diagnose CI/CD pipeline failures by identifying failed jobs, retrieving logs, and pinpointing root causes.

**Triggers:** pipeline failed, CI broken, build failed, why did the build fail, debug pipeline, job failed, get CI logs, test failures, deployment failed, pipeline stuck

---

## Steps

1. Identify the failed pipeline (by ID, branch, or most recent)
2. Get pipeline overview to see all job statuses
3. Identify which jobs failed and in which stage
4. Retrieve logs from failed jobs
5. Analyze logs for error patterns (test failures, dependency issues, timeouts)
6. Provide actionable diagnosis with specific line numbers and fix suggestions
7. If needed, offer to retry failed jobs

---

## Commands Reference

**List pipelines for a branch:**
```bash
bun run Tools/Pipelines.ts list <project> [--ref=<branch>] [--status=failed]
```

**Get pipeline details:**
```bash
bun run Tools/Pipelines.ts get <project> <pipeline_id>
```

**List jobs in a pipeline:**
```bash
bun run Tools/Jobs.ts list <project> <pipeline_id>
```

**Get specific job details:**
```bash
bun run Tools/Jobs.ts get <project> <job_id>
```

**Get job log output:**
```bash
bun run Tools/Jobs.ts log <project> <job_id>
```

**Retry a failed job:**
```bash
bun run Tools/Jobs.ts retry <project> <job_id>
```

**Retry entire pipeline:**
```bash
bun run Tools/Pipelines.ts retry <project> <pipeline_id>
```

**Cancel stuck pipeline:**
```bash
bun run Tools/Pipelines.ts cancel <project> <pipeline_id>
```

**Download job artifacts:**
```bash
bun run Tools/Jobs.ts artifacts <project> <job_id>
```

---

## Examples

**Example 1: Debug failing main branch**
```
User: "Why is the main branch failing in devops/platform?"

Process:
1. Get latest pipeline: bun run Tools/Pipelines.ts list devops/platform --ref=main --status=failed
2. List jobs: bun run Tools/Jobs.ts list devops/platform <pipeline_id>
3. Identify failed jobs (status=failed)
4. Get logs: bun run Tools/Jobs.ts log devops/platform <failed_job_id>
5. Parse logs for:
   - Exit code
   - Error messages (grep for "error:", "failed", "FATAL")
   - Test failure summary
   - Missing dependencies
6. Return:
   "Pipeline #4521 failed at 'test' stage
    Failed job: unit-tests (job #89234)
    Root cause: 3 test failures in auth_spec.rb
    - test_login_redirect: Expected 302, got 401
    - test_session_timeout: Timeout after 30s
    - test_oauth_callback: Missing mock for OAuth provider

    Suggestion: Check recent changes to auth controller"
```

**Example 2: Deployment failure investigation**
```
User: "Deployment to staging failed for myapp - what happened?"

Process:
1. Find deployment pipeline: bun run Tools/Pipelines.ts list mygroup/myapp --ref=staging
2. Get jobs: bun run Tools/Jobs.ts list mygroup/myapp <pipeline_id>
3. Find deploy job, get logs
4. Common deployment failures to check:
   - Kubernetes connection issues
   - Image pull failures
   - Health check timeouts
   - Secret/config missing
5. Return: Specific failure reason with remediation steps
```

**Example 3: Flaky test detection**
```
User: "Pipeline keeps failing intermittently on feature/user-auth"

Process:
1. List recent pipelines: bun run Tools/Pipelines.ts list org/project --ref=feature/user-auth
2. Compare passed vs failed runs
3. Get logs from multiple failed runs
4. Identify patterns:
   - Same test failing each time = real failure
   - Different tests failing = flaky test suite
   - Timeout variations = resource contention
5. Return: Analysis of failure pattern with specific flaky tests identified
```

**Example 4: Retry after transient failure**
```
User: "Retry the failed deploy job in pipeline 5678"

Process:
1. Verify pipeline: bun run Tools/Pipelines.ts get company/app 5678
2. Find failed deploy job: bun run Tools/Jobs.ts list company/app 5678
3. Retry job: bun run Tools/Jobs.ts retry company/app <job_id>
4. Return: "Retrying job 'deploy-staging' (ID: 12345). Check status in ~2 minutes."
```

**Example 5: Stuck pipeline cleanup**
```
User: "Pipeline has been running for 2 hours, something is wrong"

Process:
1. Get pipeline: bun run Tools/Pipelines.ts get myorg/service <pipeline_id>
2. List jobs: bun run Tools/Jobs.ts list myorg/service <pipeline_id>
3. Find stuck job (status=running, long duration)
4. Get job log to see where it's stuck
5. Options:
   - If waiting for manual action: bun run Tools/Jobs.ts play myorg/service <job_id>
   - If genuinely stuck: bun run Tools/Pipelines.ts cancel myorg/service <pipeline_id>
6. Return: Diagnosis and action taken
```

**Example 6: Artifact-based debugging**
```
User: "Tests failed but I need the coverage report"

Process:
1. Find failed pipeline and test job
2. Check if artifacts exist: bun run Tools/Jobs.ts get project/repo <job_id>
3. Download artifacts: bun run Tools/Jobs.ts artifacts project/repo <job_id>
4. Return: Path to downloaded artifacts for review
```

---

## Error Handling

- No failed pipelines found → Check branch name; list all recent pipelines regardless of status
- Job log too large → Focus on last 500 lines; search for "error", "failed", "exception"
- Pipeline canceled → Differentiate between user-canceled and timeout-canceled
- Runner unavailable → Check runner tags in job config; may need different runner
- Permission denied → Some logs may require Maintainer role
- Artifacts expired → Note retention policy; artifacts may auto-delete after N days

---

## Common Failure Patterns

| Pattern | Symptoms | Likely Cause |
|---------|----------|--------------|
| Exit code 1 | Generic failure | Check last command in log |
| Exit code 137 | OOM killed | Job needs more memory |
| Exit code 143 | SIGTERM | Job timeout or canceled |
| "connection refused" | Network error | Service not ready, check depends_on |
| "image not found" | Docker pull fail | Wrong image name or registry auth |
| "permission denied" | File access | Script permissions or volume mounts |
| "no space left" | Disk full | Clean artifacts, increase runner disk |

---

## Notes

- Job logs are streamed; may need to wait for job completion for full output
- Artifacts contain test reports, coverage, and build outputs - often more useful than logs
- Pipeline variables can affect behavior; check Variables.ts if env-related
- For scheduled pipeline failures, also check Schedules.ts for timing issues
- Self-hosted runners may have different capabilities than gitlab.com shared runners
- When in doubt, compare a successful pipeline to the failed one for differences
