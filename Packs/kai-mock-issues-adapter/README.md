# kai-mock-issues-adapter

Mock issues adapter for testing and development. Provides an in-memory issue store with configurable latency and failure rates for testing retry logic and error handling.

## Installation

```bash
bun add kai-mock-issues-adapter
```

## Usage

```typescript
import MockIssuesAdapter from 'kai-mock-issues-adapter';

// Create a basic mock adapter
const adapter = new MockIssuesAdapter();

// Create with pre-populated data
const adapter = new MockIssuesAdapter({
  issues: [
    {
      id: 'issue-1',
      title: 'Test issue',
      status: 'open',
      type: 'task',
      labels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  projects: [
    { id: 'project-1', name: 'Main Project' },
  ],
  labels: [
    { id: 'label-1', name: 'bug', color: '#ff0000' },
  ],
});

// Use the IssuesProvider interface
const issue = await adapter.createIssue({ title: 'New task' });
const issues = await adapter.listIssues({ status: 'open' });
```

## Test Helpers

The mock adapter provides several helper methods for testing:

```typescript
// Manage test data
adapter.setIssues(issues);
adapter.addIssue(issue);
adapter.clearIssues();
adapter.setProjects(projects);
adapter.setLabels(labels);

// Configure behavior
adapter.setFailureRate(0.5);  // 50% failure rate
adapter.setLatency(100);       // 100ms latency

// Verify method calls
const calls = adapter.getCallLog();
adapter.clearCallLog();
```

## Simulating Failures

```typescript
// Create a flaky adapter
const flakyAdapter = new MockIssuesAdapter({
  failureRate: 0.3,  // 30% failure rate
  failureError: 'NETWORK_ERROR',
});

// Create a slow adapter
const slowAdapter = new MockIssuesAdapter({
  latencyMs: 500,  // 500ms delay on each call
});
```

## Related

- [kai-issues-core](../kai-issues-core) - Core interfaces
- [kai-issues-skill](../kai-issues-skill) - User-facing workflows
