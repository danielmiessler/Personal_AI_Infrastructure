import type { NetworkProvider } from '../interfaces/index.ts';
import { discoverAdapters, loadAdapter } from './AdapterLoader.ts';
import { getNetworkConfig, getAdapterConfig } from './ConfigLoader.ts';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * ProviderOptions - Options for provider instantiation
 */
export interface ProviderOptions {
  adapter?: string;
  config?: Record<string, unknown>;
}

/**
 * Get a network provider
 */
export async function getNetworkProvider(
  options?: ProviderOptions
): Promise<NetworkProvider> {
  const networkConfig = await getNetworkConfig();

  const adapterName = options?.adapter || networkConfig?.primary;

  if (!adapterName) {
    throw new ConfigurationError(
      'No network adapter configured. Set "domains.network.primary" in providers.yaml or specify adapter in options.'
    );
  }

  const adapterConfig = {
    ...(await getAdapterConfig(adapterName)),
    ...options?.config
  };

  const adapters = await discoverAdapters('network');
  const manifest = adapters.find(a => a.name === adapterName);

  if (!manifest) {
    throw new AdapterNotFoundError(adapterName);
  }

  return loadAdapter(manifest, adapterConfig);
}

/**
 * Get a network provider with fallback support
 */
export async function getNetworkProviderWithFallback(
  options?: ProviderOptions
): Promise<NetworkProvider> {
  const networkConfig = await getNetworkConfig();

  const chain: string[] = [];

  if (options?.adapter) {
    chain.push(options.adapter);
  } else if (networkConfig?.primary) {
    chain.push(networkConfig.primary);
  }

  if (networkConfig?.fallback && !chain.includes(networkConfig.fallback)) {
    chain.push(networkConfig.fallback);
  }

  if (chain.length === 0) {
    throw new ConfigurationError(
      'No network adapter configured. Set "domains.network.primary" in providers.yaml.'
    );
  }

  let lastError: Error | undefined;

  for (const adapterName of chain) {
    try {
      const provider = await getNetworkProvider({
        adapter: adapterName,
        config: options?.config
      });

      const health = await provider.healthCheck();
      if (health.healthy) {
        return provider;
      }

      lastError = new Error(`Provider ${adapterName} is not healthy: ${health.message}`);
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new ConfigurationError(
    `No healthy network provider available. Last error: ${lastError?.message}`
  );
}

/**
 * List available network adapters
 */
export async function listAvailableAdapters(): Promise<string[]> {
  const adapters = await discoverAdapters('network');
  return adapters.map(a => a.name);
}
