# CodeReview Workflow

**Purpose:** Review merge requests by examining changes, checking pipeline status, and providing actionable feedback.

**Triggers:** review MR, check merge request, show MR changes, MR status, code review, review pipeline for MR

---

## Steps

1. Identify the merge request by IID or search by title/author
2. Fetch merge request details including description and metadata
3. Check associated pipeline status for the MR's source branch
4. Retrieve the file changes (diff) introduced by the MR
5. If pipeline failed, identify which jobs failed and why
6. Summarize findings: MR state, pipeline health, change scope, and any concerns

---

## Commands Reference

**Get merge request details:**
```bash
bun run Tools/MergeRequests.ts get <project> <mr_iid>
```

**List open merge requests:**
```bash
bun run Tools/MergeRequests.ts list <project> --state=opened
```

**Get MR changes (diff):**
```bash
bun run Tools/MergeRequests.ts changes <project> <mr_iid>
```

**Check pipeline status:**
```bash
bun run Tools/Pipelines.ts list <project> --ref=<source_branch>
```

**Get failed job logs:**
```bash
bun run Tools/Jobs.ts log <project> <job_id>
```

**Approve merge request:**
```bash
bun run Tools/MergeRequests.ts approve <project> <mr_iid>
```

**Add review comment:**
```bash
bun run Tools/MergeRequests.ts comment <project> <mr_iid> "<comment_body>"
```

---

## Examples

**Example 1: Review a specific merge request**
```
User: "Review MR 42 in devops/infrastructure"

Process:
1. Get MR details: bun run Tools/MergeRequests.ts get devops/infrastructure 42
2. Get changes: bun run Tools/MergeRequests.ts changes devops/infrastructure 42
3. Check pipeline: bun run Tools/Pipelines.ts list devops/infrastructure --ref=<source_branch>
4. If pipeline failed, get job logs for failed jobs
5. Return: Summary including MR title, author, target branch, change summary, pipeline status, and any blocking issues
```

**Example 2: Find MRs awaiting review**
```
User: "Show me open MRs in mygroup/backend-api"

Process:
1. List open MRs: bun run Tools/MergeRequests.ts list mygroup/backend-api --state=opened
2. For each MR, note: IID, title, author, pipeline status, age
3. Return: Formatted table of MRs sorted by age (oldest first)
```

**Example 3: Quick pipeline check before merge**
```
User: "Is MR 156 ready to merge?"

Process:
1. Get MR: bun run Tools/MergeRequests.ts get company/web-app 156
2. Check if pipeline passed, no conflicts, approvals met
3. If pipeline running, show current job status
4. Return: "Ready to merge" or list of blocking issues
```

**Example 4: Review MR with approval**
```
User: "Approve MR 23 in platform/core after checking pipeline"

Process:
1. Get MR: bun run Tools/MergeRequests.ts get platform/core 23
2. Verify pipeline passed: bun run Tools/Pipelines.ts list platform/core --ref=<source_branch>
3. If passed: bun run Tools/MergeRequests.ts approve platform/core 23
4. Return: Confirmation of approval with pipeline status summary
```

---

## Error Handling

- MR not found → Verify project path and MR IID; list recent MRs to find correct IID
- Pipeline pending → Report current status and estimated completion if available
- No pipeline → Check if .gitlab-ci.yml exists in the branch; MR may not trigger CI
- Permission denied → User may lack Developer+ role; report which action failed
- Merge conflicts → Flag as blocking and suggest rebasing source branch
- Self-hosted instance timeout → Check VPN/network connectivity first

---

## Notes

- MR IID is the project-scoped number (shown as !42), not the global ID
- Pipeline status for MRs uses the source branch, not the MR itself
- For large diffs (>20 files), summarize by directory/area of change
- When reviewing security-sensitive code (auth, crypto, secrets), flag for human review
- Draft MRs (prefixed with "Draft:" or "WIP:") should be noted as work-in-progress
