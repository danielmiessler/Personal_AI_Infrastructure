#!/usr/bin/env bun
/**
 * upgrade.ts — PAI upgrade engine
 *
 * Handles backup, manifest validation, file installation, post-upgrade migration,
 * and auto-rollback on failure. Consumed by pai.ts `upgrade` command.
 *
 * Usage:
 *   import { runUpgrade } from './upgrade.ts';
 *   await runUpgrade({ source: '/path/to/new-release/.claude' });
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  copyFileSync,
  renameSync,
  statSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'bun';
import { atomicWriteJSON } from '../../hooks/lib/atomic.ts';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ManifestEntry {
  path: string;   // relative to PAI dir
  sha256: string;
  size: number;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  bunMinVersion: string;
  files: ManifestEntry[];
}

export interface UpgradeOptions {
  /** Path to the new release .claude/ directory (source) */
  source: string;
  /** PAI installation directory (default: ~/.claude) */
  target?: string;
  /** Skip dependency checks */
  skipDeps?: boolean;
  /** Skip manifest integrity check */
  skipIntegrity?: boolean;
  /** Dry run — show what would happen, don't write */
  dryRun?: boolean;
}

export interface UpgradeResult {
  success: boolean;
  phase: string;
  errors: string[];
  backupPath?: string;
  rolledBack?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Paths preserved from the existing installation during upgrade */
export const PRESERVED_PATHS = [
  'MEMORY',
  'PAI/USER',
  'config/identity.jsonc',
  'config/preferences.jsonc',
  'MCPs',
  '.mcp.json',
  'projects',
];

/** Required files that must exist in the source for a valid upgrade */
export const REQUIRED_SOURCE_FILES = [
  'settings.json',
  'CLAUDE.md',
  'hooks',
  'PAI/Tools',
  'PAI/Algorithm',
];

export const MIN_BUN_VERSION = '1.0.0';

// ── Dependency checks ─────────────────────────────────────────────────────

export interface DepCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Verify Bun and Claude Code are present and meet version requirements. */
export function checkDependencies(): DepCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Bun version
  const bunResult = spawnSync(['bun', '--version'], { stderr: 'pipe' });
  if (bunResult.exitCode !== 0) {
    errors.push('Bun not found — install from https://bun.sh');
  } else {
    const bunVersion = bunResult.stdout.toString().trim();
    if (!meetsMinVersion(bunVersion, MIN_BUN_VERSION)) {
      errors.push(`Bun v${bunVersion} < required v${MIN_BUN_VERSION} — run: bun upgrade`);
    }
  }

