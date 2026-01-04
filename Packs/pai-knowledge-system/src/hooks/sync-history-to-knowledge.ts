#!/usr/bin/env bun
/**
 * Sync History to Knowledge Hook
 *
 * Syncs high-value history files (learnings, research, decisions) to the
 * knowledge graph. Designed to run on SessionStart to catch up from
 * previous sessions.
 *
 * Features:
 * - Parses YAML frontmatter for metadata
 * - Maps history format to knowledge API
 * - Tracks synced files to avoid duplicates
 * - Graceful degradation when MCP is unavailable
 * - Non-blocking execution (fire and forget)
 *
 * Usage:
 * - As SessionStart hook: Syncs recent files automatically
 * - Manual: bun run sync-history-to-knowledge.ts [--all] [--dry-run]
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { parseMarkdownFile, cleanBody } from './lib/frontmatter-parser';
import {
  loadSyncState,
  saveSyncState,
  getSyncedPaths,
  getContentHashes,
  markAsSynced,
  getSyncStats
} from './lib/sync-state';
import { checkHealth, addEpisode, AddEpisodeParams } from './lib/knowledge-client';

/**
 * Generate SHA-256 hash of content for deduplication
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Categories worth syncing to knowledge (high-value content)
const SYNC_CATEGORIES = ['learnings', 'research', 'decisions'];

// Skip sessions by default (mostly tool/file lists, low entity value)
const SKIP_CATEGORIES = ['sessions'];

interface SyncOptions {
  dryRun: boolean;
  syncAll: boolean;
  maxFiles: number;
  verbose: boolean;
}

const DEFAULT_OPTIONS: SyncOptions = {
  dryRun: false,
  syncAll: false,
  maxFiles: 50, // Limit per run to avoid overwhelming the API
  verbose: false
};

/**
 * Retry configuration for error recovery
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Wait for MCP server with exponential backoff
 */
