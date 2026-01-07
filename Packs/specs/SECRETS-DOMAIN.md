# Secrets Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-06
**Phase**: 1 (First domain implementation)

---

## Overview

The Secrets domain provides unified access to credentials, API tokens, and sensitive configuration across multiple backends. This is the first domain implemented and serves as the reference implementation for the three-layer architecture pattern.

### Goals
- Abstract secrets retrieval behind a common interface
- Support local development (macOS Keychain) and enterprise (CyberArk, Infisical)
- Enable credential rotation without code changes
- Provide audit logging for compliance
- Serve as template for other domains

### Non-Goals
- Secret lifecycle management (creation, rotation policies)
- Secret generation (password generation, key derivation)
- Encryption at rest (delegated to backends)

### Design Decisions

**Why Read-Only Interface?**

The SecretsProvider interface is intentionally read-only (get, list, healthCheck). Secret creation, update, and deletion are NOT included because:

1. **Privileged Operations**: Creating/modifying secrets is a sensitive operation that should require human approval and audit trail through the secrets manager UI
2. **Principle of Least Privilege**: AI agents and automated systems should only read secrets, not modify them
3. **Audit Trail**: Secrets manager UIs provide better audit logging for credential changes
4. **Separation of Concerns**: Secret provisioning is an infrastructure concern, not an application concern

If programmatic secret creation is needed, use the secrets manager's API directly with appropriate approval workflows.

---

## Pack Structure

```
kai-secrets-core/          # Interface + discovery + auth resolution
kai-keychain-adapter/      # macOS Keychain implementation
kai-infisical-adapter/     # Infisical implementation
kai-env-adapter/           # Environment variable implementation
kai-mock-adapter/          # Mock adapter for testing (NEW)
kai-secrets-skill/         # User-facing workflows
```

---

## kai-secrets-core

### Purpose
Defines the SecretsProvider interface, authentication resolution utilities, and adapter discovery mechanism.

### Directory Structure

```
kai-secrets-core/
├── README.md
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── SecretsProvider.ts      # Provider interface
│   ├── auth/
│   │   ├── AuthReference.ts        # Auth reference types
│   │   └── resolveAuth.ts          # Resolution implementation
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discover installed adapters
│   │   ├── ConfigLoader.ts         # Load providers.yaml
│   │   └── ProviderFactory.ts      # Instantiate providers
│   └── utils/
│       ├── errors.ts               # Domain errors
│       └── logger.ts               # Audit logging (no secret values)
└── tests/
    ├── auth.test.ts
    ├── discovery.test.ts
    └── mocks/
        └── MockSecretsProvider.ts
```

### SecretsProvider Interface

```typescript
// src/interfaces/SecretsProvider.ts

import { SecretValue } from '../types/SecretValue';

export interface Secret {
  /** Secret identifier/key */
  key: string;
  /** Secret value (wrapped to prevent accidental exposure) */
  value: SecretValue;
  /** Optional metadata */
  metadata?: SecretMetadata;
}

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

export interface SecretsProvider {
  /** Provider identifier (e.g., 'infisical', 'cyberark', 'keychain') */
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
   * @param pattern - Glob pattern (e.g., 'api/*', 'database-*')
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

export interface ListOptions extends GetOptions {
  /** Maximum number of results */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class SecretsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'SecretsError';
  }
}

export class SecretNotFoundError extends SecretsError {
  constructor(key: string, provider?: string) {
    super(`Secret not found: ${key}`, 'SECRET_NOT_FOUND', provider);
    this.name = 'SecretNotFoundError';
  }
}

export class AuthenticationError extends SecretsError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class AdapterNotFoundError extends SecretsError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

export class ConfigurationError extends SecretsError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}
```

### Provider Factory

