// Discovery exports for mai-observability-core

export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  type AdapterManifest,
} from './AdapterLoader.ts';

export {
  loadConfig,
  getObservabilityConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  type AuthReference,
  type AdapterConfig,
  type DomainConfig,
  type ProvidersConfig,
} from './ConfigLoader.ts';

export {
  getObservabilityProvider,
  getObservabilityProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './ProviderFactory.ts';
