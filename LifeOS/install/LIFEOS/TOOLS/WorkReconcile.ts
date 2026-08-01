#!/usr/bin/env bun
/**
 * @version 1.1.0
 * WorkReconcile.ts — heal work.json drift against ISA frontmatter.
 *
 * WHY: ISASync only fires on Write/Edit tool events against the ISA path.
 * Any ISA change that bypasses that trigger (Bash sed, git operations,
 * another machine, a missed hook) leaves the work.json row stale forever —
 * the 2026-07-20 case: an ISA at `phase: complete` whose row still said
 * `climbing`, parked in the kanban's Paused lane for hours.
 *
 * WHAT: for every registry row backed by an ISA file, if the file's mtime
 * moved since the last sweep, re-read frontmatter + criteria and reconcile
 * the row's phase / progress / iteration / criteria / sessionName. ISA
 * frontmatter is the state of record (CLAUDE.md: "each ISA's frontmatter
 * (phase:/progress:) is the open/closed signal") — on drift, the ISA wins.
 *
 * Deliberately NARROW: never touches bodyHash (Resume-After-Complete stays
 * ISASync's job), never writes back to ISA files, never deletes rows
 * (syncToWorkJson's cleanup owns aging).
 *
 * Cost: one stat() per ISA-backed row (≤50), file reads only on mtime change.
 * Debounced to one sweep per DEBOUNCE_MS unless --force.
 *
 * Invoked: detached from EventLogger.hook.ts on PostToolUse (debounced),
 * or manually: bun ~/.claude/LIFEOS/TOOLS/WorkReconcile.ts [--force]
 */

import { readFileSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  parseFrontmatter,
  parseCriteriaList,
  readRegistry,
  writeRegistry,
  applyAscent,
} from '../../hooks/lib/isa-utils';
import { paiPath } from '../../hooks/lib/paths';

const STATE_PATH = paiPath('MEMORY', 'STATE', 'work-reconcile.json');
const DEBOUNCE_MS = 60_000;

interface ReconcileState {
  checkedAt?: string;
  /** slug → ISA file mtimeMs at last reconcile */
  isas: Record<string, number>;
}

function loadState(): ReconcileState {
  try {
    const s = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    return s && typeof s === 'object' ? { isas: {}, ...s } : { isas: {} };
  } catch {
    return { isas: {} };
  }
}

function firstH1(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function main() {
  const force = process.argv.includes('--force');
  const state = loadState();

  if (!force && state.checkedAt) {
    const age = Date.now() - new Date(state.checkedAt).getTime();
    if (age >= 0 && age < DEBOUNCE_MS) return;
  }

  const registry = readRegistry();
  const paiDir = paiPath();
  let drifted = 0;
  const fixes: string[] = [];

  for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
    if (!session || typeof session.isa !== 'string' || !session.isa) continue;
    const isaPath = join(paiDir, session.isa);

    let mtimeMs: number;
    try {
      mtimeMs = statSync(isaPath).mtimeMs;
    } catch {
      continue; // ISA gone — the sync cleanup owns aging rows out
    }
    const changes: string[] = [];

    // ROW-INTERNAL consistency first, and deliberately NOT gated on the ISA's
    // mtime: the `ascent` blob is derived from the row's own phase + progress,
    // so a blob that was wrong when some other writer stamped it must heal even
    // though the ISA file never moved. Costs one string split, no file IO.
    // (2026-07-30: the mtime memo made even `--force` a no-op for that case.)
    if (applyAscent(session)) changes.push(`ascent→${session.ascent.key}`);

    // Everything below re-reads the ISA — skip when the file hasn't moved.
    if (state.isas[slug] === mtimeMs) {
      if (changes.length > 0) {
        session.updatedAt = new Date().toISOString();
        drifted++;
        fixes.push(`${slug}: ${changes.join(', ')}`);
      }
      continue;
    }
    state.isas[slug] = mtimeMs;

    let content: string;
    try {
      content = readFileSync(isaPath, 'utf-8');
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (!fm) continue;

    // Phase — ISA frontmatter is authoritative.
    const fmPhase = (fm.phase || '').toLowerCase();
    if (fmPhase && fmPhase !== (session.phase || '').toLowerCase()) {
      changes.push(`phase ${session.phase}→${fmPhase}`);
      session.phase = fmPhase;
    }

    // Criteria — re-parse so claim cards sit in the right kanban column.
    // Preserve createdInPhase from the existing row (same rule as syncToWorkJson).
    const fresh = parseCriteriaList(content);
    if (fresh.length > 0) {
      const prevById = new Map<string, any>(
        (session.criteria || []).map((c: any) => [c.id, c]),
      );
      const merged = fresh.map((c) => ({
        ...c,
        createdInPhase:
          prevById.get(c.id)?.createdInPhase || (session.phase || 'observe').toUpperCase(),
        category: c.category || prevById.get(c.id)?.category,
      }));
      if (JSON.stringify(merged) !== JSON.stringify(session.criteria || [])) {
        changes.push('criteria');
        session.criteria = merged;
      }
    }

    // Progress — frontmatter fraction wins; anything else derives from criteria.
    const criteria: any[] = session.criteria || [];
    const progressValue = /^\d+\s*\/\s*\d+$/.test(String(fm.progress || ''))
      ? String(fm.progress).replace(/\s+/g, '')
      : `${criteria.filter((c) => c.status === 'completed').length}/${criteria.length}`;
    if (progressValue !== session.progress) {
      changes.push(`progress ${session.progress}→${progressValue}`);
      session.progress = progressValue;
    }

    // Iteration.
    const fmIter = parseInt(fm.iteration || fm.revision || '', 10);
    if (!Number.isNaN(fmIter) && fmIter !== session.iteration) {
      changes.push(`iteration ${session.iteration ?? 1}→${fmIter}`);
      session.iteration = fmIter;
    }

    // Title — rows with no name and no task render as slugs (or worse, leak
    // the intent snippet). The ISA's H1 is the human title.
    if (!session.sessionName && !session.task) {
      const h1 = firstH1(content);
      if (h1) {
        changes.push('sessionName←H1');
        session.sessionName = h1;
      }
    }

    // Re-derive: this pass may have just moved phase and/or progress, which the
    // blob is computed from. Idempotent with the pre-gate call above — that one
    // heals a stale blob on an unchanged ISA, this one keeps the row honest
    // after a real frontmatter reconcile (2026-07-30: a row reconciled to
    // `climbing 6/7` kept rendering 📐 Marking on the status line — the blob's
    // only consumer; the Pulse board re-derives and was never affected).
    if (applyAscent(session)) changes.push(`ascent→${session.ascent.key}`);

    if (changes.length > 0) {
      session.updatedAt = new Date().toISOString();
      drifted++;
      fixes.push(`${slug}: ${changes.join(', ')}`);
    }
  }

  if (drifted > 0) writeRegistry(registry, 'WorkReconcile');

  state.checkedAt = new Date().toISOString();
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch {}

  if (drifted > 0 || force) {
    console.log(
      `[WorkReconcile] ${drifted} row(s) reconciled${fixes.length ? ':\n  ' + fixes.join('\n  ') : ''}`,
    );
  }
}

main();