```typescript
// src/discovery/ProviderFactory.ts

import { SecretsProvider } from '../interfaces/SecretsProvider';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors';
import { discoverAdapters, loadAdapter } from './AdapterLoader';
import { loadConfig } from './ConfigLoader';

export interface ProviderOptions {
  /** Override the adapter to use */
  adapter?: string;
  /** Override configuration values */
  config?: Record<string, unknown>;
}

/**
 * Get the configured secrets provider
 * @param options - Optional overrides
 * @returns Configured SecretsProvider instance
 */
export async function getSecretsProvider(
  options?: ProviderOptions
): Promise<SecretsProvider> {
  const config = await loadConfig();
  const secretsConfig = config.domains?.secrets;

  if (!secretsConfig) {
    throw new ConfigurationError('No secrets domain configuration found');
  }

  const adapterName = options?.adapter || secretsConfig.primary;
  const adapterConfig = {
    ...secretsConfig.adapters?.[adapterName],
    ...options?.config
  };

  // Discover and load the adapter
  const adapters = await discoverAdapters('secrets');
  const manifest = adapters.find(a => a.name === adapterName);

  if (!manifest) {
    throw new AdapterNotFoundError(adapterName);
  }

  return loadAdapter(manifest, adapterConfig);
}

/**
 * Get provider with fallback chain
 * @returns First healthy provider from the chain
 */
export async function getSecretsProviderWithFallback(): Promise<SecretsProvider> {
  const config = await loadConfig();
  const secretsConfig = config.domains?.secrets;

  const chain = [secretsConfig?.primary, secretsConfig?.fallback].filter(Boolean);

  for (const adapterName of chain) {
    try {
      const provider = await getSecretsProvider({ adapter: adapterName });
      const health = await provider.healthCheck();
      if (health.healthy) {
        return provider;
      }
    } catch {
      // Continue to next in chain
    }
  }

  throw new ConfigurationError('No healthy secrets provider available');
}
```

### Audit Logging

```typescript
// src/utils/logger.ts

export interface AuditLogEntry {
  timestamp: Date;
  operation: 'get' | 'getBatch' | 'list' | 'healthCheck';
  provider: string;
  key?: string;          // For 'get' operations (NEVER log value)
  keys?: string[];       // For 'getBatch' operations (NEVER log values)
  pattern?: string;      // For 'list' operations
  success: boolean;
  errorCode?: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  log(entry: AuditLogEntry): void;
}

export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditLogEntry): void {
    const { timestamp, operation, provider, key, pattern, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    const target = key || pattern || '-';

    console.log(
      `[SECRETS] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider} target=${target} status=${status} latency=${latencyMs}ms`
    );
  }
}

// Global logger instance
let auditLogger: AuditLogger = new ConsoleAuditLogger();

export function setAuditLogger(logger: AuditLogger): void {
  auditLogger = logger;
}

export function getAuditLogger(): AuditLogger {
  return auditLogger;
}
```

### package.json

```json
{
  "name": "kai-secrets-core",
  "version": "1.0.0",
  "description": "Core interfaces and utilities for KAI secrets domain",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./interfaces": "./src/interfaces/index.ts",
    "./auth": "./src/auth/index.ts",
    "./discovery": "./src/discovery/index.ts",
    "./errors": "./src/utils/errors.ts"
  },
  "keywords": ["kai", "secrets", "core", "provider"],
  "author": "PAI Community",
  "license": "MIT",
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "yaml": "^2.3.0",
    "glob": "^10.0.0"
  }
}
```

---

## kai-keychain-adapter

### Purpose
Implements SecretsProvider using macOS Keychain for local development secrets.

### Directory Structure

```
kai-keychain-adapter/
├── README.md
├── adapter.yaml                    # Adapter manifest
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── KeychainAdapter.ts
└── tests/
    └── keychain.test.ts
```

### Adapter Manifest

```yaml
# adapter.yaml
name: keychain
version: 1.0.0
domain: secrets
interface: SecretsProvider
entry: ./src/KeychainAdapter.ts
description: macOS Keychain secrets adapter for local development

config:
  required: []
  optional:
    - account: claude-code      # Default account name

requires:
  runtime: bun >= 1.0
  platform: [darwin]            # macOS only

integrations:
  cicd: false                   # Not for CI/CD
  kubernetes: false             # Not for K8s
  local: true                   # Local development only
```

### Implementation

