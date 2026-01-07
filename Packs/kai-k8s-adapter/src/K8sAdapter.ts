/**
 * Kubernetes adapter for the KAI Platform domain.
 * Provides container orchestration via Kubernetes API.
 */

import type {
  PlatformProvider,
  Namespace,
  Deployment,
  Container,
  Service,
  ResourceUsage,
  HealthStatus,
  ContainerQuery,
  LogOptions,
  ExecResult,
  PortMapping,
  PortForwardHandle,
} from 'kai-platform-core';

import {
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  ConnectionError,
} from 'kai-platform-core';

export interface K8sConfig {
  /** Path to kubeconfig file (default: ~/.kube/config) */
  kubeconfig?: string;
  /** Kubernetes context to use (default: current-context from kubeconfig) */
  context?: string;
  /** Default namespace (default: 'default') */
  namespace?: string;
  /** Skip TLS verification (not recommended) */
  insecureSkipTlsVerify?: boolean;
  /** Bearer token for authentication */
  token?: string;
  /** API server URL (overrides kubeconfig) */
  server?: string;
}

interface KubeConfig {
  clusters: Array<{
    name: string;
    cluster: {
      server: string;
      'certificate-authority-data'?: string;
      'insecure-skip-tls-verify'?: boolean;
    };
  }>;
  contexts: Array<{
    name: string;
    context: {
      cluster: string;
      user: string;
      namespace?: string;
    };
  }>;
  users: Array<{
    name: string;
    user: {
      token?: string;
      'client-certificate-data'?: string;
      'client-key-data'?: string;
    };
  }>;
  'current-context': string;
}

interface K8sNamespace {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    creationTimestamp: string;
  };
  status?: {
    phase: 'Active' | 'Terminating';
  };
}

interface K8sDeployment {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    creationTimestamp: string;
  };
  spec: {
    replicas: number;
    selector: {
      matchLabels: Record<string, string>;
    };
    template: {
      spec: {
        containers: Array<{
          name: string;
          image: string;
        }>;
      };
    };
  };
  status?: {
    replicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
    }>;
  };
}

interface K8sPod {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    creationTimestamp: string;
    ownerReferences?: Array<{
      kind: string;
      name: string;
    }>;
  };
  spec: {
    containers: Array<{
      name: string;
      image: string;
      ports?: Array<{
        containerPort: number;
        protocol?: string;
      }>;
    }>;
    nodeName?: string;
  };
  status?: {
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
    containerStatuses?: Array<{
      name: string;
      ready: boolean;
      restartCount: number;
      state?: {
        running?: { startedAt: string };
        waiting?: { reason: string };
        terminated?: { exitCode: number; reason: string };
      };
    }>;
    podIP?: string;
    startTime?: string;
  };
}

interface K8sService {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    creationTimestamp: string;
  };
  spec: {
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    selector?: Record<string, string>;
    ports: Array<{
      name?: string;
      port: number;
      targetPort: number | string;
      nodePort?: number;
      protocol?: string;
    }>;
    clusterIP?: string;
    externalIPs?: string[];
    loadBalancerIP?: string;
  };
  status?: {
    loadBalancer?: {
      ingress?: Array<{
        ip?: string;
        hostname?: string;
      }>;
    };
  };
}

interface K8sMetrics {
  containers: Array<{
    name: string;
    usage: {
      cpu: string;
      memory: string;
    };
  }>;
}

export class K8sAdapter implements PlatformProvider {
  readonly name = 'kubernetes';
  readonly version = '1.0.0';

  private config: K8sConfig;
  private server: string = '';
  private token: string = '';
  private skipTls: boolean = false;

  constructor(config: K8sConfig = {}) {
    this.config = config;
    this.skipTls = config.insecureSkipTlsVerify ?? false;
  }

