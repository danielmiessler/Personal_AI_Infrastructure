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
  getIssuesConfig,
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
  getIssuesProvider,
  getIssuesProviderWithFallback,
  listAvailableAdapters,
  createProvider,
  type ProviderOptions,
} from './ProviderFactory.ts';
