/**
 * Config Module - Configuration Loader
 *
 * Loads JAI configuration from YAML and environment files.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { JAIConfig, ApiKeys } from './types';
import { DEFAULT_CONFIG } from './defaults';

// ============================================================================
// Config Error
// ============================================================================

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

// ============================================================================
// Config Loader
// ============================================================================

export class ConfigLoader {
  private config: Partial<JAIConfig> | null = null;
  private envLoaded = false;
  private readonly configDir: string;

  constructor(configDir: string = '~/.jai') {
    // Expand ~ to home directory
    this.configDir = configDir.replace(/^~/, process.env.HOME || '');
  }

  /**
   * Load configuration from config.yaml
   */
  load(): JAIConfig {
    const configPath = join(this.configDir, 'config.yaml');

    if (!existsSync(configPath)) {
      // Return defaults if no config file exists
      this.config = { ...DEFAULT_CONFIG };
      return this.expandPaths(this.config as JAIConfig);
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = parseYaml(content) || {};

      this.config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        env: {
          ...DEFAULT_CONFIG.env,
          ...(parsed.env || {}),
        },
      };

      return this.expandPaths(this.config as JAIConfig);
    } catch (error) {
      throw new ConfigError(
        `Failed to load config: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Load environment variables from .env file
   */
  loadEnv(): void {
    if (this.envLoaded) {
      return;
    }

    const envPath = join(this.configDir, '.env');

    if (!existsSync(envPath)) {
      this.envLoaded = true;
      return;
    }

    try {
      const content = readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) {
          continue;
        }

        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // Set environment variable if not already set
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }

      this.envLoaded = true;
    } catch (error) {
      throw new ConfigError(
        `Failed to load .env: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get a configuration value by key
   */
  get<T = unknown>(key: string): T | undefined {
    if (!this.config) {
      this.load();
    }

    const config = this.config as Record<string, unknown>;
    const parts = key.split('.');
    let current: unknown = config;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as T;
  }

  /**
   * Get a required configuration value (throws if missing)
   */
  getRequired<T = unknown>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new ConfigError(`Missing required config: ${key}`, key);
    }
    return value;
  }

  /**
   * Get the policy file path
   */
  getPolicyPath(): string {
    if (!this.config) {
      this.load();
    }
    const path = this.config?.policyPath || DEFAULT_CONFIG.policyPath;
    return this.expandPath(path);
  }

  /**
   * Get the data directory path
   */
  getDataDir(): string {
    if (!this.config) {
      this.load();
    }
    const path = this.config?.dataDir || DEFAULT_CONFIG.dataDir;
    return this.expandPath(path);
  }

  /**
   * Get the cache directory path
   */
  getCacheDir(): string {
    if (!this.config) {
      this.load();
    }
    const path = this.config?.cacheDir || DEFAULT_CONFIG.cacheDir;
    return this.expandPath(path);
  }

  /**
   * Get API keys from config and environment
   */
  getApiKeys(): ApiKeys {
    if (!this.config) {
      this.load();
    }
    this.loadEnv();

    const configKeys = this.config?.env || {};

    // Merge with environment variables
    return {
      finnhub: process.env.FINNHUB_API_KEY || configKeys.finnhub,
      alpaca_key: process.env.ALPACA_API_KEY || configKeys.alpaca_key,
      alpaca_secret: process.env.ALPACA_API_SECRET || configKeys.alpaca_secret,
      discord_webhook:
        process.env.DISCORD_WEBHOOK_URL || configKeys.discord_webhook,
      ...configKeys,
    };
  }

  /**
   * Expand ~ in a single path
   */
  private expandPath(path: string): string {
    return path.replace(/^~/, process.env.HOME || '');
  }

  /**
   * Expand ~ in all config paths
   */
  private expandPaths(config: JAIConfig): JAIConfig {
    return {
      ...config,
      policyPath: this.expandPath(config.policyPath),
      dataDir: this.expandPath(config.dataDir),
      cacheDir: this.expandPath(config.cacheDir),
    };
  }
}
