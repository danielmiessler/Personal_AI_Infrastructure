# ReleaseMgmt Workflow

**Purpose:** Manage releases including triggering deployment pipelines, managing pipeline schedules, and coordinating release processes.

**Triggers:** trigger deploy, run pipeline, schedule pipeline, release to production, deploy to staging, create schedule, manage schedules, run scheduled job, trigger release, promote to production

---

## Steps

1. Identify the release action (trigger pipeline, manage schedule, deploy to environment)
2. Verify target branch and environment
3. Check for required variables or manual approvals
4. Execute the release action
5. Monitor pipeline status and report outcome

---

## Commands Reference

**Trigger new pipeline:**
```bash
bun run Tools/Pipelines.ts create <project> --ref=<branch> [--variables='{"KEY":"value"}']
```

**List pipeline schedules:**
```bash
bun run Tools/Schedules.ts list <project>
```

**Get schedule details:**
```bash
bun run Tools/Schedules.ts get <project> <schedule_id>
```

**Create new schedule:**
```bash
bun run Tools/Schedules.ts create <project> --description="<desc>" --ref=<branch> --cron="<cron_expression>" [--active=true]
```

**Update schedule:**
```bash
bun run Tools/Schedules.ts update <project> <schedule_id> [--cron="<cron>"] [--active=true|false]
```

**Run schedule immediately:**
```bash
bun run Tools/Schedules.ts run <project> <schedule_id>
```

**Delete schedule:**
```bash
bun run Tools/Schedules.ts delete <project> <schedule_id>
```

**Manage schedule variables:**
```bash
bun run Tools/Schedules.ts variables <project> <schedule_id> [--add='{"KEY":"value"}'] [--remove=KEY]
```

**Play manual job (deployment gate):**
```bash
bun run Tools/Jobs.ts play <project> <job_id>
```

**Get/set CI variables:**
```bash
bun run Tools/Variables.ts get <project> <key>
bun run Tools/Variables.ts create <project> <key> <value> [--protected] [--masked]
```

---

## Examples

**Example 1: Deploy to staging**
```
User: "Deploy main branch to staging for platform/webapp"

Process:
1. Trigger pipeline: bun run Tools/Pipelines.ts create platform/webapp --ref=main --variables='{"DEPLOY_ENV":"staging"}'
2. Get pipeline ID from response
3. Monitor: bun run Tools/Pipelines.ts get platform/webapp <pipeline_id>
4. Return: "Triggered pipeline #5678 for staging deployment. View at <pipeline_url>"
```

**Example 2: Production release with approval**
```
User: "Release v2.5.0 to production"

Process:
1. Trigger release pipeline:
   bun run Tools/Pipelines.ts create myorg/app --ref=release/v2.5.0 --variables='{"DEPLOY_ENV":"production"}'
2. List jobs: bun run Tools/Jobs.ts list myorg/app <pipeline_id>
3. Find manual deploy job (status=manual)
4. Return: "Pipeline #7890 running. Production deploy requires manual approval.
   To approve: bun run Tools/Jobs.ts play myorg/app <deploy_job_id>"
```

**Example 3: Create nightly build schedule**
```
User: "Set up a nightly build at 2 AM for develop branch in devops/core"

Process:
1. Create schedule:
   bun run Tools/Schedules.ts create devops/core \
     --description="Nightly build and test" \
     --ref=develop \
     --cron="0 2 * * *" \
     --active=true
2. Add variables if needed:
   bun run Tools/Schedules.ts variables devops/core <schedule_id> --add='{"NIGHTLY":"true"}'
3. Return: "Created schedule 'Nightly build and test' (ID: 45). Runs daily at 2:00 AM UTC on develop."
```

**Example 4: Run scheduled job now**
```
User: "Run the nightly tests for project/backend immediately"

Process:
1. List schedules: bun run Tools/Schedules.ts list project/backend
2. Find nightly schedule by description
3. Trigger: bun run Tools/Schedules.ts run project/backend <schedule_id>
4. Return: "Triggered scheduled pipeline. View at <pipeline_url>"
```

**Example 5: Pause scheduled deployments**
```
User: "Disable all scheduled pipelines in myorg/production during maintenance"

Process:
1. List schedules: bun run Tools/Schedules.ts list myorg/production
2. For each active schedule:
   bun run Tools/Schedules.ts update myorg/production <schedule_id> --active=false
3. Return: "Disabled 3 schedules: 'Nightly deploy', 'Hourly sync', 'Daily backup'. Re-enable after maintenance."
```

**Example 6: Environment promotion pipeline**
```
User: "Promote staging to production for webapp/api"

Process:
1. Get current staging commit: bun run Tools/Branches.ts get webapp/api staging
2. Verify staging pipeline passed: bun run Tools/Pipelines.ts list webapp/api --ref=staging --status=success
3. Trigger production:
   bun run Tools/Pipelines.ts create webapp/api --ref=staging --variables='{"DEPLOY_ENV":"production","PROMOTE":"true"}'
4. Return: "Promoting staging (commit abc1234) to production. Pipeline #9012 started."
```

**Example 7: Update release variables**
```
User: "Update the API_VERSION variable to v3 for production deploys"

Process:
1. Check current: bun run Tools/Variables.ts get myorg/app API_VERSION
2. Update: bun run Tools/Variables.ts update myorg/app API_VERSION v3 --protected
3. Return: "Updated API_VERSION from 'v2' to 'v3' for protected branches."
```

**Example 8: Rollback deployment**
```
User: "Rollback production to the previous release"

Process:
1. List recent successful production pipelines
2. Identify previous good commit/tag
3. Trigger: bun run Tools/Pipelines.ts create myorg/app --ref=<previous_tag> --variables='{"DEPLOY_ENV":"production","ROLLBACK":"true"}'
4. Return: "Rollback initiated to v2.4.9. Pipeline #1234 running."
```

---

## Error Handling

- Pipeline failed to start → Check branch exists and .gitlab-ci.yml is valid
- Variable not found → List available variables; check scope (project vs group)
- Schedule syntax invalid → Validate cron expression; provide corrected syntax
- Manual job not ready → Check if preceding jobs completed; list blocking jobs
- Permission denied → Production actions may require Maintainer role
- Protected variable → Cannot update via API if variable marked protected; use UI

---

## Cron Expression Reference

| Schedule | Cron Expression |
|----------|-----------------|
| Every hour | `0 * * * *` |
| Daily at midnight | `0 0 * * *` |
| Daily at 2 AM | `0 2 * * *` |
| Weekdays at 6 AM | `0 6 * * 1-5` |
| Every Monday at 9 AM | `0 9 * * 1` |
| First of month | `0 0 1 * *` |
| Every 15 minutes | `*/15 * * * *` |

All times are in UTC unless timezone configured on GitLab instance.

---

## Notes

- Pipeline variables override project variables for that run only
- Protected variables only available on protected branches
- Masked variables are hidden in logs (use for secrets)
- Manual jobs require explicit play action; won't auto-run
- Schedule pipelines run as the schedule owner's permissions
- For complex release flows, consider GitLab Release features (tags, assets)
- Self-hosted instances may have deployment freezes configured
- Always verify target environment before production deploys
- Keep rollback procedures documented and tested
