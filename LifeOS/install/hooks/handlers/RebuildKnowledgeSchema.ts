#!/usr/bin/env bun
/**
 * RebuildKnowledgeSchema.ts — keep KNOWLEDGE/_schema.md honest against the code
 *
 * PURPOSE:
 * `_schema.md` is GENERATED from `KnowledgeSchema.ts`, the single source of
 * truth. DeployCore generates it once at install time when it is missing;
 * nothing regenerated it afterwards, so any change to the ENVELOPE, the type
 * list, the relation vocab, or a `validate()` rule left the doc declaring a
 * contract the linter no longer enforced. This is the keep-fresh half.
 *
 * Renders in-process and writes ONLY when the render differs from what is on
 * disk, so an unchanged schema costs one string compare and no write.
 *
 * TRIGGER: SessionEnd (called from DocIntegrity.hook.ts)
 *
 * READS:
 *   LIFEOS/TOOLS/KnowledgeSchema.ts (via the generator's render())
 *   MEMORY/KNOWLEDGE/_schema.md
 *
 * WRITES:
 *   MEMORY/KNOWLEDGE/_schema.md (only on drift)
 *   stderr (audit log with [RebuildKnowledgeSchema] tag)
 *
 * SIDE EFFECTS:
 *   Rewrites a generated doc. Never blocks; a failure is logged by the caller.
 *
 * Ported from public PR #1685, @elhoim (which spawned the generator as a
 * subprocess on every pass; local source guards its `main()`, so an in-process
 * render + drift compare replaces both the subprocess and the blind write).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { render, SCHEMA_DOC_PATH } from '../../LIFEOS/TOOLS/GenerateKnowledgeSchemaDoc';

const TAG = '[RebuildKnowledgeSchema]';

export async function handleRebuildKnowledgeSchema(): Promise<void> {
  const doc = render();

  const current = existsSync(SCHEMA_DOC_PATH) ? readFileSync(SCHEMA_DOC_PATH, 'utf-8') : null;
  if (current === doc) {
    console.error(`${TAG} [OK] _schema.md matches KnowledgeSchema.ts — no regen needed.`);
    return;
  }

  mkdirSync(dirname(SCHEMA_DOC_PATH), { recursive: true });
  writeFileSync(SCHEMA_DOC_PATH, doc, 'utf-8');
  console.error(
    `${TAG} [REGEN] _schema.md ${current === null ? 'was missing' : 'had drifted from KnowledgeSchema.ts'} — rewrote ${doc.split('\n').length} lines.`,
  );
}

// Allow running standalone for verification.
if (import.meta.main) {
  handleRebuildKnowledgeSchema().catch((err) => {
    console.error(`${TAG} Fatal:`, err);
    process.exit(1);
  });
}
