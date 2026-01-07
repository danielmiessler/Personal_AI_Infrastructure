// Main exports for kai-issues-core

// Types
export {
  type Issue,
  type IssueStatus,
  type IssueType,
  type IssuePriority,
  type Label,
  type Project,
  type CreateIssueInput,
  type UpdateIssueInput,
  type IssueQuery,
  type SearchOptions,
  type HealthStatus,
} from './types/index.ts';

// Interfaces
export { type IssuesProvider } from './interfaces/index.ts';

// Discovery
export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  type AdapterManifest,
  loadConfig,
  getIssuesConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  type AuthReference,
  type AdapterConfig,
  type DomainConfig,
  type ProvidersConfig,
  getIssuesProvider,
  getIssuesProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './discovery/index.ts';

// Errors
export {
  IssuesError,
  IssueNotFoundError,
  ProjectNotFoundError,
  LabelNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError,
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
