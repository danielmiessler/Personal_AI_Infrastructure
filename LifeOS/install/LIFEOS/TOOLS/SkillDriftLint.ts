#!/usr/bin/env bun
/**
 * SkillDriftLint — Bitter-Pill drift detector for skill & doctrine files.
 *
 * Ported from the reference implementation donated by @rpriven (public issue #1523,
 * MIT, gist 82ecc6c832d46d35c97a3c7918de06ae) — security-reviewed line-by-line on
 * 2026-07-18: fs-read-only, no network, no exec, never edits a file.
 *
 * ADVISORY ONLY. Hits may be legitimate keep-class lines (safety gates, verified
 * gotchas, tool contracts, output-format contracts — system prompt § Ideal-State
 * Prompting). The human judges; the linter only surfaces candidates.
 *
 * Usage:
 *   bun LIFEOS/TOOLS/SkillDriftLint.ts <file.md ...>
 *   bun LIFEOS/TOOLS/SkillDriftLint.ts --dir skills/ [--strict] [--top N]
 */
import { readFileSync, statSync, readdirSync } from "fs";
import { join } from "path";

type Sev = "high" | "med" | "low";
const WEIGHT: Record<Sev, number> = { high: 3, med: 2, low: 1 };

interface LineRule { id: string; type: "V1" | "V2" | "V3"; sev: Sev; re: RegExp; msg: string; }

// Line-level patterns. High = known trust-deficit coercion (high precision).
// Low = sometimes legitimate, surfaced for review only.
const LINE_RULES: LineRule[] = [
  { id: "mandatory",            type: "V2", sev: "high", re: /\bMANDATORY\b/,                      msg: "Coercive 'MANDATORY' framing — state the WHAT, drop the command." }, // deliberately case-sensitive: uppercase = the coercion signal; prose "mandatory" is usually legitimate
  { id: "required-before",      type: "V2", sev: "high", re: /REQUIRED BEFORE ANY ACTION/i,        msg: "Rigid 'before any action' ordering coercion." },
  { id: "not-optional",         type: "V2", sev: "high", re: /this is not optional/i,              msg: "Trust-deficit phrasing for a weaker model." },
  { id: "before-anything-else", type: "V2", sev: "med",  re: /before (doing )?anything else/i,     msg: "Forced ordering — let the model choose when." },
  { id: "zero-exceptions",      type: "V2", sev: "high", re: /zero exceptions|exceptions:\s*none/i, msg: "Absolutist enforcement language." },
  { id: "dishonest",            type: "V2", sev: "high", re: /\bdishonest\b/i,                      msg: "Shame language — give facts, not threats." },
  { id: "lying",                type: "V2", sev: "high", re: /\blying\b/i,                          msg: "Shame language." },
  { id: "theater",              type: "V2", sev: "med",  re: /\btheater\b/i,                        msg: "Distrust framing around tool discipline." },
  { id: "critical-failure",     type: "V2", sev: "high", re: /critical failure/i,                  msg: "Threat framing." },
  { id: "immediately-upon",     type: "V2", sev: "med",  re: /immediately upon (skill )?invocation/i, msg: "Rigid timing coercion." },
  { id: "you-must",             type: "V2", sev: "low",  re: /\byou must\b/i,                       msg: "Imperative hand-holding (often legitimate — review)." },
  { id: "exact-sed",            type: "V1", sev: "med",  re: /\bsed -i\b/,                          msg: "Hardcoded sed — brittle HOW; state the outcome." },
  { id: "hardcoded-home",       type: "V1", sev: "low",  re: /\/(?:home|Users)\/\w+\//,             msg: "Hardcoded absolute path — brittle to env change (may be a real domain fact)." },
  // V1 procedural-rigidity — phrases that script the HOW / sequence instead of stating the WHAT (the under-detected gap).
  { id: "exact-order",          type: "V1", sev: "med",  re: /in (the )?(exact )?order|in this order/i, msg: "Rigid sequencing — let the model order its own work; state the outcome." },
  { id: "do-not-deviate",       type: "V1", sev: "med",  re: /do not (deviate|fall back|skip|reorder|improvise)/i, msg: "Procedural rigidity — prescribing HOW, not WHAT." },
  { id: "exactly-as",           type: "V1", sev: "low",  re: /exactly (this|the following|as written|as specified)/i, msg: "'exactly the following' — over-specified HOW; prefer the ideal end-state." },
];

interface Finding { line: number; type: string; sev: Sev; id: string; msg: string; snippet: string; quoted?: boolean; }

// A trigger is "quoted/example" (citing the pattern, not using it) when it sits in a blockquote,
// inside a fenced code block, or wrapped in backticks/straight-quotes. Downgrade those to low so
// docs ABOUT drift (this linter, audit reports) stop reading as drift. (The self-flag fix.)
function quotedMatch(line: string, re: RegExp, inFence: boolean): boolean {
  if (inFence || line.trimStart().startsWith(">")) return true;
  const m = line.match(re);
  if (!m || m.index === undefined) return false;
  const before = line.slice(0, m.index), after = line.slice(m.index + m[0].length);
  if (/`[^`]*$/.test(before) && /^[^`]*`/.test(after)) return true;   // `WORD`
  if (/"[^"]*$/.test(before) && /^[^"]*"/.test(after)) return true;   // "WORD"
  return false;
}

function lintText(text: string): { findings: Finding[]; heuristics: { type: string; sev: Sev; msg: string }[] } {
  const findings: Finding[] = [];
  const lines = text.split("\n");
  let inFence = false;
  lines.forEach((ln, i) => {
    if (/^\s*```/.test(ln)) inFence = !inFence;
    for (const r of LINE_RULES) {
      if (r.re.test(ln)) {
        const quoted = quotedMatch(ln, r.re, inFence);
        const sev: Sev = quoted ? "low" : r.sev;
        const msg = quoted ? `${r.msg} (quoted/example — citing, not using)` : r.msg;
        findings.push({ line: i + 1, type: r.type, sev, id: r.id, msg, snippet: ln.trim().slice(0, 90), quoted });
      }
    }
  });
  // File-level heuristics (shape, not single lines)
  const heuristics: { type: string; sev: Sev; msg: string }[] = [];
  const steps = (text.match(/^\s*\d+\.\s/gm) || []).length;
  if (steps >= 10) heuristics.push({ type: "V1", sev: "med", msg: `Long imperative step-list (${steps} numbered steps) — prefer WHAT + tools over scripted HOW.` });
  const nevers = (text.match(/\bNEVER\b/g) || []).length;
  if (nevers >= 4) heuristics.push({ type: "V2", sev: "med", msg: `'NEVER' ×${nevers} — defensive re-explanation; keep real guardrails, trim the rest.` });
  const bashFences = (text.match(/```bash/g) || []).length;
  if (bashFences >= 4) heuristics.push({ type: "V1", sev: "low", msg: `${bashFences} bash code-blocks — check for prescribed command sequences vs. illustrative examples.` });
  const routes = (text.match(/["“`][^"”`\n]{2,40}["”`]\s*(?:→|->)\s*\w[\w-]*\.md/g) || []).length;
  if (routes >= 3) heuristics.push({ type: "V1", sev: "med", msg: `If-then routing dispatch table (${routes} "trigger"→file.md maps) — let the model pick the workflow from context.` });
  return { findings, heuristics };
}

function score(findings: Finding[], heur: { sev: Sev }[]): number {
  return [...findings, ...heur].reduce((s, f) => s + WEIGHT[f.sev], 0);
}

function collectFiles(paths: string[]): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    let st; try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      if (/(^|\/)(node_modules|\.git|image-cache|cache)$/.test(p)) return;
      for (const e of readdirSync(p)) walk(join(p, e));
    } else if (p.endsWith(".md")) out.push(p);
  };
  paths.forEach(walk);
  return out;
}

