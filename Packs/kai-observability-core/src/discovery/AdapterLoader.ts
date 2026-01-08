import { parse as parseYaml } from 'yaml';
import * as path from 'path';
import * as os from 'os';
import type { ObservabilityProvider } from '../interfaces/ObservabilityProvider.ts';
import { AdapterNotFoundError, ConfigurationError } from '../utils/errors.ts';

/**
 * AdapterManifest - Parsed adapter.yaml manifest
 */
export interface AdapterManifest {
  /** Adapter identifier */
  name: string;
  /** Adapter version */
  version: string;
  /** Domain this adapter serves */
  domain: string;
  /** Interface(s) implemented */
  interface: string;
  /** Entry point relative to package root */
  entry: string;
  /** Human-readable description */
  description?: string;
  /** Configuration requirements */
  config?: {
    required?: string[];
    optional?: Record<string, unknown>;
  };
  /** Runtime requirements */
  requires?: {
    runtime?: string;
    platform?: string[];
  };
  /** Integration capabilities */
  integrations?: {
    cicd?: boolean;
    kubernetes?: boolean;
    local?: boolean;
  };
  /** Path to the adapter package */
  packagePath: string;
}

/**
 * Cache entry for discovered adapters
 */
interface CacheEntry {
  adapters: AdapterManifest[];
  timestamp: number;
}

/** Cache TTL in milliseconds (60 seconds) */
const CACHE_TTL_MS = 60_000;

/** Adapter discovery cache */
const adapterCache = new Map<string, CacheEntry>();

/**
 * Discover adapters for a specific domain
 *
 * Results are cached for 60 seconds to avoid expensive filesystem scans.
 *
 * @param domain - Domain to search for (e.g., 'observability')
 * @returns Array of adapter manifests
 */
export async function discoverAdapters(domain: string): Promise<AdapterManifest[]> {
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
 *
 * @param domain - Specific domain to invalidate, or all if not specified
 */
export function invalidateAdapterCache(domain?: string): void {
  if (domain) {
    adapterCache.delete(domain);
  } else {
    adapterCache.clear();
  }
}

/**
 * Get cache status (for testing/debugging)
 */
export function getAdapterCacheStatus(): { size: number; domains: string[] } {
  return {
    size: adapterCache.size,
    domains: Array.from(adapterCache.keys())
  };
}

/**
 * Scan filesystem for adapters matching the domain
 */
async function scanForAdapters(domain: string): Promise<AdapterManifest[]> {
  const searchPaths = getSearchPaths();
  const adapters: AdapterManifest[] = [];

  for (const searchPath of searchPaths) {
    try {
      const found = await scanPath(searchPath, domain);
      adapters.push(...found);
    } catch {
      // Path doesn't exist or isn't accessible, skip it
    }
  }

  return adapters;
}

/**
 * Get paths to search for adapters
 */
function getSearchPaths(): string[] {
  const cwd = process.cwd();
  const home = os.homedir();

  return [
    // Local node_modules
    path.join(cwd, 'node_modules'),
    // PAI packs directory
    path.join(home, 'PAI', 'packs'),
    // System-wide installation
    '/usr/local/share/kai/adapters',
    // Packs directory (for development)
    path.join(cwd, '..'),
    path.join(cwd, '../..', 'Packs')
  ];
}

/**
 * Scan a single path for adapters
 */
async function scanPath(searchPath: string, domain: string): Promise<AdapterManifest[]> {
  const adapters: AdapterManifest[] = [];

  // Use Bun's glob for pattern matching
  const glob = new Bun.Glob('kai-*-adapter/adapter.yaml');

  for await (const manifestPath of glob.scan({ cwd: searchPath, absolute: true })) {
    try {
      const manifest = await loadManifest(manifestPath);
      if (manifest.domain === domain) {
        adapters.push(manifest);
      }
    } catch {
      // Invalid manifest, skip it
    }
  }

  return adapters;
}

/**
 * Load and validate an adapter manifest
 */
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

/**
 * Validate manifest has required fields
 */
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

/**
 * Load an adapter from its manifest
 */
export async function loadAdapter(
  manifest: AdapterManifest,
  config: Record<string, unknown> = {}
): Promise<ObservabilityProvider> {
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
