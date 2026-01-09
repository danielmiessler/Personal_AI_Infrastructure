# mai-cicd-core

Core interfaces and utilities for the KAI CI/CD domain. Provides the `CICDProvider` interface that all CI/CD adapters implement, plus shared utilities for adapter discovery, configuration loading, error handling, and retry logic.

## Installation

```bash
bun add mai-cicd-core
```

## Usage

### Getting a Provider

```typescript
import { getCICDProvider, getCICDProviderWithFallback } from 'mai-cicd-core';

// Get the primary configured provider
const provider = await getCICDProvider();

// Get provider with automatic fallback
const provider = await getCICDProviderWithFallback();

// Override the adapter
const provider = await getCICDProvider({ adapter: 'github' });
```

### Using the Provider

```typescript
// List pipelines
const pipelines = await provider.listPipelines('owner/repo');

// List recent runs
const runs = await provider.listRuns('owner/repo', { limit: 10 });

// Trigger a run
const run = await provider.triggerRun('owner/repo', 'ci.yml', {
  branch: 'main',
  inputs: { deploy: 'true' }
});

// Get run status
const run = await provider.getRun('owner/repo', runId);

// Get job logs
const logs = await provider.getJobLogs('owner/repo', jobId);

// Health check
const health = await provider.healthCheck();
```

## Types

### Pipeline

```typescript
interface Pipeline {
  id: string;
  name: string;
  path: string;              // e.g., ".github/workflows/ci.yml"
  repo: string;
  defaultBranch?: string;
  metadata?: Record<string, unknown>;
}
```

### Run

```typescript
interface Run {
  id: string;
  pipelineId: string;
  pipelineName: string;
  repo: string;
  status: 'pending' | 'queued' | 'running' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  branch: string;
  commit: string;
  triggeredBy: string;
  triggerEvent: string;      // push, pull_request, schedule, manual
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  url: string;
}
```

### Job

```typescript
interface Job {
  id: string;
  runId: string;
  name: string;
  status: 'pending' | 'queued' | 'running' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  runner?: string;
  steps?: Step[];
}
```

## Configuration

Configure your CI/CD adapters in `providers.yaml`:

```yaml
domains:
  cicd:
    primary: github
    fallback: gitlab
    adapters:
      github:
        # Token from GITHUB_TOKEN env or keychain
      gitlab:
        host: gitlab.com
        # Token from GITLAB_TOKEN env or keychain
```

## Related

- [mai-github-cicd-adapter](../mai-github-cicd-adapter) - GitHub Actions adapter
- [mai-gitlab-cicd-adapter](../mai-gitlab-cicd-adapter) - GitLab CI/CD adapter
- [mai-mock-cicd-adapter](../mai-mock-cicd-adapter) - Mock adapter for testing
- [mai-cicd-skill](../mai-cicd-skill) - User-facing workflows
