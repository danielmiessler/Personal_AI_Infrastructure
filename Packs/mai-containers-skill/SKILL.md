---
name: Containers
description: Container and deployment management. USE WHEN managing containers, pods, deployments, namespaces, or services in Docker or Kubernetes.
triggers:
  - containers
  - pods
  - deployments
  - namespaces
  - services
  - docker
  - kubernetes
  - k8s
  - k3s
  - scale
  - restart
  - logs
tools:
  - Namespaces
  - Deployments
  - Containers
  - Services
  - Health
workflows:
  - DeploymentStatus
  - ServiceHealth
  - ContainerLogs
  - ScaleDeployment
  - NamespaceOverview
---

# Containers Skill

Container orchestration and deployment management for Docker and Kubernetes.

## Capabilities

- **Namespace Management**: List, create, delete namespaces
- **Deployment Operations**: Scale, restart, monitor deployments
- **Container Inspection**: View logs, status, resource usage
- **Service Discovery**: List services, check endpoints
- **Health Monitoring**: Cluster and workload health checks

## Quick Commands

| Command | Description |
|---------|-------------|
| `namespaces` | List all namespaces |
| `deployments [ns]` | List deployments in namespace |
| `containers [ns]` | List containers/pods in namespace |
| `logs [ns] [name]` | View container logs |
| `scale [ns] [name] [replicas]` | Scale a deployment |
| `restart [ns] [name]` | Restart a deployment |
| `services [ns]` | List services in namespace |
| `health` | Check platform health |

## Provider Selection

The skill automatically selects the appropriate provider based on your `providers.yaml` configuration:

```yaml
domains:
  containers:
    primary: kubernetes  # or 'docker'
    adapters:
      kubernetes:
        kubeconfig: ~/.kube/config
        context: home-cluster
      docker:
        socketPath: /var/run/docker.sock
```

## Workflow Routing

| Workflow | When to Use | Reference |
|----------|-------------|-----------|
| DeploymentStatus | "deployment status", "check deployments", "what's deployed" | `Workflows/DeploymentStatus.md` |
| ServiceHealth | "service health", "check services", "endpoints status" | `Workflows/ServiceHealth.md` |
| ContainerLogs | "container logs", "pod logs", "why is it crashing" | `Workflows/ContainerLogs.md` |
| ScaleDeployment | "scale deployment", "scale up", "scale down", "stop deployment" | `Workflows/ScaleDeployment.md` |
| NamespaceOverview | "namespace overview", "what's in namespace", "what's running" | `Workflows/NamespaceOverview.md` |

## Example Usage

```
Check the status of all deployments in the production namespace
Scale the nginx deployment to 3 replicas in default namespace
Show me the last 100 lines of logs from the api-server pod
Restart the backend deployment in the staging namespace
```

## Dependencies

- **Required**: `mai-containers-core`
- **Adapters**: At least one of `mai-docker-adapter` or `mai-k8s-adapter`
