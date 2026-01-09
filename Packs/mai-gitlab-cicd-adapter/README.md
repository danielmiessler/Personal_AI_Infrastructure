# mai-gitlab-cicd-adapter

GitLab CI/CD adapter for the KAI CI/CD domain. Provides integration with GitLab's pipeline API for pipeline management, job monitoring, and artifact handling.

## Installation

```bash
bun add mai-gitlab-cicd-adapter
```

## Authentication

The adapter looks for authentication in this order:

1. **Config token**: Passed directly in constructor
2. **Environment variable**: `GITLAB_TOKEN`
3. **macOS Keychain**: Service `gitlab-token`, account `claude-code`

```bash
# Store token in macOS Keychain
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token_here"
```

## Usage

```typescript
import { GitLabCICDAdapter } from 'mai-gitlab-cicd-adapter';

const adapter = new GitLabCICDAdapter({
  host: 'gitlab.com'  // or your GitLab instance
});

// List pipelines
const pipelines = await adapter.listPipelines('group/project');

// List recent runs
const runs = await adapter.listRuns('group/project', { limit: 10 });

// Trigger a pipeline
const run = await adapter.triggerRun('group/project', 'gitlab-ci', {
  branch: 'main',
  inputs: { DEPLOY_ENV: 'staging' }
});

// Get run status
const status = await adapter.getRun('group/project', runId);

// Get job logs
const logs = await adapter.getJobLogs('group/project', jobId);

// Download artifact
const artifact = await adapter.downloadArtifact('group/project', jobId);
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  cicd:
    primary: gitlab
    adapters:
      gitlab:
        host: gitlab.com  # Required
        apiVersion: v4    # Optional, default: v4
```

## Required Permissions

The token needs these scopes:
- `api` - Full API access
- OR `read_api` + `read_repository` for read-only access

## GitLab-Specific Notes

### Pipeline Definition

GitLab doesn't have separate "workflow" definitions like GitHub. The adapter treats `.gitlab-ci.yml` as a single pipeline definition with ID `gitlab-ci`.

### Artifacts

In GitLab, artifacts are attached to jobs, not pipelines. The `artifactId` in `downloadArtifact` is the job ID.

### Variables

When triggering a pipeline, `inputs` are converted to GitLab pipeline variables.

## Rate Limiting

GitLab rate limits vary by instance. The adapter handles 429 responses with automatic backoff.

## Related

- [mai-cicd-core](../mai-cicd-core) - Core interfaces
- [mai-github-cicd-adapter](../mai-github-cicd-adapter) - GitHub Actions adapter
- [mai-mock-cicd-adapter](../mai-mock-cicd-adapter) - Mock adapter for testing
- [mai-cicd-skill](../mai-cicd-skill) - User-facing workflows