```typescript
// src/KeychainAdapter.ts

import type {
  SecretsProvider,
  Secret,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'kai-secrets-core/interfaces';
import { SecretNotFoundError, AuthenticationError } from 'kai-secrets-core/errors';
import { $ } from 'bun';

export interface KeychainConfig {
  account?: string;
}

export class KeychainAdapter implements SecretsProvider {
  readonly name = 'keychain';
  readonly version = '1.0.0';

  private account: string;

  constructor(config: KeychainConfig = {}) {
    this.account = config.account || 'claude-code';
  }

  async get(key: string, options?: GetOptions): Promise<Secret> {
    const service = this.buildServiceName(key, options);

    try {
      const result = await $`security find-generic-password -s ${service} -a ${this.account} -w`.quiet();

      if (result.exitCode !== 0) {
        throw new SecretNotFoundError(key, this.name);
      }

      return {
        key,
        value: result.stdout.trim(),
        metadata: options?.includeMetadata ? {
          tags: { source: 'keychain', service }
        } : undefined
      };
    } catch (error) {
      if (error instanceof SecretNotFoundError) throw error;
      throw new SecretNotFoundError(key, this.name);
    }
  }

  async getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>> {
    const results = new Map<string, Secret>();

    for (const key of keys) {
      try {
        const secret = await this.get(key, options);
        results.set(key, secret);
      } catch {
        // Skip missing keys in batch operations
      }
    }

    return results;
  }

  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    // List all keychain items for our account
    // Note: macOS security CLI doesn't support listing, so we use dump-keychain
    try {
      const result = await $`security dump-keychain`.quiet();
      const output = result.stdout;

      // Parse keychain dump for service names with our account
      const serviceRegex = /"svce"<blob>="([^"]+)"/g;
      const accountRegex = /"acct"<blob>="([^"]+)"/g;

      const services: string[] = [];
      let serviceMatch;
      let currentIndex = 0;

      while ((serviceMatch = serviceRegex.exec(output)) !== null) {
        // Find corresponding account
        accountRegex.lastIndex = serviceMatch.index;
        const accountMatch = accountRegex.exec(output);

        if (accountMatch && accountMatch[1] === this.account) {
          const service = serviceMatch[1];
          if (!pattern || this.matchesPattern(service, pattern)) {
            services.push(service);
          }
        }
      }

      return services.slice(0, options?.limit || 100);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = performance.now();

    try {
      // Try to access keychain (will prompt for auth if locked)
      await $`security show-keychain-info`.quiet();

      return {
        healthy: true,
        message: 'Keychain accessible',
        latencyMs: performance.now() - start
      };
    } catch {
      return {
        healthy: false,
        message: 'Keychain not accessible (may be locked)',
        latencyMs: performance.now() - start
      };
    }
  }

  private buildServiceName(key: string, options?: GetOptions): string {
    const parts = [key];
    if (options?.environment) parts.push(options.environment);
    if (options?.project) parts.unshift(options.project);
    return parts.join('-');
  }

  private matchesPattern(value: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }
}

// Default export for adapter loader
export default KeychainAdapter;
```

---

## kai-infisical-adapter

### Purpose
Implements SecretsProvider using Infisical for team/enterprise secrets management.

### Adapter Manifest

```yaml
# adapter.yaml
name: infisical
version: 1.0.0
domain: secrets
interface: SecretsProvider
entry: ./src/InfisicalAdapter.ts
description: Infisical secrets management adapter

config:
  required:
    - url
  optional:
    - timeout: 30000
    - projectId: null
    - environment: development
    - secretPath: /

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

### Implementation

```typescript
// src/InfisicalAdapter.ts

