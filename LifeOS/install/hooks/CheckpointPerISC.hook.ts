#!/usr/bin/env bun
/**
 * @version 1.1.1
 * CheckpointPerISC.hook.ts — auto git commit on every ISC `[ ]`->`[x]` transition
 *
 * TRIGGER: PostToolUse (Write, Edit) on ISA.md (or legacy PRD.md) under
 * MEMORY/WORK/<slug>/.
 *
 * For each newly-checked ISC, iterates through the allowlist of opted-in repos
 * (~/.claude/checkpoint-repos.txt per spec) and creates one git commit per
 * repo that has uncommitted changes. Commit subject:
 *   "<ISC-id> (<slug>): <sanitized description>"
 *
 * Idempotent via sidecar state file: MEMORY/WORK/<slug>/.checkpoint-state.json.
 * Allowlist is empty by default; repos must be opted in explicitly by {{PRINCIPAL_NAME}}.
 *
 * Fails closed: any error path logs to stderr and emits `{continue:true}` with
 * exit 0 — never crashes the session, never commits without an allowlist,
 * never executes any destructive git op (no reset/revert/checkout/branch -D/
 * clean -fd/push --force).
 */

import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { parseFrontmatter, parseCriteriaList, ARTIFACT_FILENAME, LEGACY_ARTIFACT_FILENAME } from './lib/isa-utils';

// Allowlist path: top of ~/.claude per spec. One absolute repo path per line;
// '#' comments and blank
// lines are ignored. Tilde and $HOME prefixes are expanded as a quality-of-
// life feature so users can write `~/Projects/foo` instead of the long form.
const ALLOWLIST_PATH = join(homedir(), '.claude', 'checkpoint-repos.txt');
const GIT_TIMEOUT_MS = 5000;

interface CheckpointState {
  committed_iscs: string[];
  last_commit_sha: Record<string, string>;
}

function expandPath(p: string): string {
  let s = p.trim();
  if (!s) return s;
  if (s.startsWith('~/')) s = join(homedir(), s.slice(2));
  else if (s === '~') s = homedir();
  s = s.replace(/^\$HOME(\/|$)/, homedir() + '$1');
  return s;
}

