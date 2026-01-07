/**
 * kai-network-core
 *
 * Core interfaces and discovery for network infrastructure adapters.
 * Part of the PAI Infrastructure Pack System.
 */

// Interfaces
export type {
  NetworkProvider,
  Device,
  Port,
  VLAN,
  Client,
  NetworkHealth,
  ListOptions,
  ClientOptions
} from './interfaces/index.ts';

// Discovery
export type {
  AdapterManifest
} from './discovery/index.ts';

export type {
  AdapterConfig,
  DomainConfig,
  ProvidersConfig,
  ProviderOptions
} from './discovery/index.ts';

export {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  loadAdapter,
  loadConfig,
  getNetworkConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  getNetworkProvider,
  getNetworkProviderWithFallback,
  listAvailableAdapters
} from './discovery/index.ts';

// Errors
export {
  NetworkError,
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  DeviceUnreachableError,
  AuthenticationError,
  ConnectionError,
  ConfigurationError,
  AdapterNotFoundError,
  ProviderError
} from './utils/index.ts';
