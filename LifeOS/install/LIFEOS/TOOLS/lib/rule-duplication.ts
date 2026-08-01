/**
 * rule-duplication — pure logic behind the /ic `rule-duplication` blocking check.
 *
 * Every rule has ONE home (2026-07-26 consolidation): any run of
 * RULE_SHINGLE_WORDS identical words appearing in two different rule surfaces
 * is a duplicate — the fix is one full statement + a pointer, never a second
 * copy. Multi-homed rules drift into contradictions the Context Hierarchy
 * silently resolves against the newer rule (the 2026-07-26 role-routing
 * outranking incident).
 *
 * Lives in lib/ (not inline in IntegrityCheck.ts) because the orchestrator
 * executes its full check suite at import time — inert "exported for testing"
 * surfaces there are untestable (2026-07-26 review finding). Tests import THIS
 * module: test/tools/rule-duplication.test.ts.
 */

export const RULE_SHINGLE_WORDS = 12;

/** Normalize prose for shingling: YAML frontmatter dropped (metadata stamps are
 * identical across files by convention, never rule statements); CLOSED code
 * fences dropped (code is tool-contract, not prose); inline-code spans stripped
 * PER LINE so a stray backtick cannot swallow prose across lines; punctuation
 * and markdown syntax collapsed; lowercased word list out.
 *
 * Fail-closed on malformed fences: a fence that never closes would blind the
 * gate to the rest of the file, so at EOF any still-open "fenced" tail is
 * re-admitted as prose — over-detection beats silent blindness. */
export function ruleWords(content: string): string[] {
  let body = content;
  if (body.startsWith('---')) {
    const end = body.indexOf('\n---', 3);
    if (end !== -1) body = body.slice(end + 4);
  }
  const lines: string[] = [];
  let fenceBuffer: string[] = [];
  let inFence = false;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      if (inFence) { fenceBuffer = []; } // closed fence: discard its contents
      inFence = !inFence;
      continue;
    }
    if (inFence) { fenceBuffer.push(line); continue; }
    lines.push(line.replace(/`[^`]*`/g, ' '));
  }
  if (inFence) lines.push(...fenceBuffer.map((l) => l.replace(/`[^`]*`/g, ' '))); // unclosed fence: re-admit as prose
  return lines.join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export interface RuleDuplicate { pair: string; snippet: string }

/** Cross-file duplicate shingles, reported once per file pair (first hit).
 * A shingle repeated WITHIN one file is not a cross-file duplicate. */
export function findRuleDuplicates(files: { rel: string; content: string }[]): RuleDuplicate[] {
  const seen = new Map<string, string>();
  const dupes = new Map<string, string>();
  for (const { rel, content } of files) {
    const words = ruleWords(content);
    const local = new Set<string>();
    for (let i = 0; i + RULE_SHINGLE_WORDS <= words.length; i++) {
      const shingle = words.slice(i, i + RULE_SHINGLE_WORDS).join(' ');
      if (local.has(shingle)) continue;
      local.add(shingle);
      const firstFile = seen.get(shingle);
      if (firstFile === undefined) {
        seen.set(shingle, rel);
      } else if (firstFile !== rel) {
        const pair = `${firstFile} ↔ ${rel}`;
        if (!dupes.has(pair)) dupes.set(pair, shingle);
      }
    }
  }
  return [...dupes.entries()].map(([pair, snippet]) => ({ pair, snippet }));
}
