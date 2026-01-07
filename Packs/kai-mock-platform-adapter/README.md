# kai-mock-platform-adapter

Mock Platform adapter for testing the KAI Platform domain. Provides a fully functional in-memory implementation for unit and integration testing.

## Installation

```bash
bun add kai-mock-platform-adapter
```

## Usage

```typescript
import { MockPlatformAdapter } from 'kai-mock-platform-adapter';

const adapter = new MockPlatformAdapter();

// Add test data
adapter.addNamespace({ name: 'default', status: 'active' });
adapter.addDeployment({
  name: 'my-app',
  namespace: 'default',
  replicas: 3,
  availableReplicas: 3,
  readyReplicas: 3,
  status: 'running',
  image: 'nginx:latest'
});

// Use like any other adapter
const deployments = await adapter.listDeployments('default');
const logs = await adapter.getContainerLogs('default', 'my-pod');
```

## Test Helpers

### Data Management

```typescript
// Namespaces
adapter.setNamespaces([...]);
adapter.addNamespace(namespace);
adapter.clearNamespaces();

// Deployments
adapter.setDeployments([...]);
adapter.addDeployment(deployment);
adapter.updateDeployment('namespace', 'name', { replicas: 5 });
adapter.clearDeployments();

// Containers
adapter.setContainers([...]);
adapter.addContainer(container);
adapter.updateContainer('namespace', 'name', { status: 'failed' });
adapter.clearContainers();

// Services
adapter.setServices([...]);
adapter.addService(service);
adapter.clearServices();

// Logs and Exec
adapter.setLogs('container-id', 'log content');
adapter.setExecResult('command', { exitCode: 0, stdout: 'output', stderr: '' });
adapter.setResourceUsage('namespace', usage);
```

### Failure Simulation

```typescript
// Simulate failures for testing retry logic
adapter.setFailureRate(50); // 50% of calls will fail

// Simulate latency for testing timeouts
adapter.setLatency(1000); // 1 second delay
```

### Call Logging

```typescript
// Verify adapter was called correctly
const calls = adapter.getCallLog();
console.log(calls); // [{ method: 'listDeployments', args: ['default'], timestamp: Date }]

// Clear call log
adapter.clearCallLog();
```

## Related

- [kai-platform-core](../kai-platform-core) - Core interfaces
- [kai-docker-adapter](../kai-docker-adapter) - Docker adapter
- [kai-k8s-adapter](../kai-k8s-adapter) - Kubernetes adapter
- [kai-platform-skill](../kai-platform-skill) - User-facing workflows
