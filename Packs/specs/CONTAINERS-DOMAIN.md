# Containers Domain Specification

**Version**: 1.0.0
**Status**: Implemented
**Last Updated**: 2026-01-07
**Phase**: 5

---

## Overview

The Containers domain provides a unified interface for container orchestration and deployment operations across different platforms. It abstracts the differences between Docker, Kubernetes (k3s), and enterprise K8s behind a common `PlatformProvider` interface.

### Goals
- Unified interface for container/deployment lifecycle management
- Seamless transition between home (Docker, k3s) and work (enterprise K8s) environments
- Support common operations: deploy, scale, logs, exec, port-forward
- Enable monitoring of resource usage and health
- Abstract namespace/context switching

### Non-Goals
- Full Kubernetes API coverage (focus on common operations)
- CI/CD pipeline integration (that's the CICD domain)
- Secrets management (use kai-secrets-core, Containers can reference them)
- Persistent volume provisioning (infrastructure concern)
- Cluster administration (nodes, cluster-level resources)

### Design Decisions

**Why "Containers" over "Platform"?**

"Containers" clearly describes what this domain manages - containers, pods, deployments. "Platform" was too vague and could mean many things (PAI platform, cloud platform, etc.).

**Why Docker as a separate adapter?**

Docker Compose and standalone containers are common for local development and simple deployments. Not everyone needs Kubernetes, and Docker provides a simpler mental model for single-host scenarios.

**What about Docker Swarm?**

Swarm usage has declined significantly. If needed, a kai-swarm-adapter could be added later. Focus on Docker (standalone) and Kubernetes (k3s/enterprise).

---

## Pack Structure

```
kai-containers-core/           # Interface + discovery + shared utilities
kai-docker-adapter/            # Docker Engine/Compose integration
kai-k8s-adapter/               # Kubernetes (works with k3s and enterprise)
kai-mock-containers-adapter/   # Mock adapter for testing (REQUIRED)
kai-containers-skill/          # User-facing workflows
```

**Future adapters** (not implemented in Phase 5):
- `kai-podman-adapter` - Podman integration
- `kai-nomad-adapter` - HashiCorp Nomad integration

---

## kai-containers-core

### Purpose
Defines the PlatformProvider interface and shared utilities for container/deployment operations. Provides adapter discovery, configuration loading, and error classes.

### Directory Structure

```
kai-containers-core/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── PlatformProvider.ts     # Provider interface
│   ├── types/
│   │   ├── Namespace.ts            # Namespace/project
│   │   ├── Deployment.ts           # Deployment/service
│   │   ├── Container.ts            # Container/pod
│   │   ├── Resource.ts             # Resource usage
│   │   ├── Service.ts              # Service
│   │   └── index.ts
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   ├── ProviderFactory.ts      # Provider instantiation
│   │   └── index.ts
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── types.test.ts
    ├── errors.test.ts
    ├── retry.test.ts
    ├── logger.test.ts
    └── discovery.test.ts
```

### Provider Interface

```typescript
export interface PlatformProvider {
  readonly name: string;
  readonly version: string;

  // Namespace operations
  listNamespaces(): Promise<Namespace[]>;
  getNamespace(name: string): Promise<Namespace>;
  createNamespace?(name: string, labels?: Record<string, string>): Promise<Namespace>;
  deleteNamespace?(name: string): Promise<void>;

  // Deployment operations
  listDeployments(namespace: string): Promise<Deployment[]>;
  getDeployment(namespace: string, name: string): Promise<Deployment>;
  scaleDeployment(namespace: string, name: string, replicas: number): Promise<Deployment>;
  restartDeployment(namespace: string, name: string): Promise<void>;
  deleteDeployment?(namespace: string, name: string): Promise<void>;

  // Container/Pod operations
  listContainers(namespace: string, options?: ContainerQuery): Promise<Container[]>;
  getContainer(namespace: string, name: string): Promise<Container>;
  getContainerLogs(namespace: string, name: string, options?: LogOptions): Promise<string>;
  execInContainer?(namespace: string, name: string, command: string[]): Promise<ExecResult>;
  deleteContainer?(namespace: string, name: string): Promise<void>;

  // Service operations
  listServices(namespace: string): Promise<Service[]>;
  getService(namespace: string, name: string): Promise<Service>;
  portForward?(namespace: string, name: string, ports: PortMapping): Promise<PortForwardHandle>;

  // Resource monitoring
  getResourceUsage(namespace: string, name?: string): Promise<ResourceUsage>;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}
```

---

## kai-docker-adapter

### Purpose
Implements PlatformProvider using Docker Engine API. Provides container management for standalone Docker and Docker Compose environments.

### Docker-to-Containers Mapping

| Containers Type | Docker Equivalent |
|-----------------|-------------------|
| Namespace | Compose project or `kai.namespace` label |
| Deployment | Compose service or container group by label |
| Container | Container |
| Service | Container with exposed ports |

### Implementation Notes

- **Connection**: Default to Unix socket `/var/run/docker.sock`, support TCP for remote
- **Namespaces**: Use Docker labels (`com.docker.compose.project`, `kai.namespace`) or Compose project names
- **Compose**: Detect `com.docker.compose.*` labels for grouping
- **Scaling**: For Compose, use `docker compose scale`; standalone containers can't scale
- **Exec**: Use Docker exec API with multiplexed streams
- **Logs**: Support tail, since, follow via Docker logs API

---

## kai-k8s-adapter

### Purpose
Implements PlatformProvider using Kubernetes API. Works with any K8s distribution including k3s, minikube, EKS, GKE, AKS.

### Kubernetes-to-Containers Mapping

| Containers Type | Kubernetes Equivalent | API Endpoint |
|-----------------|-----------------------|--------------|
| Namespace | Namespace | `/api/v1/namespaces` |
| Deployment | Deployment | `/apis/apps/v1/namespaces/{ns}/deployments` |
| Container | Pod | `/api/v1/namespaces/{ns}/pods` |
| Service | Service | `/api/v1/namespaces/{ns}/services` |

### Implementation Notes

- **Kubeconfig**: Parse `~/.kube/config`, respect `KUBECONFIG` env, support in-cluster config
- **Context**: Support switching between clusters/contexts
- **Authentication**: Handle certificate, token, exec-based auth
- **Port-forward**: Use WebSocket API for port forwarding
- **Exec**: Use WebSocket API with SPDY for exec
- **Metrics**: Query metrics-server for resource usage

---

## kai-mock-containers-adapter

### Purpose
Provides a mock PlatformProvider for testing skills and integration tests without requiring Docker or Kubernetes.

### Test Helpers

```typescript
class MockPlatformAdapter implements PlatformProvider {
  // Test helpers
  setNamespaces(namespaces: Namespace[]): void;
  setDeployments(deployments: Deployment[]): void;
  setContainers(containers: Container[]): void;
  setServices(services: Service[]): void;
  setLogs(containerId: string, logs: string): void;
  setExecResult(command: string, result: ExecResult): void;
  setResourceUsage(namespace: string, usage: ResourceUsage): void;
  setFailureRate(rate: number): void;
  setLatency(ms: number): void;
  getCallLog(): MethodCall[];
  clearCallLog(): void;
}
```

---

## kai-containers-skill

### Purpose
Provides user-facing workflows for container/deployment operations that work across any PlatformProvider backend.

### CLI Tools

| Tool | Description |
|------|-------------|
| `Namespaces.ts` | List, get, create, delete namespaces |
| `Deployments.ts` | List, get, scale, restart, delete deployments |
| `Containers.ts` | List, get, logs, exec, delete containers |
| `Services.ts` | List, get, port-forward services |
| `Health.ts` | Check provider health, resource usage |

### Workflows

| Workflow | Description |
|----------|-------------|
| DeploymentStatus.md | Check deployment health and status |
| ContainerLogs.md | View and analyze container logs |
| ScaleDeployment.md | Scale deployments with safety checks |
| ServiceHealth.md | Check service health and endpoints |
| NamespaceOverview.md | Complete namespace overview |

### Configuration

Via `providers.yaml`:

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

---

## Test Coverage

| Package | Tests |
|---------|-------|
| kai-containers-core | 56 |
| kai-mock-containers-adapter | 42 |
| kai-docker-adapter | 5 (1 skipped) |
| kai-k8s-adapter | 7 (1 skipped) |
| **Total** | **110** |

Integration tests skipped as they require running Docker daemon or Kubernetes cluster.

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Phase 1
- [NETWORK-DOMAIN.md](./NETWORK-DOMAIN.md) - Phase 2
- [ISSUES-DOMAIN.md](./ISSUES-DOMAIN.md) - Phase 3
- [CICD-DOMAIN.md](./CICD-DOMAIN.md) - Phase 4
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
- Renamed from "Platform" to "Containers" for clarity
