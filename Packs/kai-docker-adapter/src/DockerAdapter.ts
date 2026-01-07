import type {
  PlatformProvider,
  Namespace,
  Deployment,
  Container,
  ContainerQuery,
  LogOptions,
  ExecResult,
  Service,
  ResourceUsage,
  HealthStatus,
} from 'kai-platform-core';
import {
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  AuthenticationError,
  ProviderError,
  ConfigurationError,
  ExecError,
  ScaleError,
} from 'kai-platform-core';

/**
 * Configuration for DockerAdapter
 */
export interface DockerConfig {
  socketPath?: string;
  host?: string;
  composeProject?: string;
}

/**
 * Docker API container response
 */
interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Labels: Record<string, string>;
  Created: number;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
}

/**
 * Docker API container inspect response
 */
interface DockerContainerInspect {
  Id: string;
  Name: string;
  State: {
    Status: string;
    Running: boolean;
    ExitCode: number;
    StartedAt: string;
    FinishedAt: string;
  };
  Config: {
    Image: string;
    Labels: Record<string, string>;
  };
  HostConfig: {
    RestartPolicy: { Name: string };
  };
  NetworkSettings: {
    Ports: Record<string, Array<{ HostPort: string }> | null>;
  };
}

/**
 * Docker API exec response
 */
interface DockerExecCreate {
  Id: string;
}

/**
 * DockerAdapter - Docker Engine implementation of PlatformProvider
 */
export default class DockerAdapter implements PlatformProvider {
  readonly name = 'docker';
  readonly version = '1.0.0';

  private socketPath: string;
  private host?: string;
  private composeProject?: string;

  constructor(config?: DockerConfig) {
    this.socketPath = config?.socketPath ?? '/var/run/docker.sock';
    this.host = config?.host;
    this.composeProject = config?.composeProject;
  }

  /**
   * Make Docker API request via Unix socket
   */
  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.host
      ? `${this.host}${path}`
      : `http://localhost${path}`;

    // For Unix socket, we need to use a different approach
    if (!this.host) {
      return this.unixSocketFetch<T>(path, options);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Docker API authentication failed', 'docker');
    }

