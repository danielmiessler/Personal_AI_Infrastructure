/**
 * Ephemeral Test Vault for Integration Tests
 *
 * Creates a temporary vault in /tmp for portable tests that don't
 * depend on user's actual vault. Auto-cleans up after tests.
 *
 * Usage:
 *   const vault = createTestVault();
 *   process.env.OBSIDIAN_VAULT_PATH = vault.path;
 *   // ... run tests ...
 *   vault.cleanup();
 */

import { mkdirSync, rmSync, existsSync, readdirSync } from "fs";
import { join } from "path";

export interface TestVault {
  /** Path to the temporary vault directory */
  path: string;
  /** Clean up the vault (delete all files) */
  cleanup: () => void;
  /** List files in the vault */
  listFiles: () => string[];
  /** Get full path to a file in the vault */
  getFilePath: (filename: string) => string;
}

/**
 * Create an ephemeral test vault in /tmp
 *
 * The vault is created with standard subdirectories that the ingest
 * pipeline expects (though most tests just use the root).
 */
export function createTestVault(options?: {
  /** Custom prefix for the vault directory name */
  prefix?: string;
  /** Create _meta directory for embeddings etc */
  withMeta?: boolean;
}): TestVault {
  const prefix = options?.prefix || "ingest-test-vault";
  const timestamp = Date.now();
  const vaultPath = `/tmp/${prefix}-${timestamp}`;

  // Create vault directory
  mkdirSync(vaultPath, { recursive: true });

  // Create _meta directory if requested (excluded from searches)
  if (options?.withMeta) {
    mkdirSync(join(vaultPath, "_meta"), { recursive: true });
  }

  return {
    path: vaultPath,

    cleanup: () => {
      if (existsSync(vaultPath)) {
        rmSync(vaultPath, { recursive: true, force: true });
      }
    },

    listFiles: () => {
      if (!existsSync(vaultPath)) return [];
      return readdirSync(vaultPath, { recursive: true })
        .filter((f): f is string => typeof f === "string")
        .filter((f) => f.endsWith(".md"));
    },

    getFilePath: (filename: string) => join(vaultPath, filename),
  };
}

/**
 * Helper to run a function with a temporary test vault
 *
 * Automatically sets OBSIDIAN_VAULT_PATH and cleans up after.
 */
export async function withTestVault<T>(
  fn: (vault: TestVault) => Promise<T>,
  options?: Parameters<typeof createTestVault>[0]
): Promise<T> {
  const vault = createTestVault(options);
  const originalVaultPath = process.env.OBSIDIAN_VAULT_PATH;

  try {
    process.env.OBSIDIAN_VAULT_PATH = vault.path;
    return await fn(vault);
  } finally {
    // Restore original vault path
    if (originalVaultPath !== undefined) {
      process.env.OBSIDIAN_VAULT_PATH = originalVaultPath;
    } else {
      delete process.env.OBSIDIAN_VAULT_PATH;
    }
    vault.cleanup();
  }
}

/**
 * Singleton test vault for use across a test run
 *
 * Call initTestVault() at start, cleanupTestVault() at end.
 */
let globalTestVault: TestVault | null = null;
let originalVaultPath: string | undefined;

/**
 * Initialize a global test vault for the test run
 * Returns the vault path
 */
export function initTestVault(options?: Parameters<typeof createTestVault>[0]): string {
  if (globalTestVault) {
    // Already initialized, return existing path
    return globalTestVault.path;
  }

  globalTestVault = createTestVault(options);
  originalVaultPath = process.env.OBSIDIAN_VAULT_PATH;
  process.env.OBSIDIAN_VAULT_PATH = globalTestVault.path;

  return globalTestVault.path;
}

/**
 * Get the current test vault (if initialized)
 */
export function getTestVault(): TestVault | null {
  return globalTestVault;
}

/**
 * Clean up the global test vault
 */
export function cleanupTestVault(): void {
  if (globalTestVault) {
    globalTestVault.cleanup();
    globalTestVault = null;
  }

  // Restore original vault path
  if (originalVaultPath !== undefined) {
    process.env.OBSIDIAN_VAULT_PATH = originalVaultPath;
  } else {
    delete process.env.OBSIDIAN_VAULT_PATH;
  }
  originalVaultPath = undefined;
}

/**
 * Check if running with ephemeral test vault
 */
export function isUsingTestVault(): boolean {
  return globalTestVault !== null;
}