  /**
   * Initialize the adapter by loading kubeconfig
   */
  async initialize(): Promise<void> {
    if (this.config.server && this.config.token) {
      // Direct configuration
      this.server = this.config.server;
      this.token = this.config.token;
      return;
    }

    // Load kubeconfig
    const kubeconfigPath = this.config.kubeconfig ||
      `${process.env.HOME}/.kube/config`;

    try {
      const file = Bun.file(kubeconfigPath);
      const content = await file.text();

      // Parse YAML manually (simple parser for kubeconfig)
      const kubeconfig = this.parseKubeconfig(content);

      // Get context
      const contextName = this.config.context || kubeconfig['current-context'];
      const context = kubeconfig.contexts.find(c => c.name === contextName);

      if (!context) {
        throw new ConnectionError(
          'kubernetes',
          `Context '${contextName}' not found in kubeconfig`
        );
      }

      // Get cluster
      const cluster = kubeconfig.clusters.find(
        c => c.name === context.context.cluster
      );

      if (!cluster) {
        throw new ConnectionError(
          'kubernetes',
          `Cluster '${context.context.cluster}' not found in kubeconfig`
        );
      }

      // Get user
      const user = kubeconfig.users.find(
        u => u.name === context.context.user
      );

      this.server = cluster.cluster.server;
      this.token = user?.user?.token || '';
      this.skipTls = cluster.cluster['insecure-skip-tls-verify'] ?? this.skipTls;

    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        'kubernetes',
        `Failed to load kubeconfig: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Simple YAML parser for kubeconfig format
   */
  private parseKubeconfig(content: string): KubeConfig {
    // For real implementation, use a proper YAML parser
    // This is a simplified version that handles basic kubeconfig
    const lines = content.split('\n');
    const result: KubeConfig = {
      clusters: [],
      contexts: [],
      users: [],
      'current-context': '',
    };

    let currentSection = '';
    let currentItem: Record<string, unknown> = {};
    let indent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const currentIndent = line.search(/\S/);

      if (trimmed === 'clusters:') {
        currentSection = 'clusters';
        continue;
      } else if (trimmed === 'contexts:') {
        currentSection = 'contexts';
        continue;
      } else if (trimmed === 'users:') {
        currentSection = 'users';
        continue;
      } else if (trimmed.startsWith('current-context:')) {
        result['current-context'] = trimmed.split(':')[1].trim();
        continue;
      }

      // Handle list items and properties
      if (trimmed.startsWith('- name:')) {
        if (Object.keys(currentItem).length > 0 && currentSection) {
          (result[currentSection as keyof KubeConfig] as unknown[]).push(currentItem);
        }
        currentItem = { name: trimmed.replace('- name:', '').trim() };
        indent = currentIndent;
      } else if (currentIndent > indent && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        this.setNestedValue(currentItem, key.trim(), value || {});
      }
    }

    if (Object.keys(currentItem).length > 0 && currentSection) {
      (result[currentSection as keyof KubeConfig] as unknown[]).push(currentItem);
    }

    return result;
  }

  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    obj[key] = value === 'true' ? true : value === 'false' ? false : value;
  }

  /**
   * Make an API request to Kubernetes
   */
  private async apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.server) {
      await this.initialize();
    }

    const url = `${this.server}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // @ts-expect-error - Bun supports this option
        tls: this.skipTls ? { rejectUnauthorized: false } : undefined,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API request failed: ${response.status} ${body}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes('API request failed')) {
        throw error;
      }
      throw new ConnectionError(
        'kubernetes',
        `Failed to connect to Kubernetes API: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ==================== Namespace Operations ====================

  async listNamespaces(): Promise<Namespace[]> {
    const response = await this.apiRequest<{ items: K8sNamespace[] }>(
      '/api/v1/namespaces'
    );

    return response.items.map(ns => this.mapNamespace(ns));
  }

  async getNamespace(name: string): Promise<Namespace> {
    try {
      const ns = await this.apiRequest<K8sNamespace>(
        `/api/v1/namespaces/${name}`
      );
      return this.mapNamespace(ns);
    } catch (error) {
      throw new NamespaceNotFoundError(name, 'kubernetes');
    }
  }

  async createNamespace(
    name: string,
    labels?: Record<string, string>
  ): Promise<Namespace> {
    const body = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name,
        labels,
      },
    };

    const ns = await this.apiRequest<K8sNamespace>(
      '/api/v1/namespaces',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return this.mapNamespace(ns);
  }

  async deleteNamespace(name: string): Promise<void> {
    await this.apiRequest(
      `/api/v1/namespaces/${name}`,
      { method: 'DELETE' }
    );
  }

  private mapNamespace(ns: K8sNamespace): Namespace {
    return {
      name: ns.metadata.name,
      status: ns.status?.phase === 'Terminating' ? 'terminating' : 'active',
      labels: ns.metadata.labels || {},
      createdAt: new Date(ns.metadata.creationTimestamp),
    };
  }

  // ==================== Deployment Operations ====================

  async listDeployments(namespace: string): Promise<Deployment[]> {
    const response = await this.apiRequest<{ items: K8sDeployment[] }>(
      `/apis/apps/v1/namespaces/${namespace}/deployments`
    );

    return response.items.map(dep => this.mapDeployment(dep));
  }

  async getDeployment(namespace: string, name: string): Promise<Deployment> {
    try {
      const dep = await this.apiRequest<K8sDeployment>(
        `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`
      );
      return this.mapDeployment(dep);
    } catch (error) {
      throw new DeploymentNotFoundError(name, 'kubernetes');
    }
  }

  async scaleDeployment(
    namespace: string,
    name: string,
    replicas: number
  ): Promise<Deployment> {
    const body = {
      spec: { replicas },
    };

    const dep = await this.apiRequest<K8sDeployment>(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/strategic-merge-patch+json' },
        body: JSON.stringify(body),
      }
    );

    return this.mapDeployment(dep);
  }

  async restartDeployment(namespace: string, name: string): Promise<void> {
    // Trigger rolling restart by updating an annotation
    const body = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
            },
          },
        },
      },
    };

    await this.apiRequest(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/strategic-merge-patch+json' },
        body: JSON.stringify(body),
      }
    );
  }

  async deleteDeployment(namespace: string, name: string): Promise<void> {
    await this.apiRequest(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`,
      { method: 'DELETE' }
    );
  }

