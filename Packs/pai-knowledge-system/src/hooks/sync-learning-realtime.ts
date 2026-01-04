#!/usr/bin/env bun
/**
 * Real-time Learning Sync Hook
 *
 * Syncs newly created learning files to the knowledge graph immediately
 * after they are created (runs after Stop hook).
 *
 * Features:
 * - Syncs only the most recent learning file
 * - Excludes sessions containing knowledge tool operations (prevents feedback loop)
 * - Uses content hashing to prevent duplicates
 * - Non-blocking execution
 *
 * Usage:
 * - As Stop hook: Runs automatically after stop-hook.ts
 * - Manual: bun run sync-learning-realtime.ts [--verbose]
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { parseMarkdownFile, cleanBody } from './lib/frontmatter-parser';
import {
  loadSyncState,
  saveSyncState,
  getSyncedPaths,
  getContentHashes,
  markAsSynced
} from './lib/sync-state';
import { checkHealth, addEpisode, AddEpisodeParams } from './lib/knowledge-client';

// Tools that indicate knowledge system operations (prevent feedback loop)
const KNOWLEDGE_TOOL_PATTERNS = [
  'mcp__pai-knowledge__',
  'search_memory',
  'add_memory',
  'get_episodes',
  'knowledge graph',
  'what do i know',
  'what do you know'
];

interface SyncOptions {
  verbose: boolean;
  dryRun: boolean;
}

/**
 * Check if content contains knowledge tool operations
 */
function containsKnowledgeOperations(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return KNOWLEDGE_TOOL_PATTERNS.some(pattern =>
    lowerContent.includes(pattern.toLowerCase())
  );
}

/**
 * Generate SHA-256 hash of content
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Find the most recently created learning file
 */
function findLatestLearning(): string | null {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const learningsDir = join(paiDir, 'history', 'learnings');

  if (!existsSync(learningsDir)) {
    return null;
  }

  // Get year-month subdirectories
  const subdirs = readdirSync(learningsDir).filter(d => {
    const fullPath = join(learningsDir, d);
    return statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(d);
  });

  if (subdirs.length === 0) {
    return null;
  }

  // Sort to get most recent month
  subdirs.sort().reverse();
  const latestMonth = subdirs[0];
  const monthDir = join(learningsDir, latestMonth);

  // Get all markdown files in the latest month
  const files = readdirSync(monthDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      path: join(monthDir, f),
      mtime: statSync(join(monthDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return null;
  }

  // Return the most recently modified file
  return files[0].path;
}

/**
 * Sync a single learning file to knowledge
 */
async function syncLearning(
  filepath: string,
  options: SyncOptions
): Promise<{ success: boolean; reason?: string }> {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const parsed = parseMarkdownFile(content);
    const cleanedBody = cleanBody(parsed.body);

    // Check for knowledge operations (prevent feedback loop)
    if (containsKnowledgeOperations(content)) {
      return {
        success: false,
        reason: 'Contains knowledge operations (feedback loop prevention)'
      };
    }

    // Check content hash for duplicates
    const contentHash = hashContent(cleanedBody);
    const syncState = loadSyncState();
    const syncedHashes = getContentHashes(syncState);

    if (syncedHashes.has(contentHash)) {
      return { success: false, reason: 'Duplicate content (already synced)' };
    }

    // Check if filepath already synced
    const syncedPaths = getSyncedPaths(syncState);
    if (syncedPaths.has(filepath)) {
      return { success: false, reason: 'File already synced' };
    }

    // Prepare episode parameters
    const params: AddEpisodeParams = {
      name: `${parsed.frontmatter.capture_type}: ${parsed.title}`.slice(0, 200),
      episode_body: cleanedBody.slice(0, 5000),
      source: 'text',
      source_description: [
        `Executor: ${parsed.frontmatter.executor}`,
        `Session: ${parsed.frontmatter.session_id?.slice(0, 8) || 'unknown'}`,
        `Realtime sync`
      ].filter(Boolean).join(' | '),
      group_id: parsed.frontmatter.capture_type?.toLowerCase() || 'learning'
    };

    if (options.verbose) {
      console.error(`[RealtimeSync] Syncing: ${params.name}`);
    }

    if (options.dryRun) {
      console.error(`[DryRun] Would sync: ${params.name}`);
      return { success: true };
    }

    // Sync to knowledge
    const result = await addEpisode(params);

    if (result.success) {
      // Mark as synced
      markAsSynced(
        syncState,
        filepath,
        parsed.frontmatter.capture_type || 'LEARNING',
        undefined,
        contentHash
      );
      saveSyncState(syncState);

      if (options.verbose) {
        console.error(`[RealtimeSync] ✓ Synced: ${params.name}`);
      }
      return { success: true };
    } else {
      return { success: false, reason: result.error };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, reason: message };
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('-n')
  };

  // Check if running as hook (stdin available)
  const isHook = !process.stdin.isTTY;

  if (isHook) {
    // Consume stdin (hook payload)
    await Bun.stdin.text().catch(() => '');
  }

  // Check MCP health
  if (!options.dryRun) {
    const healthy = await checkHealth();
    if (!healthy) {
      if (options.verbose) {
        console.error('[RealtimeSync] MCP server offline - skipping');
      }
      process.exit(0);
    }
  }

  // Find latest learning
  const latestLearning = findLatestLearning();

  if (!latestLearning) {
    if (options.verbose) {
      console.error('[RealtimeSync] No learning files found');
    }
    process.exit(0);
  }

  if (options.verbose) {
    console.error(`[RealtimeSync] Latest learning: ${latestLearning}`);
  }

  // Sync it
  const result = await syncLearning(latestLearning, options);

  if (result.success) {
    console.error('[RealtimeSync] ✓ Learning synced to knowledge graph');
  } else if (options.verbose) {
    console.error(`[RealtimeSync] Skipped: ${result.reason}`);
  }

  process.exit(0);
}

main();
