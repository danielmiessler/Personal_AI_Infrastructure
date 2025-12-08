/**
 * Test vault setup for obs integration tests
 *
 * Creates an ephemeral vault in /tmp with test notes having controlled dates.
 * This allows tests to run independently of any user's actual vault.
 */

import { mkdirSync, writeFileSync, utimesSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { TEST_NOTES, generateMarkdown } from "./fixtures/notes";

export interface TestVault {
  path: string;
  cleanup: () => void;
}

/**
 * Create a temporary test vault with fixture notes
 */
export function createTestVault(): TestVault {
  const timestamp = Date.now();
  const vaultPath = `/tmp/obs-test-vault-${timestamp}`;

  // Create vault directory
  mkdirSync(vaultPath, { recursive: true });

  // Create each test note
  for (const note of TEST_NOTES) {
    const filePath = join(vaultPath, note.filename);
    const content = generateMarkdown(note);

    // Write the file
    writeFileSync(filePath, content, "utf-8");

    // Set file timestamps
    const now = Date.now();
    const mtimeMs = now - note.mtimeDaysAgo * 24 * 60 * 60 * 1000;
    const birthtimeMs = note.birthtimeDaysAgo !== undefined
      ? now - note.birthtimeDaysAgo * 24 * 60 * 60 * 1000
      : mtimeMs;

    // Note: utimesSync sets atime and mtime, but birthtime (creation time)
    // cannot be changed on most filesystems after file creation.
    // We'll set mtime to our desired value.
    // For birthtime testing, we rely on the fact that files are created
    // during test setup and the birthtime will be close to test run time.
    const mtime = new Date(mtimeMs);
    const atime = new Date(mtimeMs);
    utimesSync(filePath, atime, mtime);
  }

  // Create _meta directory (excluded from searches)
  mkdirSync(join(vaultPath, "_meta"), { recursive: true });
  writeFileSync(
    join(vaultPath, "_meta", "embeddings.db"),
    "mock embeddings db",
    "utf-8"
  );

  return {
    path: vaultPath,
    cleanup: () => {
      if (existsSync(vaultPath)) {
        rmSync(vaultPath, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Get a date N days ago at midnight
 */
export function getDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Helper to run tests with a temporary vault
 */
export async function withTestVault<T>(
  fn: (vault: TestVault) => Promise<T>
): Promise<T> {
  const vault = createTestVault();
  try {
    // Set environment variable for the test
    const originalVaultPath = process.env.OBSIDIAN_VAULT_PATH;
    process.env.OBSIDIAN_VAULT_PATH = vault.path;

    const result = await fn(vault);

    // Restore original
    if (originalVaultPath !== undefined) {
      process.env.OBSIDIAN_VAULT_PATH = originalVaultPath;
    } else {
      delete process.env.OBSIDIAN_VAULT_PATH;
    }

    return result;
  } finally {
    vault.cleanup();
  }
}