  // Claude Code
  const claudeResult = spawnSync(['claude', '--version'], { stderr: 'pipe' });
  if (claudeResult.exitCode !== 0) {
    warnings.push('Claude Code CLI not found — install from https://claude.ai/code');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Returns true if version a >= b (semver-like X.Y.Z). */
export function meetsMinVersion(actual: string, min: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [aM, am, ap] = normalize(actual);
  const [bM, bm, bp] = normalize(min);
  if (aM !== bM) return aM > bM;
  if (am !== bm) return am > bm;
  return ap >= bp;
}

// ── Manifest validation ────────────────────────────────────────────────────

export interface ManifestCheckResult {
  valid: boolean;
  missing: string[];
  mismatched: string[];
}

/** Verify source directory files match the manifest checksums. */
export function validateManifest(
  sourceDir: string,
  manifestPath: string
): ManifestCheckResult {
  const missing: string[] = [];
  const mismatched: string[] = [];

  if (!existsSync(manifestPath)) {
    return { valid: false, missing: ['manifest.json'], mismatched: [] };
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
  } catch {
    return { valid: false, missing: ['manifest.json (parse error)'], mismatched: [] };
  }

  for (const entry of manifest.files) {
    const filePath = join(sourceDir, entry.path);
    if (!existsSync(filePath)) {
      missing.push(entry.path);
      continue;
    }
    const actual = sha256File(filePath);
    if (actual !== entry.sha256) {
      mismatched.push(entry.path);
    }
  }

  return {
    valid: missing.length === 0 && mismatched.length === 0,
    missing,
    mismatched,
  };
}

// ── Backup ────────────────────────────────────────────────────────────────

/** Copy targetDir → backupDir recursively. Returns the backup path. */
export function backupInstallation(targetDir: string, backupDir: string): void {
  mkdirSync(backupDir, { recursive: true });
  copyDir(targetDir, backupDir);
}

/** Build a date-stamped backup path. */
export function makeBackupPath(targetDir: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${targetDir}-backup-${date}`;
}

// ── File installation ─────────────────────────────────────────────────────

/**
 * Copy files from sourceDir → targetDir, skipping PRESERVED_PATHS.
 * Creates directories as needed. Does NOT delete files in target that
 * are absent in source (additive merge, not clobber).
 */
export function installFiles(
  sourceDir: string,
  targetDir: string,
  preservePaths: string[] = PRESERVED_PATHS,
  dryRun = false
): string[] {
  const installed: string[] = [];

  function shouldPreserve(relPath: string): boolean {
    return preservePaths.some(
      p => relPath === p || relPath.startsWith(p + '/')
    );
  }

  function copyRecursive(src: string, tgt: string, rel: string): void {
    if (shouldPreserve(rel)) return;

    const stat = statSync(src);
    if (stat.isDirectory()) {
      if (!dryRun) mkdirSync(tgt, { recursive: true });
      for (const entry of readdirSync(src)) {
        const childRel = rel ? `${rel}/${entry}` : entry;
        copyRecursive(join(src, entry), join(tgt, entry), childRel);
      }
    } else {
      if (!dryRun) {
        mkdirSync(dirname(tgt), { recursive: true });
        copyFileSync(src, tgt);
      }
      installed.push(rel);
    }
  }

  for (const entry of readdirSync(sourceDir)) {
    copyRecursive(join(sourceDir, entry), join(targetDir, entry), entry);
  }

  return installed;
}

// ── Rollback ──────────────────────────────────────────────────────────────

/**
 * Restore targetDir from backupDir.
 * Renames current target to targetDir.failed-TIMESTAMP, then copies backup.
 */
export function rollback(targetDir: string, backupDir: string): void {
  if (!existsSync(backupDir)) {
    throw new Error(`Backup not found at ${backupDir}`);
  }

  const failedDir = `${targetDir}.failed-${Date.now()}`;
  if (existsSync(targetDir)) {
    renameSync(targetDir, failedDir);
  }
  mkdirSync(targetDir, { recursive: true });
  copyDir(backupDir, targetDir);
}

// ── Post-upgrade migrations ────────────────────────────────────────────────

export interface MigrationResult {
  success: boolean;
  errors: string[];
}

/**
 * Run post-upgrade migration steps:
 * 1. BuildSettings.ts — rebuild settings.json from config/*.jsonc
 * 2. BuildCLAUDE.ts — rebuild CLAUDE.md if needed
 */
export function runMigrations(targetDir: string): MigrationResult {
  const errors: string[] = [];

  const buildSettings = join(targetDir, 'hooks', 'handlers', 'BuildSettings.ts');
  const buildClaude = join(targetDir, 'hooks', 'handlers', 'BuildCLAUDE.ts');

  for (const script of [buildSettings, buildClaude]) {
    if (!existsSync(script)) continue;
    const result = spawnSync(['bun', script], {
      env: { ...process.env, PAI_DIR: targetDir },
      stderr: 'pipe',
      stdout: 'pipe',
    });
    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString().trim();
      errors.push(`${script}: ${stderr || `exit ${result.exitCode}`}`);
    }
  }

  return { success: errors.length === 0, errors };
}

// ── Source validation ─────────────────────────────────────────────────────

/** Quick check that source directory looks like a valid PAI release. */
export function validateSource(sourceDir: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!existsSync(sourceDir)) {
    errors.push(`Source directory not found: ${sourceDir}`);
    return { valid: false, errors };
  }

  for (const required of REQUIRED_SOURCE_FILES) {
    if (!existsSync(join(sourceDir, required))) {
      errors.push(`Source missing: ${required}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Main upgrade flow ─────────────────────────────────────────────────────

/**
 * Run the full upgrade flow. Returns success/failure with phase info.
 * On failure, auto-rolls back to backup if one was created.
 */
export async function runUpgrade(opts: UpgradeOptions): Promise<UpgradeResult> {
  const targetDir = opts.target ?? join(homedir(), '.claude');
  const { source, dryRun = false } = opts;

  // ── Phase 1: Validate source ───────────────────────────────────────────
  const sourceCheck = validateSource(source);
  if (!sourceCheck.valid) {
    return { success: false, phase: 'validate-source', errors: sourceCheck.errors };
  }

  // ── Phase 2: Dependency check ──────────────────────────────────────────
  if (!opts.skipDeps) {
    const deps = checkDependencies();
    if (!deps.valid) {
      return { success: false, phase: 'dependency-check', errors: deps.errors };
    }
  }

  // ── Phase 3: Manifest integrity ────────────────────────────────────────
  if (!opts.skipIntegrity) {
    const manifestPath = join(source, 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifestCheck = validateManifest(source, manifestPath);
      if (!manifestCheck.valid) {
        const errors = [
          ...manifestCheck.missing.map(f => `Missing: ${f}`),
          ...manifestCheck.mismatched.map(f => `Checksum mismatch: ${f}`),
        ];
        return { success: false, phase: 'manifest-validation', errors };
      }
    }
    // No manifest.json in source → skip integrity check (fresh install case)
  }

  if (dryRun) {
    const files = installFiles(source, targetDir, PRESERVED_PATHS, true);
    return {
      success: true,
      phase: 'dry-run',
      errors: [],
      backupPath: makeBackupPath(targetDir),
    };
  }

  // ── Phase 4: Backup current installation ──────────────────────────────
  const backupPath = makeBackupPath(targetDir);
  try {
    backupInstallation(targetDir, backupPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, phase: 'backup', errors: [`Backup failed: ${msg}`] };
  }

  // ── Phase 5: Install new files ─────────────────────────────────────────
  try {
    installFiles(source, targetDir, PRESERVED_PATHS, false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      rollback(targetDir, backupPath);
      return {
        success: false,
        phase: 'install',
        errors: [`Install failed: ${msg}`],
        backupPath,
        rolledBack: true,
      };
    } catch (rollbackErr) {
      const rbMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
      return {
        success: false,
        phase: 'install',
        errors: [`Install failed: ${msg}`, `Rollback also failed: ${rbMsg}`],
        backupPath,
        rolledBack: false,
      };
    }
  }

  // ── Phase 6: Post-upgrade migrations ──────────────────────────────────
  const migrations = runMigrations(targetDir);
  if (!migrations.success) {
    // Migrations failing is non-fatal — installation succeeded, just warn
    return {
      success: true,
      phase: 'complete-with-warnings',
      errors: migrations.errors.map(e => `Migration warning: ${e}`),
      backupPath,
    };
  }

  return { success: true, phase: 'complete', errors: [], backupPath };
}

// ── Utilities ─────────────────────────────────────────────────────────────

/** Compute SHA-256 hex digest of a file using Bun's native crypto. */
export function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(content);
  return hasher.digest('hex');
}

/** Recursively copy src directory to tgt. */
function copyDir(src: string, tgt: string): void {
  if (!existsSync(src)) return;
  mkdirSync(tgt, { recursive: true });

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const tgtPath = join(tgt, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, tgtPath);
    } else {
      copyFileSync(srcPath, tgtPath);
    }
  }
}
