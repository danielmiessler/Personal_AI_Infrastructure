import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * Adapter manifest structure (from adapter.yaml)
 */
export interface AdapterManifest {
  name: string;
  version: string;
  domain: string;
  interface: string;
  entry: string;
  description: string;
  config?: {
    required?: string[];
    optional?: Record<string, unknown>;
  };
  requires?: {
    runtime?: string;
    platform?: string[];
  };
  integrations?: Record<string, boolean>;
}

/**
 * Cache entry for discovered adapters
 */
interface CacheEntry {
  adapters: AdapterManifest[];
  paths: Map<string, string>; // adapter name -> manifest path
  timestamp: number;
}

/** Cache TTL in milliseconds (60 seconds) */
const CACHE_TTL_MS = 60_000;

/** Adapter discovery cache */
const adapterCache = new Map<string, CacheEntry>();

/**
 * Get possible adapter locations
 */
function getAdapterSearchPaths(): string[] {
  const paths: string[] = [];

  // Node modules in current directory
  paths.push(join(process.cwd(), 'node_modules'));

  // Node modules in Packs directory (for monorepo setup)
  const packsDir = join(process.cwd(), '..'); // Assuming we're in a pack
  paths.push(packsDir);

  // Global node modules
  if (process.env.NODE_PATH) {
    paths.push(...process.env.NODE_PATH.split(':'));
  }

  return paths;
}

/**
 * Scan for adapters matching a domain
 */
async function scanForAdapters(domain: string): Promise<{ adapters: AdapterManifest[]; paths: Map<string, string> }> {
  const adapters: AdapterManifest[] = [];
  const paths = new Map<string, string>();
  const searchPaths = getAdapterSearchPaths();

  for (const searchPath of searchPaths) {
    try {
      const entries = await readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Look for kai-*-adapter packages
        if (entry.name.startsWith('kai-') && entry.name.endsWith('-adapter')) {
          const manifestPath = join(searchPath, entry.name, 'adapter.yaml');
          try {
            const manifest = await loadManifest(manifestPath);
            if (manifest.domain === domain) {
              adapters.push(manifest);
              paths.set(manifest.name, manifestPath);
            }
          } catch {
            // No adapter.yaml or invalid - skip
          }
        }
      }
    } catch {
      // Directory doesn't exist - skip
    }
  }

  return { adapters, paths };
}

/**
 * Load adapter manifest from file
 */
export async function loadManifest(manifestPath: string): Promise<AdapterManifest> {
  const content = await readFile(manifestPath, 'utf-8');
  const manifest = parseYaml(content) as AdapterManifest;

  // Validate required fields
  if (!manifest.name || !manifest.domain || !manifest.interface || !manifest.entry) {
    throw new ConfigurationError(`Invalid adapter manifest: ${manifestPath}`);
  }

  return manifest;
}

/**
 * Discover available adapters for the platform domain
 *
 * Results are cached for 60 seconds to avoid repeated filesystem scans.
 */
export async function discoverAdapters(): Promise<AdapterManifest[]> {
  const domain = 'platform';
  const cached = adapterCache.get(domain);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.adapters;
  }

  const { adapters, paths } = await scanForAdapters(domain);
  adapterCache.set(domain, { adapters, paths, timestamp: Date.now() });

  return adapters;
}

/**
 * Invalidate the adapter cache
 */
export function invalidateAdapterCache(): void {
  adapterCache.delete('platform');
}

/**
 * Get cache status for debugging
 */
export function getAdapterCacheStatus(): { cached: boolean; age?: number; count?: number } {
  const cached = adapterCache.get('platform');
  if (!cached) {
    return { cached: false };
  }
  return {
    cached: true,
    age: Date.now() - cached.timestamp,
    count: cached.adapters.length
  };
}

/**
 * Load an adapter by name
 */
export async function loadAdapter(name: string): Promise<{ manifest: AdapterManifest; AdapterClass: new (config: unknown) => unknown }> {
  // Ensure cache is populated
  await discoverAdapters();

  const cached = adapterCache.get('platform');
  if (!cached) {
    throw new AdapterNotFoundError(name);
  }

  const manifestPath = cached.paths.get(name);
  if (!manifestPath) {
    throw new AdapterNotFoundError(name);
  }

  const manifest = await loadManifest(manifestPath);
  const adapterDir = dirname(manifestPath);
  const entryPath = join(adapterDir, manifest.entry);

  try {
    const module = await import(entryPath);
    const AdapterClass = module.default || module[Object.keys(module)[0]];

    if (typeof AdapterClass !== 'function') {
      throw new ConfigurationError(`Adapter ${name} does not export a class`);
    }

    return { manifest, AdapterClass };
  } catch (error) {
    if (error instanceof AdapterNotFoundError || error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError(`Failed to load adapter ${name}: ${error}`);
  }
}
