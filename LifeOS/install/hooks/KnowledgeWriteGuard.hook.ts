#!/usr/bin/env bun
/**
 * @version 1.0.0
 * KnowledgeWriteGuard.hook.ts — schema feedback at the moment a note is written.
 *
 * PURPOSE:
 * `MemorySystem.renderInitialNote` is the sanctioned way a Knowledge note is
 * born on the schema, but nothing prevents a writer from bypassing it. A bulk
 * import that does so writes every note off-schema, and every writer afterwards
 * reads a neighbouring note, copies its frontmatter, and spreads the legacy
 * dialect further — copying a sibling is the intuitive move and is precisely the
 * wrong one. The convention was documented and unenforced.
 *
 * `handlers/KnowledgeConformance.ts` reports the damage on the SessionEnd pass.
 * This reports it at the write, while the author is still in the loop and the
 * fix is one edit rather than a migration.
 *
 * TRIGGER: PostToolUse (Write | Edit | MultiEdit)
 *
 * CONTRACT:
 *   Advisory only. Emits `additionalContext` naming the violations and the
 *   canonical writer. NEVER blocks — the note is already on disk by PostToolUse,
 *   and a hard gate on note-writing would be worse than the drift it prevents.
 *   Silent for every path outside MEMORY/KNOWLEDGE/<Type>/<slug>.md, including
 *   `_index.md` and `_schema.md`.
 *
 * FAIL POLICY: fail-SILENT everywhere. Unparseable input, absent file, any
 * internal throw → exit 0 with no output.
 *
 * Ported from public PR #1687, @elhoim.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { getLifeosDir } from "./lib/paths";
import {
  parseNote,
  validate,
  slugFromPath,
  DIR_TO_TYPE,
  type CanonicalType,
} from "../LIFEOS/TOOLS/KnowledgeSchema";

const KNOWLEDGE_DIR = join(getLifeosDir(), "MEMORY", "KNOWLEDGE");
const MAX_LISTED = 6;

/** The note's directory decides its type; anything outside a typed dir is not a note. */
function knowledgeDirOf(path: string): string | null {
  if (!path.endsWith(".md")) return null;
  if (!path.startsWith(KNOWLEDGE_DIR + sep)) return null;
  const rest = path.slice(KNOWLEDGE_DIR.length + 1).split(sep);
  if (rest.length !== 2) return null; // must be KNOWLEDGE/<Dir>/<file>.md
  if (rest[1].startsWith("_")) return null; // _index.md / _schema.md are not notes
  return DIR_TO_TYPE[rest[0]] ? rest[0] : null;
}

let input: { hook_event_name?: string; tool_input?: { file_path?: string } };
try {
  input = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  process.exit(0);
}

const path = input.tool_input?.file_path ?? "";
const dir = path ? knowledgeDirOf(path) : null;
if (!dir || !existsSync(path)) process.exit(0);

let violations: { key: string; problem: string }[];
try {
  violations = validate(
    parseNote(readFileSync(path, "utf-8")),
    slugFromPath(path),
    DIR_TO_TYPE[dir] as CanonicalType,
  );
} catch {
  violations = [{ key: "frontmatter", problem: "could not be parsed" }];
}
if (violations.length === 0) process.exit(0);

const listed = violations.slice(0, MAX_LISTED).map((v) => `  - \`${v.key}\` — ${v.problem}`);
const more = violations.length > MAX_LISTED ? `\n  …and ${violations.length - MAX_LISTED} more` : "";

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || "PostToolUse",
      additionalContext:
        `⚠ Knowledge note written off-schema — \`${path.split(sep).slice(-2).join("/")}\`\n` +
        listed.join("\n") +
        more +
        `\n\nNotes are born on the schema via \`MemorySystem.renderInitialNote\`. ` +
        `Do not hand-write frontmatter by copying a sibling — that is how a legacy dialect spreads. ` +
        `Fix this note now, or run \`bun LIFEOS/TOOLS/MigrateKnowledge.ts\` (dry-run by default) for a bulk repair.`,
    },
  }),
);
process.exit(0);
