// Main exports for kai-containers-core

// Types
export {
  type Namespace,
  type NamespaceStatus,
  type Deployment,
  type DeploymentStatus,
  type Container,
  type ContainerStatus,
  type ContainerQuery,
  type LogOptions,
  type ExecResult,
  type PortInfo,
  type ResourceSpec,
  type ResourceQuantity,
  type Service,
  type ServiceType,
  type ServicePort,
  type PortMapping,
  type PortForwardHandle,
  type ResourceUsage,
  type ResourceMetric,
  type HealthStatus,
} from './types/index.ts';

// Interfaces
export { type PlatformProvider } from './interfaces/index.ts';

// Discovery
export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  type AdapterManifest,
  loadConfig,
  getPlatformConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  type AuthReference,
  type AdapterConfig,
  type DomainConfig,
  type ProvidersConfig,
  getPlatformProvider,
  getPlatformProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './discovery/index.ts';

// Errors
export {
  PlatformError,
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError,
  ExecError,
  ScaleError,
  ConnectionError,
} from './utils/errors.ts';

// Utilities
export { withRetry, type RetryOptions } from './utils/retry.ts';
export {
  type AuditLogEntry,
  type AuditLogger,
  ConsoleAuditLogger,
  NoopAuditLogger,
  createLogEntry,
} from './utils/logger.ts';
