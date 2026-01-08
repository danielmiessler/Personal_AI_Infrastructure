# kai-containers-core

Core interfaces and utilities for the KAI Containers domain. Provides the `PlatformProvider` interface and shared utilities for container/deployment operations across Docker, Kubernetes, and other platforms.

## Installation

```bash
bun add kai-containers-core
```

## Usage

```typescript
import {
  getPlatformProvider,
  type PlatformProvider,
  type Deployment,
  type Container
} from 'kai-containers-core';

// Get configured provider
const provider = await getPlatformProvider();

// List namespaces
const namespaces = await provider.listNamespaces();

// List deployments in a namespace
const deployments = await provider.listDeployments('default');

// Get container logs
const logs = await provider.getContainerLogs('default', 'my-pod', {
  tail: 100,
  since: '1h'
});

// Scale a deployment
await provider.scaleDeployment('default', 'my-app', 3);

// Check provider health
const health = await provider.healthCheck();
```

## Configuration

Configure in `~/.config/kai/providers.yaml` or `./providers.yaml`:

```yaml
domains:
  containers:
    primary: kubernetes
    fallback: docker
    adapters:
      kubernetes:
        context: home-k3s
        namespace: default
      docker:
        socketPath: /var/run/docker.sock
```

## Exports

### Types
- `Namespace` - Namespace/project
- `NamespaceStatus` - active, terminating
- `Deployment` - Deployment/service definition
- `DeploymentStatus` - running, pending, failed, updating
- `Container` - Container/pod instance
- `ContainerStatus` - running, pending, succeeded, failed, unknown
- `ContainerQuery` - Query options for listing containers
- `LogOptions` - Options for log retrieval
- `ExecResult` - Command execution result
- `Service` - Service definition
- `ServiceType` - ClusterIP, NodePort, LoadBalancer, ExternalName
- `ServicePort` - Port configuration
- `PortInfo` - Container port info
- `PortMapping` - Port forward mapping
- `PortForwardHandle` - Handle to close port forward
- `ResourceSpec` - Resource requests/limits
- `ResourceQuantity` - CPU/memory quantities
- `ResourceUsage` - Current resource usage
- `ResourceMetric` - Single resource metric
- `HealthStatus` - Provider health info

### Interfaces
- `PlatformProvider` - Main provider interface

### Discovery
- `discoverAdapters()` - Find available adapters
- `loadAdapter()` - Load adapter by name
- `loadConfig()` - Load providers.yaml
- `getPlatformProvider()` - Get primary provider
- `getPlatformProviderWithFallback()` - Get provider with fallback

### Errors
- `PlatformError` - Base error class
- `NamespaceNotFoundError`
- `DeploymentNotFoundError`
- `ContainerNotFoundError`
- `ServiceNotFoundError`
- `AuthenticationError`
- `ConfigurationError`
- `AdapterNotFoundError`
- `ExecError`
- `ScaleError`
- `ConnectionError`

### Utilities
- `withRetry()` - Retry with exponential backoff

## Related

- [kai-docker-adapter](../kai-docker-adapter) - Docker Engine adapter
- [kai-k8s-adapter](../kai-k8s-adapter) - Kubernetes adapter
- [kai-mock-containers-adapter](../kai-mock-containers-adapter) - Mock adapter for testing
- [kai-containers-skill](../kai-containers-skill) - User-facing workflows
