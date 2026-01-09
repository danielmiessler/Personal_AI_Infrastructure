/**
 * Deployment/service definition
 */
export interface Deployment {
  /** Deployment name */
  name: string;

  /** Namespace the deployment belongs to */
  namespace: string;

  /** Desired number of replicas */
  replicas: number;

  /** Number of available replicas */
  availableReplicas: number;

  /** Number of ready replicas */
  readyReplicas: number;

  /** Current status */
  status: DeploymentStatus;

  /** Container image */
  image: string;

  /** Labels for filtering/grouping */
  labels?: Record<string, string>;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Deployment status
 */
export type DeploymentStatus = 'running' | 'pending' | 'failed' | 'updating';
