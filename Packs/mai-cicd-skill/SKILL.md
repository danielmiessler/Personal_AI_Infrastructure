---
name: CICD
description: CI/CD pipeline management across GitHub Actions, GitLab CI. USE WHEN pipelines, builds, deployments, workflows, runs, jobs, artifacts.
---

# CI/CD Skill

Unified CI/CD management across multiple providers. Works with GitHub Actions, GitLab CI, or other CI/CD platforms via adapters.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| ListRuns | "recent builds", "pipeline status", "what's running" | Run list |
| TriggerPipeline | "run tests", "deploy to staging", "trigger build" | Triggered run |
| ViewLogs | "show build logs", "why did it fail", "job output" | Job logs |
| PipelineOverview | "all pipelines", "available workflows" | Pipeline list |
| DownloadArtifacts | "get build artifact", "download output" | Artifact data |

## CLI Tools

```bash
# List pipelines
bun run Tools/pipelines.ts <repo> [--format table|json]

# List recent runs
bun run Tools/runs.ts <repo> [--status pending|running|completed]
                              [--branch <name>] [--limit <num>]
                              [--format table|json]

# Get run details
bun run Tools/run.ts <repo> <run-id> [--format table|json]

# Trigger a pipeline
bun run Tools/trigger.ts <repo> <pipeline-id> [--branch <name>]
                                               [--input KEY=VALUE]...

# Get job logs
bun run Tools/logs.ts <repo> <job-id>

# List artifacts
bun run Tools/artifacts.ts <repo> <run-id> [--format table|json]

# Download artifact
bun run Tools/artifacts.ts <repo> <run-id> --download <artifact-id> [--output <path>]

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  cicd:
    primary: github       # Default backend
    fallback: gitlab      # If primary fails
    adapters:
      github:
        # Token from GITHUB_TOKEN or keychain
      gitlab:
        host: gitlab.com
        # Token from GITLAB_TOKEN or keychain
```

## Examples

### Example 1: Check recent builds
```
User: "What's the status of recent builds?"

-> Skill loads: CICD -> ListRuns workflow
-> Queries: listRuns(repo, { limit: 10 })
-> Returns formatted run list with status
```

### Example 2: Trigger deployment
```
User: "Deploy to staging"

-> Skill loads: CICD -> TriggerPipeline workflow
-> Finds deployment pipeline
-> Triggers: triggerRun(repo, pipelineId, { inputs: { DEPLOY_ENV: 'staging' } })
-> Returns triggered run details
```

### Example 3: Debug a failure
```
User: "Why did the last build fail?"

-> Skill loads: CICD -> ViewLogs workflow
-> Gets latest failed run
-> Fetches failed job logs
-> Returns logs with failure context
```

### Example 4: Get build artifacts
```
User: "Download the test coverage report"

-> Skill loads: CICD -> DownloadArtifacts workflow
-> Lists artifacts for latest run
-> Downloads matching artifact
-> Returns artifact path
```
