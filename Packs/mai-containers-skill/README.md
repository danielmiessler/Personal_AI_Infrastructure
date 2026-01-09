# mai-containers-skill

> User-facing skill for container and deployment management across Docker and Kubernetes

## Overview

This skill provides CLI tools and workflows for managing containers, pods, deployments, namespaces, and services. It abstracts away provider differences, allowing you to use the same commands whether you're working with Docker or Kubernetes.

## Features

- **Namespace Management** - List, create, and delete namespaces
- **Deployment Operations** - Scale, restart, and monitor deployments
- **Container Inspection** - View logs, status, and resource usage
- **Service Discovery** - List services and check endpoints
- **Health Monitoring** - Cluster and workload health checks
- **Provider Agnostic** - Works with Docker and Kubernetes through adapters

## Requirements

- `mai-containers-core` - Core interfaces and provider discovery
- At least one adapter:
  - `mai-docker-adapter` - For Docker environments
  - `mai-k8s-adapter` - For Kubernetes environments

## Quick Start

```bash
# Check platform health
bun run Tools/Health.ts

# List namespaces
bun run Tools/Namespaces.ts list

# List deployments in a namespace
bun run Tools/Deployments.ts list default

# View container logs
bun run Tools/Containers.ts logs default my-pod --tail 100

# Scale a deployment
bun run Tools/Deployments.ts scale default my-app 3

# Check service health
bun run Tools/Services.ts list default
```

See `VERIFY.md` for full verification checklist.

## Configuration

Configure in `Config/platform.yaml`:

```yaml
default_provider: kubernetes

defaults:
  namespace: default

output:
  format: table
  timestamps: false
  tail: 100

safety:
  warn_scale_to_zero: true
  max_replicas_warning: 10
  confirm_delete: true
```

Provider configuration is managed via `providers.yaml`:

```yaml
domains:
  containers:
    primary: kubernetes
    adapters:
      kubernetes:
        kubeconfig: ~/.kube/config
        context: home-cluster
      docker:
        socketPath: /var/run/docker.sock
```

## Related Packs

- [mai-containers-core](../mai-containers-core) - Core interfaces and types
- [mai-docker-adapter](../mai-docker-adapter) - Docker Engine adapter
- [mai-k8s-adapter](../mai-k8s-adapter) - Kubernetes adapter
- [mai-mock-containers-adapter](../mai-mock-containers-adapter) - Mock adapter for testing
