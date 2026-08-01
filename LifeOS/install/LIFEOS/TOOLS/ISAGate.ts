#!/usr/bin/env bun
// ISAGate.ts — the deterministic ISA structural gate.
//
// The ISA doctrine promises granular, testable, anchored claims and a document
// that is a real test harness, not a work-log. Until now those promises were
// enforced by a markdown checklist the model may or may not run on itself — so
// they leaked (92 closed ISAs missing anchoring, 60 with no anti-claim, 14 with
// unresolved fog at close; the 2026-07-23 audit). This tool makes the STRUCTURAL,
// un-gameable subset mechanical.
//
// Two tiers, and the split is doctrinal (the Goodhart line the 2026-07-24 Forge
// audit drew):
//   HARD  — binary structural facts a throwaway entry cannot satisfy. Block close.
//           (unresolved fog at complete · missing anchors_to when a goal is stated
//            · non-`M/N` progress format)
//   ADVISORY — anything a count could game (a lone anti-claim, a no-probe tag).
//           Surface, never block — blocking a count just manufactures the count.
//
// Exit: 0 clean (or advisories only); 2 hard violations AND phase==complete.
// Advisories print at any phase; hard violations only BLOCK at close, because a
// mid-climb ISA legitimately has open fog and unwired anchors.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// Bunker's ISA test-strategy parser feeds H3 (anchors_to) and A2 (probe
// coverage). Bunker is a private containment zone (2026-07-23) and never ships
// in the public release, so the dependency is loaded dynamically behind an
// existsSync guard: on installs without Bunker those two checks degrade to an
// advisory notice instead of crashing (ImportCaseGate contract — a dead static
// import fails the emit; a guarded dynamic one is the sanctioned shape).
type TestStrategyFns = {
  parseTestStrategyDiagnostic: (p: string) => { probes: { isc: string; anchors_to?: string }[] };
  coverageOf: (p: string) => { coveredClaims: number; totalClaims: number; uncovered: string[] };
};
const BUNKER_ISA = join(dirname(fileURLToPath(import.meta.url)), "../PULSE/Bunker/src/isa.ts");
const bunkerIsa: TestStrategyFns | null = existsSync(BUNKER_ISA)
  ? ((await import(BUNKER_ISA)) as TestStrategyFns)
  : null;

export interface Violation {
  code: string;
  tier: "hard" | "advisory";
  message: string;
}

export interface GateReport {
  isaPath: string;
  phase: string;
  hard: Violation[];
  advisory: Violation[];
  blocks: boolean; // hard violations AND phase==complete
}

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string> = {};
  if (!m) return fm;
  for (const line of m[1]!.split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (kv) fm[kv[1]!] = kv[2]!.trim();
  }
  return fm;
}

