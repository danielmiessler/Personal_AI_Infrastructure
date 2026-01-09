import type {
  SecretsProvider,
  Secret,
  SecretMetadata,
  GetOptions,
  ListOptions,
  HealthStatus
} from 'mai-secrets-core/interfaces';
import type { AuthReference } from 'mai-secrets-core/auth';
import { SecretValue } from 'mai-secrets-core/types';
import {
  SecretNotFoundError,
  AuthenticationError,
  ProviderError,
  resolveAuth,
  withRetry
} from 'mai-secrets-core';

/**
 * Configuration for InfisicalAdapter
 */
export interface InfisicalConfig {
  /** Infisical API base URL */
  url: string;
  /** Authentication reference */
  auth: AuthReference;
  /** Default environment (default: 'development') */
  environment?: string;
  /** Default project ID */
  project?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Infisical API response types
 */
interface InfisicalSecret {
  _id: string;
  secretKey: string;
  secretValue: string;
  version: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  environment: string;
  folder?: string;
  tags?: Array<{ _id: string; name: string; slug: string }>;
}

interface InfisicalSecretsResponse {
  secrets: InfisicalSecret[];
}

interface InfisicalSecretResponse {
  secret: InfisicalSecret;
}

/**
 * InfisicalAdapter - Infisical secrets adapter
 *
 * Connects to Infisical API to retrieve secrets.
 * Supports token caching with automatic refresh on 401.
 */
export default class InfisicalAdapter implements SecretsProvider {
  readonly name = 'infisical';
  readonly version = '1.0.0';

  private readonly url: string;
  private readonly auth: AuthReference;
  private readonly defaultEnvironment: string;
  private readonly defaultProject?: string;
  private readonly timeout: number;

  // Token cache
  private cachedToken: string | null = null;

  constructor(config: InfisicalConfig) {
    if (!config.url) {
      throw new ProviderError('Infisical URL is required', this.name);
    }
    if (!config.auth) {
      throw new ProviderError('Infisical auth is required', this.name);
    }

    this.url = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.auth = config.auth;
    this.defaultEnvironment = config.environment || 'development';
    this.defaultProject = config.project;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Get cached token or resolve fresh one
   */
  private async getToken(): Promise<string> {
    if (!this.cachedToken) {
      this.cachedToken = await resolveAuth(this.auth);
    }
    return this.cachedToken;
  }

  /**
   * Clear cached token (for refresh on 401)
   */
  private clearToken(): void {
    this.cachedToken = null;
  }

  /**
   * Make authenticated request to Infisical API
   */
  private async fetchWithAuth(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.url}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Handle 401 - clear token and retry once
      if (response.status === 401) {
        this.clearToken();
        const newToken = await this.getToken();

        const retryResponse = await fetch(`${this.url}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        if (retryResponse.status === 401) {
          throw new AuthenticationError('Invalid or expired token', this.name);
        }

        return retryResponse;
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Convert Infisical secret to Secret interface
   */
  private toSecret(infisicalSecret: InfisicalSecret): Secret {
    const metadata: SecretMetadata = {
      createdAt: new Date(infisicalSecret.createdAt),
      updatedAt: new Date(infisicalSecret.updatedAt),
      version: String(infisicalSecret.version),
      tags: infisicalSecret.tags?.reduce((acc, tag) => {
        acc[tag.slug] = tag.name;
        return acc;
      }, {} as Record<string, string>)
    };

    return {
      key: infisicalSecret.secretKey,
      value: new SecretValue(infisicalSecret.secretValue),
      metadata
    };
  }

  /**
   * Get effective options with defaults
   */
  private getEffectiveOptions(options?: GetOptions): { environment: string; project?: string; path?: string } {
    return {
      environment: options?.environment || this.defaultEnvironment,
      project: options?.project || this.defaultProject,
      path: options?.path
    };
  }

  /**
   * Get a single secret
   */
  async get(key: string, options?: GetOptions): Promise<Secret> {
    const { environment, project, path } = this.getEffectiveOptions(options);

    if (!project) {
      throw new ProviderError('Project ID is required', this.name);
    }

    const queryParams = new URLSearchParams({
      secretName: key,
      environment,
      workspaceId: project
    });

    if (path) {
      queryParams.set('secretPath', path);
    }

    const apiPath = `/api/v3/secrets/raw/${key}?${queryParams.toString()}`;

    try {
      const response = await withRetry(
        async () => {
          const resp = await this.fetchWithAuth(apiPath);

          // Throw on retryable status codes so withRetry can catch them
          if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
            throw new ProviderError(`${resp.status} ${resp.statusText}`, this.name);
          }

          return resp;
        },
        {
          maxRetries: 3,
          baseDelayMs: 100, // Shorter for faster tests
          retryableErrors: ['503', '429', '500', 'ECONNRESET', 'ETIMEDOUT']
        }
      );

      if (response.status === 404) {
        throw new SecretNotFoundError(key, this.name);
      }

      if (!response.ok) {
        throw new ProviderError(
          `API error: ${response.status} ${response.statusText}`,
          this.name
        );
      }

      const data = await response.json() as InfisicalSecretResponse;
      return this.toSecret(data.secret);
    } catch (error) {
      if (error instanceof SecretNotFoundError ||
          error instanceof AuthenticationError ||
          error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to get secret "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get multiple secrets
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
   * List secrets in an environment
   */
  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    const { environment, project, path } = this.getEffectiveOptions(options);

    if (!project) {
      throw new ProviderError('Project ID is required', this.name);
    }

    const queryParams = new URLSearchParams({
      environment,
      workspaceId: project
    });

    if (path) {
      queryParams.set('secretPath', path);
    }

    const apiPath = `/api/v3/secrets/raw?${queryParams.toString()}`;

    try {
      const response = await withRetry(
        async () => {
          const resp = await this.fetchWithAuth(apiPath);

          // Throw on retryable status codes so withRetry can catch them
          if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
            throw new ProviderError(`${resp.status} ${resp.statusText}`, this.name);
          }

          return resp;
        },
        {
          maxRetries: 3,
          baseDelayMs: 100,
          retryableErrors: ['503', '429', '500', 'ECONNRESET', 'ETIMEDOUT']
        }
      );

      if (!response.ok) {
        throw new ProviderError(
          `API error: ${response.status} ${response.statusText}`,
          this.name
        );
      }

      const data = await response.json() as InfisicalSecretsResponse;
      let keys = data.secrets.map(s => s.secretKey);

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
    } catch (error) {
      if (error instanceof ProviderError || error instanceof AuthenticationError) {
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
   * Check Infisical API health
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Try to get a token first
      await this.getToken();

      // Check API connectivity with a simple request
      const response = await fetch(`${this.url}/api/v1/status`, {
        signal: AbortSignal.timeout(5000)
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok && response.status !== 401) {
        return {
          healthy: false,
          message: `API returned ${response.status}`,
          latencyMs,
          details: { url: this.url, status: response.status }
        };
      }

      return {
        healthy: true,
        message: 'Infisical API accessible',
        latencyMs,
        details: {
          url: this.url,
          environment: this.defaultEnvironment,
          hasProject: !!this.defaultProject
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latencyMs: Date.now() - startTime,
        details: { url: this.url, error: String(error) }
      };
    }
  }
}
