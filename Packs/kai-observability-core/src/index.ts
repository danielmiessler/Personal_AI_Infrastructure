// Main exports for kai-observability-core

// Types
export {
  type MetricSample,
  type MetricSeries,
  type QueryResult,
  type InstantQueryOptions,
  type RangeQueryOptions,
  type MetricNamesOptions,
  type LabelValuesOptions,
  type Alert,
  type AlertRule,
  type AlertState,
  type AlertSeverity,
  type AlertQuery,
  type AlertRuleQuery,
  type Target,
  type TargetHealth,
  type TargetQuery,
  type HealthStatus,
} from './types/index.ts';

// Interfaces
export { type ObservabilityProvider } from './interfaces/index.ts';

// Discovery
export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  type AdapterManifest,
  loadConfig,
  getObservabilityConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  type AuthReference,
  type AdapterConfig,
  type DomainConfig,
  type ProvidersConfig,
  getObservabilityProvider,
  getObservabilityProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './discovery/index.ts';

// Errors
export {
  ObservabilityError,
  QueryError,
  QueryTimeoutError,
  AlertNotFoundError,
  MetricNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ConnectionError,
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
