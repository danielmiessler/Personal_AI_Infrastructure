#!/usr/bin/env bun
/**
 * current-work-dir.ts — print the absolute work directory of the active LifeOS session
 *
 * Prints the work directory (absolute path) of the principal's current active
 * LifeOS session, resolved against the canonical session registry at
 * MEMORY/STATE/work.json.
 *
 * REPLACES the legacy phantom file pattern:
 *   $(jq -r '.work_dir' ~/.claude/LIFEOS/MEMORY/STATE/current-work.json)
 *
 * The file `current-work.json` was never written by anything in the system —
 * it was a read-only contract on a nonexistent producer. The canonical
 * session-state registry is MEMORY/STATE/work.json, written by the hook
 * pipeline (SessionStart, ToolActivityTracker, ISASync, etc.) and consumed
 * by Pulse, ULWorkSync, SessionCleanup, and WorkCompletionLearning.
 *
 * Resolution precedence:
 *   1. CLAUDE_SESSION_ID env var → exact sessionUUID match, phase != complete
 *      (multiple matches → most recent updatedAt wins).
 *   2. Most recent lastToolActivity (or updatedAt fallback) where
 *      phase != complete AND phase != native.
 *   3. Most recent updatedAt where phase != complete (any mode, incl. native).
 *
 * Exits 1 to stderr if nothing matches. Never prints an empty path — empty
 * paths silently break downstream file ops; loud failure is correct.
 *
 * Usage:
 *   bun current-work-dir.ts            # absolute work dir
 *   bun current-work-dir.ts --slug     # slug only
 *   bun current-work-dir.ts --isa      # absolute ISA.md path
 *   bun current-work-dir.ts --json     # {slug, workDir, isaPath}
 *   bun current-work-dir.ts --help     # usage
 */

import { readFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { paiPath } from '../../hooks/lib/paths';

interface SessionEntry {
  isa?: string;
  sessionUUID?: string;
  phase: string;
  updatedAt: string;
  lastToolActivity?: string;
}

interface WorkJson {
  sessions: Record<string, SessionEntry>;
}

function usage(): void {
  process.stdout.write(
    'Usage: bun current-work-dir.ts [--slug|--isa|--json|--help]\n' +
    '  (no flag)  print absolute work dir\n' +
    '  --slug     print slug only\n' +
    '  --isa      print absolute ISA.md path\n' +
    '  --json     print {slug, workDir, isaPath}\n' +
    '  --help     show this message\n',
  );
}

function die(msg: string): never {
  process.stderr.write(`current-work-dir: ${msg}\n`);
  process.exit(1);
}

function tsOf(s: SessionEntry): number {
  const v = s.lastToolActivity ?? s.updatedAt;
  const n = v ? Date.parse(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function pickMostRecent(entries: Array<[string, SessionEntry]>): [string, SessionEntry] | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) => (tsOf(cur[1]) > tsOf(best[1]) ? cur : best));
}

function resolveActiveSession(work: WorkJson): [string, SessionEntry] {
  const all = Object.entries(work.sessions ?? {});
  const withIsa = all.filter(([, s]) => typeof s.isa === 'string' && s.isa.length > 0);
  const notComplete = withIsa.filter(([, s]) => s.phase !== 'complete');

  // Precedence 1: exact CLAUDE_SESSION_ID match
  const envId = process.env.CLAUDE_SESSION_ID;
  if (envId) {
    const matches = notComplete.filter(([, s]) => s.sessionUUID === envId);
    const picked = pickMostRecent(matches);
    if (picked) return picked;
  }

  // Precedence 2: non-native, non-complete, most recent activity
  const algoActive = notComplete.filter(([, s]) => s.phase !== 'native');
  const algoPicked = pickMostRecent(algoActive);
  if (algoPicked) return algoPicked;

  // Precedence 3: any non-complete session (incl. native)
  const anyPicked = pickMostRecent(notComplete);
  if (anyPicked) return anyPicked;

  die('no active session found in MEMORY/STATE/work.json (all sessions complete or missing isa field)');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const workJsonPath = paiPath('MEMORY', 'STATE', 'work.json');
  if (!existsSync(workJsonPath)) {
    die(`work.json not found at ${workJsonPath}`);
  }

  let work: WorkJson;
  try {
    work = JSON.parse(readFileSync(workJsonPath, 'utf8')) as WorkJson;
  } catch (err) {
    die(`failed to parse work.json: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!work || typeof work.sessions !== 'object' || work.sessions === null) {
    die('work.json has no .sessions object');
  }

  const [slug, session] = resolveActiveSession(work);
  // isa is guaranteed non-empty by resolveActiveSession's filter
  const isaRelative = session.isa as string;
  const isaPath = paiPath(isaRelative);
  const workDir = dirname(isaPath);

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify({ slug, workDir, isaPath }) + '\n');
    return;
  }
  if (args.includes('--slug')) {
    process.stdout.write(slug + '\n');
    return;
  }
  if (args.includes('--isa')) {
    process.stdout.write(isaPath + '\n');
    return;
  }
  process.stdout.write(workDir + '\n');
}

main();
