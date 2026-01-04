/**
 * Sync State Manager
 *
 * Tracks which history files have been synced to the knowledge graph.
 * Persists state to JSON file for durability across sessions.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface SyncedFile {
  filepath: string;
  synced_at: string;
  episode_uuid?: string;
  capture_type: string;
  content_hash?: string;  // SHA-256 hash of episode_body for content-level dedup
}

export interface SyncState {
  version: string;
  last_sync: string;
  synced_files: SyncedFile[];
}

const SYNC_STATE_VERSION = '1.0.0';

/**
 * Get the path to the sync state file
 */
export function getSyncStatePath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  return join(paiDir, 'history', '.synced', 'sync-state.json');
}

/**
 * Load sync state from file
 */
export function loadSyncState(statePath?: string): SyncState {
  const path = statePath || getSyncStatePath();

  if (!existsSync(path)) {
    return {
      version: SYNC_STATE_VERSION,
      last_sync: '',
      synced_files: []
    };
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const state = JSON.parse(content) as SyncState;

    // Ensure version compatibility
    if (!state.version) {
      state.version = SYNC_STATE_VERSION;
    }

    return state;
  } catch (error) {
    console.error('[SyncState] Failed to load state, starting fresh:', error);
    return {
      version: SYNC_STATE_VERSION,
      last_sync: '',
      synced_files: []
    };
  }
}

/**
 * Save sync state to file
 */
export function saveSyncState(state: SyncState, statePath?: string): void {
  const path = statePath || getSyncStatePath();
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.last_sync = new Date().toISOString();

  writeFileSync(path, JSON.stringify(state, null, 2));
}

/**
 * Get set of already synced file paths for quick lookup
 */
export function getSyncedPaths(state: SyncState): Set<string> {
  return new Set(state.synced_files.map(f => f.filepath));
}

/**
 * Mark a file as synced
 */
export function markAsSynced(
  state: SyncState,
  filepath: string,
  captureType: string,
  episodeUuid?: string,
  contentHash?: string
): void {
  // Check if already synced
  const existing = state.synced_files.find(f => f.filepath === filepath);
  if (existing) {
    existing.synced_at = new Date().toISOString();
    existing.episode_uuid = episodeUuid;
    if (contentHash) existing.content_hash = contentHash;
    return;
  }

  state.synced_files.push({
    filepath,
    synced_at: new Date().toISOString(),
    episode_uuid: episodeUuid,
    capture_type: captureType,
    content_hash: contentHash
  });
}

/**
 * Check if content has already been synced (by hash)
 */
export function isContentDuplicate(state: SyncState, contentHash: string): boolean {
  return state.synced_files.some(f => f.content_hash === contentHash);
}

/**
 * Get all content hashes for quick lookup
 */
export function getContentHashes(state: SyncState): Set<string> {
  const hashes = new Set<string>();
  for (const file of state.synced_files) {
    if (file.content_hash) {
      hashes.add(file.content_hash);
    }
  }
  return hashes;
}

/**
 * Get sync statistics
 */
export function getSyncStats(state: SyncState): {
  totalSynced: number;
  byType: Record<string, number>;
  lastSync: string;
} {
  const byType: Record<string, number> = {};

  for (const file of state.synced_files) {
    byType[file.capture_type] = (byType[file.capture_type] || 0) + 1;
  }

  return {
    totalSynced: state.synced_files.length,
    byType,
    lastSync: state.last_sync
  };
}

/**
 * Prune sync state of files that no longer exist
 */
export function pruneMissing(state: SyncState): number {
  const before = state.synced_files.length;

  state.synced_files = state.synced_files.filter(f => existsSync(f.filepath));

  return before - state.synced_files.length;
}

/**
 * Get files synced in the last N hours
 */
export function getRecentlySynced(state: SyncState, hours: number = 24): SyncedFile[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  return state.synced_files.filter(f => f.synced_at > cutoff);
}
