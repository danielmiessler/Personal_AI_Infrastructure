import type { ObservabilityProvider } from '../interfaces/ObservabilityProvider.ts';
import { discoverAdapters, loadAdapter } from './AdapterLoader.ts';
import { getObservabilityConfig, getAdapterConfig } from './ConfigLoader.ts';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * ProviderOptions - Options for provider instantiation
 */
export interface ProviderOptions {
  /** Override the adapter to use */
  adapter?: string;
  /** Override configuration values */
  config?: Record<string, unknown>;
}

/**
 * Get an Observability provider
 *
 * Uses the configured primary adapter unless overridden.
 *
 * @param options - Optional overrides
 * @returns Configured ObservabilityProvider instance
 */
export async function getObservabilityProvider(
  options?: ProviderOptions
): Promise<ObservabilityProvider> {
  const obsConfig = await getObservabilityConfig();

  // Determine which adapter to use
  const adapterName = options?.adapter || obsConfig?.primary;

  if (!adapterName) {
    throw new ConfigurationError(
      'No Observability adapter configured. Set "domains.observability.primary" in providers.yaml or specify adapter in options.'
    );
  }

  // Get adapter configuration
  const adapterConfig = {
    ...(await getAdapterConfig(adapterName)),
    ...options?.config
  };

  // Discover and load the adapter
  const adapters = await discoverAdapters('observability');
  const manifest = adapters.find(a => a.name === adapterName);

  if (!manifest) {
    throw new AdapterNotFoundError(adapterName);
  }

  return loadAdapter(manifest, adapterConfig);
}

/**
 * Get an Observability provider with fallback support
 *
 * Tries the primary adapter first, then falls back to the configured fallback.
 *
 * @param options - Optional overrides
 * @returns First healthy provider from the chain
 */
export async function getObservabilityProviderWithFallback(
  options?: ProviderOptions
): Promise<ObservabilityProvider> {
  const obsConfig = await getObservabilityConfig();

  // Build the adapter chain
  const chain: string[] = [];

  if (options?.adapter) {
    chain.push(options.adapter);
  } else if (obsConfig?.primary) {
    chain.push(obsConfig.primary);
  }

  if (obsConfig?.fallback && !chain.includes(obsConfig.fallback)) {
    chain.push(obsConfig.fallback);
  }

  if (chain.length === 0) {
    throw new ConfigurationError(
      'No Observability adapter configured. Set "domains.observability.primary" in providers.yaml.'
    );
  }

  // Try each adapter in the chain
  let lastError: Error | undefined;

  for (const adapterName of chain) {
    try {
      const provider = await getObservabilityProvider({
        adapter: adapterName,
        config: options?.config
      });

      // Check if the provider is healthy
      const health = await provider.healthCheck();
      if (health.healthy) {
        return provider;
      }

      lastError = new Error(`Provider ${adapterName} is not healthy: ${health.message}`);
    } catch (error) {
      lastError = error as Error;
      // Continue to next in chain
    }
  }

  throw new ConfigurationError(
    `No healthy Observability provider available. Last error: ${lastError?.message}`
  );
}

/**
 * List available Observability adapters
 *
 * @returns Array of adapter names that are installed and discovered
 */
export async function listAvailableAdapters(): Promise<string[]> {
  const adapters = await discoverAdapters('observability');
  return adapters.map(a => a.name);
}

/**
 * Create a provider directly from an adapter class (for testing)
 */
export function createProvider<T extends ObservabilityProvider>(
  AdapterClass: new (config: Record<string, unknown>) => T,
  config: Record<string, unknown> = {}
): T {
  return new AdapterClass(config);
}
