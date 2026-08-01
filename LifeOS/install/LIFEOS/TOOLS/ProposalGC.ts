#!/usr/bin/env bun
/**
 * ProposalGC — self-healing garbage collection for auto-appended memory proposals.
 *
 * The memory reviewer appends proposals to always-loaded files under a
 * `## Memory-System Proposals` section. Without cleanup they accrete (dups,
 * superseded entries, proposals already absorbed into the file body), re-bloating
 * the every-turn context. This job REMOVES only the provably-redundant, on
 * cadence, with no human step — the self-healing counterpart to the reviewer's
 * add loop.
 *
 * SAFETY (non-negotiable): only three removal classes, each PROVABLE, never a
 * judgment call. It never merges meaning and never touches a distinct rule, so
 * the worst case is a no-op — it cannot drop a live directive. `--dry-run` is
 * the default; `--apply` writes; git makes every heal reversible.
 *
 *   1. SUPERSEDED — entry contains a self-marked `[SUPERSEDED` tag.
 *   2. EXACT-DUP  — normalized text identical to another entry; keep newest ts.
 *   3. ABSORBED   — the entry's substantive text already appears verbatim in the
 *                   file's canonical body (above the proposals section).
 *
 * ROUTING (checkpoint-OUT, advisory only — `--route`): a proposal already enforced
 * by a named hook, or scoped to a single skill or project, does not belong in an
 * always-loaded file. Its home is the hook (delete the prose), the skill's
 * SKILL.md, or the project's ISA. Classification is delegated to ProposalScope.ts.
 * It is NEVER auto-applied: it only FLAGS candidates for a human/Trim decision,
 * and the auto-heal path above keeps its provable-only invariant untouched.
 *
 * As of 2026-07-31 this leg is a BACKSTOP, not the primary defense: new proposals
 * are diverted to the Upgrades store before they can ever reach these files, so
 * `--route` exists for entries that predate that gate.
 *
 * UNATTENDED (`--auto`): the scheduled entry point. Applied proposals otherwise
 * accreted in always-on context files until someone remembered to run `/trim`
 * (public issue #1669, @xmasyx). `--auto` implies `--apply` and adds the two
 * properties a cron job needs that an interactive run doesn't: it is BOUNDED (a
 * file offering more than MAX_AUTO_REMOVALS removals is left untouched for a
 * human — an unattended pass that large is a signal, not a chore) and
 * FAIL-SILENT (always exits 0; a GC failure must never surface as a job alarm).
 * Idempotence comes free from the provable-only invariant: the second run finds
 * nothing. Interactive `--apply` behaviour is unchanged.
 *
 * Usage:
 *   bun ProposalGC.ts                # dry-run: report provable removals per file
 *   bun ProposalGC.ts --apply        # write the cleaned files (provable removals only)
 *   bun ProposalGC.ts --auto         # scheduled unattended heal (bounded, fail-silent)
 *   bun ProposalGC.ts --route        # advisory: flag hook-, skill-, or project-scoped entries
 *   bun ProposalGC.ts --json
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { classifyScope, loadScopeTables, type ProposalScope, type ScopeTables } from "./ProposalScope";

const CLAUDE_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const OBS_LOG = join(CLAUDE_DIR, "LIFEOS/MEMORY/OBSERVABILITY/proposal-gc.jsonl");
const SECTION = "## Memory-System Proposals";

// Always-loaded files that carry an auto-appended proposals section.
const TARGETS = [
  "LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md",
  "LIFEOS/USER/PROJECTS.md",
  "LIFEOS/USER/PRINCIPAL/PRINCIPAL_IDENTITY.md",
  "LIFEOS/USER/DIGITAL_ASSISTANT/DA_IDENTITY.md",
];

// Per-file ceiling for an unattended (`--auto`) pass. A file offering more than
// this many removals is skipped whole and left for a human `/trim`.
const MAX_AUTO_REMOVALS = 20;

type Removal = { file: string; reason: "superseded" | "exact-dup" | "absorbed"; text: string };

/** Normalize an entry for equality: drop the applied-comment, bullet, ws, case. */
function normalize(entry: string): string {
  return entry
    .replace(/<!--\s*applied:[^>]*-->/gi, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Timestamp from an `<!-- applied: ISO -->` marker (for keep-newest). */
function appliedTs(entry: string): string {
  const m = entry.match(/<!--\s*applied:\s*([^>]+?)\s*-->/i);
  return m ? m[1].trim() : "";
}

/** Substantive core of an entry (first ~60 normalized chars) for absorption test. */
function core(entry: string): string {
  return normalize(entry).slice(0, 60);
}

function gcFile(relPath: string): { removals: Removal[]; nextContent: string | null } {
  const abs = join(CLAUDE_DIR, relPath);
  if (!existsSync(abs)) return { removals: [], nextContent: null };
  const content = readFileSync(abs, "utf8");
  const idx = content.indexOf(SECTION);
  if (idx === -1) return { removals: [], nextContent: null };

  const head = content.slice(0, idx); // canonical body (for absorption test)
  const sectionBlock = content.slice(idx);
  const lines = sectionBlock.split("\n");
  const bodyNorm = normalize(head);

  const entryLines: { i: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*[-*]\s+/.test(lines[i]) && lines[i].length > 3) entryLines.push({ i, text: lines[i] });
  }

  const removals: Removal[] = [];
  const removeIdx = new Set<number>();

  // Pass 1: superseded + absorbed
  for (const e of entryLines) {
    if (/\[SUPERSEDED/i.test(e.text)) {
      removals.push({ file: relPath, reason: "superseded", text: e.text.trim() });
      removeIdx.add(e.i);
    } else if (core(e.text).length >= 30 && bodyNorm.includes(core(e.text))) {
      removals.push({ file: relPath, reason: "absorbed", text: e.text.trim() });
      removeIdx.add(e.i);
    }
  }

  // Pass 2: exact-dup (keep newest applied ts among a normalized group)
  const groups = new Map<string, { i: number; ts: string }[]>();
  for (const e of entryLines) {
    if (removeIdx.has(e.i)) continue;
    const key = normalize(e.text);
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push({ i: e.i, ts: appliedTs(e.text) });
  }
  for (const [, grp] of groups) {
    if (grp.length < 2) continue;
    grp.sort((a, b) => (a.ts < b.ts ? 1 : -1)); // newest first
    for (const g of grp.slice(1)) {
      removals.push({ file: relPath, reason: "exact-dup", text: lines[g.i].trim() });
      removeIdx.add(g.i);
    }
  }

  if (removeIdx.size === 0) return { removals, nextContent: null };
  const keptLines = lines.filter((_, i) => !removeIdx.has(i));
  const nextContent = head + keptLines.join("\n");
  return { removals, nextContent };
}

// ── Routing (checkpoint-OUT, advisory) ─────────────────────────────────────
// Before 2026-07-31 this file carried its own copies of the directory lookups.
// They agreed with ProposalScope's at the time, which is exactly how a pair like
// that drifts unnoticed.
type Route = { file: string; kind: Exclude<ProposalScope, "global">; dest: string; reason: string; text: string };

/**
 * Flag entries whose home is elsewhere. Advisory only: returns candidates,
 * never removes — the auto-heal path keeps its provable-only invariant.
 */
function routeFile(relPath: string, tables: ScopeTables): Route[] {
  const abs = join(CLAUDE_DIR, relPath);
  if (!existsSync(abs)) return [];
  const content = readFileSync(abs, "utf8");
  const idx = content.indexOf(SECTION);
  if (idx === -1) return [];
  const routes: Route[] = [];
  for (const line of content.slice(idx).split("\n")) {
    if (!/^\s*[-*]\s+/.test(line) || line.length <= 3) continue;
    const v = classifyScope(line, tables);
    if (v.scope === "global") continue;
    routes.push({ file: relPath, kind: v.scope, dest: v.dest, reason: v.reason, text: line.trim() });
  }
  return routes;
}

function runRoute(json: boolean) {
  const tables = loadScopeTables();
  const all: Route[] = [];
  for (const t of TARGETS) all.push(...routeFile(t, tables));
  if (json) { console.log(JSON.stringify({ routes: all }, null, 2)); return; }
  console.log("── ProposalGC (route — advisory, no removals) ──");
  if (all.length === 0) { console.log("  every entry in the always-loaded tails is genuinely global ✅"); return; }
  const byFile = new Map<string, Route[]>();
  for (const r of all) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)!).push(r);
  for (const [file, rs] of byFile) {
    console.log(`\n  ${file} — ${rs.length} candidate(s):`);
    for (const r of rs) {
      console.log(`    → ${r.kind}:${r.dest}  ${r.text.slice(0, 84)}${r.text.length > 84 ? "…" : ""}`);
      console.log(`       ${r.reason}`);
    }
  }
  console.log(`\n${all.length} candidate(s) for a better home. HOOK = a hook already enforces it, so delete the prose once confirmed. SKILL = relocate to its SKILL.md. PROJECT = relocate to its ISA or repo CLAUDE.md. Human-gated: nothing removed. New proposals no longer reach these files — MemorySystem.add() diverts them at write time.`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--route")) return runRoute(args.has("--json"));
  const auto = args.has("--auto");
  const apply = args.has("--apply") || auto;
  const all: Removal[] = [];
  const writes: { path: string; content: string }[] = [];
  const skipped: { file: string; count: number }[] = [];

  for (const t of TARGETS) {
    const { removals, nextContent } = gcFile(t);
    // Bounded: an unattended pass never makes a large edit to an always-on file.
    if (auto && removals.length > MAX_AUTO_REMOVALS) {
      skipped.push({ file: t, count: removals.length });
      continue;
    }
    all.push(...removals);
    if (nextContent && apply) writes.push({ path: join(CLAUDE_DIR, t), content: nextContent });
  }

  if (args.has("--json")) {
    console.log(JSON.stringify({ dryRun: !apply, removals: all, skipped }, null, 2));
  } else if (auto) {
    // One line for the job log. NO_ACTION is Pulse's suppress-dispatch sentinel.
    for (const s of skipped) {
      console.log(`ProposalGC: ${s.file} offers ${s.count} removals (> ${MAX_AUTO_REMOVALS}) — skipped, run /trim`);
    }
    if (all.length === 0 && skipped.length === 0) console.log("NO_ACTION");
  } else {
    console.log(`── ProposalGC ${apply ? "(APPLY)" : "(dry-run)"} ──`);
    if (all.length === 0) console.log("  nothing to collect — all proposal sections clean ✅");
    const byFile = new Map<string, Removal[]>();
    for (const r of all) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)!).push(r);
    for (const [file, rs] of byFile) {
      console.log(`\n  ${file} — ${rs.length} removable:`);
      for (const r of rs) console.log(`    [${r.reason}] ${r.text.slice(0, 100)}${r.text.length > 100 ? "…" : ""}`);
    }
  }

  if (apply) {
    for (const w of writes) {
      const tmp = `${w.path}.tmp`;
      writeFileSync(tmp, w.content, "utf8");
      renameSync(tmp, w.path);
      stampTarget(w.path);
    }
    try {
      appendLog({ ts: new Date().toISOString(), applied: true, auto, removed: all.length, byReason: countBy(all), skipped });
    } catch {}
    // A no-op auto pass already said NO_ACTION; don't contradict it with a
    // "removed 0 entries" success line.
    if (writes.length || !auto) {
      console.log(`\n✅ applied — removed ${all.length} redundant entries across ${writes.length} file(s). Commit to persist.`);
    }
  } else if (all.length) {
    console.log(`\n${all.length} entries would be removed. Re-run with --apply to heal.`);
  }
}