async function waitForMcpServer(verbose: boolean): Promise<boolean> {
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    const healthy = await checkHealth();
    if (healthy) {
      if (verbose && attempt > 0) {
        console.error(`[Sync] MCP server available after ${attempt + 1} attempts`);
      }
      return true;
    }

    if (attempt < RETRY_CONFIG.maxRetries - 1) {
      const delay = getBackoffDelay(attempt, RETRY_CONFIG);
      if (verbose) {
        console.error(`[Sync] MCP server offline, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return false;
}

/**
 * Find all markdown files in a category directory
 */
function findMarkdownFiles(categoryDir: string): string[] {
  if (!existsSync(categoryDir)) {
    return [];
  }

  const files: string[] = [];

  // Get year-month subdirectories
  const subdirs = readdirSync(categoryDir).filter(d => {
    const fullPath = join(categoryDir, d);
    return statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(d);
  });

  for (const subdir of subdirs) {
    const subdirPath = join(categoryDir, subdir);
    const mdFiles = readdirSync(subdirPath)
      .filter(f => f.endsWith('.md'))
      .map(f => join(subdirPath, f));

    files.push(...mdFiles);
  }

  // Sort by modification time (newest first)
  files.sort((a, b) => {
    const statA = statSync(a);
    const statB = statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });

  return files;
}

/**
 * Map parsed history to knowledge API parameters
 */
function mapToKnowledgeParams(
  parsed: ReturnType<typeof parseMarkdownFile>,
  filepath: string
): AddEpisodeParams {
  const { frontmatter, title, body } = parsed;
  const cleanedBody = cleanBody(body);

  return {
    name: `${frontmatter.capture_type}: ${title}`.slice(0, 200),
    episode_body: cleanedBody.slice(0, 5000),
    source: 'text',
    source_description: [
      `Executor: ${frontmatter.executor}`,
      `Session: ${frontmatter.session_id.slice(0, 8)}`,
      `File: ${basename(filepath)}`,
      frontmatter.agent_completion ? `Agent: ${frontmatter.agent_completion}` : null
    ].filter(Boolean).join(' | '),
    reference_timestamp: frontmatter.timestamp,
    group_id: frontmatter.capture_type.toLowerCase()
  };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: string | undefined): boolean {
  if (!error) return false;
  const retryablePatterns = [
    'timeout', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
    'abort', '429', '503', '502', '504', 'rate limit'
  ];
  const lowerError = error.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern.toLowerCase()));
}

/**
 * Sync a single file to knowledge graph with retry logic
 */
async function syncFile(
  filepath: string,
  options: SyncOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const parsed = parseMarkdownFile(content);
    const params = mapToKnowledgeParams(parsed, filepath);

    if (options.verbose) {
      console.error(`[Sync] Processing: ${params.name}`);
    }

    if (options.dryRun) {
      console.error(`[DryRun] Would sync: ${params.name}`);
      return { success: true };
    }

    // Retry loop for transient failures
    let lastError: string | undefined;
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      const result = await addEpisode(params);

      if (result.success) {
        if (options.verbose) {
          console.error(`[Sync] ✓ Synced: ${params.name}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
        }
        return { success: true };
      }

      lastError = result.error;

      // Only retry on retryable errors
      if (!isRetryableError(lastError)) {
        break;
      }

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        const delay = getBackoffDelay(attempt, RETRY_CONFIG);
        if (options.verbose) {
          console.error(`[Sync] Retrying ${params.name} in ${delay}ms (attempt ${attempt + 1})`);
        }
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.error(`[Sync] ✗ Failed: ${params.name} - ${lastError}`);
    return { success: false, error: lastError };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Sync] ✗ Error processing ${filepath}: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Main sync function
 */
async function syncHistoryToKnowledge(options: SyncOptions = DEFAULT_OPTIONS): Promise<{
  synced: number;
  failed: number;
  skipped: number;
}> {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const historyDir = join(paiDir, 'history');

  const stats = { synced: 0, failed: 0, skipped: 0 };

  // Check if MCP is healthy with retry logic
  if (!options.dryRun) {
    const healthy = await waitForMcpServer(options.verbose);
    if (!healthy) {
      console.error('[Sync] MCP server offline after retries - skipping sync');
      return stats;
    }
  }

  // Load sync state
  const syncState = loadSyncState();
  const syncedPaths = getSyncedPaths(syncState);
  const syncedHashes = getContentHashes(syncState);

  if (options.verbose) {
    const stateStats = getSyncStats(syncState);
    console.error(`[Sync] Previously synced: ${stateStats.totalSynced} files, ${syncedHashes.size} unique hashes`);
  }

  // Collect files to sync
  const filesToSync: string[] = [];

  for (const category of SYNC_CATEGORIES) {
    const categoryDir = join(historyDir, category);
    const files = findMarkdownFiles(categoryDir);

    for (const file of files) {
      if (!options.syncAll && syncedPaths.has(file)) {
        stats.skipped++;
        continue;
      }

      filesToSync.push(file);

      if (filesToSync.length >= options.maxFiles) {
        break;
      }
    }

    if (filesToSync.length >= options.maxFiles) {
      break;
    }
  }

  if (options.verbose) {
    console.error(`[Sync] Found ${filesToSync.length} files to sync`);
  }

  if (filesToSync.length === 0) {
    console.error('[Sync] No new files to sync');
    return stats;
  }

  // Sync files
  for (const filepath of filesToSync) {
    // Pre-check content hash for deduplication
    let contentHash: string | undefined;
    try {
      const content = readFileSync(filepath, 'utf-8');
      const parsed = parseMarkdownFile(content);
      const cleanedBody = cleanBody(parsed.body);
      contentHash = hashContent(cleanedBody);

      // Skip if content already synced (even from a different file)
      if (syncedHashes.has(contentHash)) {
        if (options.verbose) {
          console.error(`[Sync] Skipping duplicate content: ${filepath}`);
        }
        stats.skipped++;
        // Mark filepath as synced to avoid re-checking (only if not dry run)
        if (!options.dryRun) {
          markAsSynced(syncState, filepath, parsed.frontmatter.capture_type, undefined, contentHash);
        }
        continue;
      }
    } catch {
      // Continue with sync attempt if pre-check fails
    }

    const result = await syncFile(filepath, options);

    if (result.success) {
      stats.synced++;

      if (!options.dryRun) {
        try {
          const content = readFileSync(filepath, 'utf-8');
          const parsed = parseMarkdownFile(content);
          markAsSynced(syncState, filepath, parsed.frontmatter.capture_type, undefined, contentHash);
          // Add hash to in-memory set for this run
          if (contentHash) syncedHashes.add(contentHash);
        } catch {
          // Continue even if marking fails
        }
      }
    } else {
      stats.failed++;
    }

    // Brief pause between API calls
    if (!options.dryRun && stats.synced % 5 === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Save sync state (also save if we skipped duplicates, as we marked them)
  if (!options.dryRun && (stats.synced > 0 || stats.skipped > 0)) {
    saveSyncState(syncState);
  }

  console.error(`[Sync] Complete: ${stats.synced} synced, ${stats.failed} failed, ${stats.skipped} skipped`);

  return stats;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): SyncOptions {
  const options = { ...DEFAULT_OPTIONS };

  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;
      case '--all':
      case '-a':
        options.syncAll = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      default:
        if (arg.startsWith('--max=')) {
          options.maxFiles = parseInt(arg.slice(6), 10) || 50;
        }
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main() {
  // Check if running as hook (stdin available) or CLI
  const isHook = !process.stdin.isTTY;

  if (isHook) {
    // Running as hook - quick sync, non-blocking
    try {
      // Read and discard stdin (hook payload)
      await Bun.stdin.text().catch(() => '');

      // Run sync with defaults (limited files, not verbose)
      await syncHistoryToKnowledge({
        ...DEFAULT_OPTIONS,
        maxFiles: 20 // Limit for hook execution
      });
    } catch (error) {
      console.error('[Sync Hook] Error:', error);
    }
  } else {
    // Running as CLI - parse args
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.verbose) {
      console.error('[Sync] Running in CLI mode');
      console.error(`[Sync] Options: ${JSON.stringify(options)}`);
    }

    await syncHistoryToKnowledge(options);
  }

  process.exit(0);
}

main();
