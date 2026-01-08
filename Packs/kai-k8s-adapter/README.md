# kai-k8s-adapter

Kubernetes adapter for the KAI Containers domain. Provides container orchestration via the Kubernetes API.

## Installation

```bash
bun add kai-k8s-adapter
```

## Prerequisites

- Kubernetes cluster access
- Valid kubeconfig or bearer token
- For metrics: metrics-server installed in cluster

## Usage

```typescript
import { K8sAdapter } from 'kai-k8s-adapter';

// Use default kubeconfig (~/.kube/config)
const adapter = new K8sAdapter();

// Or specify options
const adapter = new K8sAdapter({
  kubeconfig: '/path/to/kubeconfig',
  context: 'my-cluster',
  namespace: 'production',
});

// Or direct authentication
const adapter = new K8sAdapter({
  server: 'https://k8s.example.com:6443',
  token: 'bearer-token',
});

// List namespaces
const namespaces = await adapter.listNamespaces();

// List deployments
const deployments = await adapter.listDeployments('default');

// Scale a deployment
await adapter.scaleDeployment('default', 'my-app', 3);

// Get pod logs
const logs = await adapter.getContainerLogs('default', 'my-app-xyz', {
  tail: 100,
});

// Restart a deployment
await adapter.restartDeployment('default', 'my-app');
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  containers:
    primary: kubernetes
    adapters:
      kubernetes:
        kubeconfig: ~/.kube/config  # Default
        context: my-cluster          # Optional: specific context
        namespace: default           # Optional: default namespace
        insecureSkipTlsVerify: false # Optional: skip TLS verification
```

Or via environment variables:

```bash
KUBECONFIG=/path/to/config  # Override kubeconfig path
```

## Authentication Methods

1. **kubeconfig (default)**: Uses `~/.kube/config` or path from `KUBECONFIG` env
2. **Direct token**: Provide `server` and `token` in config
3. **In-cluster**: When running inside a Kubernetes pod (uses service account)

## Namespace Operations

```typescript
// List all namespaces
const namespaces = await adapter.listNamespaces();

// Get specific namespace
const ns = await adapter.getNamespace('production');

// Create namespace
const newNs = await adapter.createNamespace('staging', {
  'team': 'backend',
});

// Delete namespace
await adapter.deleteNamespace('staging');
```

## Deployment Operations

```typescript
// List deployments in namespace
const deployments = await adapter.listDeployments('default');

// Get specific deployment
const dep = await adapter.getDeployment('default', 'my-app');

// Scale deployment
await adapter.scaleDeployment('default', 'my-app', 5);

// Restart deployment (rolling restart)
await adapter.restartDeployment('default', 'my-app');

// Delete deployment
await adapter.deleteDeployment('default', 'my-app');
```

## Container (Pod) Operations

```typescript
// List pods
const pods = await adapter.listContainers('default');

// Filter by deployment
const appPods = await adapter.listContainers('default', {
  deploymentName: 'my-app',
});

// Filter by labels
const pods = await adapter.listContainers('default', {
  labelSelector: { app: 'nginx' },
});

// Get pod logs
const logs = await adapter.getContainerLogs('default', 'my-app-xyz', {
  tail: 100,
  since: 3600000, // Last hour in ms
  container: 'main', // Specific container in pod
  timestamps: true,
});

// Delete pod (it will be recreated by deployment)
await adapter.deleteContainer('default', 'my-app-xyz');
```

## Service Operations

```typescript
// List services
const services = await adapter.listServices('default');

// Get specific service
const svc = await adapter.getService('default', 'my-app');

// Port forward (requires implementation)
const handle = await adapter.portForward('default', 'my-app', {
  local: 8080,
  remote: 80,
});

// Stop port forward
await handle.stop();
```

## Resource Metrics

Requires metrics-server installed in the cluster.

```typescript
// Get resource usage for a pod
const usage = await adapter.getResourceUsage('default', 'my-app-xyz');
console.log(`CPU: ${usage.cpu.used}m`);
console.log(`Memory: ${usage.memory.used}MB`);

// Get total resource usage for namespace
const total = await adapter.getResourceUsage('default');
```

## Health Check

```typescript
const health = await adapter.healthCheck();
if (health.healthy) {
  console.log('Connected to:', health.details.server);
} else {
  console.error('Connection failed:', health.message);
}
```

## k3s Support

This adapter works with k3s clusters. k3s uses standard Kubernetes API, so no special configuration is needed:

```typescript
const adapter = new K8sAdapter({
  kubeconfig: '/etc/rancher/k3s/k3s.yaml',  // k3s default location
});
```

## Related

- [kai-containers-core](../kai-containers-core) - Core interfaces
- [kai-docker-adapter](../kai-docker-adapter) - Docker adapter
- [kai-mock-containers-adapter](../kai-mock-containers-adapter) - Mock adapter for testing
- [kai-containers-skill](../kai-containers-skill) - User-facing workflows
