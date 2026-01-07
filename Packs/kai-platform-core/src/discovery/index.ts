// Discovery exports for kai-platform-core

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
  getPlatformConfig,
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
  getPlatformProvider,
  getPlatformProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './ProviderFactory.ts';
