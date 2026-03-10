/**
 * recovery-types.ts - Type definitions for the recovery journal system
 */

export interface RecoveryPoint {
  id: string;                    // UUID for this recovery point
  timestamp: string;             // ISO timestamp
  timestamp_pst: string;         // PST for display
  session_id: string;            // Claude session that triggered
  command: string;               // Original command (truncated)
  command_type: DestructiveType; // Classification
  affected_paths: string[];      // Files/dirs that will be modified
  snapshot_path?: string;        // Path to snapshot archive
  status: 'pending' | 'created' | 'restored' | 'expired';
  file_count?: number;           // Number of files in snapshot
  snapshot_size?: number;        // Size in bytes
}

export type DestructiveType =
  | 'file_delete'      // rm, unlink
  | 'file_move'        // mv (source files disappear)
  | 'git_reset'        // git reset --hard, git checkout --
  | 'git_clean'        // git clean -fd
  | 'directory_delete' // rm -r, rmdir
  | 'overwrite'        // > redirect, cp that overwrites
  | 'bulk_modify';     // sed -i, find -exec

export interface DestructivePattern {
  pattern: RegExp;
  type: DestructiveType;
  extractPaths: (command: string) => string[];
}

export interface RecoveryIndex {
  last_updated: string;
  total_points: number;
  points: RecoveryPointSummary[];
}

export interface RecoveryPointSummary {
  id: string;
  timestamp: string;
  command_type: DestructiveType;
  affected_paths: string[];
  snapshot_path?: string;
  status: string;
  file_count?: number;
}

// Safe paths that don't need journaling (within .claude ecosystem)
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
export const SAFE_PATH_PREFIXES = [
  `${PAI_DIR}/MEMORY/`,  // All MEMORY output is safe (sessions, learnings, raw-outputs, etc.)
  `${PAI_DIR}/Scratchpad/`,
  `${PAI_DIR}/Tmp/`,
  `${PAI_DIR}/Debug/`,
  `${PAI_DIR}/SessionEnv/`,
  `${PAI_DIR}/Todos/`,
  '/tmp/',
  '/var/tmp/',
];

// Skip journaling for these output-only operations
export const SKIP_COMMAND_PATTERNS = [
  /^\s*ls\b/,
  /^\s*cat\b/,
  /^\s*head\b/,
  /^\s*tail\b/,
  /^\s*echo\s+[^>]/,  // echo without redirect
  /^\s*pwd\b/,
  /^\s*which\b/,
  /^\s*git\s+(status|log|diff|show|branch|remote)\b/,
  /^\s*find\b[^|]*$/,  // find without pipe
  /^\s*grep\b/,
  /^\s*rg\b/,
];

// Patterns that indicate destructive operations requiring journaling
export const DESTRUCTIVE_PATTERNS: DestructivePattern[] = [
  {
    pattern: /\brm\s+(?:-[rfivd]+\s+)*([^\|;&]+)/i,
    type: 'file_delete',
    extractPaths: extractRmPaths
  },
  {
    pattern: /\bmv\s+([^\|;&]+)/i,
    type: 'file_move',
    extractPaths: extractMvSourcePaths
  },
  {
    pattern: /\bgit\s+reset\s+--hard/i,
    type: 'git_reset',
    extractPaths: () => ['.'] // Current git repo
  },
  {
    pattern: /\bgit\s+checkout\s+--\s+([^\|;&]+)/i,
    type: 'git_reset',
    extractPaths: (cmd) => {
      const match = cmd.match(/git\s+checkout\s+--\s+(.+)/i);
      return match ? match[1].trim().split(/\s+/) : ['.'];
    }
  },
  {
    pattern: /\bgit\s+clean\s+-[fd]+/i,
    type: 'git_clean',
    extractPaths: () => ['.'] // Current git repo
  },
];

/**
 * Extract paths from rm command
 */
function extractRmPaths(command: string): string[] {
  // Remove the 'rm' and flags, get the paths
  const withoutRm = command.replace(/^\s*rm\s+/, '');
  const withoutFlags = withoutRm.replace(/^(-[rfivd]+\s+)+/, '');

  // Split on whitespace, filter empty
  return withoutFlags
    .split(/\s+/)
    .filter(p => p && !p.startsWith('-'))
    .map(p => p.replace(/['"`]/g, '')); // Remove quotes
}

/**
 * Extract source paths from mv command (files being moved/renamed)
 */
function extractMvSourcePaths(command: string): string[] {
  const withoutMv = command.replace(/^\s*mv\s+/, '');
  const withoutFlags = withoutMv.replace(/^(-[fivn]+\s+)+/, '');

  const parts = withoutFlags.split(/\s+/).filter(p => p && !p.startsWith('-'));

  // Last part is destination, everything else is source
  if (parts.length >= 2) {
    return parts.slice(0, -1).map(p => p.replace(/['"`]/g, ''));
  }

  return parts.map(p => p.replace(/['"`]/g, ''));
}
