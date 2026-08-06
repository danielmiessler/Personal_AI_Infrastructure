#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * UpdateLifeosState — Writes LIFEOS_STATE.json with per-dimension pct scores read by
 * the statusline (LIFEOS/LIFEOS_StatusLine.sh) STATE strip and the Pulse TELOS
 * dashboard rings.
 *
 * Pct semantics:
 *   - If `CURRENT_STATE/<DIM>.md` exists with `status: have|partial|missing`
 *     rows and is not the byte-identical shipped scaffold, pct =
 *     (have + 0.5 × partial) / total × 100 — real coverage.
 *   - Else falls back to IDEAL_STATE articulation completeness:
 *     `100 - (TBD markers × 10)`, clamped 0..100.
 *
 * The fallback measures whether the principal has articulated what "good"
 * looks like; the primary path measures whether reality matches it. A freshly
 * copied CURRENT_STATE scaffold has not measured reality yet, so it falls
 * through to IDEAL_STATE instead of reporting a real 0%. Detection uses the
 * exact hashes of the templates shipped beside this tool: provenance alone is
 * insufficient because sanctioned writers can add real data to the body.
 *
 * Reads:  LIFEOS/USER/TELOS/IDEAL_STATE/<DIM>.md (target articulation)
 *         LIFEOS/USER/TELOS/CURRENT_STATE/<DIM>.md (actual coverage, when present)
 * Writes: LIFEOS/USER/TELOS/LIFEOS_STATE.json
 *
 * Template-style: works on any user's LifeOS install — no hardcoded paths,
 * no {{PRINCIPAL_NAME}}-specific names. Fresh installs land all dimensions at 0 until the
 * principal runs the IDEAL_STATE interview.
 *
 * Usage:
 *   bun ~/.claude/LIFEOS/TOOLS/UpdateLifeosState.ts
 *   bun ~/.claude/LIFEOS/TOOLS/UpdateLifeosState.ts --json
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}


const HOME = process.env.HOME || "";
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(HOME, ".claude", "LIFEOS");
const IDEAL_DIR = join(LIFEOS_DIR, "USER", "TELOS", "IDEAL_STATE");
const CURRENT_DIR = join(LIFEOS_DIR, "USER", "TELOS", "CURRENT_STATE");
const STATE_FILE = join(LIFEOS_DIR, "USER", "TELOS", "LIFEOS_STATE.json");

// SHA-256 of install/USER/TELOS/CURRENT_STATE/<file> in this release. These
// templates contain no identity placeholders, so ScaffoldUser copies the exact
// bytes. Any sanctioned or manual write changes the hash and makes the file a
// real CURRENT_STATE measurement, even if every status row still says missing.
const CURRENT_STATE_TEMPLATE_SHA256: Readonly<Record<string, string>> = {
  "HEALTH.md": "639f18883019aad254bc10919d5afdadb3e5b75113dac83a66c4f30321cac50b",
  "MONEY.md": "0aabf60e26599466bab184fc4af8a0422401a33a37bbdfa770d6bd1437a9b535",
  "FREEDOM.md": "18113772b9f614b63e8015d9f4e3956e9615d629cac839331c93bf9f5e447ec2",
  "CREATIVE.md": "60947d1433993b2a5b10573139d9168c9b5c8701f03cf16b0fde2f1fb26b5dfb",
  "RELATIONSHIPS.md": "3fe80f37e984e1f56abdb4476bd520d69048a5301204a0ff4353e086ddca31e0",
  "RHYTHMS.md": "d0480c374ab725c93b6ddf3472d0fa753c22ffe0f8fdc2e750d81c249920a3ae",
  "INFRASTRUCTURE.md": "507b80617cd0eb9d1a4285a2a503cf8ffefd2788076f884f614de73d638bb827",
};

const DIMENSIONS = [
  { id: "health",         file: "HEALTH.md" },
  { id: "money",          file: "MONEY.md" },
  { id: "freedom",        file: "FREEDOM.md" },
  { id: "creative",       file: "CREATIVE.md" },
  { id: "relationships",  file: "RELATIONSHIPS.md" },
  { id: "rhythms",        file: "RHYTHMS.md" },
  { id: "infrastructure", file: "INFRASTRUCTURE.md" },
] as const;

