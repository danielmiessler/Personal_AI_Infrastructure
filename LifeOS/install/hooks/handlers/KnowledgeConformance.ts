#!/usr/bin/env bun
/**
 * KnowledgeConformance.ts — Knowledge Archive note conformance reporter
 *
 * PURPOSE:
 * RebuildKnowledgeSchema keeps `_schema.md` honest against `KnowledgeSchema.ts`,
 * so the DOC can no longer drift from the CODE. Nothing checked whether the
 * NOTES conform to either: `KnowledgeLint.ts` exists and works, but every
 * reference to it in the tree is prose telling a human to run it, so note-level
 * conformance was only ever measured when someone remembered to type the
 * command. That is how a bulk import can write thousands of off-schema notes,
 * have later writers copy the legacy frontmatter from a neighbour, and spread a
 * dead dialect through the archive without a single warning.
 *
 * TRIGGER: SessionEnd (called from DocIntegrity.hook.ts)
 *
 * READS:
 *   MEMORY/KNOWLEDGE/<Type>/*.md (the canonical dirs, from KnowledgeSchema)
 *
 * WRITES:
 *   stderr (audit log with [KnowledgeConformance] tag)
 *   STATE/events.jsonl (typed event: doc.integrity.knowledge_conformance)
 *
 * SIDE EFFECTS:
 *   None — read-only. Non-conformance is a soft warning and never blocks,
 *   matching MemoryDirIntegrity's contract.
 *
 * Ported from public PR #1686, @elhoim.
 */

import { readdirSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getLifeosDir } from '../lib/paths';
import {
  parseNote,
  validate,
  slugFromPath,
  ALL_DIRS,
  DIR_TO_TYPE,
  type CanonicalType,
} from '../../LIFEOS/TOOLS/KnowledgeSchema';

const TAG = '[KnowledgeConformance]';
const LIFEOS_DIR = getLifeosDir();
const MEMORY_DIR = join(LIFEOS_DIR, 'MEMORY');
const KNOWLEDGE_DIR = join(MEMORY_DIR, 'KNOWLEDGE');
const EVENTS_FILE = join(MEMORY_DIR, 'STATE', 'events.jsonl');

function emitEvent(payload: Record<string, unknown>): void {
  try {
    mkdirSync(join(MEMORY_DIR, 'STATE'), { recursive: true });
    const event = { timestamp: new Date().toISOString(), ...payload };
    appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // Event log is best-effort — never let a telemetry failure break the check.
  }
}

export async function handleKnowledgeConformance(): Promise<void> {
  const startTime = Date.now();
  if (!existsSync(KNOWLEDGE_DIR)) return;

  console.error(`${TAG} === Starting knowledge conformance check ===`);

  let total = 0;
  let conformant = 0;
  const byDir: Record<string, { n: number; ok: number }> = {};
  const violationCounts: Record<string, number> = {};

  // Dir list comes from the schema's own TYPE_TO_DIR, so a new canonical type
  // is covered without editing this handler.
  for (const dir of ALL_DIRS) {
    const dirPath = join(KNOWLEDGE_DIR, dir);
    if (!existsSync(dirPath)) continue;
    const dirType = DIR_TO_TYPE[dir] as CanonicalType;
    byDir[dir] = { n: 0, ok: 0 };

    let files: string[];
    try {
      files = readdirSync(dirPath);
    } catch {
      continue;
    }

    for (const file of files) {
      // `_`-prefixed files are generated surfaces (_index.md, _schema.md), not notes.
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      const path = join(dirPath, file);
      total++;
      byDir[dir].n++;
      try {
        const violations = validate(parseNote(readFileSync(path, 'utf-8')), slugFromPath(path), dirType);
        if (violations.length === 0) {
          conformant++;
          byDir[dir].ok++;
        } else {
          for (const v of violations) {
            const key = `${v.key} — ${v.problem}`;
            violationCounts[key] = (violationCounts[key] || 0) + 1;
          }
        }
      } catch {
        violationCounts['unparseable frontmatter'] = (violationCounts['unparseable frontmatter'] || 0) + 1;
      }
    }
  }

  const nonConformant = total - conformant;
  const pct = total > 0 ? ((conformant / total) * 100).toFixed(1) : '0.0';
  const ranked = Object.entries(violationCounts).sort((a, b) => b[1] - a[1]);

  emitEvent({
    type: 'doc.integrity.knowledge_conformance',
    source: 'KnowledgeConformance',
    total,
    conformant,
    non_conformant: nonConformant,
    conformance_pct: Number(pct),
    per_dir: byDir,
    top_violations: ranked.slice(0, 5).map(([problem, count]) => ({ problem, count })),
    ok: nonConformant === 0,
  });

  if (nonConformant > 0) {
    console.error(
      `${TAG} [WARN] ${nonConformant}/${total} notes off-schema (${pct}% conformant). Repair: bun LIFEOS/TOOLS/MigrateKnowledge.ts`,
    );
    for (const [problem, count] of ranked.slice(0, 3)) {
      console.error(`${TAG}   ${count}× ${problem}`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.error(`${TAG} === Check complete (${elapsed}ms, ${pct}% conformant, ${total} notes) ===`);
}

// Allow running standalone for verification.
if (import.meta.main) {
  handleKnowledgeConformance().catch((err) => {
    console.error(`${TAG} Fatal:`, err);
    process.exit(1);
  });
}