import type {
  SecretsProvider,
  Secret,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'kai-secrets-core/interfaces';
import type { AuthReference } from 'kai-secrets-core/auth';
import { resolveAuth } from 'kai-secrets-core/auth';
import { SecretNotFoundError, AuthenticationError } from 'kai-secrets-core/errors';

export interface InfisicalConfig {
  url: string;
  auth: AuthReference;
  projectId?: string;
  environment?: string;
  secretPath?: string;
  timeout?: number;
}

interface InfisicalSecret {
  secretKey: string;
  secretValue: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class InfisicalAdapter implements SecretsProvider {
  readonly name = 'infisical';
  readonly version = '1.0.0';

  private config: InfisicalConfig;
  private token: string | null = null;

  constructor(config: InfisicalConfig) {
    this.config = {
      timeout: 30000,
      environment: 'development',
      secretPath: '/',
      ...config
    };
  }

  async get(key: string, options?: GetOptions): Promise<Secret> {
    const token = await this.getToken();
    const env = options?.environment || this.config.environment;
    const path = options?.path || this.config.secretPath;
    const projectId = options?.project || this.config.projectId;

    const url = new URL(`${this.config.url}/api/v3/secrets/${key}`);
    url.searchParams.set('environment', env!);
    url.searchParams.set('secretPath', path!);
    if (projectId) url.searchParams.set('workspaceId', projectId);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    if (response.status === 404) {
      throw new SecretNotFoundError(key, this.name);
    }

    if (response.status === 401) {
      this.token = null; // Clear cached token
      throw new AuthenticationError('Invalid or expired token', this.name);
    }

    if (!response.ok) {
      throw new Error(`Infisical API error: ${response.status}`);
    }

    const data = await response.json() as { secret: InfisicalSecret };

    return {
      key,
      value: data.secret.secretValue,
      metadata: options?.includeMetadata ? {
        version: String(data.secret.version),
        createdAt: new Date(data.secret.createdAt),
        updatedAt: new Date(data.secret.updatedAt)
      } : undefined
    };
  }

  async getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>> {
    // Infisical supports batch retrieval
    const token = await this.getToken();
    const env = options?.environment || this.config.environment;
    const path = options?.path || this.config.secretPath;
    const projectId = options?.project || this.config.projectId;

    const url = new URL(`${this.config.url}/api/v3/secrets`);
    url.searchParams.set('environment', env!);
    url.searchParams.set('secretPath', path!);
    if (projectId) url.searchParams.set('workspaceId', projectId);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    if (!response.ok) {
      throw new Error(`Infisical API error: ${response.status}`);
    }

    const data = await response.json() as { secrets: InfisicalSecret[] };
    const results = new Map<string, Secret>();

    for (const secret of data.secrets) {
      if (keys.includes(secret.secretKey)) {
        results.set(secret.secretKey, {
          key: secret.secretKey,
          value: secret.secretValue,
          metadata: options?.includeMetadata ? {
            version: String(secret.version),
            createdAt: new Date(secret.createdAt),
            updatedAt: new Date(secret.updatedAt)
          } : undefined
        });
      }
    }

    return results;
  }

  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    const token = await this.getToken();
    const env = options?.environment || this.config.environment;
    const path = options?.path || this.config.secretPath;
    const projectId = options?.project || this.config.projectId;

    const url = new URL(`${this.config.url}/api/v3/secrets`);
    url.searchParams.set('environment', env!);
    url.searchParams.set('secretPath', path!);
    if (projectId) url.searchParams.set('workspaceId', projectId);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    if (!response.ok) {
      throw new Error(`Infisical API error: ${response.status}`);
    }

    const data = await response.json() as { secrets: InfisicalSecret[] };
    let keys = data.secrets.map(s => s.secretKey);

    if (pattern) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      keys = keys.filter(k => regex.test(k));
    }

    return keys.slice(0, options?.limit || 100);
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = performance.now();

    try {
      const token = await this.getToken();

      const response = await fetch(`${this.config.url}/api/v1/auth/token/check`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });

      return {
        healthy: response.ok,
        message: response.ok ? 'Connected to Infisical' : 'Token invalid',
        latencyMs: performance.now() - start,
        details: { url: this.config.url }
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: performance.now() - start
      };
    }
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    this.token = await resolveAuth(this.config.auth);
    return this.token;
  }
}

export default InfisicalAdapter;
```

---

## kai-mock-adapter

### Purpose
Provides a mock SecretsProvider for testing skills and integration tests without requiring real secrets backends.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: secrets
interface: SecretsProvider
entry: ./src/MockAdapter.ts
description: Mock secrets adapter for testing

config:
  required: []
  optional:
    - secrets: {}         # Pre-populated secrets map
    - simulateLatency: 0  # Simulated latency in ms
    - failureRate: 0      # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Implementation

```typescript
// src/MockAdapter.ts