function loadAllowlist(): string[] {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  try {
    return readFileSync(ALLOWLIST_PATH, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'))
      .map(expandPath);
  } catch (err) {
    console.error('[CheckpointPerISC] failed to read allowlist:', err);
    return [];
  }
}

function loadState(stateFile: string): CheckpointState {
  if (!existsSync(stateFile)) return { committed_iscs: [], last_commit_sha: {} };
  try {
    const parsed = JSON.parse(readFileSync(stateFile, 'utf-8'));
    return {
      committed_iscs: Array.isArray(parsed.committed_iscs) ? parsed.committed_iscs : [],
      last_commit_sha: parsed.last_commit_sha && typeof parsed.last_commit_sha === 'object' ? parsed.last_commit_sha : {},
    };
  } catch (err) {
    console.error('[CheckpointPerISC] malformed state file, resetting:', err);
    return { committed_iscs: [], last_commit_sha: {} };
  }
}

function saveState(stateFile: string, state: CheckpointState): void {
  try {
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('[CheckpointPerISC] failed to write state:', err);
  }
}

function gitRun(repo: string, args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf-8',
    timeout: GIT_TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function isGitRepo(repo: string): boolean {
  try {
    gitRun(repo, ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

function hasChanges(repo: string): boolean {
  try {
    return gitRun(repo, ['status', '--porcelain']).trim().length > 0;
  } catch {
    return false;
  }
}

function sanitizeMessage(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[`$]/g, '').trim().slice(0, 200);
}

/**
 * Dirty paths in `repo`, repo-relative. Handles rename entries ("R  old -> new") and
 * git's quoted form for paths with unusual bytes.
 */
function dirtyPaths(repo: string): string[] {
  let out: string;
  try { out = gitRun(repo, ['status', '--porcelain', '-z']); } catch { return []; }
  const entries = out.split('\0').filter(Boolean);
  const paths: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.length < 4) continue;
    const code = e.slice(0, 2);
    paths.push(e.slice(3));
    // A rename entry is followed by its source path as the next NUL-delimited field.
    if (code.includes('R') || code.includes('C')) { if (entries[i + 1]) paths.push(entries[i + 1]); i++; }
  }
  return paths;
}

/**
 * Paths this RUN touched: dirty AND modified at or after the run started.
 *
 * `git add -A` cannot be used here. ~/.claude runs concurrent sessions, so a whole-tree
 * stage silently adopts another session's in-flight work and buries it under an unrelated
 * subject — which also destroys the provenance the Algorithm depends on, since
 * `git log -- <path>` is the authoritative change record. Residual: a file another session
 * dirties mid-run still has a fresh mtime and can be swept; this closes the common case,
 * not every case.
 */
function runTouchedPaths(repo: string, startedMs: number): string[] {
  return dirtyPaths(repo).filter((rel) => {
    try { return statSync(join(repo, rel)).mtimeMs >= startedMs; }
    catch { return true; } // deleted in-run — the deletion is ours to record
  });
}

function commitInRepo(repo: string, iscId: string, slug: string, description: string, startedMs: number): string | null {
  try {
    const paths = runTouchedPaths(repo, startedMs);
    if (paths.length === 0) return null;
    gitRun(repo, ['add', '--', ...paths]);
    // iscId already has the canonical "ISC-<N>" form (or "ISC-<N>-A-<M>" for
    // anti-criteria) per parseCriteriaList — use it verbatim, do not re-prefix.
    const subject = `${iscId} (${slug}): ${sanitizeMessage(description)}`;
    // --no-verify skips husky/pre-commit hooks; --no-gpg-sign avoids GPG
    // passphrase prompts that would hang the session blocking on stdin.
    gitRun(repo, ['commit', '-m', subject, '--quiet', '--no-verify', '--no-gpg-sign']);
    const sha = gitRun(repo, ['rev-parse', 'HEAD']).trim();
    return sha;
  } catch (err: unknown) {
    const e = err as { stderr?: { toString?: () => string }; message?: string };
    const detail = e?.stderr?.toString?.() || e?.message || String(err);
    console.error(`[CheckpointPerISC] commit failed in ${repo} for ${iscId}: ${detail}`);
    return null;
  }
}

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

function emitContinueAndExit(): never {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

async function main() {
  const filePath: string = input?.tool_input?.file_path || '';
  if (!filePath.includes('MEMORY/WORK/')) return;
  const isISA = filePath.endsWith('/' + ARTIFACT_FILENAME) || filePath.endsWith(ARTIFACT_FILENAME);
  const isLegacyPRD = filePath.endsWith('/' + LEGACY_ARTIFACT_FILENAME) || filePath.endsWith(LEGACY_ARTIFACT_FILENAME);
  if (!isISA && !isLegacyPRD) return;
  if (!existsSync(filePath)) return;

  const slugDir = dirname(filePath);
  const slug = basename(slugDir);
  const stateFile = join(slugDir, '.checkpoint-state.json');

  const content = readFileSync(filePath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm) return;
  const criteria = parseCriteriaList(content);
  if (criteria.length === 0) return;

  // Only files touched at or after the run started get staged (see runTouchedPaths).
  // No parseable `started` means no way to tell this run's work from another session's,
  // so checkpointing stands down rather than guessing — silence beats a bad commit.
  const startedMs = Date.parse(String((fm as Record<string, unknown>).started ?? ''));
  if (!Number.isFinite(startedMs)) {
    console.error(`[CheckpointPerISC] ${slug}: no parseable 'started' in frontmatter — skipping (will not stage a whole tree)`);
    return;
  }

  const state = loadState(stateFile);
  const alreadyCommitted = new Set(state.committed_iscs);
  const newlyChecked = criteria.filter(c => c.status === 'completed' && !alreadyCommitted.has(c.id));
  if (newlyChecked.length === 0) return;

  const allowlist = loadAllowlist();
  if (allowlist.length === 0) {
    console.error('[CheckpointPerISC] no repos configured, skipping');
    return;
  }

  for (const isc of newlyChecked) {
    for (const repo of allowlist) {
      if (!existsSync(repo)) {
        console.error(`[CheckpointPerISC] repo not found: ${repo}`);
        continue;
      }
      if (!isGitRepo(repo)) {
        console.error(`[CheckpointPerISC] not a git repo: ${repo}`);
        continue;
      }
      if (!hasChanges(repo)) continue;
      const sha = commitInRepo(repo, isc.id, slug, isc.description, startedMs);
      if (sha) state.last_commit_sha[repo] = sha;
    }
    state.committed_iscs.push(isc.id);
  }

  saveState(stateFile, state);
}

main().catch(err => {
  console.error('[CheckpointPerISC] uncaught error:', err);
}).finally(() => {
  emitContinueAndExit();
});
