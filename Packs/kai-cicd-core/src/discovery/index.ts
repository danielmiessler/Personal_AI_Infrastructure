// Discovery exports for kai-cicd-core

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
  getCICDConfig,
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
  getCICDProvider,
  getCICDProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './ProviderFactory.ts';
