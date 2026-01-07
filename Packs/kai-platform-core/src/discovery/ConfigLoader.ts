import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { ConfigurationError } from '../utils/errors.ts';

/**
 * Authentication reference for adapter configuration
 */
export interface AuthReference {
  /** Keychain service name */
  keychain?: { service: string; account: string };

  /** Environment variable name */
  env?: string;

  /** File path */
  file?: string;

  /** Direct value (not recommended for secrets) */
  value?: string;
}

/**
 * Adapter-specific configuration
 */
export interface AdapterConfig {
  [key: string]: unknown;
}

/**
 * Domain configuration
 */
export interface DomainConfig {
  /** Primary adapter to use */
  primary: string;

  /** Fallback adapter if primary fails */
  fallback?: string;

  /** Adapter configurations */
  adapters: Record<string, AdapterConfig>;
}

/**
 * Full providers.yaml structure
 */
export interface ProvidersConfig {
  domains: Record<string, DomainConfig>;
}

/**
 * Config loader cache
 */
interface ConfigCache {
  config: ProvidersConfig;
  path: string;
  timestamp: number;
}

/** Cache TTL in milliseconds (60 seconds) */
const CACHE_TTL_MS = 60_000;

let configCache: ConfigCache | null = null;

/**
 * Get possible config file locations in order of precedence
 */
function getConfigPaths(): string[] {
  const paths: string[] = [];

  // Environment variable override
  if (process.env.KAI_PROVIDERS_CONFIG) {
    paths.push(process.env.KAI_PROVIDERS_CONFIG);
  }

  // Project-level config
  paths.push(join(process.cwd(), 'providers.yaml'));

  // User-level config
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    paths.push(join(homeDir, '.config', 'kai', 'providers.yaml'));
  }

  // System-level config
  paths.push('/etc/kai/providers.yaml');

  return paths;
}

/**
 * Load providers.yaml configuration
 *
 * Searches for config in this order:
 * 1. KAI_PROVIDERS_CONFIG environment variable
 * 2. ./providers.yaml (project)
 * 3. ~/.config/kai/providers.yaml (user)
 * 4. /etc/kai/providers.yaml (system)
 */
export async function loadConfig(): Promise<ProvidersConfig> {
  // Check cache
  if (configCache && Date.now() - configCache.timestamp < CACHE_TTL_MS) {
    return configCache.config;
  }

  const configPaths = getConfigPaths();

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf-8');
      const config = parseYaml(content) as ProvidersConfig;

      // Basic validation
      if (!config.domains) {
        config.domains = {};
      }

      configCache = { config, path: configPath, timestamp: Date.now() };
      return config;
    } catch {
      // File doesn't exist or is invalid - try next
    }
  }

  // No config found - return empty config
  const emptyConfig: ProvidersConfig = { domains: {} };
  configCache = { config: emptyConfig, path: '', timestamp: Date.now() };
  return emptyConfig;
}

/**
 * Get configuration for the platform domain
 */
export async function getPlatformConfig(): Promise<DomainConfig | undefined> {
  const config = await loadConfig();
  return config.domains.platform;
}

/**
 * Get configuration for a specific adapter
 */
export async function getAdapterConfig(adapterName: string): Promise<AdapterConfig | undefined> {
  const domainConfig = await getPlatformConfig();
  return domainConfig?.adapters?.[adapterName];
}

/**
 * Invalidate the config cache
 */
export function invalidateConfigCache(): void {
  configCache = null;
}

/**
 * Get the path of the loaded config file
 */
export function getLoadedConfigPath(): string | null {
  return configCache?.path || null;
}

/**
 * Validate domain configuration
 */
export function validateDomainConfig(config: DomainConfig): void {
  if (!config.primary) {
    throw new ConfigurationError('Domain config requires a primary adapter');
  }

  if (!config.adapters || typeof config.adapters !== 'object') {
    throw new ConfigurationError('Domain config requires an adapters section');
  }
}
