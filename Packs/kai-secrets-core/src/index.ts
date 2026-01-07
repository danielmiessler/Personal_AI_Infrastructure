/**
 * kai-secrets-core
 *
 * Core interfaces and utilities for the PAI Secrets domain.
 * Provides a vendor-neutral abstraction over secrets management systems.
 *
 * @packageDocumentation
 */

// Interfaces
export type {
  Secret,
  SecretMetadata,
  GetOptions,
  ListOptions,
  HealthStatus,
  SecretsProvider
} from './interfaces/index.ts';

// Types
export { SecretValue } from './types/index.ts';

// Auth
export type { AuthType, AuthReference } from './auth/index.ts';
export { resolveAuth } from './auth/index.ts';

// Discovery
export type {
  AdapterManifest,
  AdapterConfig,
  DomainConfig,
  ProvidersConfig,
  ProviderOptions
} from './discovery/index.ts';
export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  loadConfig,
  getSecretsConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  getSecretsProvider,
  getSecretsProviderWithFallback,
  listAvailableAdapters
} from './discovery/index.ts';

// Utils
export {
  SecretsError,
  SecretNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  ProviderError
} from './utils/index.ts';
export type { RetryOptions, AuditLogEntry, AuditLogger } from './utils/index.ts';
export {
  withRetry,
  ConsoleAuditLogger,
  NoOpLogger,
  setAuditLogger,
  getAuditLogger,
  logAudit
} from './utils/index.ts';
