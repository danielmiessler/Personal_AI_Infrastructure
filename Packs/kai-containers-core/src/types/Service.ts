/**
 * Service definition
 */
export interface Service {
  /** Service name */
  name: string;

  /** Namespace the service belongs to */
  namespace: string;

  /** Service type */
  type: ServiceType;

  /** Cluster-internal IP */
  clusterIP?: string;

  /** External IP (for LoadBalancer/NodePort) */
  externalIP?: string;

  /** Service ports */
  ports: ServicePort[];

  /** Pod selector labels */
  selector?: Record<string, string>;

  /** Creation timestamp */
  createdAt?: Date;
}

/**
 * Service type
 */
export type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';

/**
 * Service port configuration
 */
export interface ServicePort {
  /** Port name (optional) */
  name?: string;

  /** Service port */
  port: number;

  /** Target port on pods */
  targetPort: number;

  /** Node port (for NodePort/LoadBalancer) */
  nodePort?: number;

  /** Protocol */
  protocol: 'TCP' | 'UDP';
}

/**
 * Port mapping for port forwarding
 */
export interface PortMapping {
  /** Local port */
  local: number;

  /** Remote port */
  remote: number;
}

/**
 * Handle to manage active port forward
 */
export interface PortForwardHandle {
  /** Actual local port (may differ from requested) */
  localPort: number;

  /** Close the port forward */
  close(): Promise<void>;
}
