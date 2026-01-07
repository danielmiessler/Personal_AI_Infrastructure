import type {
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
} from '../types/index.ts';

/**
 * PlatformProvider interface for container/deployment operations
 *
 * Implementations provide access to container orchestration platforms
 * like Docker, Kubernetes, and others.
 */
export interface PlatformProvider {
  /** Provider identifier (e.g., 'docker', 'kubernetes') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // ==================== Namespace Operations ====================

  /**
   * List all namespaces/projects
   */
  listNamespaces(): Promise<Namespace[]>;

  /**
   * Get a specific namespace
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   */
  getNamespace(name: string): Promise<Namespace>;

  /**
   * Create a new namespace (optional)
   */
  createNamespace?(name: string, labels?: Record<string, string>): Promise<Namespace>;

  /**
   * Delete a namespace (optional)
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   */
  deleteNamespace?(name: string): Promise<void>;

  // ==================== Deployment Operations ====================

  /**
   * List deployments in a namespace
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   */
  listDeployments(namespace: string): Promise<Deployment[]>;

  /**
   * Get a specific deployment
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   * @throws {DeploymentNotFoundError} If deployment doesn't exist
   */
  getDeployment(namespace: string, name: string): Promise<Deployment>;

  /**
   * Scale a deployment to specified replicas
   * @throws {DeploymentNotFoundError} If deployment doesn't exist
   * @throws {ScaleError} If scaling fails
   */
  scaleDeployment(namespace: string, name: string, replicas: number): Promise<Deployment>;

  /**
   * Restart a deployment (rolling restart)
   * @throws {DeploymentNotFoundError} If deployment doesn't exist
   */
  restartDeployment(namespace: string, name: string): Promise<void>;

  /**
   * Delete a deployment (optional)
   * @throws {DeploymentNotFoundError} If deployment doesn't exist
   */
  deleteDeployment?(namespace: string, name: string): Promise<void>;

  // ==================== Container/Pod Operations ====================

  /**
   * List containers/pods in a namespace
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   */
  listContainers(namespace: string, options?: ContainerQuery): Promise<Container[]>;

  /**
   * Get a specific container/pod
   * @throws {ContainerNotFoundError} If container doesn't exist
   */
  getContainer(namespace: string, name: string): Promise<Container>;

  /**
   * Get container logs
   * @throws {ContainerNotFoundError} If container doesn't exist
   */
  getContainerLogs(namespace: string, name: string, options?: LogOptions): Promise<string>;

  /**
   * Execute a command in a container (optional)
   * @throws {ContainerNotFoundError} If container doesn't exist
   * @throws {ExecError} If command execution fails
   */
  execInContainer?(namespace: string, name: string, command: string[]): Promise<ExecResult>;

  /**
   * Delete a container/pod (optional)
   * @throws {ContainerNotFoundError} If container doesn't exist
   */
  deleteContainer?(namespace: string, name: string): Promise<void>;

  // ==================== Service Operations ====================

  /**
   * List services in a namespace
   * @throws {NamespaceNotFoundError} If namespace doesn't exist
   */
  listServices(namespace: string): Promise<Service[]>;

  /**
   * Get a specific service
   * @throws {ServiceNotFoundError} If service doesn't exist
   */
  getService(namespace: string, name: string): Promise<Service>;

  /**
   * Start port forwarding to a service (optional)
   * @returns Handle to close the port forward
   */
  portForward?(namespace: string, name: string, ports: PortMapping): Promise<PortForwardHandle>;

  // ==================== Resource Monitoring ====================

  /**
   * Get resource usage for a namespace or specific container
   */
  getResourceUsage(namespace: string, name?: string): Promise<ResourceUsage>;

  // ==================== Health Check ====================

  /**
   * Check if the provider is available and working
   */
  healthCheck(): Promise<HealthStatus>;
}
