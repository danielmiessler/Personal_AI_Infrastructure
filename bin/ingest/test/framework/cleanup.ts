/**
 * Test Cleanup
 *
 * Removes test-generated files from vault and Dropbox based on the test files registry.
 */

import { existsSync, unlinkSync, readdirSync, statSync, readFileSync } from "fs";
import { join, basename } from "path";
import {
  loadTestFilesRegistry,
  getTestFilesForRun,
  getAllTestFiles,
  removeRunFromRegistry,
  type TestFileEntry,
} from "./report";
import { getConfig } from "../../lib/config";

// =============================================================================
// Types
// =============================================================================

export interface CleanupOptions {
  runId?: string;      // Clean specific run
  all?: boolean;       // Clean all registered test files
  dryRun?: boolean;    // Show what would be deleted without deleting
  verbose?: boolean;   // Show detailed output
  scanVault?: boolean; // Also scan vault for unregistered test files
}

export interface CleanupResult {
  deleted: string[];
  failed: string[];
  skipped: string[];
  unregistered: string[];
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Clean up test files based on options
 */
export async function cleanupTestFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
  const result: CleanupResult = {
    deleted: [],
    failed: [],
    skipped: [],
    unregistered: [],
  };

  // Get files to clean
  let files: TestFileEntry[] = [];
  let runIds: string[] = [];

  if (options.runId) {
    files = getTestFilesForRun(options.runId);
    runIds = [options.runId];
  } else if (options.all) {
    const registry = loadTestFilesRegistry();
    files = getAllTestFiles();
    runIds = Object.keys(registry.runs);
  } else {
    console.log("Specify --run <runId> or --all to clean up test files");
    return result;
  }

  if (files.length === 0) {
    console.log("No test files found in registry");

    // Optionally scan vault for unregistered test files
    if (options.scanVault) {
      const unregistered = await scanForUnregisteredTestFiles();
      result.unregistered = unregistered;
    }

    return result;
  }

  console.log(`\nFound ${files.length} test files to clean up`);

  if (options.dryRun) {
    console.log("\n[DRY RUN] Would delete:");
  }

  // Process each file
  for (const file of files) {
    // Clean vault file
    if (file.vaultPath) {
      if (existsSync(file.vaultPath)) {
        if (options.dryRun) {
          console.log(`  - ${file.vaultPath}`);
          result.skipped.push(file.vaultPath);
        } else {
          try {
            unlinkSync(file.vaultPath);
            result.deleted.push(file.vaultPath);
            if (options.verbose) {
              console.log(`  Deleted: ${file.vaultPath}`);
            }
          } catch (err) {
            result.failed.push(file.vaultPath);
            if (options.verbose) {
              console.log(`  Failed: ${file.vaultPath} - ${err}`);
            }
          }
        }
      } else {
        result.skipped.push(file.vaultPath);
        if (options.verbose) {
          console.log(`  Not found: ${file.vaultPath}`);
        }
      }
    }

    // Clean Dropbox file
    if (file.dropboxPath) {
      if (existsSync(file.dropboxPath)) {
        if (options.dryRun) {
          console.log(`  - ${file.dropboxPath}`);
          result.skipped.push(file.dropboxPath);
        } else {
          try {
            unlinkSync(file.dropboxPath);
            result.deleted.push(file.dropboxPath);
            if (options.verbose) {
              console.log(`  Deleted: ${file.dropboxPath}`);
            }
          } catch (err) {
            result.failed.push(file.dropboxPath);
            if (options.verbose) {
              console.log(`  Failed: ${file.dropboxPath} - ${err}`);
            }
          }
        }
      } else {
        result.skipped.push(file.dropboxPath);
        if (options.verbose) {
          console.log(`  Not found: ${file.dropboxPath}`);
        }
      }
    }
  }

  // Remove runs from registry (if not dry run)
  if (!options.dryRun) {
    for (const runId of runIds) {
      removeRunFromRegistry(runId);
    }
  }

  // Print summary
  console.log("\nCleanup Summary:");
  console.log(`  Deleted: ${result.deleted.length}`);
  if (result.failed.length > 0) {
    console.log(`  Failed: ${result.failed.length}`);
  }
  console.log(`  Not found: ${result.skipped.length}`);

  return result;
}

/**
 * Scan vault for test files not in registry (orphaned test files)
 */
export async function scanForUnregisteredTestFiles(): Promise<string[]> {
  const config = getConfig();
  const vaultPath = config.obsidianVaultPath;

  if (!vaultPath || !existsSync(vaultPath)) {
    console.log("Vault path not configured");
    return [];
  }

  const testFiles: string[] = [];
  const testIdPattern = /\[TEST-[A-Z]+-\d+[a-z]?\]/;

  function scan(dir: string) {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "_meta" || entry.name === "node_modules") continue;
        scan(fullPath);
      } else if (entry.name.endsWith(".md")) {
        // Check filename for test ID
        if (testIdPattern.test(entry.name)) {
          testFiles.push(fullPath);
          continue;
        }

        // Check content for test ID (first 500 chars)
        try {
          const content = readFileSync(fullPath, "utf-8").slice(0, 500);
          if (testIdPattern.test(content)) {
            testFiles.push(fullPath);
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  scan(vaultPath);
  return testFiles;
}

/**
 * List registered test runs
 */
export function listTestRuns(): void {
  const registry = loadTestFilesRegistry();
  const runs = Object.values(registry.runs);

  if (runs.length === 0) {
    console.log("No test runs in registry");
    return;
  }

  console.log("\nRegistered Test Runs:");
  console.log("─".repeat(80));
  console.log(
    "Run ID".padEnd(40) +
    "Date".padEnd(22) +
    "Files".padEnd(8) +
    "Vault".padEnd(10)
  );
  console.log("─".repeat(80));

  for (const run of runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    const date = new Date(run.startedAt).toLocaleString();
    const vaultCount = run.files.filter(f => f.vaultPath).length;
    const dropboxCount = run.files.filter(f => f.dropboxPath).length;

    console.log(
      run.runId.padEnd(40) +
      date.padEnd(22) +
      String(run.files.length).padEnd(8) +
      `${vaultCount}v/${dropboxCount}d`
    );
  }

  console.log("─".repeat(80));
  console.log(`Total: ${runs.length} runs`);
}

/**
 * Print cleanup help
 */
export function printCleanupHelp(): void {
  console.log(`
Test Cleanup Commands:

  bun run ingest.ts test cleanup --list
    List all registered test runs

  bun run ingest.ts test cleanup --run <runId>
    Clean up files from a specific run

  bun run ingest.ts test cleanup --all
    Clean up all registered test files

  bun run ingest.ts test cleanup --all --dry-run
    Show what would be deleted without deleting

  bun run ingest.ts test cleanup --scan
    Scan vault for unregistered test files (orphans)

Options:
  --dry-run    Show what would be deleted without deleting
  --verbose    Show detailed output
  --scan       Also scan vault for unregistered test files
`);
}
