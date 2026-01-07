// Type exports for kai-platform-core

export {
  type Namespace,
  type NamespaceStatus,
} from './Namespace.ts';

export {
  type Deployment,
  type DeploymentStatus,
} from './Deployment.ts';

export {
  type Container,
  type ContainerStatus,
  type ContainerQuery,
  type LogOptions,
  type ExecResult,
  type PortInfo,
  type ResourceSpec,
  type ResourceQuantity,
} from './Container.ts';

export {
  type Service,
  type ServiceType,
  type ServicePort,
  type PortMapping,
  type PortForwardHandle,
} from './Service.ts';

export {
  type ResourceUsage,
  type ResourceMetric,
  type HealthStatus,
} from './Resource.ts';
