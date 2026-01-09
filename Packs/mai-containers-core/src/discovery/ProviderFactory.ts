import type { PlatformProvider } from '../interfaces/PlatformProvider.ts';
import { discoverAdapters, loadAdapter } from './AdapterLoader.ts';
import { getPlatformConfig, getAdapterConfig } from './ConfigLoader.ts';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * Options for creating a provider
 */
export interface ProviderOptions {
  /** Specific adapter to use (overrides config) */
  adapter?: string;

  /** Additional configuration to merge */
  config?: Record<string, unknown>;
}

/**
 * Create a provider instance from an adapter
 */
export async function createProvider(
  adapterName: string,
  config?: Record<string, unknown>
): Promise<PlatformProvider> {
  const { AdapterClass } = await loadAdapter(adapterName);

  // Get adapter config from providers.yaml and merge with overrides
  const adapterConfig = await getAdapterConfig(adapterName);
  const mergedConfig = { ...adapterConfig, ...config };

  const provider = new AdapterClass(mergedConfig) as PlatformProvider;

  // Validate that the provider has required methods
  if (typeof provider.healthCheck !== 'function') {
    throw new ConfigurationError(`Adapter ${adapterName} does not implement PlatformProvider`);
  }

  return provider;
}

/**
 * Get the primary platform provider based on configuration
 *
 * @throws {ConfigurationError} If no platform domain is configured
 * @throws {AdapterNotFoundError} If the configured adapter is not found
 */
export async function getPlatformProvider(options?: ProviderOptions): Promise<PlatformProvider> {
  // If specific adapter requested, use it
  if (options?.adapter) {
    return createProvider(options.adapter, options.config);
  }

  // Get from config
  const domainConfig = await getPlatformConfig();

  if (domainConfig?.primary) {
    return createProvider(domainConfig.primary, options?.config);
  }

  // No config - try to find first available adapter
  const adapters = await discoverAdapters();
  if (adapters.length > 0) {
    // Prefer non-mock adapters
    const realAdapter = adapters.find(a => a.name !== 'mock');
    const adapter = realAdapter || adapters[0];
    return createProvider(adapter.name, options?.config);
  }

  throw new ConfigurationError(
    'No platform provider configured. Add a platform domain to providers.yaml or install an adapter.'
  );
}

/**
 * Get a platform provider with fallback support
 *
 * Tries the primary provider first, falls back to secondary if configured and primary fails.
 */
export async function getPlatformProviderWithFallback(
  options?: ProviderOptions
): Promise<PlatformProvider> {
  const domainConfig = await getPlatformConfig();

  // Try primary
  try {
    const primary = await getPlatformProvider(options);
    const health = await primary.healthCheck();
    if (health.healthy) {
      return primary;
    }
  } catch {
    // Primary failed, try fallback
  }

  // Try fallback if configured
  if (domainConfig?.fallback) {
    try {
      return await createProvider(domainConfig.fallback, options?.config);
    } catch {
      // Fallback also failed
    }
  }

  // If we get here, return primary anyway (caller can handle errors)
  return getPlatformProvider(options);
}

/**
 * List all available adapters
 */
export async function listAvailableAdapters(): Promise<string[]> {
  const adapters = await discoverAdapters();
  return adapters.map(a => a.name);
}
