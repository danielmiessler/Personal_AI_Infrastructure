/**
 * Unit tests for sync state manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadSyncState,
  saveSyncState,
  getSyncedPaths,
  markAsSynced,
  getSyncStats,
  pruneMissing,
  getRecentlySynced,
  SyncState
} from '../../../src/hooks/lib/sync-state';

describe('sync-state', () => {
  let tempDir: string;
  let statePath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `sync-state-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    statePath = join(tempDir, 'sync-state.json');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadSyncState', () => {
    it('should return empty state when file does not exist', () => {
      const state = loadSyncState(statePath);

      expect(state.version).toBe('1.0.0');
      expect(state.last_sync).toBe('');
      expect(state.synced_files).toEqual([]);
    });

    it('should load existing state from file', () => {
      const existingState: SyncState = {
        version: '1.0.0',
        last_sync: '2026-01-04T10:00:00.000Z',
        synced_files: [
          {
            filepath: '/path/to/file.md',
            synced_at: '2026-01-04T10:00:00.000Z',
            episode_uuid: 'uuid-123',
            capture_type: 'LEARNING'
          }
        ]
      };

      writeFileSync(statePath, JSON.stringify(existingState));

      const state = loadSyncState(statePath);

      expect(state.synced_files).toHaveLength(1);
      expect(state.synced_files[0].filepath).toBe('/path/to/file.md');
      expect(state.synced_files[0].episode_uuid).toBe('uuid-123');
    });

    it('should handle corrupted state file gracefully', () => {
      writeFileSync(statePath, 'not valid json');

      const state = loadSyncState(statePath);

      expect(state.synced_files).toEqual([]);
    });
  });

  describe('saveSyncState', () => {
    it('should save state to file', () => {
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: [
          {
            filepath: '/path/to/file.md',
            synced_at: '2026-01-04T10:00:00.000Z',
            capture_type: 'LEARNING'
          }
        ]
      };

      saveSyncState(state, statePath);

      expect(existsSync(statePath)).toBe(true);

      const loaded = loadSyncState(statePath);
      expect(loaded.synced_files).toHaveLength(1);
      expect(loaded.last_sync).not.toBe(''); // Updated by save
    });

    it('should create parent directories if needed', () => {
      const nestedPath = join(tempDir, 'nested', 'dir', 'state.json');
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: []
      };

      saveSyncState(state, nestedPath);

      expect(existsSync(nestedPath)).toBe(true);
    });
  });

  describe('getSyncedPaths', () => {
    it('should return set of synced file paths', () => {
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: [
          { filepath: '/path/one.md', synced_at: '', capture_type: 'LEARNING' },
          { filepath: '/path/two.md', synced_at: '', capture_type: 'RESEARCH' },
          { filepath: '/path/three.md', synced_at: '', capture_type: 'DECISION' }
        ]
      };

      const paths = getSyncedPaths(state);

      expect(paths.size).toBe(3);
      expect(paths.has('/path/one.md')).toBe(true);
      expect(paths.has('/path/two.md')).toBe(true);
      expect(paths.has('/path/three.md')).toBe(true);
      expect(paths.has('/path/four.md')).toBe(false);
    });
  });

  describe('markAsSynced', () => {
    it('should add new file to synced list', () => {
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: []
      };

      markAsSynced(state, '/path/to/file.md', 'LEARNING', 'uuid-123');

      expect(state.synced_files).toHaveLength(1);
      expect(state.synced_files[0].filepath).toBe('/path/to/file.md');
      expect(state.synced_files[0].capture_type).toBe('LEARNING');
      expect(state.synced_files[0].episode_uuid).toBe('uuid-123');
    });

    it('should update existing file entry', () => {
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: [
          {
            filepath: '/path/to/file.md',
            synced_at: '2026-01-01T00:00:00.000Z',
            capture_type: 'LEARNING'
          }
        ]
      };

      markAsSynced(state, '/path/to/file.md', 'LEARNING', 'new-uuid');

      expect(state.synced_files).toHaveLength(1);
      expect(state.synced_files[0].episode_uuid).toBe('new-uuid');
      expect(state.synced_files[0].synced_at).not.toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('getSyncStats', () => {
    it('should return statistics about synced files', () => {
      const state: SyncState = {
        version: '1.0.0',
        last_sync: '2026-01-04T10:00:00.000Z',
        synced_files: [
          { filepath: '/a.md', synced_at: '', capture_type: 'LEARNING' },
          { filepath: '/b.md', synced_at: '', capture_type: 'LEARNING' },
          { filepath: '/c.md', synced_at: '', capture_type: 'RESEARCH' },
          { filepath: '/d.md', synced_at: '', capture_type: 'DECISION' }
        ]
      };

      const stats = getSyncStats(state);

      expect(stats.totalSynced).toBe(4);
      expect(stats.byType.LEARNING).toBe(2);
      expect(stats.byType.RESEARCH).toBe(1);
      expect(stats.byType.DECISION).toBe(1);
      expect(stats.lastSync).toBe('2026-01-04T10:00:00.000Z');
    });
  });

  describe('pruneMissing', () => {
    it('should remove entries for files that no longer exist', () => {
      // Create a real file
      const existingFile = join(tempDir, 'existing.md');
      writeFileSync(existingFile, 'content');

      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: [
          { filepath: existingFile, synced_at: '', capture_type: 'LEARNING' },
          { filepath: '/nonexistent/file.md', synced_at: '', capture_type: 'RESEARCH' }
        ]
      };

      const pruned = pruneMissing(state);

      expect(pruned).toBe(1);
      expect(state.synced_files).toHaveLength(1);
      expect(state.synced_files[0].filepath).toBe(existingFile);
    });
  });

  describe('getRecentlySynced', () => {
    it('should return files synced within time window', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const state: SyncState = {
        version: '1.0.0',
        last_sync: '',
        synced_files: [
          { filepath: '/recent.md', synced_at: oneHourAgo.toISOString(), capture_type: 'LEARNING' },
          { filepath: '/old.md', synced_at: twoDaysAgo.toISOString(), capture_type: 'RESEARCH' }
        ]
      };

      const recent = getRecentlySynced(state, 24);

      expect(recent).toHaveLength(1);
      expect(recent[0].filepath).toBe('/recent.md');
    });
  });
});