// Body of a named H2 section, up to the next H2. Null if the section is absent.
function section(text: string, heading: string): string | null {
  const re = new RegExp(`^##\\s+${heading}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "m");
  const m = text.match(re);
  return m ? m[1]! : null;
}

// A claim's description text, keyed by id (across Claims + Features blocks).
function claimDescriptions(text: string): { id: string; desc: string; anti: boolean }[] {
  const out: { id: string; desc: string; anti: boolean }[] = [];
  const RE = /^- \[[ xX~-]\]\s+([A-Za-z][A-Za-z0-9.-]*?)\s*(?::|—)\s*(.+)$/;
  for (const raw of text.split("\n")) {
    const m = raw.trim().match(RE);
    if (m) out.push({ id: m[1]!, desc: m[2]!.trim(), anti: /^Anti:/i.test(m[2]!.trim()) });
  }
  return out;
}

const EVENT_MARKERS = /\b(remediated|this session|this consolidation|touched only|iter \d+|deployed (?:this|in) |shipped this)\b/i;
const BUNDLE_MARKERS = /\b\w+ and \w+.*\b(and|with)\b|;\s*\w+.*;\s*\w+|\bincluding\b/i;

export function gateReport(isaPath: string): GateReport {
  const text = readFileSync(isaPath, "utf8");
  const fm = frontmatter(text);
  const phase = fm.phase ?? "";
  const hard: Violation[] = [];
  const advisory: Violation[] = [];

  // ── HARD (structural, un-gameable) ────────────────────────────────────────

  // H1 · progress must be a mechanical M/N count, not `true`/prose.
  if (!/^\d+\/\d+$/.test(fm.progress ?? "")) {
    hard.push({
      code: "progress-format",
      tier: "hard",
      message: `progress: "${fm.progress ?? ""}" is not M/N — done must be a mechanical claim count, not an opinion.`,
    });
  }

  // H2 · unresolved fog at close. Fog is honest mid-climb; at complete it must be empty.
  const fog = section(text, "Not yet specified");
  const fogLines = fog
    ? fog.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("<!--"))
    : [];
  if (phase === "complete" && fogLines.length > 0) {
    hard.push({
      code: "fog-at-complete",
      tier: "hard",
      message: `${fogLines.length} unresolved fog line(s) in "## Not yet specified" at phase: complete — graduate each to a claim or kill it in Decisions.`,
    });
  }

  // H3 · anchors_to present on every Test Strategy row when a goal literal is set.
  const goal = fm.principal_stated_goal;
  const hasGoal = goal !== undefined && goal !== "null" && goal.replace(/^["']|["']$/g, "").length > 0;
  if (hasGoal && bunkerIsa) {
    const { probes } = bunkerIsa.parseTestStrategyDiagnostic(isaPath);
    const missing = probes.filter((p) => !p.anchors_to).map((p) => p.isc);
    if (missing.length) {
      hard.push({
        code: "anchors-missing",
        tier: "hard",
        message: `${missing.length} Test Strategy row(s) missing anchors_to though a principal_stated_goal is set: ${missing.slice(0, 8).join(", ")} — every claim must trace to the literal or a named derived sub-claim.`,
      });
    }
  }

  // ── ADVISORY (count-gameable — surface, never block) ─────────────────────

  const claims = claimDescriptions(text);

  // A1 · at least one anti-claim (a goal with zero named failure modes is under-specified).
  if (claims.length > 0 && !claims.some((c) => c.anti)) {
    advisory.push({
      code: "no-anti-claim",
      tier: "advisory",
      message: `no Anti: claim — name at least one thing that must NOT happen. (advisory: a lone anti-claim added to pass is theater; write a real one.)`,
    });
  }

  // A2 · claims with no Test Strategy row at all (unverifiable, un-re-runnable).
  // Both Bunker-backed checks surface their absence once so a public install
  // knows the gate is running in reduced mode rather than silently passing.
  if (!bunkerIsa) {
    advisory.push({
      code: "bunker-parser-unavailable",
      tier: "advisory",
      message: `Bunker ISA parser not installed — anchors_to (H3) and probe-coverage (A2) checks skipped.`,
    });
  }
  const cov = bunkerIsa ? bunkerIsa.coverageOf(isaPath) : { coveredClaims: 0, totalClaims: 0, uncovered: [] as string[] };
  if (cov.uncovered.length) {
    advisory.push({
      code: "claims-uncovered",
      tier: "advisory",
      message: `${cov.coveredClaims}/${cov.totalClaims} claims probe-covered — uncovered: ${cov.uncovered.slice(0, 10).join(", ")}${cov.uncovered.length > 10 ? ", …" : ""}. Each should name a probe or an explicit no-probe reason.`,
    });
  }

  // A3 · bundled claims (Splitting Test — likely 2+ assertions in one claim).
  const bundled = claims.filter((c) => !c.anti && BUNDLE_MARKERS.test(c.desc)).map((c) => c.id);
  if (bundled.length) {
    advisory.push({
      code: "bundled-claim",
      tier: "advisory",
      message: `${bundled.length} claim(s) look bundled (Splitting Test — 2+ assertions): ${bundled.slice(0, 8).join(", ")}. Split until each is one binary probe.`,
    });
  }

  // A4 · event-claims (work-log masquerading as claims — verify nothing ongoing).
  const events = claims.filter((c) => EVENT_MARKERS.test(c.desc)).map((c) => c.id);
  if (events.length) {
    advisory.push({
      code: "event-claim",
      tier: "advisory",
      message: `${events.length} claim(s) read as work-log events (verify nothing ongoing): ${events.slice(0, 8).join(", ")}. State the durable end-state, not the action taken.`,
    });
  }

  return { isaPath, phase, hard, advisory, blocks: hard.length > 0 && phase === "complete" };
}

// ── CLI ───────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const path = args.find((a) => !a.startsWith("--")) ?? "./ISA.md";
  const r = gateReport(path);
  if (jsonOut) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    for (const v of r.hard) console.log(`❌ HARD  [${v.code}] ${v.message}`);
    for (const v of r.advisory) console.log(`⚠️  ADVISORY [${v.code}] ${v.message}`);
    if (!r.hard.length && !r.advisory.length) console.log(`✅ clean — no structural violations`);
    console.log(
      `\n${r.hard.length} hard · ${r.advisory.length} advisory · phase: ${r.phase || "?"} · ${r.blocks ? "BLOCKS close" : "does not block"}`,
    );
  }
  process.exit(r.blocks ? 2 : 0);
}