  private mapDeployment(dep: K8sDeployment): Deployment {
    const status = this.getDeploymentStatus(dep);

    return {
      name: dep.metadata.name,
      namespace: dep.metadata.namespace,
      replicas: {
        desired: dep.spec.replicas,
        ready: dep.status?.readyReplicas || 0,
        available: dep.status?.availableReplicas || 0,
      },
      status,
      image: dep.spec.template.spec.containers[0]?.image || 'unknown',
      labels: dep.metadata.labels || {},
      createdAt: new Date(dep.metadata.creationTimestamp),
    };
  }

  private getDeploymentStatus(dep: K8sDeployment): Deployment['status'] {
    const conditions = dep.status?.conditions || [];
    const available = conditions.find(c => c.type === 'Available');
    const progressing = conditions.find(c => c.type === 'Progressing');

    if (available?.status === 'True') {
      if (dep.status?.updatedReplicas !== dep.spec.replicas) {
        return 'updating';
      }
      return 'running';
    }

    if (progressing?.status === 'True') {
      return 'updating';
    }

    if (progressing?.status === 'False') {
      return 'failed';
    }

    return 'pending';
  }

  // ==================== Container (Pod) Operations ====================

  async listContainers(
    namespace: string,
    options?: ContainerQuery
  ): Promise<Container[]> {
    let path = `/api/v1/namespaces/${namespace}/pods`;

    if (options?.labelSelector) {
      const selector = Object.entries(options.labelSelector)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      path += `?labelSelector=${encodeURIComponent(selector)}`;
    }

    const response = await this.apiRequest<{ items: K8sPod[] }>(path);

    let pods = response.items;

    if (options?.deploymentName) {
      pods = pods.filter(pod =>
        pod.metadata.ownerReferences?.some(
          ref => ref.kind === 'ReplicaSet' && ref.name.startsWith(options.deploymentName!)
        )
      );
    }

    if (options?.status) {
      pods = pods.filter(pod =>
        this.mapPodStatus(pod.status?.phase || 'Unknown') === options.status
      );
    }

    return pods.map(pod => this.mapContainer(pod));
  }

