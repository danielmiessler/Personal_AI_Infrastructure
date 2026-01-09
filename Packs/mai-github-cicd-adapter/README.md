# mai-github-cicd-adapter

GitHub Actions CI/CD adapter for the KAI CI/CD domain. Provides integration with GitHub's workflow and actions API for pipeline management, run monitoring, and artifact handling.

## Installation

```bash
bun add mai-github-cicd-adapter
```

## Authentication

The adapter looks for authentication in this order:

1. **Config token**: Passed directly in constructor
2. **Environment variable**: `GITHUB_TOKEN`
3. **macOS Keychain**: Service `github-token`, account `claude-code`

```bash
# Store token in macOS Keychain
security add-generic-password -s "github-token" -a "claude-code" -w "ghp_your_token_here"
```

## Usage

```typescript
import { GitHubCICDAdapter } from 'mai-github-cicd-adapter';

const adapter = new GitHubCICDAdapter();

// List workflows
const pipelines = await adapter.listPipelines('owner/repo');

// List recent runs
const runs = await adapter.listRuns('owner/repo', { limit: 10 });

// Trigger a workflow (requires workflow_dispatch event)
const run = await adapter.triggerRun('owner/repo', 'ci.yml', {
  branch: 'main',
  inputs: { deploy: 'true' }
});

// Get run status
const status = await adapter.getRun('owner/repo', runId);

// Get job logs
const logs = await adapter.getJobLogs('owner/repo', jobId);

// Download artifact
const artifact = await adapter.downloadArtifact('owner/repo', artifactId);
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  cicd:
    primary: github
    adapters:
      github:
        apiUrl: https://api.github.com  # Optional, for GitHub Enterprise
```

## Required Permissions

The token needs these permissions:
- `actions:read` - View workflows and runs
- `actions:write` - Trigger workflows, cancel runs
- `contents:read` - Required for some operations

## Rate Limiting

GitHub API has rate limits:
- **Authenticated**: 5,000 requests/hour
- **Enterprise**: Higher limits may apply

The adapter automatically handles rate limiting with exponential backoff.

## Related

- [mai-cicd-core](../mai-cicd-core) - Core interfaces
- [mai-gitlab-cicd-adapter](../mai-gitlab-cicd-adapter) - GitLab CI/CD adapter
- [mai-mock-cicd-adapter](../mai-mock-cicd-adapter) - Mock adapter for testing
- [mai-cicd-skill](../mai-cicd-skill) - User-facing workflows
