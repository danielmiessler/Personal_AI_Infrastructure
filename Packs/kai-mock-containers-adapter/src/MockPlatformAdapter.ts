import type {
  PlatformProvider,
  Namespace,
  Deployment,
  Container,
  ContainerQuery,
  LogOptions,
  ExecResult,
  Service,
  PortMapping,
  PortForwardHandle,
  ResourceUsage,
  HealthStatus,
} from 'kai-containers-core';
import {
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  ProviderError,
  ScaleError,
} from 'kai-containers-core';

/**
 * Configuration for MockPlatformAdapter
 */
export interface MockPlatformConfig {
  namespaces?: Namespace[];
  deployments?: Deployment[];
  containers?: Container[];
  services?: Service[];
  simulateLatency?: number;
  failureRate?: number;
}

/**
 * Method call log entry
 */
export interface MethodCall {
  method: string;
  args: unknown[];
  timestamp: Date;
}

/**
 * MockPlatformAdapter - Mock implementation for testing
 */
export default class MockPlatformAdapter implements PlatformProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private namespaces: Map<string, Namespace> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private containers: Map<string, Container> = new Map();
  private services: Map<string, Service> = new Map();
  private logs: Map<string, string> = new Map();
  private execResults: Map<string, ExecResult> = new Map();
  private resourceUsage: Map<string, ResourceUsage> = new Map();
  private callLog: MethodCall[] = [];
  private latencyMs = 0;
  private failureRate = 0;

  constructor(config?: MockPlatformConfig) {
    if (config?.namespaces) {
      this.setNamespaces(config.namespaces);
    }
    if (config?.deployments) {
      this.setDeployments(config.deployments);
    }
    if (config?.containers) {
      this.setContainers(config.containers);
    }
    if (config?.services) {
      this.setServices(config.services);
    }
    if (config?.simulateLatency) {
      this.latencyMs = config.simulateLatency;
    }
    if (config?.failureRate) {
      this.failureRate = config.failureRate;
    }
  }

  // ==================== Helper Methods ====================

  private async simulateCall(method: string, args: unknown[]): Promise<void> {
    this.callLog.push({ method, args, timestamp: new Date() });

    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }

    if (this.failureRate > 0 && Math.random() * 100 < this.failureRate) {
      throw new ProviderError(`Simulated failure for ${method}`, 'mock');
    }
  }

  private getKey(namespace: string, name: string): string {
    return `${namespace}/${name}`;
  }

  // ==================== Test Helpers ====================

  setNamespaces(namespaces: Namespace[]): void {
    this.namespaces.clear();
    for (const ns of namespaces) {
      this.namespaces.set(ns.name, ns);
    }
  }

  addNamespace(namespace: Namespace): void {
    this.namespaces.set(namespace.name, namespace);
  }

  clearNamespaces(): void {
    this.namespaces.clear();
  }

  setDeployments(deployments: Deployment[]): void {
    this.deployments.clear();
    for (const dep of deployments) {
      this.deployments.set(this.getKey(dep.namespace, dep.name), dep);
    }
  }

  addDeployment(deployment: Deployment): void {
    this.deployments.set(this.getKey(deployment.namespace, deployment.name), deployment);
  }

  updateDeployment(namespace: string, name: string, updates: Partial<Deployment>): void {
    const key = this.getKey(namespace, name);
    const existing = this.deployments.get(key);
    if (existing) {
      this.deployments.set(key, { ...existing, ...updates });
    }
  }

  clearDeployments(): void {
    this.deployments.clear();
  }

  setContainers(containers: Container[]): void {
    this.containers.clear();
    for (const container of containers) {
      this.containers.set(this.getKey(container.namespace, container.name), container);
    }
  }

  addContainer(container: Container): void {
    this.containers.set(this.getKey(container.namespace, container.name), container);
  }

  updateContainer(namespace: string, name: string, updates: Partial<Container>): void {
    const key = this.getKey(namespace, name);
    const existing = this.containers.get(key);
    if (existing) {
      this.containers.set(key, { ...existing, ...updates });
    }
  }

  clearContainers(): void {
    this.containers.clear();
  }

  setServices(services: Service[]): void {
    this.services.clear();
    for (const svc of services) {
      this.services.set(this.getKey(svc.namespace, svc.name), svc);
    }
  }

  addService(service: Service): void {
    this.services.set(this.getKey(service.namespace, service.name), service);
  }

  clearServices(): void {
    this.services.clear();
  }

  setLogs(containerId: string, logs: string): void {
    this.logs.set(containerId, logs);
  }

  setExecResult(command: string, result: ExecResult): void {
    this.execResults.set(command, result);
  }

  setResourceUsage(namespace: string, usage: ResourceUsage): void {
    this.resourceUsage.set(namespace, usage);
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(100, rate));
  }

  setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }

  getCallLog(): MethodCall[] {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  // ==================== PlatformProvider Implementation ====================

  async listNamespaces(): Promise<Namespace[]> {
    await this.simulateCall('listNamespaces', []);
    return Array.from(this.namespaces.values());
  }

  async getNamespace(name: string): Promise<Namespace> {
    await this.simulateCall('getNamespace', [name]);
    const ns = this.namespaces.get(name);
    if (!ns) {
      throw new NamespaceNotFoundError(name, 'mock');
    }
    return ns;
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<Namespace> {
    await this.simulateCall('createNamespace', [name, labels]);
    const ns: Namespace = {
      name,
      status: 'active',
      labels,
      createdAt: new Date()
    };
    this.namespaces.set(name, ns);
    return ns;
  }

  async deleteNamespace(name: string): Promise<void> {
    await this.simulateCall('deleteNamespace', [name]);
    if (!this.namespaces.has(name)) {
      throw new NamespaceNotFoundError(name, 'mock');
    }
    this.namespaces.delete(name);
  }

  async listDeployments(namespace: string): Promise<Deployment[]> {
    await this.simulateCall('listDeployments', [namespace]);
    if (!this.namespaces.has(namespace) && this.namespaces.size > 0) {
      throw new NamespaceNotFoundError(namespace, 'mock');
    }
    return Array.from(this.deployments.values())
      .filter(d => d.namespace === namespace);
  }

  async getDeployment(namespace: string, name: string): Promise<Deployment> {
    await this.simulateCall('getDeployment', [namespace, name]);
    const dep = this.deployments.get(this.getKey(namespace, name));
    if (!dep) {
      throw new DeploymentNotFoundError(name, 'mock');
    }
    return dep;
  }

  async scaleDeployment(namespace: string, name: string, replicas: number): Promise<Deployment> {
    await this.simulateCall('scaleDeployment', [namespace, name, replicas]);
    const key = this.getKey(namespace, name);
    const dep = this.deployments.get(key);
    if (!dep) {
      throw new DeploymentNotFoundError(name, 'mock');
    }
    if (replicas < 0) {
      throw new ScaleError(name, 'Replicas cannot be negative', 'mock');
    }
    const updated = {
      ...dep,
      replicas,
      availableReplicas: replicas,
      readyReplicas: replicas,
      status: 'running' as const,
      updatedAt: new Date()
    };
    this.deployments.set(key, updated);
    return updated;
  }

  async restartDeployment(namespace: string, name: string): Promise<void> {
    await this.simulateCall('restartDeployment', [namespace, name]);
    const key = this.getKey(namespace, name);
    const dep = this.deployments.get(key);
    if (!dep) {
      throw new DeploymentNotFoundError(name, 'mock');
    }
    // Simulate restart by updating timestamp
    this.deployments.set(key, { ...dep, updatedAt: new Date() });
  }

  async deleteDeployment(namespace: string, name: string): Promise<void> {
    await this.simulateCall('deleteDeployment', [namespace, name]);
    const key = this.getKey(namespace, name);
    if (!this.deployments.has(key)) {
      throw new DeploymentNotFoundError(name, 'mock');
    }
    this.deployments.delete(key);
  }

  async listContainers(namespace: string, options?: ContainerQuery): Promise<Container[]> {
    await this.simulateCall('listContainers', [namespace, options]);
    let containers = Array.from(this.containers.values())
      .filter(c => c.namespace === namespace);

    if (options?.status) {
      containers = containers.filter(c => c.status === options.status);
    }
    if (options?.limit) {
      containers = containers.slice(0, options.limit);
    }

    return containers;
  }

  async getContainer(namespace: string, name: string): Promise<Container> {
    await this.simulateCall('getContainer', [namespace, name]);
    const container = this.containers.get(this.getKey(namespace, name));
    if (!container) {
      throw new ContainerNotFoundError(name, 'mock');
    }
    return container;
  }

  async getContainerLogs(namespace: string, name: string, options?: LogOptions): Promise<string> {
    await this.simulateCall('getContainerLogs', [namespace, name, options]);
    const key = this.getKey(namespace, name);
    if (!this.containers.has(key)) {
      throw new ContainerNotFoundError(name, 'mock');
    }
    let logs = this.logs.get(key) || `Logs for ${name}`;

    if (options?.tail) {
      const lines = logs.split('\n');
      logs = lines.slice(-options.tail).join('\n');
    }

    return logs;
  }

  async execInContainer(namespace: string, name: string, command: string[]): Promise<ExecResult> {
    await this.simulateCall('execInContainer', [namespace, name, command]);
    const key = this.getKey(namespace, name);
    if (!this.containers.has(key)) {
      throw new ContainerNotFoundError(name, 'mock');
    }
    const cmdString = command.join(' ');
    const result = this.execResults.get(cmdString);
    if (result) {
      return result;
    }
    // Default success result
    return { exitCode: 0, stdout: `Executed: ${cmdString}`, stderr: '' };
  }

  async deleteContainer(namespace: string, name: string): Promise<void> {
    await this.simulateCall('deleteContainer', [namespace, name]);
    const key = this.getKey(namespace, name);
    if (!this.containers.has(key)) {
      throw new ContainerNotFoundError(name, 'mock');
    }
    this.containers.delete(key);
  }

  async listServices(namespace: string): Promise<Service[]> {
    await this.simulateCall('listServices', [namespace]);
    return Array.from(this.services.values())
      .filter(s => s.namespace === namespace);
  }

  async getService(namespace: string, name: string): Promise<Service> {
    await this.simulateCall('getService', [namespace, name]);
    const svc = this.services.get(this.getKey(namespace, name));
    if (!svc) {
      throw new ServiceNotFoundError(name, 'mock');
    }
    return svc;
  }

  async portForward(namespace: string, name: string, ports: PortMapping): Promise<PortForwardHandle> {
    await this.simulateCall('portForward', [namespace, name, ports]);
    const key = this.getKey(namespace, name);
    if (!this.services.has(key) && !this.containers.has(key)) {
      throw new ServiceNotFoundError(name, 'mock');
    }
    return {
      localPort: ports.local,
      close: async () => {}
    };
  }

  async getResourceUsage(namespace: string, name?: string): Promise<ResourceUsage> {
    await this.simulateCall('getResourceUsage', [namespace, name]);
    const key = name ? this.getKey(namespace, name) : namespace;
    const usage = this.resourceUsage.get(key);
    if (usage) {
      return usage;
    }
    // Default usage
    return {
      namespace,
      container: name,
      cpu: { used: '100m', requested: '200m', limit: '500m', percentage: 20 },
      memory: { used: '256Mi', requested: '512Mi', limit: '1Gi', percentage: 25 },
      timestamp: new Date()
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    await this.simulateCall('healthCheck', []);
    return {
      healthy: true,
      message: 'Mock adapter is healthy',
      latencyMs: this.latencyMs,
      details: {
        namespaces: this.namespaces.size,
        deployments: this.deployments.size,
        containers: this.containers.size,
        services: this.services.size
      }
    };
  }
}
