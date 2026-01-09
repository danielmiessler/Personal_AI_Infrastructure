# mai-mock-cicd-adapter

Mock CI/CD adapter for testing KAI CI/CD domain. Provides a fully-functional in-memory CICDProvider that can be configured with test data and used to verify integration behavior.

## Installation

```bash
bun add mai-mock-cicd-adapter
```

## Usage

### Basic Usage

```typescript
import { MockCICDAdapter } from 'mai-mock-cicd-adapter';

const adapter = new MockCICDAdapter();

// Add test data
adapter.addPipeline({
  id: 'ci',
  name: 'CI Pipeline',
  path: '.github/workflows/ci.yml',
  repo: 'owner/repo',
  defaultBranch: 'main'
});

// Use like any CICDProvider
const pipelines = await adapter.listPipelines('owner/repo');
const run = await adapter.triggerRun('owner/repo', 'ci');
```

### Test Helpers

```typescript
// Bulk set data
adapter.setPipelines([pipeline1, pipeline2]);
adapter.setRuns([run1, run2]);
adapter.setJobs([job1, job2]);
adapter.setArtifacts([artifact1, artifact2]);

// Individual operations
adapter.addPipeline(pipeline);
adapter.addRun(run);
adapter.addJob(job);
adapter.addArtifact(artifact, Buffer.from('content'));

// Update runs
adapter.updateRun('run-1', { status: 'completed', conclusion: 'success' });

// Clear data
adapter.clearPipelines();
adapter.clearRuns();
adapter.clearJobs();
adapter.clearArtifacts();

// Verify calls
const calls = adapter.getCallLog();
expect(calls).toContainEqual(
  expect.objectContaining({ method: 'triggerRun' })
);
adapter.clearCallLog();
```

### Simulating Failures

```typescript
// Random failure rate (0-100%)
adapter.setFailureRate(50);

// Simulated latency (ms)
adapter.setLatency(500);
```

### Pre-configured Adapter

```typescript
const adapter = new MockCICDAdapter({
  pipelines: [/* ... */],
  runs: [/* ... */],
  jobs: [/* ... */],
  simulateLatency: 100,
  failureRate: 10
});
```

## Related

- [mai-cicd-core](../mai-cicd-core) - Core interfaces
- [mai-github-cicd-adapter](../mai-github-cicd-adapter) - GitHub Actions adapter
- [mai-gitlab-cicd-adapter](../mai-gitlab-cicd-adapter) - GitLab CI/CD adapter
- [mai-cicd-skill](../mai-cicd-skill) - User-facing workflows
