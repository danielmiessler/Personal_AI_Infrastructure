#!/usr/bin/env bun
/**
 * ProseInCode — fails on doctrine prose living inside source comments.
 *
 * BPE exempts `.ts`, which is right for code and wrong for the essays that collect above it:
 * a rule file's audit never reads a comment, so policy hides there and drifts from the file
 * that owns it. Three classes are flagged, all of them git's job:
 *   - HISTORY     narration of what the file once did or when it changed
 *   - SUPERSEDED  a dated directive or baseline asserted as current
 *   - TOMBSTONE   a note that some code is gone
 *
 * Legitimate HOW is never flagged. A comment carrying an incident ID (INC-YYYYMMDD-slug) or
 * a public issue number is a verified-gotcha keep-class; tool contracts, safety gates, and
 * output-format contracts contain none of these patterns to begin with. When a flagged
 * comment holds real knowledge, the fix is to file it as an incident and cite the ID —
 * not to delete it.
 *
 * Usage:
 *   bun LIFEOS/TOOLS/ProseInCode.ts [path ...]   scan (default: hooks, LIFEOS, skills, test)
 *   bun LIFEOS/TOOLS/ProseInCode.ts --self-test  prove the scanner detects a seeded violation
 *   bun LIFEOS/TOOLS/ProseInCode.ts --json       machine-readable output
 *
 * Exit 0 = clean, 1 = hits found, 2 = self-test failed.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.env.HOME!, ".claude");
const DEFAULT_SCAN = ["hooks", "LIFEOS/TOOLS", "LIFEOS/ATLAS", "LIFEOS/PULSE/modules", "skills"];

const SKIP_DIRS = new Set(["node_modules", ".git", "Plugins", "LIFEOS_RELEASES", "archive", "dist", "build", "MEMORY"]);

type Kind = "HISTORY" | "SUPERSEDED" | "TOMBSTONE";

const RULES: Array<{ kind: Kind; re: RegExp; why: string }> = [
  { kind: "HISTORY", re: /\b(?:History|HISTORY):/, why: "history narration — git log is the record" },
  { kind: "HISTORY", re: /\bthis (?:FLIPPED|flipped|replaced|reversed) the\b/i, why: "narrates a past change" },
  { kind: "HISTORY", re: /\bsee (?:the )?git history\b/i, why: "points at git instead of being in git" },
  // No rule for dated verification stamps ("Verified 2026-07-28", "Last probe: ..."). Those
  // are PROVENANCE for an empirical claim — they tell a reader how stale the fact is, which
  // is the opposite of rot. Flagging them would push authors toward undated assertions.
  { kind: "HISTORY", re: /\bused to (?:be|live|carry|pin|do)\b/i, why: "describes a prior state" },
  // "superseded" is ordinary domain vocabulary in places (ProposalGC collects superseded
  // entries). It only signals misplaced doctrine when anchored to a date, a version, or the
  // thing being superseded.
  { kind: "SUPERSEDED", re: /\bsupersed(?:es|ed|ing)\b[^\n]*(?:\d{4}-\d{2}-\d{2}|\bv\d+\.\d+|\bdirective\b|\bbaseline\b|\.tsx?\b)/i, why: "a superseded directive asserted in code drifts from the rule file that owns it" },
  { kind: "SUPERSEDED", re: /\b(?:BASELINE|baseline) \(\d{4}-\d{2}-\d{2}/, why: "dated baseline — policy, not data" },
  { kind: "SUPERSEDED", re: /\bprincipal directive\b/i, why: "doctrine belongs in OPERATIONAL_RULES, cited not restated" },
  { kind: "SUPERSEDED", re: /\bRETIRED \d{4}-\d{2}-\d{2}\b/, why: "retirement notice — the retirement registry owns this" },
  // Narrow deliberately: "the item was deleted mid-stage" describes runtime behavior and is
  // code, not history. A tombstone is the same phrase ANCHORED to a date, version, or symbol.
  { kind: "TOMBSTONE", re: /\bwas (?:deleted|removed|retired)\b[^\n]*(?:\d{4}-\d{2}-\d{2}|\bv\d+\.\d+\.\d+|\.tsx?\b)/i, why: "tombstone for code that is already gone" },
  { kind: "TOMBSTONE", re: /\bthe former \w+ (?:record|table|field|export|function)\b/i, why: "tombstone for a removed symbol" },
];

interface Hit { file: string; line: number; kind: Kind; why: string; text: string; }

/** Comment lines only — a string literal that happens to match is not doctrine prose. */
function commentLines(src: string): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  let inBlock = false;
  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (inBlock) {
      out.push([i + 1, line]);
      if (line.includes("*/")) inBlock = false;
      return;
    }
    if (line.startsWith("/*")) {
      out.push([i + 1, line]);
      if (!line.includes("*/")) inBlock = true;
      return;
    }
    if (line.startsWith("//") || line.startsWith("*")) out.push([i + 1, line]);
  });
  return out;
}

