import type { SecretValue } from '../types/SecretValue.ts';

/**
 * Secret - A retrieved secret with its value and optional metadata
 */
export interface Secret {
  /** Secret identifier/key */
  key: string;
  /** Secret value (wrapped to prevent accidental exposure) */
  value: SecretValue;
  /** Optional metadata about the secret */
  metadata?: SecretMetadata;
}

/**
 * SecretMetadata - Additional information about a secret
 */
export interface SecretMetadata {
  /** When the secret was created */
  createdAt?: Date;
  /** When the secret was last modified */
  updatedAt?: Date;
  /** When the secret expires (if applicable) */
  expiresAt?: Date;
  /** Secret version identifier */
  version?: string;
  /** Custom tags/labels */
  tags?: Record<string, string>;
}

/**
 * GetOptions - Options for retrieving secrets
 */
export interface GetOptions {
  /** Environment/scope (e.g., 'production', 'development') */
  environment?: string;
  /** Project/workspace identifier */
  project?: string;
  /** Path prefix for hierarchical secrets */
  path?: string;
  /** Include metadata in response */
  includeMetadata?: boolean;
}

/**
 * ListOptions - Options for listing secrets
 */
export interface ListOptions extends GetOptions {
  /** Maximum number of results */
  limit?: number;
  /** Pagination cursor (for cursor-based pagination) */
  cursor?: string;
  /** Offset for results (for offset-based pagination) */
  offset?: number;
}

/**
 * HealthStatus - Result of a health check
 */
export interface HealthStatus {
  /** Whether the provider is healthy and accessible */
  healthy: boolean;
  /** Human-readable status message */
  message?: string;
  /** Response latency in milliseconds */
  latencyMs?: number;
  /** Additional diagnostic details */
  details?: Record<string, unknown>;
}

/**
 * SecretsProvider - Interface for secrets management backends
 *
 * Implementations provide access to secrets from various sources
 * (Keychain, Infisical, environment variables, etc.)
 */
export interface SecretsProvider {
  /** Provider identifier (e.g., 'infisical', 'keychain') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  /**
   * Retrieve a secret by key
   * @param key - Secret identifier
   * @param options - Optional retrieval options
   * @returns The secret with its value and metadata
   * @throws SecretNotFoundError if key doesn't exist
   * @throws AuthenticationError if credentials are invalid
   */
  get(key: string, options?: GetOptions): Promise<Secret>;

  /**
   * Retrieve multiple secrets by keys
   * @param keys - Array of secret identifiers
   * @param options - Optional retrieval options
   * @returns Map of key to secret (missing keys are omitted)
   */
  getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>>;

  /**
   * List secret keys matching a pattern
   * @param pattern - Glob pattern (e.g., 'api-*', 'database/*')
   * @param options - Optional listing options
   * @returns Array of matching secret keys
   */
  list(pattern?: string, options?: ListOptions): Promise<string[]>;

  /**
   * Check if provider is available and authenticated
   * @returns Health status with diagnostics
   */
  healthCheck(): Promise<HealthStatus>;
}
