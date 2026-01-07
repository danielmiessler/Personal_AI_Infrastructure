import { parse as parseYaml } from 'yaml';
import * as path from 'path';
import * as os from 'os';
import type { AuthReference } from '../auth/AuthReference.ts';
import { ConfigurationError } from '../utils/errors.ts';

/**
 * AdapterConfig - Configuration for a specific adapter
 */
export interface AdapterConfig {
  /** Base URL for API-based adapters */
  url?: string;
  /** Authentication reference */
  auth?: AuthReference;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional adapter-specific configuration */
  [key: string]: unknown;
}

/**
 * DomainConfig - Configuration for a domain
 */
export interface DomainConfig {
  /** Primary adapter to use */
  primary: string;
  /** Fallback adapter if primary fails */
  fallback?: string;
  /** Per-adapter configurations */
  adapters?: Record<string, AdapterConfig>;
}

/**
 * ProvidersConfig - Root configuration structure
 */
export interface ProvidersConfig {
  /** Config file version */
  version?: string;
  /** Per-domain configurations */
  domains?: Record<string, DomainConfig>;
}

// Cache the loaded config
let configCache: ProvidersConfig | null = null;
let configCachePath: string | null = null;

/**
 * Load providers configuration
 *
 * Configuration is loaded from (in order of precedence):
 * 1. Environment variable PROVIDERS_CONFIG (path to config file)
 * 2. Project-level ./providers.yaml
 * 3. User-level ~/.config/kai/providers.yaml
 * 4. System-level /etc/kai/providers.yaml
 *
 * @returns The loaded configuration
 */
export async function loadConfig(): Promise<ProvidersConfig> {
  // Return cached config if available
  if (configCache !== null) {
    return configCache;
  }

  const configPaths = getConfigPaths();

  for (const configPath of configPaths) {
    try {
      const config = await loadConfigFile(configPath);
      configCache = config;
      configCachePath = configPath;
      return config;
    } catch {
      // Try next path
    }
  }

  // No config file found, return empty config
  configCache = {};
  return configCache;
}

/**
 * Get configuration file paths in order of precedence
 */
function getConfigPaths(): string[] {
  const paths: string[] = [];
  const cwd = process.cwd();
  const home = os.homedir();

  // 1. Environment variable
  if (process.env.PROVIDERS_CONFIG) {
    paths.push(process.env.PROVIDERS_CONFIG);
  }

  // 2. Project-level
  paths.push(path.join(cwd, 'providers.yaml'));
  paths.push(path.join(cwd, 'providers.yml'));

  // 3. User-level
  paths.push(path.join(home, '.config', 'kai', 'providers.yaml'));
  paths.push(path.join(home, '.config', 'kai', 'providers.yml'));

  // 4. System-level
  paths.push('/etc/kai/providers.yaml');
  paths.push('/etc/kai/providers.yml');

  return paths;
}

/**
 * Load and parse a config file
 */
async function loadConfigFile(configPath: string): Promise<ProvidersConfig> {
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    throw new Error('File not found');
  }

  const content = await file.text();
  const config = parseYaml(content) as ProvidersConfig;

  return config || {};
}

/**
 * Get secrets domain configuration
 */
export async function getSecretsConfig(): Promise<DomainConfig | undefined> {
  const config = await loadConfig();
  return config.domains?.secrets;
}

/**
 * Get adapter configuration for secrets domain
 */
export async function getAdapterConfig(adapterName: string): Promise<AdapterConfig> {
  const secretsConfig = await getSecretsConfig();

  if (!secretsConfig?.adapters) {
    return {};
  }

  return secretsConfig.adapters[adapterName] || {};
}

/**
 * Invalidate the config cache (forces reload on next access)
 */
export function invalidateConfigCache(): void {
  configCache = null;
  configCachePath = null;
}

/**
 * Get the path of the currently loaded config (for debugging)
 */
export function getLoadedConfigPath(): string | null {
  return configCachePath;
}

/**
 * Validate domain configuration
 */
export function validateDomainConfig(config: DomainConfig): void {
  if (!config.primary) {
    throw new ConfigurationError('Domain config requires "primary" adapter');
  }
}
