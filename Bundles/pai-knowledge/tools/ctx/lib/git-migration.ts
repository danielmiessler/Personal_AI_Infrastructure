/**
 * Git-Based Migration Module
 *
 * Provides Git-backed migration workflow for vault tag migrations.
 * Supports Git opt-in vaults where not all files are tracked.
 *
 * REQ-MIG-011: Git-based workflow (prepare/execute/finalize/abort)
 * REQ-MIG-012: Idempotent migration rules
 * REQ-MIG-016: Migration branch grooming
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { getConfig } from "./config";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export enum MigrationState {
  NONE = "NONE",
  PREPARED = "PREPARED",
  EXECUTED = "EXECUTED",
}

export interface MigrationStatus {
  state: MigrationState;
  branchName?: string;
  originalBranch?: string;
  files?: string[];
  trackedFiles?: string[];
  newlyTrackedFiles?: string[];
  timestamp?: string;
}

export interface PrepareOptions {
  filters?: Array<{ type: string; value: string }>;
  files?: string[];
  dryRun?: boolean;
}

export interface PrepareResult {
  filesToMigrate: string[];
  filesToTrack: string[];
  branchName: string;
  branchCreated: boolean;
  committed: boolean;
}

export interface ExecuteResult {
  filesModified: number;
  tagsChanged: number;
  changes: Array<{
    file: string;
    oldTags: string[];
    newTags: string[];
  }>;
}

export interface FinalizeResult {
  commitHash?: string;
  merged: boolean;
  branchDeleted: boolean;
  returnedToBranch?: string;
}

export interface AbortResult {
  filesRestored: number;
  branchDeleted: boolean;
  filesToUntrack: string[];
  returnedToBranch?: string;
}

export interface MigrationBranch {
  name: string;
  merged: boolean;
  mergedDate?: Date;
  age?: number; // days
}

export interface CleanupResult {
  branchesDeleted: string[];
  branchesPreserved: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATION_STATE_FILE = join(homedir(), ".claude", "context", "migrations", "current-migration.json");
const MIGRATION_BRANCH_PREFIX = "migration/taxonomy-";

// ═══════════════════════════════════════════════════════════════════════════
// Git Helpers
// ═══════════════════════════════════════════════════════════════════════════

function runGit(args: string[], cwd: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error: any) {
    throw new Error(`Git command failed: git ${args}\n${error.stderr || error.message}`);
  }
}

function isGitRepo(path: string): boolean {
  try {
    runGit("rev-parse --is-inside-work-tree", path);
    return true;
  } catch {
    return false;
  }
}

function getCurrentBranch(cwd: string): string {
  return runGit("rev-parse --abbrev-ref HEAD", cwd);
}

function isFileTracked(file: string, cwd: string): boolean {
  try {
    runGit(`ls-files --error-unmatch "${file}"`, cwd);
    return true;
  } catch {
    return false;
  }
}

function branchExists(branch: string, cwd: string): boolean {
  try {
    runGit(`show-ref --verify --quiet refs/heads/${branch}`, cwd);
    return true;
  } catch {
    return false;
  }
}

function isBranchMerged(branch: string, cwd: string): boolean {
  try {
    const merged = runGit("branch --merged", cwd);
    return merged.split("\n").some(b => b.trim() === branch);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════════════════════════

function loadMigrationState(): MigrationStatus {
  if (!existsSync(MIGRATION_STATE_FILE)) {
    return { state: MigrationState.NONE };
  }

  try {
    const content = readFileSync(MIGRATION_STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return { state: MigrationState.NONE };
  }
}

function saveMigrationState(status: MigrationStatus): void {
  const dir = dirname(MIGRATION_STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(MIGRATION_STATE_FILE, JSON.stringify(status, null, 2));
}

function clearMigrationState(): void {
  if (existsSync(MIGRATION_STATE_FILE)) {
    const { unlinkSync } = require("fs");
    unlinkSync(MIGRATION_STATE_FILE);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Branch Name Generation
// ═══════════════════════════════════════════════════════════════════════════

export function getMigrationBranchName(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  return `${MIGRATION_BRANCH_PREFIX}${date}-${time}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// File Analysis
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeFilesForMigration(
  files: Array<{ path: string; isTracked?: boolean }>,
  vaultPath?: string
): { tracked: typeof files; untracked: typeof files } {
  const cwd = vaultPath || getConfig().vaultPath;

  const analyzed = files.map(f => ({
    ...f,
    isTracked: f.isTracked ?? isFileTracked(f.path, cwd),
  }));

  return {
    tracked: analyzed.filter(f => f.isTracked),
    untracked: analyzed.filter(f => !f.isTracked),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Prepare Phase (REQ-MIG-011)
// ═══════════════════════════════════════════════════════════════════════════

export async function prepareMigration(options: PrepareOptions): Promise<PrepareResult> {
  const config = getConfig();
  const vaultPath = config.vaultPath;

  // Verify Git repo
  if (!isGitRepo(vaultPath)) {
    throw new Error("Vault is not a Git repository");
  }

  // Get current status
  const currentStatus = loadMigrationState();
  if (currentStatus.state !== MigrationState.NONE) {
    throw new Error(
      `Migration already in progress (state: ${currentStatus.state}). ` +
      `Run 'ctx tag migrate --abort' or '--finalize' first.`
    );
  }

  // TODO: Implement file selection based on filters
  // For now, return a placeholder
  const filesToMigrate = options.files || [];
  const filesToTrack: string[] = [];

  // Analyze which files need to be tracked
  if (filesToMigrate.length > 0) {
    const analysis = analyzeFilesForMigration(
      filesToMigrate.map(f => ({ path: f })),
      vaultPath
    );
    filesToTrack.push(...analysis.untracked.map(f => f.path));
  }

  const branchName = getMigrationBranchName();

  if (options.dryRun) {
    return {
      filesToMigrate,
      filesToTrack,
      branchName,
      branchCreated: false,
      committed: false,
    };
  }

  // Store original branch
  const originalBranch = getCurrentBranch(vaultPath);

  // Create migration branch
  runGit(`checkout -b "${branchName}"`, vaultPath);

  // Track untracked files
  for (const file of filesToTrack) {
    runGit(`add "${file}"`, vaultPath);
  }

  // Commit pre-migration state
  if (filesToMigrate.length > 0 || filesToTrack.length > 0) {
    // Stage all target files
    for (const file of filesToMigrate) {
      if (existsSync(join(vaultPath, file))) {
        runGit(`add "${file}"`, vaultPath);
      }
    }

    try {
      runGit('commit -m "chore(migration): pre-migration snapshot"', vaultPath);
    } catch {
      // No changes to commit is OK
    }
  }

  // Save state
  saveMigrationState({
    state: MigrationState.PREPARED,
    branchName,
    originalBranch,
    files: filesToMigrate,
    trackedFiles: filesToMigrate.filter(f => !filesToTrack.includes(f)),
    newlyTrackedFiles: filesToTrack,
    timestamp: new Date().toISOString(),
  });

  return {
    filesToMigrate,
    filesToTrack,
    branchName,
    branchCreated: true,
    committed: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Execute Phase (REQ-MIG-011)
// ═══════════════════════════════════════════════════════════════════════════

export async function executeMigration(options?: { dryRun?: boolean }): Promise<ExecuteResult> {
  const status = loadMigrationState();

  if (status.state !== MigrationState.PREPARED) {
    throw new Error(
      "No migration prepared. Run 'ctx tag migrate --prepare' first."
    );
  }

  // TODO: Implement actual migration execution
  // This would call the existing migration logic on the prepared files

  const result: ExecuteResult = {
    filesModified: 0,
    tagsChanged: 0,
    changes: [],
  };

  if (!options?.dryRun) {
    // Update state
    saveMigrationState({
      ...status,
      state: MigrationState.EXECUTED,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Finalize Phase (REQ-MIG-011)
// ═══════════════════════════════════════════════════════════════════════════

export async function finalizeMigration(options?: { dryRun?: boolean }): Promise<FinalizeResult> {
  const status = loadMigrationState();

  if (status.state === MigrationState.NONE) {
    throw new Error("No migration in progress.");
  }

  const config = getConfig();
  const vaultPath = config.vaultPath;

  if (options?.dryRun) {
    return {
      commitHash: "dry-run",
      merged: true,
      branchDeleted: false,
      returnedToBranch: status.originalBranch,
    };
  }

  // Commit any remaining changes
  try {
    runGit("add .", vaultPath);
    runGit('commit -m "feat(migration): apply taxonomy migration rules"', vaultPath);
  } catch {
    // No changes to commit is OK
  }

  // Get commit hash
  const commitHash = runGit("rev-parse HEAD", vaultPath);

  // Switch back to original branch
  runGit(`checkout "${status.originalBranch}"`, vaultPath);

  // Merge migration branch
  runGit(`merge "${status.branchName}" --no-ff -m "Merge migration branch"`, vaultPath);

  // Clear state (but keep branch for grooming later)
  clearMigrationState();

  return {
    commitHash,
    merged: true,
    branchDeleted: false, // Keep for grooming
    returnedToBranch: status.originalBranch,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Abort Phase (REQ-MIG-011)
// ═══════════════════════════════════════════════════════════════════════════

export async function abortMigration(options?: { dryRun?: boolean }): Promise<AbortResult> {
  const status = loadMigrationState();

  if (status.state === MigrationState.NONE) {
    throw new Error("No migration in progress.");
  }

  const config = getConfig();
  const vaultPath = config.vaultPath;

  if (options?.dryRun) {
    return {
      filesRestored: status.files?.length || 0,
      branchDeleted: true,
      filesToUntrack: status.newlyTrackedFiles || [],
      returnedToBranch: status.originalBranch,
    };
  }

  // Discard all changes
  runGit("checkout .", vaultPath);

  // Switch back to original branch
  runGit(`checkout "${status.originalBranch}"`, vaultPath);

  // Delete migration branch
  if (status.branchName && branchExists(status.branchName, vaultPath)) {
    runGit(`branch -D "${status.branchName}"`, vaultPath);
  }

  // Clear state
  clearMigrationState();

  return {
    filesRestored: status.files?.length || 0,
    branchDeleted: true,
    filesToUntrack: status.newlyTrackedFiles || [],
    returnedToBranch: status.originalBranch,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Status (REQ-MIG-011)
// ═══════════════════════════════════════════════════════════════════════════

export async function getMigrationStatus(): Promise<MigrationStatus> {
  return loadMigrationState();
}

// ═══════════════════════════════════════════════════════════════════════════
// Branch Cleanup / Grooming (REQ-MIG-016)
// ═══════════════════════════════════════════════════════════════════════════

export async function listMigrationBranches(options?: {
  olderThanDays?: number;
}): Promise<MigrationBranch[]> {
  const config = getConfig();
  const vaultPath = config.vaultPath;

  if (!isGitRepo(vaultPath)) {
    return [];
  }

  // Get all branches matching migration pattern
  let branches: string[];
  try {
    const output = runGit("branch --list 'migration/taxonomy-*'", vaultPath);
    branches = output
      .split("\n")
      .map(b => b.trim().replace(/^\* /, ""))
      .filter(b => b.length > 0);
  } catch {
    return [];
  }

  const result: MigrationBranch[] = [];
  const now = Date.now();

  for (const branch of branches) {
    const merged = isBranchMerged(branch, vaultPath);

    // Parse date from branch name (migration/taxonomy-YYYY-MM-DD-HHMMSS)
    const dateMatch = branch.match(/(\d{4}-\d{2}-\d{2})/);
    let mergedDate: Date | undefined;
    let age: number | undefined;

    if (dateMatch) {
      mergedDate = new Date(dateMatch[1]);
      age = Math.floor((now - mergedDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Filter by age if specified
    if (options?.olderThanDays !== undefined && age !== undefined) {
      if (age < options.olderThanDays) {
        continue;
      }
    }

    result.push({
      name: branch,
      merged,
      mergedDate,
      age,
    });
  }

  return result;
}

export async function cleanupMigrationBranches(options: {
  olderThanDays?: number;
  dryRun?: boolean;
}): Promise<CleanupResult> {
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const branches = await listMigrationBranches({
    olderThanDays: options.olderThanDays ?? 30,
  });

  const toDelete = branches.filter(b => b.merged);
  const toPreserve = branches.filter(b => !b.merged);

  const result: CleanupResult = {
    branchesDeleted: [],
    branchesPreserved: toPreserve.map(b => b.name),
  };

  if (options.dryRun) {
    result.branchesDeleted = toDelete.map(b => b.name);
    return result;
  }

  for (const branch of toDelete) {
    try {
      runGit(`branch -d "${branch.name}"`, vaultPath);
      result.branchesDeleted.push(branch.name);
    } catch {
      result.branchesPreserved.push(branch.name);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Idempotent Rule Helpers (REQ-MIG-012)
// ═══════════════════════════════════════════════════════════════════════════

export function applyIdempotentRule(
  tags: string[],
  rule: { from: string; to: string }
): string[] {
  const result = new Set<string>();

  for (const tag of tags) {
    if (tag === rule.from) {
      // Replace source with target
      result.add(rule.to);
    } else {
      result.add(tag);
    }
  }

  return Array.from(result);
}

export function applyPrefixRule(tag: string, prefix: string): string {
  if (tag.startsWith(prefix)) {
    return tag; // Already has prefix
  }
  if (tag.includes("/")) {
    return tag; // Already has some prefix
  }
  return `${prefix}${tag}`;
}