/**
 * Stamp a healed file's frontmatter so the header stops contradicting the body.
 * A GC pass is still a programmatic write to an always-loaded context file: it must
 * move `last_updated`, and a file the memory loop is maintaining is not a pristine
 * template, so `provenance: template` flips too. Best-effort — a stamping failure
 * must not undo a heal that already landed on disk. (public PR #1667, @elhoim)
 */
function stampTarget(absPath: string): void {
  try {
    const mod = require("./TelosFreshness") as typeof import("./TelosFreshness");
    mod.stampContextWrite(absPath, "proposal-gc");
  } catch {
    // best-effort — see doc above
  }
}

function countBy(rs: Removal[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const r of rs) o[r.reason] = (o[r.reason] ?? 0) + 1;
  return o;
}
function appendLog(obj: unknown) {
  const { appendFileSync } = require("node:fs");
  appendFileSync(OBS_LOG, JSON.stringify(obj) + "\n", "utf8");
}

// Fail-silent under `--auto`: a scheduled heal that throws must not surface as a
// job alarm — the worst case of skipping a GC pass is a slightly larger context
// file, which the next tick collects. Interactive runs still fail loudly.
try {
  main();
} catch (err) {
  if (!process.argv.includes("--auto")) throw err;
  console.error(`ProposalGC: auto pass failed — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(0);
}
