#!/usr/bin/env bun
/**
 * KnowledgeWriteGuard.hook.ts — schema feedback at the moment a note is written.
 *
 * PURPOSE:
 * `MemorySystem.renderInitialNote` is the sanctioned way a Knowledge note is
 * born on the schema, but nothing prevents a writer from bypassing it. A bulk
 * import did exactly that and wrote 1,744 notes off-schema; every later writer
 * then read a neighbouring note, copied its frontmatter, and spread the legacy
 * dialect further. The convention was documented and unenforced.
 *
 * KnowledgeConformance reports the damage on the Stop pass. This reports it at
 * the write, while the author is still in the loop and the fix is one edit
 * rather than a migration.
 *
 * TRIGGER: PostToolUse, matcher Write|Edit|MultiEdit
 *
 * CONTRACT:
 *   Advisory only. Emits `additionalContext` naming the violations and the
 *   canonical writer. NEVER blocks — a hard gate on note-writing would be worse
 *   than the drift it prevents, and the note is already on disk by PostToolUse.
 *   Silent for every path outside MEMORY/KNOWLEDGE/<Type>/*.md.
 */

import { readFileSync, existsSync } from 'fs';
import { join, sep } from 'path';
import { getLifeosDir } from './lib/paths';
import { parseNote, validate, slugFromPath, DIR_TO_TYPE, type CanonicalType } from '../LIFEOS/TOOLS/KnowledgeSchema';

const KNOWLEDGE_DIR = join(getLifeosDir(), 'MEMORY', 'KNOWLEDGE');

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.on('data', (c) => { data += c.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

/** The note's directory decides its type; anything outside a typed dir is not a note. */
function knowledgeDirOf(path: string): string | null {
  if (!path.endsWith('.md')) return null;
  if (!path.startsWith(KNOWLEDGE_DIR + sep)) return null;
  const rest = path.slice(KNOWLEDGE_DIR.length + 1).split(sep);
  if (rest.length !== 2) return null;                 // must be KNOWLEDGE/<Dir>/<file>.md
  if (rest[1].startsWith('_')) return null;           // _index.md / _schema.md are not notes
  return DIR_TO_TYPE[rest[0]] ? rest[0] : null;
}

(async () => {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let input: Record<string, any>;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  const path: string = input?.tool_input?.file_path ?? '';
  const dir = path ? knowledgeDirOf(path) : null;
  if (!dir || !existsSync(path)) process.exit(0);

  let violations: { key: string; problem: string }[] = [];
  try {
    violations = validate(
      parseNote(readFileSync(path, 'utf-8')),
      slugFromPath(path),
      DIR_TO_TYPE[dir] as CanonicalType,
    );
  } catch {
    violations = [{ key: 'frontmatter', problem: 'could not be parsed' }];
  }
  if (violations.length === 0) process.exit(0);

  const lines = violations.slice(0, 6).map((v) => `  - \`${v.key}\` — ${v.problem}`);
  const more = violations.length > 6 ? `\n  …and ${violations.length - 6} more` : '';

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'PostToolUse',
      additionalContext:
        `⚠ Knowledge note written off-schema — \`${path.split(sep).slice(-2).join('/')}\`\n` +
        lines.join('\n') + more +
        `\n\nNotes are born on the schema via \`MemorySystem.renderInitialNote\`. ` +
        `Do not hand-write frontmatter by copying a sibling — that is how a legacy dialect spreads. ` +
        `Fix this note now, or run \`bun LIFEOS/TOOLS/MigrateKnowledge.ts\` (dry-run by default) for a bulk repair.`,
    },
  }));
  process.exit(0);
})().catch(() => process.exit(0));
