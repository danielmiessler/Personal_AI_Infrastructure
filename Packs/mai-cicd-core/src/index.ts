// Main exports for mai-cicd-core

// Types
export {
  type Pipeline,
  type Run,
  type RunStatus,
  type RunConclusion,
  type RunQuery,
  type TriggerOptions,
  type Job,
  type JobStatus,
  type Step,
  type Artifact,
  type HealthStatus,
} from './types/index.ts';

// Interfaces
export { type CICDProvider } from './interfaces/index.ts';

// Discovery
export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  type AdapterManifest,
  loadConfig,
  getCICDConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  type AuthReference,
  type AdapterConfig,
  type DomainConfig,
  type ProvidersConfig,
  getCICDProvider,
  getCICDProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './discovery/index.ts';

// Errors
export {
  CICDError,
  PipelineNotFoundError,
  RunNotFoundError,
  JobNotFoundError,
  ArtifactNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError,
  TriggerError,
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
