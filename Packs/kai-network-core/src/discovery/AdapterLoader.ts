import { parse as parseYaml } from 'yaml';
import * as path from 'path';
import * as os from 'os';
import type { NetworkProvider } from '../interfaces/index.ts';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * AdapterManifest - Parsed adapter.yaml manifest
 */
export interface AdapterManifest {
  name: string;
  version: string;
  domain: string;
  interface: string;
  entry: string;
  description?: string;
  config?: {
    required?: string[];
    optional?: Record<string, unknown>;
  };
  requires?: {
    runtime?: string;
    platform?: string[];
  };
  packagePath: string;
}

interface CacheEntry {
  adapters: AdapterManifest[];
  timestamp: number;
}

const CACHE_TTL_MS = 60_000;
const adapterCache = new Map<string, CacheEntry>();

/**
 * Discover adapters for the network domain
 */
export async function discoverAdapters(domain: string = 'network'): Promise<AdapterManifest[]> {
  const cached = adapterCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.adapters;
  }

  const adapters = await scanForAdapters(domain);
  adapterCache.set(domain, { adapters, timestamp: Date.now() });
  return adapters;
}

/**
 * Invalidate the adapter cache
 */
export function invalidateAdapterCache(domain?: string): void {
  if (domain) {
    adapterCache.delete(domain);
  } else {
    adapterCache.clear();
  }
}

/**
 * Get cache status
 */
export function getAdapterCacheStatus(): { size: number; domains: string[] } {
  return {
    size: adapterCache.size,
    domains: Array.from(adapterCache.keys())
  };
}

function getSearchPaths(): string[] {
  const cwd = process.cwd();
  const home = os.homedir();

  return [
    path.join(cwd, 'node_modules'),
    path.join(home, 'PAI', 'packs'),
    '/usr/local/share/kai/adapters',
    path.join(cwd, '..'),
    path.join(cwd, '../..', 'Packs')
  ];
}

async function scanForAdapters(domain: string): Promise<AdapterManifest[]> {
  const searchPaths = getSearchPaths();
  const adapters: AdapterManifest[] = [];

  for (const searchPath of searchPaths) {
    try {
      const found = await scanPath(searchPath, domain);
      adapters.push(...found);
    } catch {
      // Path doesn't exist, skip
    }
  }

  return adapters;
}

async function scanPath(searchPath: string, domain: string): Promise<AdapterManifest[]> {
  const adapters: AdapterManifest[] = [];
  const glob = new Bun.Glob('kai-*-adapter/adapter.yaml');

  for await (const manifestPath of glob.scan({ cwd: searchPath, absolute: true })) {
    try {
      const manifest = await loadManifest(manifestPath);
      if (manifest.domain === domain) {
        adapters.push(manifest);
      }
    } catch {
      // Invalid manifest, skip
    }
  }

  return adapters;
}

export async function loadManifest(manifestPath: string): Promise<AdapterManifest> {
  const file = Bun.file(manifestPath);
  const content = await file.text();
  const manifest = parseYaml(content) as Omit<AdapterManifest, 'packagePath'>;

  validateManifest(manifest, manifestPath);

  return {
    ...manifest,
    packagePath: path.dirname(manifestPath)
  };
}

function validateManifest(
  manifest: Partial<AdapterManifest>,
  manifestPath: string
): asserts manifest is Omit<AdapterManifest, 'packagePath'> {
  const required = ['name', 'version', 'domain', 'interface', 'entry'];

  for (const field of required) {
    if (!(field in manifest) || !manifest[field as keyof typeof manifest]) {
      throw new ConfigurationError(
        `Invalid adapter manifest at ${manifestPath}: missing "${field}"`
      );
    }
  }
}

export async function loadAdapter(
  manifest: AdapterManifest,
  config: Record<string, unknown> = {}
): Promise<NetworkProvider> {
  const entryPath = path.join(manifest.packagePath, manifest.entry);

  try {
    const module = await import(entryPath);
    const AdapterClass = module.default;

    if (typeof AdapterClass !== 'function') {
      throw new ConfigurationError(
        `Adapter ${manifest.name} does not export a default class`
      );
    }

    return new AdapterClass(config);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new AdapterNotFoundError(manifest.name);
  }
}
