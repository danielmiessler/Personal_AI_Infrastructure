# mai-mock-cicd-adapter Installation

Mock CI/CD adapter for testing KAI CI/CD domain integrations.

## Prerequisites

- **Bun** runtime installed

No external services or credentials required - this is a mock adapter.

---

## Step 1: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-mock-cicd-adapter
bun install
```

---

## Step 2: Configure providers.yaml (Optional)

For development/testing environments, add to `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  cicd:
    primary: mock
    adapters:
      mock:
        simulateLatency: 0     # Optional: simulate latency (ms)
        failureRate: 0         # Optional: simulate failures (0-100%)
```

---

## Step 3: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```typescript
import { MockCICDAdapter } from 'mai-mock-cicd-adapter';

const adapter = new MockCICDAdapter();
const result = await adapter.healthCheck();
console.log(result.healthy); // true
```

---

## Usage Examples

### Basic Testing

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

### Pre-configured Adapter

```typescript
const adapter = new MockCICDAdapter({
  pipelines: [
    {
      id: 'ci',
      name: 'CI Pipeline',
      path: '.github/workflows/ci.yml',
      repo: 'owner/repo',
      defaultBranch: 'main'
    }
  ],
  runs: [
    {
      id: 'run-1',
      pipelineId: 'ci',
      status: 'completed',
      conclusion: 'success'
    }
  ],
  simulateLatency: 100,
  failureRate: 10
});
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
```

### Verifying Integration Calls

```typescript
// Verify method calls
const calls = adapter.getCallLog();
expect(calls).toContainEqual(
  expect.objectContaining({ method: 'triggerRun' })
);

// Clear call log between tests
adapter.clearCallLog();
```

### Simulating Failures

```typescript
// Random failure rate (50%)
adapter.setFailureRate(50);

// Simulated latency (500ms)
adapter.setLatency(500);
```

---

## Troubleshooting

### Pipeline not found

**Cause:** Pipeline was not added to the mock adapter.

**Solution:**
```typescript
adapter.addPipeline({
  id: 'missing-pipeline',
  name: 'Pipeline Name',
  path: '.github/workflows/ci.yml',
  repo: 'owner/repo',
  defaultBranch: 'main'
});
```

### Simulated failures in tests

**Cause:** Adapter configured with `failureRate > 0`.

**Solution:**
```typescript
// Disable failures for deterministic tests
adapter.setFailureRate(0);
```

### Call log verification failing

**Cause:** Call log may contain calls from previous tests.

**Solution:**
```typescript
// Clear call log before each test
beforeEach(() => {
  adapter.clearCallLog();
});
```

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-mock-cicd-adapter/
│       ├── package.json
│       ├── src/
│       │   └── index.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml
```
