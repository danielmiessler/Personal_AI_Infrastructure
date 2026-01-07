# Platform Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 5

---

## Overview

The Platform domain provides a unified interface for container orchestration and deployment operations across different platforms. It abstracts the differences between Docker, Kubernetes (k3s), and enterprise K8s behind a common `PlatformProvider` interface.

### Goals
- Unified interface for container/deployment lifecycle management
- Seamless transition between home (Docker, k3s) and work (enterprise K8s) environments
- Support common operations: deploy, scale, logs, exec, port-forward
- Enable monitoring of resource usage and health
- Abstract namespace/context switching

### Non-Goals
- Full Kubernetes API coverage (focus on common operations)
- CI/CD pipeline integration (that's the CICD domain)
- Secrets management (use kai-secrets-core, Platform can reference them)
- Persistent volume provisioning (infrastructure concern)
- Cluster administration (nodes, cluster-level resources)

### Design Decisions

**Why "Platform" not "Containers" or "Kubernetes"?**

"Platform" encompasses both simple container runtimes (Docker) and orchestrators (Kubernetes). This allows the same skill to work whether you're running a single container locally or deploying to a production cluster.

**Why Docker as a separate adapter?**

Docker Compose and standalone containers are common for local development and simple deployments. Not everyone needs Kubernetes, and Docker provides a simpler mental model for single-host scenarios.

**What about Docker Swarm?**

Swarm usage has declined significantly. If needed, a kai-swarm-adapter could be added later. Focus on Docker (standalone) and Kubernetes (k3s/enterprise).

**Why not include Helm?**

Helm is a package manager, not a platform. Helm chart management could be a separate skill or integrated into the Platform skill as a workflow. The core interface focuses on runtime operations.

---

## Pack Structure

```
kai-platform-core/           # Interface + discovery + shared utilities
kai-docker-adapter/          # Docker Engine/Compose integration
kai-k8s-adapter/             # Kubernetes (works with k3s and enterprise)
kai-mock-platform-adapter/   # Mock adapter for testing (REQUIRED)
kai-platform-skill/          # User-facing workflows
```

**Future adapters** (not implemented in Phase 5):
- `kai-podman-adapter` - Podman integration
- `kai-nomad-adapter` - HashiCorp Nomad integration

---

## kai-platform-core

### Purpose
Defines the PlatformProvider interface and shared utilities for container/deployment operations. Provides adapter discovery, configuration loading, and error classes.

### Directory Structure

```
kai-platform-core/
├── README.md
├── VERIFY.md
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
│   │   └── index.ts
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   └── ProviderFactory.ts      # Provider instantiation
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── interfaces.test.ts
    ├── discovery.test.ts
    └── fixtures.ts
```

### Provider Interface

```typescript
// src/interfaces/PlatformProvider.ts

export interface PlatformProvider {
  /** Provider identifier */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Context/Namespace operations
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

// Types
export interface Namespace {
  name: string;
  status: NamespaceStatus;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createdAt?: Date;
}

export type NamespaceStatus = 'active' | 'terminating';

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  status: DeploymentStatus;
  image: string;
  labels?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type DeploymentStatus = 'running' | 'pending' | 'failed' | 'updating';

export interface Container {
  id: string;
  name: string;
  namespace: string;
  image: string;
  status: ContainerStatus;
  ready: boolean;
  restartCount: number;
  startedAt?: Date;
  ports?: PortInfo[];
  resources?: ResourceSpec;
  metadata?: Record<string, unknown>;
}

export type ContainerStatus = 'running' | 'pending' | 'succeeded' | 'failed' | 'unknown';

export interface ContainerQuery {
  deployment?: string;
  labelSelector?: string;
  status?: ContainerStatus;
  limit?: number;
}

export interface LogOptions {
  tail?: number;           // Number of lines from end
  since?: string;          // Duration like "1h", "30m"
  follow?: boolean;        // Stream logs (returns ReadableStream)
  timestamps?: boolean;    // Include timestamps
  container?: string;      // Specific container in pod
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: ServiceType;
  clusterIP?: string;
  externalIP?: string;
  ports: ServicePort[];
  selector?: Record<string, string>;
  createdAt?: Date;
}

export type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';

export interface ServicePort {
  name?: string;
  port: number;
  targetPort: number;
  nodePort?: number;
  protocol: 'TCP' | 'UDP';
}

export interface PortInfo {
  containerPort: number;
  protocol: 'TCP' | 'UDP';
  hostPort?: number;
}

export interface PortMapping {
  local: number;
  remote: number;
}

export interface PortForwardHandle {
  localPort: number;
  close(): Promise<void>;
}

export interface ResourceSpec {
  requests?: ResourceQuantity;
  limits?: ResourceQuantity;
}

export interface ResourceQuantity {
  cpu?: string;      // e.g., "100m", "0.5"
  memory?: string;   // e.g., "128Mi", "1Gi"
}

export interface ResourceUsage {
  namespace: string;
  container?: string;
  cpu: ResourceMetric;
  memory: ResourceMetric;
  timestamp: Date;
}

export interface ResourceMetric {
  used: string;
  requested?: string;
  limit?: string;
  percentage?: number;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class NamespaceNotFoundError extends PlatformError {
  constructor(namespace: string, provider?: string) {
    super(`Namespace not found: ${namespace}`, 'NAMESPACE_NOT_FOUND', provider);
    this.name = 'NamespaceNotFoundError';
  }
}

export class DeploymentNotFoundError extends PlatformError {
  constructor(deployment: string, provider?: string) {
    super(`Deployment not found: ${deployment}`, 'DEPLOYMENT_NOT_FOUND', provider);
    this.name = 'DeploymentNotFoundError';
  }
}

export class ContainerNotFoundError extends PlatformError {
  constructor(container: string, provider?: string) {
    super(`Container not found: ${container}`, 'CONTAINER_NOT_FOUND', provider);
    this.name = 'ContainerNotFoundError';
  }
}

export class ServiceNotFoundError extends PlatformError {
  constructor(service: string, provider?: string) {
    super(`Service not found: ${service}`, 'SERVICE_NOT_FOUND', provider);
    this.name = 'ServiceNotFoundError';
  }
}

export class AuthenticationError extends PlatformError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends PlatformError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AdapterNotFoundError extends PlatformError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

export class ExecError extends PlatformError {
  constructor(command: string, exitCode: number, stderr: string, provider?: string) {
    super(`Command failed (exit ${exitCode}): ${stderr}`, 'EXEC_ERROR', provider);
    this.name = 'ExecError';
  }
}

export class ScaleError extends PlatformError {
  constructor(deployment: string, reason: string, provider?: string) {
    super(`Failed to scale ${deployment}: ${reason}`, 'SCALE_ERROR', provider);
    this.name = 'ScaleError';
  }
}
```

---

## kai-docker-adapter

### Purpose
Implements PlatformProvider using Docker Engine API. Provides container management for standalone Docker and Docker Compose environments.

### Adapter Manifest

```yaml
# adapter.yaml
name: docker
version: 1.0.0
domain: platform
interface: PlatformProvider
entry: ./src/DockerAdapter.ts
description: Docker Engine adapter for container management

config:
  required: []  # Uses default Docker socket
  optional:
    - socketPath: /var/run/docker.sock
    - host: null              # For remote Docker (tcp://host:2375)
    - composeProject: null    # Default Compose project filter

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Docker-to-Platform Mapping

| Platform Type | Docker Equivalent |
|---------------|-------------------|
| Namespace | Compose project or label filter |
| Deployment | Compose service or container group by label |
| Container | Container |
| Service | Container with exposed ports |

### Implementation Notes

- **Connection**: Default to Unix socket `/var/run/docker.sock`, support TCP for remote
- **Namespaces**: Use Docker labels or Compose project names as logical namespaces
- **Compose**: Detect `com.docker.compose.*` labels for grouping
- **Scaling**: For Compose, use `docker compose scale`; standalone containers can't scale
- **Exec**: Use Docker exec API with multiplexed streams
- **Logs**: Support tail, since, follow via Docker logs API

---

## kai-k8s-adapter

### Purpose
Implements PlatformProvider using Kubernetes API. Works with any K8s distribution including k3s, minikube, EKS, GKE, AKS.

### Adapter Manifest

```yaml
# adapter.yaml
name: kubernetes
version: 1.0.0
domain: platform
interface: PlatformProvider
entry: ./src/K8sAdapter.ts
description: Kubernetes adapter for container orchestration

config:
  required: []  # Uses default kubeconfig
  optional:
    - kubeconfig: ~/.kube/config
    - context: null           # Use specific context
    - namespace: default      # Default namespace

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

### Kubernetes-to-Platform Mapping

| Platform Type | Kubernetes Equivalent | API Endpoint |
|---------------|-----------------------|--------------|
| Namespace | Namespace | `/api/v1/namespaces` |
| Deployment | Deployment | `/apis/apps/v1/namespaces/{ns}/deployments` |
| Container | Pod | `/api/v1/namespaces/{ns}/pods` |
| Service | Service | `/api/v1/namespaces/{ns}/services` |

### Implementation Notes

- **Kubeconfig**: Parse `~/.kube/config`, respect `KUBECONFIG` env, support in-cluster config
- **Context**: Support switching between clusters/contexts
- **Authentication**: Handle certificate, token, exec-based auth
- **Watch**: Support watch for real-time updates (optional)
- **Port-forward**: Use WebSocket API for port forwarding
- **Exec**: Use WebSocket API with SPDY for exec
- **Metrics**: Query metrics-server for resource usage

---

## kai-mock-platform-adapter

### Purpose
Provides a mock PlatformProvider for testing skills and integration tests without requiring Docker or Kubernetes.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: platform
interface: PlatformProvider
entry: ./src/MockPlatformAdapter.ts
description: Mock adapter for testing

config:
  required: []
  optional:
    - namespaces: []       # Pre-populated namespaces
    - deployments: []      # Pre-populated deployments
    - containers: []       # Pre-populated containers
    - services: []         # Pre-populated services
    - simulateLatency: 0   # Simulated latency in ms
    - failureRate: 0       # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Test Helpers

```typescript
class MockPlatformAdapter implements PlatformProvider {
  // Standard interface methods...

  // Test helpers
  setNamespaces(namespaces: Namespace[]): void;
  addNamespace(namespace: Namespace): void;
  clearNamespaces(): void;

  setDeployments(deployments: Deployment[]): void;
  addDeployment(deployment: Deployment): void;
  updateDeployment(namespace: string, name: string, updates: Partial<Deployment>): void;
  clearDeployments(): void;

  setContainers(containers: Container[]): void;
  addContainer(container: Container): void;
  updateContainer(namespace: string, name: string, updates: Partial<Container>): void;
  clearContainers(): void;

  setServices(services: Service[]): void;
  addService(service: Service): void;
  clearServices(): void;

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

## kai-platform-skill

### Purpose
Provides user-facing workflows for container/deployment operations that work across any PlatformProvider backend.

### SKILL.md

```yaml
---
name: Platform
description: Container and deployment management across Docker, Kubernetes. USE WHEN containers, pods, deployments, services, namespaces, logs, scaling.
---

# Platform Skill

Unified container/deployment management across multiple platforms. Works with Docker (local), k3s (homelab), or enterprise Kubernetes (work).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| ListDeployments | "show deployments", "what's running" | Deployment list |
| DeploymentStatus | "pod status", "is it healthy" | Deployment details |
| ViewLogs | "show logs", "container output" | Log content |
| ScaleDeployment | "scale up", "add replicas" | Scaled deployment |
| RestartDeployment | "restart pods", "bounce service" | Restart confirmation |
| ExecCommand | "exec into", "run command" | Command output |

## CLI Tools

```bash
# List namespaces
bun run Tools/namespaces.ts [--format table|json]

# List deployments
bun run Tools/deployments.ts [--namespace <ns>] [--format table|json]

# Get deployment details
bun run Tools/deployment.ts <namespace> <name>

# Scale deployment
bun run Tools/scale.ts <namespace> <name> <replicas>

# Restart deployment
bun run Tools/restart.ts <namespace> <name>

# List containers/pods
bun run Tools/containers.ts [--namespace <ns>] [--deployment <name>]

# Get container logs
bun run Tools/logs.ts <namespace> <container> [--tail 100] [--since 1h]

# Exec command
bun run Tools/exec.ts <namespace> <container> -- <command...>

# List services
bun run Tools/services.ts [--namespace <ns>]

# Resource usage
bun run Tools/resources.ts [--namespace <ns>] [--name <container>]

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  platform:
    primary: kubernetes    # Default backend
    fallback: docker       # If primary fails
    adapters:
      kubernetes:
        context: home-k3s  # Kubeconfig context
        namespace: default
      docker:
        socketPath: /var/run/docker.sock
```
```

### Workflows

1. **ListDeployments.md** - List deployments with status
2. **DeploymentStatus.md** - Detailed deployment health
3. **ViewLogs.md** - Stream or fetch container logs
4. **ScaleDeployment.md** - Scale deployment replicas
5. **RestartDeployment.md** - Rolling restart of pods
6. **ExecCommand.md** - Execute command in container

---

## Implementation Checklist

### Phase 5.1: kai-platform-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define PlatformProvider interface in src/interfaces/
- [ ] Define Namespace, Deployment, Container, Service, Resource types
- [ ] Implement adapter discovery with 60s caching
- [ ] Implement cache invalidation function
- [ ] Implement config loading with precedence
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff
- [ ] Add domain-specific error classes
- [ ] Add audit logging
- [ ] Write unit tests for each module
- [ ] Create VERIFY.md and verify all items

### Phase 5.2: kai-mock-platform-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockPlatformAdapter class with test helpers
- [ ] Implement namespace/deployment/container/service CRUD
- [ ] Implement logs and exec simulation
- [ ] Implement resource usage simulation
- [ ] Implement simulated latency
- [ ] Implement simulated failures
- [ ] Implement call logging for verification
- [ ] Create tests/fixtures.ts with factory functions
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify all items

### Phase 5.3: kai-docker-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement DockerAdapter class
- [ ] Implement Docker Engine API client
- [ ] Implement namespace mapping via labels/Compose
- [ ] Implement container listing and management
- [ ] Implement logs streaming
- [ ] Implement exec with multiplexed streams
- [ ] Handle Compose service grouping
- [ ] Write unit tests with mocked Docker API
- [ ] Create VERIFY.md and verify all items

### Phase 5.4: kai-k8s-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement K8sAdapter class
- [ ] Implement kubeconfig parsing and context switching
- [ ] Implement namespace operations
- [ ] Implement deployment operations (CRUD, scale, restart)
- [ ] Implement pod listing and management
- [ ] Implement service listing
- [ ] Implement logs via pod log API
- [ ] Implement exec via WebSocket
- [ ] Implement port-forward via WebSocket
- [ ] Implement metrics query
- [ ] Write unit tests with mocked K8s API
- [ ] Create VERIFY.md and verify all items

### Phase 5.5: kai-platform-skill
- [ ] Create package structure
- [ ] Create SKILL.md with workflow routing
- [ ] Create CLI tools in Tools/
- [ ] Create workflow documentation in Workflows/
- [ ] Write integration tests using mock adapter
- [ ] Create VERIFY.md and verify all items

### Phase 5.6: Integration Testing
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → Docker adapter (if Docker available)
- [ ] End-to-end test: skill → core → K8s adapter (if k3s available)
- [ ] Verify fallback chain works
- [ ] Verify audit logging captures all operations
- [ ] Test retry behavior with flaky mock adapter
- [ ] Update SESSION-CONTEXT.md with Phase 5 completion

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference implementation (Phase 1)
- [NETWORK-DOMAIN.md](./NETWORK-DOMAIN.md) - Reference implementation (Phase 2)
- [ISSUES-DOMAIN.md](./ISSUES-DOMAIN.md) - Reference implementation (Phase 3)
- [CICD-DOMAIN.md](./CICD-DOMAIN.md) - Reference implementation (Phase 4)
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
