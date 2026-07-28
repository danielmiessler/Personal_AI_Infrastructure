#!/usr/bin/env bun
/**
 * KnowledgeConformance.ts — Knowledge Archive schema conformance checker
 *
 * PURPOSE:
 * RebuildKnowledgeSchema keeps `_schema.md` honest against `KnowledgeSchema.ts`,
 * so the DOC can no longer drift from the CODE. Nothing, however, checks whether
 * the NOTES conform to either. That gap is how an archive reached 0.9%
 * conformance without a single warning: a bulk import wrote 1,744 notes off
 * schema, later writers copied their frontmatter, and the only tool that could
 * have said so (KnowledgeLint) was never invoked by anything.
 *
 * This closes the detection half. It reports; it never edits or blocks.
 *
 * TRIGGER: Stop hook (called from DocIntegrity.hook.ts)
 *
 * READS:
 *   MEMORY/KNOWLEDGE/{People,Companies,Ideas,Research,Blogs,Books}/*.md
 *
 * WRITES:
 *   stderr (audit log with [KnowledgeConformance] tag)
 *   STATE/events.jsonl (typed event: doc.integrity.knowledge_conformance)
 *
 * SIDE EFFECTS:
 *   None — read-only check. Non-conformance is a soft warning. Never blocks.
 */

import { readdirSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getLifeosDir } from '../lib/paths';
import { parseNote, validate, slugFromPath, DIR_TO_TYPE, type CanonicalType } from '../../LIFEOS/TOOLS/KnowledgeSchema';

const TAG = '[KnowledgeConformance]';
const LIFEOS_DIR = getLifeosDir();
const MEMORY_DIR = join(LIFEOS_DIR, 'MEMORY');
const KNOWLEDGE_DIR = join(MEMORY_DIR, 'KNOWLEDGE');
const EVENTS_FILE = join(MEMORY_DIR, 'STATE', 'events.jsonl');
const DIRS = ['People', 'Companies', 'Ideas', 'Research', 'Blogs', 'Books'] as const;

function emitEvent(payload: Record<string, unknown>): void {
  try {
    mkdirSync(join(MEMORY_DIR, 'STATE'), { recursive: true });
    appendFileSync(EVENTS_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...payload }) + '\n', 'utf-8');
  } catch {
    /* non-fatal */
  }
}

export async function handleKnowledgeConformance(): Promise<void> {
  const startTime = Date.now();
  if (!existsSync(KNOWLEDGE_DIR)) return;

  let total = 0;
  let conformant = 0;
  const byDir: Record<string, { n: number; ok: number }> = {};
  const violationCounts: Record<string, number> = {};

  for (const dir of DIRS) {
    const dirPath = join(KNOWLEDGE_DIR, dir);
    if (!existsSync(dirPath)) continue;
    const dirType = DIR_TO_TYPE[dir] as CanonicalType;
    byDir[dir] = { n: 0, ok: 0 };

    for (const file of readdirSync(dirPath)) {
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

  emitEvent({
    event: 'doc.integrity.knowledge_conformance',
    total,
    conformant,
    non_conformant: nonConformant,
    conformance_pct: Number(pct),
    per_dir: byDir,
    top_violations: Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([problem, count]) => ({ problem, count })),
    ok: nonConformant === 0,
  });

  const elapsed = Date.now() - startTime;
  if (nonConformant > 0) {
    console.error(`${TAG} ${nonConformant}/${total} notes off-schema (${pct}% conformant). Repair: bun LIFEOS/TOOLS/MigrateKnowledge.ts`);
    for (const [problem, count] of Object.entries(violationCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
      console.error(`${TAG}   ${count}× ${problem}`);
    }
  }
  console.error(`${TAG} === Check complete (${elapsed}ms, ${pct}% conformant) ===`);
}

// Allow running standalone for verification.
if (import.meta.main) {
  handleKnowledgeConformance().catch((err) => {
    console.error(`${TAG} Fatal:`, err);
    process.exit(1);
  });
}
