/**
 * Container/pod instance
 */
export interface Container {
  /** Container/pod ID */
  id: string;

  /** Container/pod name */
  name: string;

  /** Namespace the container belongs to */
  namespace: string;

  /** Container image */
  image: string;

  /** Current status */
  status: ContainerStatus;

  /** Whether the container is ready */
  ready: boolean;

  /** Number of restarts */
  restartCount: number;

  /** When the container started */
  startedAt?: Date;

  /** Exposed ports */
  ports?: PortInfo[];

  /** Resource configuration */
  resources?: ResourceSpec;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Container status
 */
export type ContainerStatus = 'running' | 'pending' | 'succeeded' | 'failed' | 'unknown';

/**
 * Query options for listing containers
 */
export interface ContainerQuery {
  /** Filter by deployment/service name */
  deployment?: string;

  /** Kubernetes label selector (e.g., "app=nginx") */
  labelSelector?: string;

  /** Filter by status */
  status?: ContainerStatus;

  /** Maximum number of results */
  limit?: number;
}

/**
 * Options for log retrieval
 */
export interface LogOptions {
  /** Number of lines from end */
  tail?: number;

  /** Duration like "1h", "30m" */
  since?: string;

  /** Stream logs (returns ReadableStream if true) */
  follow?: boolean;

  /** Include timestamps */
  timestamps?: boolean;

  /** Specific container in multi-container pod */
  container?: string;
}

/**
 * Command execution result
 */
export interface ExecResult {
  /** Exit code of the command */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;
}

/**
 * Port information for a container
 */
export interface PortInfo {
  /** Port inside the container */
  containerPort: number;

  /** Protocol */
  protocol: 'TCP' | 'UDP';

  /** Port on the host (if mapped) */
  hostPort?: number;
}

/**
 * Resource requests and limits
 */
export interface ResourceSpec {
  /** Requested resources */
  requests?: ResourceQuantity;

  /** Maximum resources */
  limits?: ResourceQuantity;
}

/**
 * CPU and memory quantities
 */
export interface ResourceQuantity {
  /** CPU (e.g., "100m", "0.5", "2") */
  cpu?: string;

  /** Memory (e.g., "128Mi", "1Gi") */
  memory?: string;
}
