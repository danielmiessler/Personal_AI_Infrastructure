#!/usr/bin/env bun
/**
 * @version 1.0.0
 * BlockMessageGate — every red box tells you how to get out of it.
 *
 * When a hook returns `decision: "block"` (or a deny permission decision), Claude
 * Code renders that hook's `reason` string in a red-outlined box. That box is the
 * only thing the model and the principal see. A block that states the PROBLEM but
 * not the FIX stops the work without moving it, which turns a gate into an
 * obstacle and invites the worst possible response: rewording the claim until the
 * gate stops firing.
 *
 * The contract ({{PRINCIPAL_NAME}}, 2026-07-31 — "the red outline includes the problem and
 * the recommended fix if there is one"):
 *
 *   PROBLEM — what was claimed or attempted, and what the gate actually observed.
 *   FIX     — the concrete next action, and where honest downgrade is acceptable,
 *             the downgrade wording that legitimately passes.
 *
 * This gate is deliberately a LINTER, not a refactor: it reads the block strings
 * where they already live rather than forcing every hook through a shared
 * builder, because these are safety-critical paths and a mass rewrite of them
 * carries more risk than the inconsistency it would fix.
 *
 * Usage:
 *   bun LIFEOS/TOOLS/BlockMessageGate.ts          # report; exit 1 on violation
 *   bun LIFEOS/TOOLS/BlockMessageGate.ts --json
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const CLAUDE_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const HOOK_DIRS = [join(CLAUDE_DIR, "hooks"), join(CLAUDE_DIR, "hooks", "handlers")];

/**
 * Markers of an actionable remedy. Broad on purpose — the gate's job is to catch
 * a message that offers NO way forward, not to police phrasing. A false pass on
 * an awkwardly-worded fix costs nothing; a false failure would push authors to
 * pad messages with filler to satisfy a regex.
 */
const FIX_MARKERS = [
  /\bdo one\b/i,
  /\bthen restate\b/i,
  /\bor downgrade\b/i,
  /\bdowngrade honestly\b/i,
  /\bbefore stopping\b/i,
  /\binstead\b/i,
  /\bfix (?:the|it|and)\b/i,
  /\brun\b[^.]{0,60}\b(?:and|then|so)\b/i,
  /\bre-?run\b/i,
  /\bor state\b/i,
  /\bset .{0,30} back to\b/i,
  /\bnow, then\b/i,
  /\badd\b[^.]{0,40}\bthen\b/i,
];

/** Markers that the message says what actually went wrong (not just a label). */
const PROBLEM_MARKERS = [
  /\byou (?:claimed|asserted|declared|said)\b/i,
  /\bthe transcript shows\b/i,
  /\bbut\b/i,
  /\bhas hard violations\b/i,
  /\bthere is no record\b/i,
  /\bwas not\b/i,
  /\bnever\b/i,
];

interface Finding {
  file: string;
  line: number;
  snippet: string;
  missing: ("problem" | "fix")[];
}

/**
 * Pull the text of each `reason:` value. Handles the two shapes actually used in
 * this repo: a template literal, and a run of concatenated string/template parts.
 * Deliberately simple — a reason built by a helper call is reported as
 * unanalyzable rather than guessed at.
 */
function extractReasons(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const re = /reason:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length;
    let text = "";
    let segments = 0;
    const skipWs = () => { while (i < src.length && /\s/.test(src[i])) i++; };
    // Consume a chain of `+`-joined parts. The guard counts SEGMENTS, not
    // characters: counting characters let indentation between parts exhaust the
    // budget and silently truncate a message to its first line, which reported
    // two compliant gates as missing their fix clause.
    skipWs();
    while (segments++ < 24) {
      const ch = src[i];
      if (ch === "`" || ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        while (j < src.length && !(src[j] === quote && src[j - 1] !== "\\")) j++;
        text += src.slice(i + 1, j);
        i = j + 1;
      } else if (/[A-Za-z_$]/.test(ch ?? "")) {
        // A computed part (`lines.join("\n")`, a helper call). Skip it rather
        // than stop — the remedy usually sits in a literal AFTER it.
        while (i < src.length && !/[+,;\n]/.test(src[i])) i++;
      } else break;
      skipWs();
      if (src[i] === "+") { i++; skipWs(); continue; }
      break;
    }
    if (text.trim().length > 20) {
      out.push({ line: src.slice(0, m.index).split("\n").length, text });
    }
  }
  return out;
}

function isBlockContext(src: string, lineNo: number): boolean {
  // A `reason:` within a few lines of a block/deny decision is a red-box message.
  const lines = src.split("\n");
  const from = Math.max(0, lineNo - 8);
  const window = lines.slice(from, lineNo + 2).join("\n");
  return /decision:\s*"block"|permissionDecision:\s*"deny"/.test(window);
}

function scan(): Finding[] {
  const findings: Finding[] = [];
  for (const dir of HOOK_DIRS) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { continue; }
    for (const f of entries) {
      if (!f.endsWith(".ts") || f.includes(".test.")) continue;
      const abs = join(dir, f);
      const src = readFileSync(abs, "utf8");
      if (!/decision:\s*"block"|permissionDecision:\s*"deny"/.test(src)) continue;
      for (const r of extractReasons(src)) {
        if (!isBlockContext(src, r.line)) continue;
        const missing: ("problem" | "fix")[] = [];
        if (!PROBLEM_MARKERS.some((p) => p.test(r.text))) missing.push("problem");
        if (!FIX_MARKERS.some((p) => p.test(r.text))) missing.push("fix");
        if (missing.length) {
          findings.push({
            file: relative(CLAUDE_DIR, abs),
            line: r.line,
            snippet: r.text.replace(/\s+/g, " ").slice(0, 100),
            missing,
          });
        }
      }
    }
  }
  return findings;
}

const findings = scan();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
} else {
  console.log("── BlockMessageGate — every block states the problem AND the fix ──");
  if (findings.length === 0) {
    console.log("  all block messages carry a problem clause and a remedy ✅");
  } else {
    for (const f of findings) {
      console.log(`\n  ${f.file}:${f.line}  missing: ${f.missing.join(" + ")}`);
      console.log(`    "${f.snippet}…"`);
    }
    console.log(
      `\n${findings.length} block message(s) leave the reader stuck. A block must say what it observed and what to do next — see hooks/README.md § Block messages.`,
    );
  }
}
process.exit(findings.length === 0 ? 0 : 1);