function scanFile(abs: string): Hit[] {
  // A scanner that documents its own patterns will always match them. Naming a rule is not
  // committing the offense the rule describes.
  if (abs === import.meta.path) return [];
  const src = readFileSync(abs, "utf8");
  const hits: Hit[] = [];
  for (const [line, text] of commentLines(src)) {
    // Keep-classes: a verified gotcha carries provenance — an incident ID or a public
    // issue number. Those comments earn their place; they explain a non-obvious failure.
    if (/\bINC-\d{8}-/.test(text) || /\bissue #\d+/i.test(text)) continue;
    for (const r of RULES) {
      if (r.re.test(text)) {
        hits.push({ file: relative(ROOT, abs), line, kind: r.kind, why: r.why, text: text.slice(0, 110) });
        break;
      }
    }
  }
  return hits;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; } // dangling symlink — not this tool's problem
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e) && !/\.(test|spec)\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

function selfTest(): number {
  const seeded = [
    "/**",
    " * BASELINE (2026-07-11, principal directive — supersedes every prior decision).",
    " * History: this FLIPPED the earlier fact. The former ALIAS record was deleted.",
    " */",
    "export const X = 1;",
  ].join("\n");
  const kinds = new Set<Kind>();
  for (const [, text] of commentLines(seeded)) {
    for (const r of RULES) if (r.re.test(text)) { kinds.add(r.kind); break; }
  }
  const clean = "/** Level → tier. Edit this on a lineup change. */\nexport const Y = 2;\n";
  const falsePositives = commentLines(clean).filter(([, t]) => RULES.some((r) => r.re.test(t))).length;
  const ok = kinds.size >= 2 && falsePositives === 0;
  console.log(ok
    ? `✓ self-test: seeded violation detected (${[...kinds].join(", ")}), clean sample produced 0 false positives`
    : `✗ self-test FAILED — detected ${[...kinds].join(",") || "nothing"}, ${falsePositives} false positives on clean sample`);
  return ok ? 0 : 2;
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) process.exit(selfTest());

const json = args.includes("--json");
const targets = args.filter((a) => !a.startsWith("--"));
const roots = (targets.length ? targets : DEFAULT_SCAN).map((t) => (t.startsWith("/") ? t : join(ROOT, t)));

const files = roots.flatMap((r) => (existsSync(r) && statSync(r).isFile() ? [r] : walk(r)));
const hits = files.flatMap(scanFile);

if (json) {
  console.log(JSON.stringify({ scanned: files.length, hits }, null, 2));
} else {
  console.log(`\n📝 Prose-in-Code — ${files.length} source files scanned`);
  console.log("─".repeat(64));
  if (!hits.length) {
    console.log("✓ no doctrine prose in code");
  } else {
    const byFile = new Map<string, Hit[]>();
    for (const h of hits) (byFile.get(h.file) ?? byFile.set(h.file, []).get(h.file)!).push(h);
    for (const [f, hs] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`✗ ${f}  (${hs.length})`);
      for (const h of hs.slice(0, 6)) console.log(`    ${String(h.line).padStart(4)}  ${h.kind.padEnd(10)} ${h.text}`);
      if (hs.length > 6) console.log(`    … ${hs.length - 6} more`);
    }
    console.log("─".repeat(64));
    console.log(`Verdict: ${hits.length} hits across ${byFile.size} files — move the narration to git, keep the contract.`);
  }
}
process.exit(hits.length ? 1 : 0);