import type {
  SecretsProvider,
  Secret,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'kai-secrets-core/interfaces';
import { SecretValue } from 'kai-secrets-core/types';
import { SecretNotFoundError } from 'kai-secrets-core/errors';

export interface MockConfig {
  secrets?: Record<string, string>;
  simulateLatency?: number;
  failureRate?: number;
}

export class MockAdapter implements SecretsProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private secrets: Map<string, string>;
  private latency: number;
  private failureRate: number;

  constructor(config: MockConfig = {}) {
    this.secrets = new Map(Object.entries(config.secrets || {}));
    this.latency = config.simulateLatency || 0;
    this.failureRate = config.failureRate || 0;
  }

  /** Add a secret for testing */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  /** Remove a secret */
  deleteSecret(key: string): void {
    this.secrets.delete(key);
  }

  /** Clear all secrets */
  clearSecrets(): void {
    this.secrets.clear();
  }

  private async maybeDelay(): Promise<void> {
    if (this.latency > 0) {
      await new Promise(r => setTimeout(r, this.latency));
    }
  }

  private maybeFail(): void {
    if (this.failureRate > 0 && Math.random() * 100 < this.failureRate) {
      throw new Error('Simulated failure');
    }
  }

  async get(key: string, options?: GetOptions): Promise<Secret> {
    await this.maybeDelay();
    this.maybeFail();

    const value = this.secrets.get(key);
    if (!value) {
      throw new SecretNotFoundError(key, this.name);
    }

    return {
      key,
      value: new SecretValue(value),
      metadata: options?.includeMetadata ? {
        tags: { source: 'mock' }
      } : undefined
    };
  }

  async getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>> {
    await this.maybeDelay();
    this.maybeFail();

    const results = new Map<string, Secret>();
    for (const key of keys) {
      const value = this.secrets.get(key);
      if (value) {
        results.set(key, {
          key,
          value: new SecretValue(value),
          metadata: options?.includeMetadata ? { tags: { source: 'mock' } } : undefined
        });
      }
    }
    return results;
  }

  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    await this.maybeDelay();
    this.maybeFail();

    let keys = Array.from(this.secrets.keys());

    if (pattern) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      keys = keys.filter(k => regex.test(k));
    }

    return keys.slice(0, options?.limit || 100);
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: true,
      message: 'Mock adapter always healthy',
      latencyMs: this.latency
    };
  }
}

export default MockAdapter;
```

### Test Fixtures

```typescript
// tests/fixtures.ts

import { MockAdapter } from 'kai-mock-adapter';

export function createTestProvider(): MockAdapter {
  const provider = new MockAdapter({
    secrets: {
      'database-password': 'test-db-pass-123',
      'api-key': 'test-api-key-abc',
      'jwt-secret': 'test-jwt-secret-xyz'
    }
  });
  return provider;
}

export function createSlowProvider(): MockAdapter {
  return new MockAdapter({
    secrets: { 'slow-secret': 'value' },
    simulateLatency: 500
  });
}

export function createFlakyProvider(): MockAdapter {
  return new MockAdapter({
    secrets: { 'flaky-secret': 'value' },
    failureRate: 50  // 50% failure rate
  });
}
```

---

## Retry and Token Refresh Patterns

### Retry with Exponential Backoff

All adapters should implement retry logic for transient failures:

```typescript
// kai-secrets-core/src/utils/retry.ts

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '503', '429']
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-retryable errors
      if (!isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      // Don't retry after max attempts
      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

function isRetryable(error: unknown, codes: string[]): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return codes.some(code => message.includes(code));
}
```

### Token Refresh on 401

Adapters that cache authentication tokens should handle 401 responses:

```typescript
// Updated Infisical adapter with token refresh

private async fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return withRetry(async () => {
    const token = await this.getToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    // Token expired - refresh and retry
    if (response.status === 401) {
      this.token = null;  // Clear cached token
      throw new Error('401');  // Will be retried
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json() as T;
  }, {
    maxRetries: 2,
    retryableErrors: ['401', '503', '429', 'ECONNRESET']
  });
}
```

---

## kai-secrets-skill

### Purpose
Provides user-facing workflows for secrets management, including retrieval, listing, health checks, and documentation.

### Directory Structure

```
kai-secrets-skill/
├── README.md
├── SKILL.md
├── VERIFY.md
├── package.json
├── Workflows/
│   ├── GetSecret.md
│   ├── ListSecrets.md
│   ├── CheckHealth.md
│   └── RotateCredentials.md
├── Tools/
│   ├── get.ts
│   ├── list.ts
│   └── health.ts
└── Templates/
    └── secret-report.md
