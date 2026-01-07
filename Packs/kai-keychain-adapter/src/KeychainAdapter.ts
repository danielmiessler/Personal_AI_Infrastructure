import { $ } from 'bun';
import type {
  SecretsProvider,
  Secret,
  SecretMetadata,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'kai-secrets-core/interfaces';
import { SecretValue } from 'kai-secrets-core/types';
import { SecretNotFoundError, ProviderError } from 'kai-secrets-core';

/**
 * Configuration for KeychainAdapter
 */
export interface KeychainConfig {
  /** Prefix for keychain service names (default: 'kai') */
  servicePrefix?: string;
  /** Default account name (default: 'claude-code') */
  defaultAccount?: string;
}

/**
 * KeychainAdapter - macOS Keychain secrets adapter
 *
 * Stores and retrieves secrets from the macOS Keychain using the `security` CLI.
 * Service names are formatted as: {servicePrefix}:{key}
 */
export default class KeychainAdapter implements SecretsProvider {
  readonly name = 'keychain';
  readonly version = '1.0.0';

  private readonly servicePrefix: string;
  private readonly defaultAccount: string;

  constructor(config: KeychainConfig = {}) {
    this.servicePrefix = config.servicePrefix || 'kai';
    this.defaultAccount = config.defaultAccount || 'claude-code';
  }

  /**
   * Build the service name for a key
   */
  private buildServiceName(key: string): string {
    return `${this.servicePrefix}:${key}`;
  }

  /**
   * Extract key from service name
   */
  private extractKey(serviceName: string): string | null {
    const prefix = `${this.servicePrefix}:`;
    if (serviceName.startsWith(prefix)) {
      return serviceName.slice(prefix.length);
    }
    return null;
  }

  /**
   * Check if a key matches a glob pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Get a single secret from the keychain
   */
  async get(key: string, _options?: GetOptions): Promise<Secret> {
    const service = this.buildServiceName(key);

    try {
      const result = await $`security find-generic-password -s ${service} -a ${this.defaultAccount} -w`.quiet().nothrow();

      // Exit code 44 means "item not found"
      if (result.exitCode === 44) {
        throw new SecretNotFoundError(key, this.name);
      }

      if (result.exitCode !== 0) {
        throw new ProviderError(
          `security command failed with exit code ${result.exitCode}`,
          this.name
        );
      }

      const value = result.stdout.toString().trim();
      if (!value) {
        throw new SecretNotFoundError(key, this.name);
      }

      const metadata: SecretMetadata = {
        createdAt: new Date(), // Keychain doesn't provide creation date
        updatedAt: new Date()
      };

      return {
        key,
        value: new SecretValue(value),
        metadata
      };
    } catch (error) {
      if (error instanceof SecretNotFoundError || error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to retrieve secret "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get multiple secrets from the keychain
   */
  async getBatch(keys: string[], options?: GetOptions): Promise<Map<string, Secret>> {
    const results = new Map<string, Secret>();

    // Fetch in parallel
    const promises = keys.map(async key => {
      try {
        const secret = await this.get(key, options);
        results.set(key, secret);
      } catch (error) {
        // Skip secrets that don't exist
        if (!(error instanceof SecretNotFoundError)) {
          throw error;
        }
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * List secret keys from the keychain
   */
  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    try {
      // Use security dump-keychain to list all generic passwords
      // This outputs in a specific format that we need to parse
      const result = await $`security dump-keychain`.quiet();

      if (result.exitCode !== 0) {
        throw new ProviderError(
          'Failed to list keychain entries',
          this.name
        );
      }

      const output = result.stdout.toString();
      const keys: string[] = [];

      // Parse the dump-keychain output to find service names
      // Format: "svce"<blob>="service-name"
      const serviceRegex = /"svce"<blob>="([^"]+)"/g;
      let match;

      while ((match = serviceRegex.exec(output)) !== null) {
        const serviceName = match[1];
        const key = this.extractKey(serviceName);

        if (key) {
          // Apply pattern filter if provided
          if (!pattern || this.matchesPattern(key, pattern)) {
            keys.push(key);
          }
        }
      }

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || keys.length;

      return keys.slice(offset, offset + limit);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to list secrets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check keychain access
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      // Try to access the login keychain
      const result = await $`security list-keychains`.quiet();

      if (result.exitCode !== 0) {
        return {
          healthy: false,
          message: 'Cannot access keychain',
          details: { error: 'security list-keychains failed' }
        };
      }

      const keychains = result.stdout.toString();
      const hasLoginKeychain = keychains.includes('login.keychain');

      if (!hasLoginKeychain) {
        return {
          healthy: false,
          message: 'Login keychain not found',
          details: { keychains }
        };
      }

      return {
        healthy: true,
        message: 'Keychain accessible',
        details: {
          servicePrefix: this.servicePrefix,
          defaultAccount: this.defaultAccount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Keychain health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }
}