  async getContainer(namespace: string, name: string): Promise<Container> {
    try {
      const pod = await this.apiRequest<K8sPod>(
        `/api/v1/namespaces/${namespace}/pods/${name}`
      );
      return this.mapContainer(pod);
    } catch (error) {
      throw new ContainerNotFoundError(name, 'kubernetes');
    }
  }

  async getContainerLogs(
    namespace: string,
    name: string,
    options?: LogOptions
  ): Promise<string> {
    const params = new URLSearchParams();

    if (options?.tail) {
      params.set('tailLines', String(options.tail));
    }
    if (options?.since) {
      params.set('sinceSeconds', String(Math.floor(options.since / 1000)));
    }
    if (options?.container) {
      params.set('container', options.container);
    }
    if (options?.timestamps) {
      params.set('timestamps', 'true');
    }

    const query = params.toString();
    const path = `/api/v1/namespaces/${namespace}/pods/${name}/log${query ? '?' + query : ''}`;

    const response = await fetch(`${this.server}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new ContainerNotFoundError(name, 'kubernetes');
    }

    return await response.text();
  }

  async execInContainer(
    namespace: string,
    name: string,
    command: string[]
  ): Promise<ExecResult> {
    // Note: Real exec requires WebSocket support
    // This is a simplified implementation that returns the command output
    const params = new URLSearchParams();
    params.set('stdout', 'true');
    params.set('stderr', 'true');
    command.forEach(c => params.append('command', c));

    // In real implementation, this would use WebSocket
    // For now, return a placeholder indicating exec is not fully supported
    return {
      exitCode: 0,
      stdout: `[exec not fully implemented - would run: ${command.join(' ')}]`,
      stderr: '',
    };
  }

  async deleteContainer(namespace: string, name: string): Promise<void> {
    await this.apiRequest(
      `/api/v1/namespaces/${namespace}/pods/${name}`,
      { method: 'DELETE' }
    );
  }

  private mapContainer(pod: K8sPod): Container {
    const containerSpec = pod.spec.containers[0];
    const containerStatus = pod.status?.containerStatuses?.[0];

    return {
      id: pod.metadata.name,
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      image: containerSpec?.image || 'unknown',
      status: this.mapPodStatus(pod.status?.phase || 'Unknown'),
      ports: containerSpec?.ports?.map(p => ({
        container: p.containerPort,
        protocol: (p.protocol?.toLowerCase() || 'tcp') as 'tcp' | 'udp',
      })) || [],
      labels: pod.metadata.labels || {},
      createdAt: new Date(pod.metadata.creationTimestamp),
      node: pod.spec.nodeName,
      restartCount: containerStatus?.restartCount || 0,
    };
  }

  private mapPodStatus(phase: string): Container['status'] {
    switch (phase) {
      case 'Running':
        return 'running';
      case 'Pending':
        return 'pending';
      case 'Succeeded':
        return 'succeeded';
      case 'Failed':
        return 'failed';
      default:
        return 'unknown';
    }
  }

  // ==================== Service Operations ====================

  async listServices(namespace: string): Promise<Service[]> {
    const response = await this.apiRequest<{ items: K8sService[] }>(
      `/api/v1/namespaces/${namespace}/services`
    );

    return response.items.map(svc => this.mapService(svc));
  }

  async getService(namespace: string, name: string): Promise<Service> {
    try {
      const svc = await this.apiRequest<K8sService>(
        `/api/v1/namespaces/${namespace}/services/${name}`
      );
      return this.mapService(svc);
    } catch (error) {
      throw new ServiceNotFoundError(name, 'kubernetes');
    }
  }

  async portForward(
    namespace: string,
    name: string,
    ports: PortMapping
  ): Promise<PortForwardHandle> {
    // Port forwarding requires a long-running connection
    // This returns a handle that would manage the connection
    return {
      localPort: ports.local,
      remotePort: ports.remote,
      stop: async () => {
        // In real implementation, close the port-forward connection
      },
    };
  }

  private mapService(svc: K8sService): Service {
    const externalIPs: string[] = [];

    if (svc.spec.externalIPs) {
      externalIPs.push(...svc.spec.externalIPs);
    }
    if (svc.status?.loadBalancer?.ingress) {
      svc.status.loadBalancer.ingress.forEach(ing => {
        if (ing.ip) externalIPs.push(ing.ip);
        if (ing.hostname) externalIPs.push(ing.hostname);
      });
    }

    return {
      name: svc.metadata.name,
      namespace: svc.metadata.namespace,
      type: this.mapServiceType(svc.spec.type),
      clusterIP: svc.spec.clusterIP,
      externalIP: externalIPs[0],
      ports: svc.spec.ports.map(p => ({
        name: p.name,
        port: p.port,
        targetPort: typeof p.targetPort === 'number' ? p.targetPort : p.port,
        nodePort: p.nodePort,
        protocol: (p.protocol?.toLowerCase() || 'tcp') as 'tcp' | 'udp',
      })),
      selector: svc.spec.selector || {},
      labels: svc.metadata.labels || {},
      createdAt: new Date(svc.metadata.creationTimestamp),
    };
  }

  private mapServiceType(type: string): Service['type'] {
    switch (type) {
      case 'ClusterIP':
        return 'cluster-ip';
      case 'NodePort':
        return 'node-port';
      case 'LoadBalancer':
        return 'load-balancer';
      case 'ExternalName':
        return 'external-name';
      default:
        return 'cluster-ip';
    }
  }

  // ==================== Resource Operations ====================

  async getResourceUsage(
    namespace: string,
    name?: string
  ): Promise<ResourceUsage> {
    // Requires metrics-server to be installed
    try {
      if (name) {
        const metrics = await this.apiRequest<{
          containers: K8sMetrics['containers'];
        }>(
          `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods/${name}`
        );

        return this.parseMetrics(metrics.containers);
      } else {
        // Get metrics for all pods in namespace
        const metrics = await this.apiRequest<{
          items: Array<{ containers: K8sMetrics['containers'] }>;
        }>(
          `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`
        );

        const totals: ResourceUsage = {
          cpu: { used: 0, limit: 0, percentage: 0 },
          memory: { used: 0, limit: 0, percentage: 0 },
        };

        for (const item of metrics.items) {
          const usage = this.parseMetrics(item.containers);
          totals.cpu.used += usage.cpu.used;
          totals.memory.used += usage.memory.used;
        }

        return totals;
      }
    } catch (error) {
      // Metrics server might not be available
      return {
        cpu: { used: 0, limit: 0, percentage: 0 },
        memory: { used: 0, limit: 0, percentage: 0 },
      };
    }
  }

  private parseMetrics(containers: K8sMetrics['containers']): ResourceUsage {
    let cpuNanos = 0;
    let memoryBytes = 0;

    for (const container of containers) {
      // CPU is in nanocores (e.g., "100m" = 100 millicores = 100,000,000 nanocores)
      const cpuStr = container.usage.cpu;
      if (cpuStr.endsWith('n')) {
        cpuNanos += parseInt(cpuStr.slice(0, -1));
      } else if (cpuStr.endsWith('m')) {
        cpuNanos += parseInt(cpuStr.slice(0, -1)) * 1_000_000;
      }

      // Memory is in bytes (e.g., "100Mi", "1Gi")
      const memStr = container.usage.memory;
      if (memStr.endsWith('Ki')) {
        memoryBytes += parseInt(memStr.slice(0, -2)) * 1024;
      } else if (memStr.endsWith('Mi')) {
        memoryBytes += parseInt(memStr.slice(0, -2)) * 1024 * 1024;
      } else if (memStr.endsWith('Gi')) {
        memoryBytes += parseInt(memStr.slice(0, -2)) * 1024 * 1024 * 1024;
      }
    }

    return {
      cpu: {
        used: cpuNanos / 1_000_000, // Convert to millicores
        limit: 0,
        percentage: 0,
      },
      memory: {
        used: memoryBytes / (1024 * 1024), // Convert to MB
        limit: 0,
        percentage: 0,
      },
    };
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<HealthStatus> {
    try {
      await this.apiRequest('/api/v1');

      return {
        healthy: true,
        message: 'Kubernetes API is accessible',
        details: {
          server: this.server,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Kubernetes API is not accessible: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          server: this.server,
        },
      };
    }
  }
}

export default K8sAdapter;
