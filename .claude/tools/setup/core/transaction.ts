/**
 * Transaction system for safe configuration changes
 * Backs up files before modification, rolls back on failure
 */

import { existsSync, mkdirSync, copyFileSync, unlinkSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

export interface BackupEntry {
  originalPath: string;
  backupPath: string;
  existed: boolean;
}

export class Transaction {
  private backups: BackupEntry[] = [];
  private backupDir: string;
  private committed = false;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = join(homedir(), '.pai-setup-backups', timestamp);
  }

  /**
   * Backup a file before modifying it
   */
  async backup(filePath: string): Promise<void> {
    const existed = existsSync(filePath);
    const backupPath = join(this.backupDir, filePath.replace(/\//g, '__'));

    if (existed) {
      // Ensure backup directory exists
      if (!existsSync(this.backupDir)) {
        mkdirSync(this.backupDir, { recursive: true });
      }
      copyFileSync(filePath, backupPath);
    }

    this.backups.push({ originalPath: filePath, backupPath, existed });
  }

  /**
   * Mark transaction as committed (backups no longer needed for rollback)
   */
  commit(): void {
    this.committed = true;
    // Optionally clean up backup directory after successful commit
    // For now, keep backups for safety
  }

  /**
   * Rollback all changes - restore original files
   */
  async rollback(): Promise<void> {
    if (this.committed) {
      throw new Error('Cannot rollback a committed transaction');
    }

    for (const entry of this.backups.reverse()) {
      if (entry.existed) {
        // Restore from backup
        copyFileSync(entry.backupPath, entry.originalPath);
      } else {
        // File didn't exist before - remove it
        if (existsSync(entry.originalPath)) {
          unlinkSync(entry.originalPath);
        }
      }
    }
  }

  /**
   * Get backup directory path (for user info)
   */
  getBackupDir(): string {
    return this.backupDir;
  }
}

/**
 * Atomic file write - write to temp then rename
 */
export async function writeAtomic(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.tmp.${process.pid}`;
  await Bun.write(tempPath, content);
  renameSync(tempPath, filePath);
}