```

### SKILL.md

```yaml
---
name: Secrets
description: Secrets management across multiple backends. USE WHEN user needs to retrieve credentials, list secrets, check provider health, or manage sensitive configuration.
type: skill
version: "1.0"
---

# Secrets Skill

Unified secrets management across local development and enterprise environments.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| GetSecret | Retrieve a specific secret by key | Secret value (sensitive) |
| ListSecrets | List available secrets matching pattern | Array of secret keys |
| CheckHealth | Verify secrets provider connectivity | Health status report |
| RotateCredentials | Document credential rotation procedure | Rotation checklist |

## Examples

### Example 1: Get a secret
```
User: "Get the database password"
Skill loads: Secrets → GetSecret workflow
Output: Retrieved secret (displayed securely)
```

### Example 2: List API keys
```
User: "What API keys do we have configured?"
Skill loads: Secrets → ListSecrets workflow
Pattern: api-*
Output: List of matching secret keys
```

### Example 3: Check provider health
```
User: "Is Infisical working?"
Skill loads: Secrets → CheckHealth workflow
Output: Health status with latency and details
```

## CLI Tools

All tools support both interactive and scripted usage:

```bash
# Get a secret
bun run Tools/get.ts <key> [--env development] [--project myapp]

# List secrets
bun run Tools/list.ts [--pattern "api-*"] [--limit 50]

# Check health
bun run Tools/health.ts [--adapter infisical]
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  secrets:
    primary: infisical
    fallback: keychain
    adapters:
      infisical:
        url: https://secrets.example.com
        auth:
          type: keychain
          service: infisical-token
```

## Security Notes

- Secret values are NEVER logged
- All access is audit-logged (key, not value)
- Prefer keychain for local development
- Use environment-specific secrets in production

## Related Packs

- kai-secrets-core: Provider interfaces
- kai-keychain-adapter: macOS Keychain backend
- kai-infisical-adapter: Infisical backend
```

### CLI Tool: get.ts

```typescript
#!/usr/bin/env bun
// Tools/get.ts