// ---- CLI ----
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const dirIdx = args.indexOf("--dir");
const topIdx = args.indexOf("--top");
const top = topIdx >= 0 ? Math.max(0, parseInt(args[topIdx + 1] || "0", 10) || 0) : 0;
const consumed = new Set<number>();
if (dirIdx >= 0) consumed.add(dirIdx + 1);
if (topIdx >= 0) consumed.add(topIdx + 1);
let targets: string[];
if (dirIdx >= 0) targets = collectFiles([args[dirIdx + 1]]);
else targets = collectFiles(args.filter((a, i) => !a.startsWith("--") && !consumed.has(i)));

if (targets.length === 0) {
  console.log("skill-linter: no .md targets. Usage: bun skill-linter.ts <file.md ...> | --dir <path> [--strict]");
  process.exit(0);
}

interface Report { file: string; score: number; findings: Finding[]; heuristics: { type: string; sev: Sev; msg: string }[]; }
const reports: Report[] = [];
for (const f of targets) {
  let text: string; try { text = readFileSync(f, "utf8"); } catch { continue; }
  const { findings, heuristics } = lintText(text);
  reports.push({ file: f, score: score(findings, heuristics), findings, heuristics });
}
reports.sort((a, b) => b.score - a.score);

const flagged = reports.filter(r => r.score > 0);
const totalHigh = flagged.reduce((s, r) => s + r.findings.filter(f => f.sev === "high").length, 0);
const anyHigh = totalHigh > 0;
console.log(`\n🔎 skill-linter — Bitter-Lesson drift scan: ${reports.length} scanned · ${flagged.length} flagged · ${totalHigh} high\n`);
const show = top > 0 ? flagged.slice(0, top) : flagged;
for (const r of show) {
  const highs = r.findings.filter(f => f.sev === "high").length;
  const tag = r.file.replace(process.env.HOME + "/", "~/");
  console.log(`▌ ${tag}   drift=${r.score}  (${highs} high)`);
  for (const f of r.findings) console.log(`    L${f.line} [${f.type}/${f.sev}] ${f.id}: ${f.msg}`);
  for (const h of r.heuristics) console.log(`    [file] [${h.type}/${h.sev}] ${h.msg}`);
  console.log("");
}
if (top > 0 && flagged.length > top) console.log(`… +${flagged.length - top} more flagged file(s) — omit --top to see all\n`);
const cleanCount = reports.length - flagged.length;
if (cleanCount > 0) console.log(`✅ clean (drift=0): ${cleanCount} file(s)\n`);
console.log("Legend: V1 over-specified HOW · V2 trust-deficit scaffolding · V3 obviated scaffolding.");
console.log("⚠  ADVISORY: hits may be legitimate guardrails / domain facts / user preferences — human judges. The linter never edits.");
process.exit(strict && anyHigh ? 1 : 0);
