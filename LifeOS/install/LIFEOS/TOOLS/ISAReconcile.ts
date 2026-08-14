#!/usr/bin/env bun
//
// ISAReconcile.ts — Sweep every MEMORY/WORK/<slug>/ISA.md and reconcile work.json.
//
// ISASync.hook.ts only fires on PostToolUse Edit/Write of an ISA. ISAs that
// were abandoned mid-run (e.g., stranded at `phase: verify`) and later fell
// out of work.json never re-sync, so Pulse /agents can't see them.
//
// This tool runs the canonical `syncToWorkJson` for every ISA on disk in one
// pass. ISA frontmatter is ground truth (Algorithm v6.3.0 doctrine); work.json
// converges to it, never the other way.
//
// RETIRED: `--abandon-old-verify` used to rewrite stranded verify-phase ISAs to
// `phase: complete`. That erased the backlog signal instead of surfacing it — a
// run that never finished was recorded as finished, and the only evidence it
// stalled was gone. Stranded ISAs are now reported as `stranded-verify` and
// left exactly as they are. THIS SWEEP NEVER WRITES AN ISA FILE.
// Extracted from public PR #1714, @anikinsasha.
//
// Usage:
//   bun run ~/.claude/LIFEOS/TOOLS/ISAReconcile.ts                       (default: --audit)
//   bun run ~/.claude/LIFEOS/TOOLS/ISAReconcile.ts --audit               (report drift, no writes)
//   bun run ~/.claude/LIFEOS/TOOLS/ISAReconcile.ts --fix                 (sync drift into work.json)
//   bun run ~/.claude/LIFEOS/TOOLS/ISAReconcile.ts --json                (machine-readable)
//

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import {
  ARTIFACT_FILENAME,
  LEGACY_ARTIFACT_FILENAME,
  parseFrontmatter,
  syncToWorkJson,
  readRegistry,
  WORK_DIR,
} from "../../hooks/lib/isa-utils";

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const audit = !fix || args.includes("--audit");
const asJson = args.includes("--json");

// The retired flag announces itself rather than no-op'ing silently — a cron
// entry or runbook still passing it should learn that it stopped meaning
// anything, not quietly get different behaviour.
if (args.includes("--abandon-old-verify")) {
  console.error(
    "[ISAReconcile] --abandon-old-verify is RETIRED: rewriting stranded ISAs to " +
      "phase:complete recorded unfinished runs as finished and erased the backlog signal. " +
      "Stranded ISAs are reported as-is. Proceeding without it.",
  );
}

// Scope the sync window. ISAs older than this many days are reported but
// never written to work.json (avoids resurrecting hundreds of historical
// completed sessions just to have /api/algorithm filter them right back out).
// Override with --max-age-days N. Default keeps "recent" generous: 30 days.
const maxAgeIdx = args.indexOf("--max-age-days");
const MAX_AGE_DAYS = maxAgeIdx >= 0 && args[maxAgeIdx + 1] ? Number(args[maxAgeIdx + 1]) : 30;

const STRANDED_AGE_DAYS = 7;

type DriftStatus = "in-sync" | "drift" | "orphan" | "stranded-verify";

interface DriftRow {
  slug: string;
  isaPhase: string;
  workPhase: string;
  inWorkJson: boolean;
  ageDays: number;
  status: DriftStatus;
  action: "noop" | "synced" | "skipped";
}

function findISAPath(slug: string): string | null {
  const dir = join(WORK_DIR, slug);
  const isa = join(dir, ARTIFACT_FILENAME);
  if (existsSync(isa)) return isa;
  const legacy = join(dir, LEGACY_ARTIFACT_FILENAME);
  if (existsSync(legacy)) return legacy;
  return null;
}

function ageDays(ts: number): number {
  return (Date.now() - ts) / (24 * 60 * 60 * 1000);
}

function classify(isaPhase: string, inWorkJson: boolean, workPhase: string, days: number): DriftStatus {
  if (!inWorkJson) {
    return isaPhase === "verify" && days > STRANDED_AGE_DAYS ? "stranded-verify" : "orphan";
  }
  return isaPhase === workPhase ? "in-sync" : "drift";
}

const slugs = existsSync(WORK_DIR) ? readdirSync(WORK_DIR) : [];

// Sort by mtime ascending (oldest first) so when we sync, the newest ISAs
// get the highest updatedAt and survive the 50-session cap inside syncToWorkJson.
// readdirSync alphabetical order happens to roughly match for date-prefixed
// slugs, but legacy slugs without YYYYMMDD prefix break that — sort by mtime
// to be deterministic.
const sortedSlugs = slugs
  .map((slug) => {
    const path = findISAPath(slug);
    if (!path) return null;
    try {
      return { slug, path, mtime: statSync(path).mtimeMs };
    } catch {
      return null;
    }
  })
  .filter((x): x is { slug: string; path: string; mtime: number } => x !== null)
  .sort((a, b) => a.mtime - b.mtime);

