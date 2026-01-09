import type { SecretsProvider } from '../interfaces/SecretsProvider.ts';
import { discoverAdapters, loadAdapter } from './AdapterLoader.ts';
import { getSecretsConfig, getAdapterConfig } from './ConfigLoader.ts';
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
 * Get a secrets provider
 *
 * Uses the configured primary adapter unless overridden.
 *
 * @param options - Optional overrides
 * @returns Configured SecretsProvider instance
 */
export async function getSecretsProvider(
  options?: ProviderOptions
): Promise<SecretsProvider> {
  const secretsConfig = await getSecretsConfig();

  // Determine which adapter to use
  const adapterName = options?.adapter || secretsConfig?.primary;

  if (!adapterName) {
    throw new ConfigurationError(
      'No secrets adapter configured. Set "domains.secrets.primary" in providers.yaml or specify adapter in options.'
    );
  }

  // Get adapter configuration
  const adapterConfig = {
    ...(await getAdapterConfig(adapterName)),
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
 * Get a secrets provider with fallback support
 *
 * Tries the primary adapter first, then falls back to the configured fallback.
 *
 * @param options - Optional overrides
 * @returns First healthy provider from the chain
 */
export async function getSecretsProviderWithFallback(
  options?: ProviderOptions
): Promise<SecretsProvider> {
  const secretsConfig = await getSecretsConfig();

  // Build the adapter chain
  const chain: string[] = [];

  if (options?.adapter) {
    chain.push(options.adapter);
  } else if (secretsConfig?.primary) {
    chain.push(secretsConfig.primary);
  }

  if (secretsConfig?.fallback && !chain.includes(secretsConfig.fallback)) {
    chain.push(secretsConfig.fallback);
  }

  if (chain.length === 0) {
    throw new ConfigurationError(
      'No secrets adapter configured. Set "domains.secrets.primary" in providers.yaml.'
    );
  }

  // Try each adapter in the chain
  let lastError: Error | undefined;

  for (const adapterName of chain) {
    try {
      const provider = await getSecretsProvider({
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
    `No healthy secrets provider available. Last error: ${lastError?.message}`
  );
}

/**
 * List available secrets adapters
 *
 * @returns Array of adapter names that are installed and discovered
 */
export async function listAvailableAdapters(): Promise<string[]> {
  const adapters = await discoverAdapters('secrets');
  return adapters.map(a => a.name);
}
