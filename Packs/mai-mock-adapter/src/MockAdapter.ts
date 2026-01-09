import type {
  SecretsProvider,
  Secret,
  SecretMetadata,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'mai-secrets-core/interfaces';
import { SecretValue } from 'mai-secrets-core/types';
import { SecretNotFoundError, ProviderError } from 'mai-secrets-core';

/**
 * Configuration for MockAdapter
 */
export interface MockConfig {
  /** Pre-populated secrets */
  secrets?: Record<string, string>;
  /** Simulated latency in milliseconds */
  latencyMs?: number;
  /** Probability of failure (0-1) */
  failureRate?: number;
  /** Error message to throw on simulated failure */
  failureError?: string;
}

/**
 * MockAdapter - In-memory secrets adapter for testing
 *
 * Provides an in-memory secrets store with configurable latency
 * and failure rates for testing retry logic and error handling.
 */
export default class MockAdapter implements SecretsProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private secrets: Map<string, { value: string; createdAt: Date; updatedAt: Date }>;
  private readonly latencyMs: number;
  private readonly failureRate: number;
  private readonly failureError: string;

  constructor(config: MockConfig = {}) {
    this.secrets = new Map();
    this.latencyMs = config.latencyMs || 0;
    this.failureRate = config.failureRate || 0;
    this.failureError = config.failureError || 'MOCK_ERROR';

    // Initialize with provided secrets
    if (config.secrets) {
      const now = new Date();
      for (const [key, value] of Object.entries(config.secrets)) {
        this.secrets.set(key, { value, createdAt: now, updatedAt: now });
      }
    }
  }

  /**
   * Simulate latency if configured
   */
  private async maybeDelay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }
  }

  /**
   * Simulate failure if configured
   */
  private maybeFail(): void {
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new ProviderError(this.failureError, this.name);
    }
  }

  /**
   * Add or update a secret (test helper)
   */
  setSecret(key: string, value: string): void {
    const existing = this.secrets.get(key);
    const now = new Date();

    this.secrets.set(key, {
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
  }

  /**
   * Remove a secret (test helper)
   */
  deleteSecret(key: string): boolean {
    return this.secrets.delete(key);
  }

  /**
   * Remove all secrets (test helper)
   */
  clearSecrets(): void {
    this.secrets.clear();
  }

  /**
   * Get the number of stored secrets (test helper)
   */
  get size(): number {
    return this.secrets.size;
  }

  /**
   * Get a single secret
   */
  async get(key: string, _options?: GetOptions): Promise<Secret> {
    await this.maybeDelay();
    this.maybeFail();

    const entry = this.secrets.get(key);

    if (!entry) {
      throw new SecretNotFoundError(key, this.name);
    }

    const metadata: SecretMetadata = {
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      version: '1'
    };

    return {
      key,
      value: new SecretValue(entry.value),
      metadata
    };
  }

  /**
   * Get multiple secrets
   */
  async getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>> {
    const results = new Map<string, Secret>();

    for (const key of keys) {
      try {
        const secret = await this.get(key, options);
        results.set(key, secret);
      } catch (error) {
        // Skip secrets that don't exist
        if (!(error instanceof SecretNotFoundError)) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * List secret keys
   */
  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    await this.maybeDelay();
    this.maybeFail();

    let keys = Array.from(this.secrets.keys());

    // Apply pattern filter
    if (pattern) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      keys = keys.filter(key => regex.test(key));
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || keys.length;

    return keys.slice(offset, offset + limit);
  }

  /**
   * Health check always returns healthy for mock adapter
   */
  async healthCheck(): Promise<HealthStatus> {
    await this.maybeDelay();

    // Don't fail health check even with failure rate
    return {
      healthy: true,
      message: 'Mock adapter is healthy',
      latencyMs: this.latencyMs,
      details: {
        secretCount: this.secrets.size,
        latencyMs: this.latencyMs,
        failureRate: this.failureRate
      }
    };
  }
}
