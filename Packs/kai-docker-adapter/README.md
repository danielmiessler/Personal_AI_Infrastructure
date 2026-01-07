# kai-docker-adapter

Docker Engine adapter for the KAI Platform domain. Provides container management via the Docker Engine API.

## Installation

```bash
bun add kai-docker-adapter
```

## Prerequisites

- Docker Engine installed and running
- Access to Docker socket (default: `/var/run/docker.sock`)

## Usage

```typescript
import { DockerAdapter } from 'kai-docker-adapter';

const adapter = new DockerAdapter();

// List all containers
const containers = await adapter.listContainers('default');

// Get container logs
const logs = await adapter.getContainerLogs('default', 'my-container', {
  tail: 100
});

// Execute command in container
const result = await adapter.execInContainer('default', 'my-container', ['ls', '-la']);
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  platform:
    primary: docker
    adapters:
      docker:
        socketPath: /var/run/docker.sock  # Default
        # Or for remote Docker:
        # host: tcp://remote-docker:2375
        composeProject: myapp  # Optional: filter by Compose project
```

## Namespace Mapping

Docker doesn't have native namespaces. The adapter uses these conventions:

1. **Compose projects**: Containers with `com.docker.compose.project` label are grouped by project name as namespace
2. **Labels**: Containers with `kai.namespace` label use that value
3. **Default**: All other containers appear in the `default` namespace

## Deployment Mapping

Docker doesn't have native deployments. The adapter treats:

1. **Compose services**: Service name from `com.docker.compose.service` label
2. **Swarm services**: If Docker Swarm is enabled
3. **Container groups**: Containers with same `kai.deployment` label

## Scaling

For Compose services, scaling uses `docker compose scale`.
Standalone containers cannot be scaled (returns error).

## Related

- [kai-platform-core](../kai-platform-core) - Core interfaces
- [kai-k8s-adapter](../kai-k8s-adapter) - Kubernetes adapter
- [kai-mock-platform-adapter](../kai-mock-platform-adapter) - Mock adapter for testing
- [kai-platform-skill](../kai-platform-skill) - User-facing workflows