const rows: DriftRow[] = [];
let scanned = 0;
let errors = 0;
const errorList: string[] = [];

for (const { slug, path } of sortedSlugs) {
  scanned++;
  try {
    const content = readFileSync(path, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm || !fm.slug) {
      errors++;
      errorList.push(`${slug}: no parseable frontmatter or missing slug field`);
      continue;
    }

    const isaPhase = (fm.phase || "idle").toLowerCase();
    // Re-read registry on every iteration: syncToWorkJson rewrites work.json
    // and runs its own cleanup pass, so what was true at the start of the
    // outer loop may not be true now. Reading again before classify ensures
    // we report drift as it actually stands at this step.
    const liveRegistry = readRegistry();
    const work = liveRegistry.sessions[fm.slug];
    const workPhase = work?.phase || "MISSING";
    const inWorkJson = !!work;
    const days = ageDays(statSync(path).mtimeMs);
    const status = classify(isaPhase, inWorkJson, workPhase, days);

    let action: DriftRow["action"] = "noop";
    if (fix && status !== "in-sync") {
      // Outright skip rules.
      // 1. Out-of-window: never sync ISAs older than --max-age-days.
      // 2. Old-completed: completed >24h ago wouldn't render on the dashboard
      //    anyway (the /api/algorithm filter drops them) and wastes cap slots.
      //    Skipping them keeps the 50-session cap room for active-phase ISAs.
      const isOldCompleted = isaPhase === "complete" && days > 1;
      if (days > MAX_AGE_DAYS) {
        action = "skipped";
      } else if (isOldCompleted) {
        action = "skipped";
      } else if (status === "stranded-verify") {
        // Reported, never rewritten — a stalled run stays visibly stalled.
        action = "skipped";
      } else {
        syncToWorkJson(fm, path, content);
        action = "synced";
      }
    }

    rows.push({ slug: fm.slug, isaPhase, workPhase, inWorkJson, ageDays: days, status, action });
  } catch (e) {
    errors++;
    errorList.push(`${slug}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const counts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});
const actionCounts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.action] = (acc[r.action] || 0) + 1;
  return acc;
}, {});

if (asJson) {
  console.log(JSON.stringify({ scanned, errors, counts, actionCounts, rows, errorList }, null, 2));
  process.exit(errors > 0 ? 1 : 0);
}

const mode = fix ? "FIX" : "AUDIT";
console.log(`\n═══ ISA Reconcile (${mode}) ═══════════════════════\n`);
console.log(`Scanned: ${scanned} ISA files`);
console.log(`Status counts:`);
for (const [k, v] of Object.entries(counts).sort()) {
  console.log(`  ${k.padEnd(20)} ${v}`);
}

if (fix) {
  console.log(`\nActions taken:`);
  for (const [k, v] of Object.entries(actionCounts).sort()) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
}

const interesting = rows
  .filter((r) => r.status !== "in-sync")
  .sort((a, b) => a.ageDays - b.ageDays);

if (interesting.length > 0) {
  console.log(`\nNon-in-sync rows (newest → oldest):`);
  for (const r of interesting) {
    const age = `${r.ageDays.toFixed(1)}d`.padStart(7);
    const actionTag = fix ? ` → ${r.action}` : "";
    console.log(
      `  [${r.status.padEnd(15)}] ${age} | ISA=${r.isaPhase.padEnd(10)} work=${r.workPhase.padEnd(10)} | ${r.slug}${actionTag}`
    );
  }
}

if (errors > 0) {
  console.log(`\n${errors} error(s):`);
  for (const e of errorList) console.log(`  ${e}`);
}

if (audit && !fix) {
  const strandedCount = counts["stranded-verify"] || 0;
  const otherDrift = (counts["drift"] || 0) + (counts["orphan"] || 0);
  const recentDrift = rows.filter((r) => r.status !== "in-sync" && r.ageDays <= MAX_AGE_DAYS).length;
  console.log(`\n${strandedCount} stranded verify-phase ISAs (>${STRANDED_AGE_DAYS}d old, not in work.json).`);
  console.log(`${otherDrift} total drift/orphan rows | ${recentDrift} within --max-age-days=${MAX_AGE_DAYS}.`);
  console.log(`\nRun with --fix to sync drift/orphans (≤${MAX_AGE_DAYS}d) into work.json.`);
  if (strandedCount > 0) {
    console.log(`Stranded ISAs are reported, never rewritten — resume or close them by hand.`);
  }
}

process.exit(errors > 0 ? 1 : 0);
