# TriggerPipeline Workflow

**Purpose:** Trigger a pipeline run with optional branch selection and input parameters.

**Triggers:** "run tests", "deploy to staging", "trigger build", "start pipeline", "kick off deployment", "run the CI", "deploy to production"

---

## Steps

1. **Identify the pipeline to trigger**
   - If user specifies pipeline name/ID, use it directly
   - If ambiguous, list available pipelines first:
   ```bash
   bun run Tools/pipelines.ts <repo>
   ```

2. **Determine branch (optional)**
   - Extract branch from request or use default (main/master)
   - For deployments, confirm branch if not specified

3. **Parse input parameters (optional)**
   - Extract KEY=VALUE pairs from request
   - Common inputs: DEPLOY_ENV, VERSION, DRY_RUN

4. **Trigger the pipeline**
   ```bash
   bun run Tools/trigger.ts <repo> <pipeline-id> [--branch <name>] [--input KEY=VALUE]...
   ```

5. **Confirm trigger and provide run details**
   - Report run ID, status, and URL
   - Offer to watch the run status

---

## Examples

**Example 1: Simple CI trigger**
```
User: "Run the CI"

Process:
1. List pipelines: bun run Tools/pipelines.ts owner/repo
2. Find CI pipeline (e.g., "ci.yml" or "CI")
3. Trigger: bun run Tools/trigger.ts owner/repo ci.yml
4. Return: Run ID and link to monitor

Output:
Pipeline triggered successfully!
--------------------------------------------------
Run ID:      abc12345
Pipeline:    CI
Status:      queued
Branch:      main
URL:         https://github.com/owner/repo/actions/runs/abc12345
```

**Example 2: Deploy to specific environment**
```
User: "Deploy to staging"

Process:
1. List pipelines to find deployment workflow
2. Identify staging deployment pipeline
3. Trigger: bun run Tools/trigger.ts owner/repo deploy.yml --input DEPLOY_ENV=staging
4. Return: Deployment run details

Note: If multiple environments exist, confirm staging before triggering.
```

**Example 3: Deploy specific branch**
```
User: "Deploy the feature/new-auth branch to staging"

Process:
1. Parse branch: "feature/new-auth"
2. Parse environment: "staging"
3. Trigger: bun run Tools/trigger.ts owner/repo deploy.yml --branch feature/new-auth --input DEPLOY_ENV=staging
4. Return: Run details with branch confirmation
```

**Example 4: Multiple inputs**
```
User: "Run deployment with VERSION=2.1.0 and DRY_RUN=true"

Process:
1. Parse inputs: VERSION=2.1.0, DRY_RUN=true
2. Trigger: bun run Tools/trigger.ts owner/repo deploy.yml --input VERSION=2.1.0 --input DRY_RUN=true
3. Return: Run details confirming inputs
```

**Example 5: Production deployment (with confirmation)**
```
User: "Deploy to production"

Process:
1. IMPORTANT: Production deployments require extra care
2. Confirm with user: "You're about to deploy to production. Current main branch commit is [hash]. Proceed?"
3. If confirmed: bun run Tools/trigger.ts owner/repo deploy.yml --input DEPLOY_ENV=production
4. Return: Run details with prominent warning about production deployment
```

---

## Error Handling

- **Pipeline not found** -> List available pipelines and ask user to select
- **Branch doesn't exist** -> Verify branch name, list recent branches as suggestions
- **Missing required inputs** -> Check pipeline definition for required inputs, prompt user
- **Insufficient permissions** -> Report permission error, suggest checking repo access
- **Workflow disabled** -> Report that workflow is disabled, suggest enabling it

---

## Notes

- For production deployments, always confirm with user before triggering
- The `--input` flag can be repeated multiple times for multiple inputs
- Pipeline ID is typically the workflow filename (e.g., "ci.yml", "deploy.yml") for GitHub Actions
- For GitLab CI, pipeline ID is the pipeline name or ID from the .gitlab-ci.yml
- Some pipelines may only be triggerable from specific branches (check workflow permissions)
- If the user asks to "rerun" a build, use the original run's branch and inputs