    if (response.status === 404) {
      throw new ProviderError(`Not found: ${path}`, 'docker');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderError(`Docker API error: ${response.status} - ${text}`, 'docker');
    }

    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  }

  /**
   * Make request via Unix socket using Bun's native support
   */
  private async unixSocketFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `http://localhost${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        // @ts-expect-error - Bun supports unix socket option
        unix: this.socketPath,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 404) {
        throw new ProviderError(`Not found: ${path}`, 'docker');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new ProviderError(`Docker API error: ${response.status} - ${text}`, 'docker');
      }

      const text = await response.text();
      if (!text) return {} as T;

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new ConfigurationError(
          `Docker socket not found at ${this.socketPath}. Is Docker running?`,
          'docker'
        );
      }

      throw new ProviderError(`Docker API error: ${error}`, 'docker');
    }
  }

  /**
   * Get namespace from container labels
   */
  private getNamespace(labels: Record<string, string>): string {
    // Compose project
    if (labels['com.docker.compose.project']) {
      return labels['com.docker.compose.project'];
    }
    // Custom label
    if (labels['kai.namespace']) {
      return labels['kai.namespace'];
    }
    return 'default';
  }

  /**
   * Get deployment from container labels
   */
  private getDeployment(labels: Record<string, string>): string | undefined {
    // Compose service
    if (labels['com.docker.compose.service']) {
      return labels['com.docker.compose.service'];
    }
    // Custom label
    if (labels['kai.deployment']) {
      return labels['kai.deployment'];
    }
    return undefined;
  }

  /**
   * Map Docker container to Platform Container
   */
  private mapContainer(dc: DockerContainer): Container {
    const name = dc.Names[0]?.replace(/^\//, '') || dc.Id.slice(0, 12);
    const labels = dc.Labels || {};

    return {
      id: dc.Id,
      name,
      namespace: this.getNamespace(labels),
      image: dc.Image,
      status: this.mapStatus(dc.State),
      ready: dc.State === 'running',
      restartCount: 0, // Not available in list API
      startedAt: new Date(dc.Created * 1000),
      ports: dc.Ports?.map(p => ({
        containerPort: p.PrivatePort,
        hostPort: p.PublicPort,
        protocol: p.Type.toUpperCase() as 'TCP' | 'UDP'
      })),
      metadata: { labels }
    };
  }

  /**
   * Map Docker state to ContainerStatus
   */
  private mapStatus(state: string): Container['status'] {
    switch (state.toLowerCase()) {
      case 'running':
        return 'running';
      case 'created':
      case 'restarting':
        return 'pending';
      case 'exited':
        return 'succeeded';
      case 'dead':
      case 'removing':
        return 'failed';
      default:
        return 'unknown';
    }
  }

  // ==================== PlatformProvider Implementation ====================

  async listNamespaces(): Promise<Namespace[]> {
    const containers = await this.fetch<DockerContainer[]>('/containers/json?all=true');

    // Collect unique namespaces from container labels
    const namespaceSet = new Set<string>();
    namespaceSet.add('default');

    for (const container of containers) {
      const ns = this.getNamespace(container.Labels || {});
      namespaceSet.add(ns);
    }

    // Filter by compose project if configured
    if (this.composeProject) {
      namespaceSet.clear();
      namespaceSet.add(this.composeProject);
    }

    return Array.from(namespaceSet).map(name => ({
      name,
      status: 'active' as const
    }));
  }

  async getNamespace(name: string): Promise<Namespace> {
    const namespaces = await this.listNamespaces();
    const ns = namespaces.find(n => n.name === name);
    if (!ns) {
      throw new NamespaceNotFoundError(name, 'docker');
    }
    return ns;
  }

  async listDeployments(namespace: string): Promise<Deployment[]> {
    const containers = await this.fetch<DockerContainer[]>('/containers/json?all=true');

    // Group by deployment (compose service or label)
    const deploymentMap = new Map<string, DockerContainer[]>();

    for (const container of containers) {
      const containerNs = this.getNamespace(container.Labels || {});
      if (containerNs !== namespace) continue;

      const deployment = this.getDeployment(container.Labels || {});
      if (deployment) {
        const existing = deploymentMap.get(deployment) || [];
        existing.push(container);
        deploymentMap.set(deployment, existing);
      }
    }

    return Array.from(deploymentMap.entries()).map(([name, containers]) => {
      const running = containers.filter(c => c.State === 'running').length;
      const image = containers[0]?.Image || 'unknown';

      return {
        name,
        namespace,
        replicas: containers.length,
        availableReplicas: running,
        readyReplicas: running,
        status: running === containers.length ? 'running' : 'pending',
        image
      } as Deployment;
    });
  }

  async getDeployment(namespace: string, name: string): Promise<Deployment> {
    const deployments = await this.listDeployments(namespace);
    const dep = deployments.find(d => d.name === name);
    if (!dep) {
      throw new DeploymentNotFoundError(name, 'docker');
    }
    return dep;
  }

  async scaleDeployment(namespace: string, name: string, replicas: number): Promise<Deployment> {
    // Check if it's a Compose service
    const deployment = await this.getDeployment(namespace, name);

    // Docker standalone containers can't be scaled
    // This would require docker compose or swarm
    throw new ScaleError(
      name,
      'Scaling requires Docker Compose or Swarm mode. Use `docker compose scale` instead.',
      'docker'
    );
  }

  async restartDeployment(namespace: string, name: string): Promise<void> {
    // Find all containers for this deployment
    const containers = await this.listContainers(namespace, { deployment: name });

    if (containers.length === 0) {
      throw new DeploymentNotFoundError(name, 'docker');
    }

    // Restart each container
    for (const container of containers) {
      await this.fetch(`/containers/${container.id}/restart`, { method: 'POST' });
    }
  }

  async listContainers(namespace: string, options?: ContainerQuery): Promise<Container[]> {
    const all = options?.status !== 'running';
    const containers = await this.fetch<DockerContainer[]>(`/containers/json?all=${all}`);

    let result = containers
      .map(c => this.mapContainer(c))
      .filter(c => c.namespace === namespace);

    if (options?.deployment) {
      result = result.filter(c => {
        const labels = (c.metadata?.labels as Record<string, string>) || {};
        return this.getDeployment(labels) === options.deployment;
      });
    }

    if (options?.status) {
      result = result.filter(c => c.status === options.status);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  async getContainer(namespace: string, name: string): Promise<Container> {
    try {
      // Try to get by name or ID
      const inspect = await this.fetch<DockerContainerInspect>(`/containers/${name}/json`);

      const labels = inspect.Config.Labels || {};
      const containerNs = this.getNamespace(labels);

      if (containerNs !== namespace) {
        throw new ContainerNotFoundError(name, 'docker');
      }

      return {
        id: inspect.Id,
        name: inspect.Name.replace(/^\//, ''),
        namespace: containerNs,
        image: inspect.Config.Image,
        status: this.mapStatus(inspect.State.Status),
        ready: inspect.State.Running,
        restartCount: 0,
        startedAt: new Date(inspect.State.StartedAt),
        metadata: { labels }
      };
    } catch (error) {
      if (error instanceof ContainerNotFoundError) throw error;
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new ContainerNotFoundError(name, 'docker');
      }
      throw error;
    }
  }

  async getContainerLogs(namespace: string, name: string, options?: LogOptions): Promise<string> {
    // Verify container exists and is in namespace
    await this.getContainer(namespace, name);

    const params = new URLSearchParams();
    params.set('stdout', 'true');
    params.set('stderr', 'true');

    if (options?.tail) {
      params.set('tail', options.tail.toString());
    }
    if (options?.since) {
      // Convert duration to timestamp
      const duration = this.parseDuration(options.since);
      const since = Math.floor((Date.now() - duration) / 1000);
      params.set('since', since.toString());
    }
    if (options?.timestamps) {
      params.set('timestamps', 'true');
    }

    const response = await this.fetch<string>(`/containers/${name}/logs?${params}`);

    // Docker logs may have stream headers, strip them for clean output
    return this.cleanLogs(response);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private cleanLogs(logs: string | object): string {
    if (typeof logs !== 'string') return '';
    // Docker multiplexed stream format has 8-byte header per frame
    // For simplicity, we return as-is (may need binary stream handling for full cleanup)
    return logs;
  }

  async execInContainer(namespace: string, name: string, command: string[]): Promise<ExecResult> {
    // Verify container exists
    await this.getContainer(namespace, name);

    try {
      // Create exec instance
      const exec = await this.fetch<DockerExecCreate>(`/containers/${name}/exec`, {
        method: 'POST',
        body: JSON.stringify({
          AttachStdout: true,
          AttachStderr: true,
          Cmd: command
        })
      });

      // Start exec and capture output
      const response = await this.fetch<{ ExitCode: number }>(`/exec/${exec.Id}/start`, {
        method: 'POST',
        body: JSON.stringify({ Detach: false })
      });

      // Get exec inspect for exit code
      const inspect = await this.fetch<{ ExitCode: number }>(`/exec/${exec.Id}/json`);

      return {
        exitCode: inspect.ExitCode,
        stdout: '', // Would need stream handling for actual output
        stderr: ''
      };
    } catch (error) {
      throw new ExecError(command.join(' '), 1, String(error), 'docker');
    }
  }

  async deleteContainer(namespace: string, name: string): Promise<void> {
    await this.getContainer(namespace, name);
    await this.fetch(`/containers/${name}?force=true`, { method: 'DELETE' });
  }

  async listServices(namespace: string): Promise<Service[]> {
    // Docker standalone doesn't have services like K8s
    // Map containers with exposed ports as "services"
    const containers = await this.listContainers(namespace);

    return containers
      .filter(c => c.ports && c.ports.length > 0)
      .map(c => ({
        name: c.name,
        namespace: c.namespace,
        type: 'ClusterIP' as const,
        ports: c.ports!.map(p => ({
          port: p.hostPort || p.containerPort,
          targetPort: p.containerPort,
          protocol: p.protocol
        })),
        createdAt: c.startedAt
      }));
  }

  async getService(namespace: string, name: string): Promise<Service> {
    const services = await this.listServices(namespace);
    const svc = services.find(s => s.name === name);
    if (!svc) {
      throw new ServiceNotFoundError(name, 'docker');
    }
    return svc;
  }

  async getResourceUsage(namespace: string, name?: string): Promise<ResourceUsage> {
    if (name) {
      // Get stats for specific container
      const stats = await this.fetch<{
        cpu_stats: { cpu_usage: { total_usage: number } };
        memory_stats: { usage: number; limit: number };
      }>(`/containers/${name}/stats?stream=false`);

      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 1;

      return {
        namespace,
        container: name,
        cpu: { used: '0m', percentage: 0 }, // CPU calculation requires delta
        memory: {
          used: this.formatBytes(memoryUsage),
          limit: this.formatBytes(memoryLimit),
          percentage: Math.round((memoryUsage / memoryLimit) * 100)
        },
        timestamp: new Date()
      };
    }

    // Aggregate for namespace (simplified)
    return {
      namespace,
      cpu: { used: '0m' },
      memory: { used: '0Mi' },
      timestamp: new Date()
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}Ki`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}Mi`;
    return `${Math.round(bytes / (1024 * 1024 * 1024))}Gi`;
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      await this.fetch<{ ApiVersion: string }>('/version');

      return {
        healthy: true,
        message: 'Docker Engine is accessible',
        latencyMs: Date.now() - startTime,
        details: { socketPath: this.socketPath }
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
        details: { socketPath: this.socketPath }
      };
    }
  }
}