import { parseArgs } from 'util';
import { getSecretsProvider } from 'kai-secrets-core/discovery';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    env: { type: 'string', short: 'e' },
    project: { type: 'string', short: 'p' },
    adapter: { type: 'string', short: 'a' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: bun run get.ts <key> [options]

Options:
  -e, --env <env>       Environment (default: from config)
  -p, --project <id>    Project/workspace ID
  -a, --adapter <name>  Override adapter (default: from config)
  -j, --json            Output as JSON
  -h, --help            Show this help

Examples:
  bun run get.ts database-password
  bun run get.ts api-key --env production
  bun run get.ts stripe-key --adapter keychain
`);
  process.exit(0);
}

const key = positionals[0];

try {
  const provider = await getSecretsProvider({
    adapter: values.adapter
  });

  const secret = await provider.get(key, {
    environment: values.env,
    project: values.project,
    includeMetadata: values.json
  });

  if (values.json) {
    console.log(JSON.stringify({
      key: secret.key,
      value: secret.value,
      metadata: secret.metadata,
      provider: provider.name
    }, null, 2));
  } else {
    // Output just the value for scripting
    console.log(secret.value);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
}
```

---

## VERIFY.md Requirements

Each pack must include verification steps:

### kai-secrets-core VERIFY.md

```markdown
# Verification Checklist - kai-secrets-core

## Interface Completeness
- [ ] SecretsProvider interface defines all required methods
- [ ] GetOptions and ListOptions cover common use cases
- [ ] HealthStatus provides sufficient diagnostic info
- [ ] All methods have JSDoc documentation

## Auth Resolution
- [ ] Keychain resolution works on macOS
- [ ] Environment variable resolution works
- [ ] File-based resolution works
- [ ] Fallback chain executes in order
- [ ] Errors propagate correctly when all fallbacks fail

## Adapter Discovery
- [ ] discoverAdapters finds installed adapters
- [ ] loadManifest validates adapter.yaml schema
- [ ] loadAdapter instantiates provider correctly
- [ ] ConfigLoader respects precedence order

## Error Handling
- [ ] SecretNotFoundError thrown for missing keys
- [ ] AuthenticationError thrown for auth failures
- [ ] AdapterNotFoundError thrown for missing adapters
- [ ] ConfigurationError thrown for invalid config

## Audit Logging
- [ ] All operations are logged
- [ ] Secret values are NEVER logged
- [ ] Log format is consistent
- [ ] Custom logger can be injected

## Tests
- [ ] Unit tests pass: `bun test`
- [ ] Type checking passes: `bun run typecheck`
- [ ] Coverage > 80%
```

### kai-keychain-adapter VERIFY.md

```markdown
# Verification Checklist - kai-keychain-adapter

## Prerequisites
- [ ] Running on macOS
- [ ] Keychain is unlocked
- [ ] Test secrets exist: `security add-generic-password -s "test-secret" -a "claude-code" -w "test-value"`

## Basic Operations
- [ ] get() retrieves existing secret
- [ ] get() throws SecretNotFoundError for missing secret
- [ ] getBatch() retrieves multiple secrets
- [ ] getBatch() skips missing secrets without error
- [ ] list() returns secret names for account
- [ ] list() filters by pattern correctly

## Health Check
- [ ] healthCheck() returns healthy when keychain unlocked
- [ ] healthCheck() returns unhealthy when keychain locked
- [ ] latencyMs is populated

## Integration
- [ ] Adapter loads via kai-secrets-core discovery
- [ ] adapter.yaml validates against schema
- [ ] Works with providers.yaml configuration

## Cleanup
- [ ] Remove test secrets: `security delete-generic-password -s "test-secret" -a "claude-code"`
```

---

## Implementation Checklist

### Phase 1.1: kai-secrets-core
- [ ] Create package structure
- [ ] Define SecretsProvider interface
- [ ] Implement SecretValue wrapper class (NEW)
- [ ] Implement AuthReference types
- [ ] Implement resolveAuth with all backends
- [ ] Implement adapter discovery with caching (NEW)
- [ ] Implement config loading
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff (NEW)
- [ ] Add error classes
- [ ] Add audit logging (include getBatch)
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify

### Phase 1.2: kai-keychain-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement KeychainAdapter
- [ ] Use SecretValue wrapper (NEW)
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify

### Phase 1.3: kai-infisical-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement InfisicalAdapter
- [ ] Use SecretValue wrapper (NEW)
- [ ] Implement token refresh on 401 (NEW)
- [ ] Use retry utility for all API calls (NEW)
- [ ] Write unit tests (mocked)
- [ ] Create VERIFY.md and verify

### Phase 1.4: kai-mock-adapter (NEW)
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockAdapter with test helpers
- [ ] Create test fixtures file
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify

### Phase 1.5: kai-secrets-skill
- [ ] Create package structure
- [ ] Create SKILL.md with routing
- [ ] Create CLI tools (get, list, health)
- [ ] Update tools to use SecretValue.reveal() (NEW)
- [ ] Create workflow documentation
- [ ] Write integration tests using mock adapter (NEW)
- [ ] Create VERIFY.md and verify

### Phase 1.6: Integration Testing
- [ ] End-to-end test: skill → core → keychain adapter
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → infisical adapter (if available)
- [ ] Verify fallback chain works
- [ ] Verify audit logging captures all operations (get, getBatch, list)
- [ ] Verify SecretValue prevents accidental exposure (NEW)
- [ ] Test retry behavior with flaky mock adapter (NEW)
- [ ] Document any issues for Phase 2+

**Revised Estimate**: 14-16 hours (up from 10-12 hours)

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Template for other domains

---

## Changelog

### 1.0.0 - 2026-01-06
- Initial specification
- SecretsProvider interface defined
- Keychain and Infisical adapter specs
- Skill workflows documented