type DimensionId = (typeof DIMENSIONS)[number]["id"];

interface DimensionState {
  pct: number | null;
  tbd_count: number;
  last_updated: string | null;
  source_file: string;
}

interface LifeosState {
  generated_at: string;
  dimensions: Record<DimensionId, DimensionState>;
}

function readFrontmatterDate(content: string): string | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = content.slice(3, end);
  const m = fm.match(/^last_updated:\s*(.+?)\s*$/m);
  return m ? m[1].replace(/^["']|["']$/g, "") : null;
}

function isUntouchedCurrentStateTemplate(file: string, content: string): boolean {
  const expected = CURRENT_STATE_TEMPLATE_SHA256[file];
  if (!expected) return false;
  return createHash("sha256").update(content).digest("hex") === expected;
}

function computeFromCurrent(file: string): DimensionState | null {
  const path = join(CURRENT_DIR, file);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf-8");
  const have    = (content.match(/\bstatus:\s*have\b/g)    || []).length;
  const partial = (content.match(/\bstatus:\s*partial\b/g) || []).length;
  const missing = (content.match(/\bstatus:\s*missing\b/g) || []).length;
  // Fail loud on unrecognized status keywords (public issue #1509): a synonym
  // like `status: populated` used to silently count as nothing, so a fully
  // populated file computed as 0% coverage with no signal anything was wrong.
  const RECOGNIZED = new Set(["have", "partial", "missing"]);
  const unrecognized = [...content.matchAll(/\bstatus:\s*([A-Za-z][\w-]*)/g)]
    .map((m) => m[1]!.toLowerCase())
    .filter((kw) => !RECOGNIZED.has(kw));
  if (unrecognized.length > 0) {
    const uniq = [...new Set(unrecognized)].join(", ");
    process.stderr.write(
      `[UpdateLifeosState] WARNING: ${file} has ${unrecognized.length} unrecognized status keyword(s) (${uniq}) — ` +
      `only have/partial/missing count toward coverage, so the reported percentage is wrong until fixed.\n`,
    );
  }
  const total = have + partial + missing;
  if (total === 0) return null;
  if (isUntouchedCurrentStateTemplate(file, content)) return null;
  const pct = Math.round(((have + 0.5 * partial) / total) * 100);
  return {
    pct,
    tbd_count: missing,
    last_updated: readFrontmatterDate(content),
    source_file: `CURRENT_STATE/${file}`,
  };
}

function computeFromIdeal(file: string): DimensionState {
  const path = join(IDEAL_DIR, file);
  if (!existsSync(path)) {
    return { pct: null, tbd_count: 0, last_updated: null, source_file: file };
  }
  const content = readFileSync(path, "utf-8");
  const tbd_count = (content.match(/\bTBD\b/g) || []).length;
  const pct = Math.max(0, Math.min(100, 100 - tbd_count * 10));
  return {
    pct,
    tbd_count,
    last_updated: readFrontmatterDate(content),
    source_file: `IDEAL_STATE/${file}`,
  };
}

function computeState(file: string): DimensionState {
  return computeFromCurrent(file) ?? computeFromIdeal(file);
}

function build(): LifeosState {
  const dimensions = {} as Record<DimensionId, DimensionState>;
  for (const d of DIMENSIONS) {
    dimensions[d.id] = computeState(d.file);
  }
  return {
    generated_at: new Date().toISOString(),
    dimensions,
  };
}

function main(): void {
  const state = build();
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(state, null, 2));
  } else {
    console.log(`LIFEOS_STATE.json updated: ${STATE_FILE}`);
    for (const d of DIMENSIONS) {
      const s = state.dimensions[d.id];
      const pctStr = s.pct === null ? "—" : `${s.pct}%`;
      console.log(`  ${d.id.padEnd(14)} ${pctStr.padStart(5)}  (${s.tbd_count} TBDs, updated ${s.last_updated ?? "unknown"})`);
    }
  }
}

main();
