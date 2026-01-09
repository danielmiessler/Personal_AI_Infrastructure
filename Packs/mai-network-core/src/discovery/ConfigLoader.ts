import { parse as parseYaml } from 'yaml';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationError } from '../utils/errors.ts';

/**
 * AdapterConfig - Configuration for a specific adapter
 */
export interface AdapterConfig {
  url?: string;
  auth?: {
    type: string;
    service?: string;
    var?: string;
    path?: string;
    [key: string]: unknown;
  };
  timeout?: number;
  [key: string]: unknown;
}

/**
 * DomainConfig - Configuration for a domain
 */
export interface DomainConfig {
  primary: string;
  fallback?: string;
  adapters?: Record<string, AdapterConfig>;
}

/**
 * ProvidersConfig - Root configuration structure
 */
export interface ProvidersConfig {
  version?: string;
  domains?: Record<string, DomainConfig>;
}

let configCache: ProvidersConfig | null = null;
let configCachePath: string | null = null;

/**
 * Load providers configuration
 */
export async function loadConfig(): Promise<ProvidersConfig> {
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

  configCache = {};
  return configCache;
}

function getConfigPaths(): string[] {
  const paths: string[] = [];
  const cwd = process.cwd();
  const home = os.homedir();

  if (process.env.PROVIDERS_CONFIG) {
    paths.push(process.env.PROVIDERS_CONFIG);
  }

  paths.push(path.join(cwd, 'providers.yaml'));
  paths.push(path.join(cwd, 'providers.yml'));
  paths.push(path.join(home, '.config', 'kai', 'providers.yaml'));
  paths.push(path.join(home, '.config', 'kai', 'providers.yml'));
  paths.push('/etc/kai/providers.yaml');
  paths.push('/etc/kai/providers.yml');

  return paths;
}

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
 * Get network domain configuration
 */
export async function getNetworkConfig(): Promise<DomainConfig | undefined> {
  const config = await loadConfig();
  return config.domains?.network;
}

/**
 * Get adapter configuration
 */
export async function getAdapterConfig(adapterName: string): Promise<AdapterConfig> {
  const networkConfig = await getNetworkConfig();

  if (!networkConfig?.adapters) {
    return {};
  }

  return networkConfig.adapters[adapterName] || {};
}

/**
 * Invalidate config cache
 */
export function invalidateConfigCache(): void {
  configCache = null;
  configCachePath = null;
}

/**
 * Get loaded config path
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
