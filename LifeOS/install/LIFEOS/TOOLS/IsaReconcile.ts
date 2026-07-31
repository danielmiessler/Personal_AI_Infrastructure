#!/usr/bin/env bun
//
// IsaReconcile.ts — sweep every ISA this instance owns, maintain the persistent
// backlog index, and reconcile work.json.
//
// PURPOSE:
// Two jobs, one pass.
//
//   1. THE INDEX (the reason this tool now runs on a trigger).
//      ISAs are the memory of the principal's work and tools; they must stay
//      persistent and findable forever. This sweep writes every ISA it can see
//      — BOTH WORK trees (~/.claude/MEMORY/WORK and <LIFEOS_DIR>/MEMORY/WORK)
//      plus the registered persistent tool ISAs under LIFEOS/TOOLS/ — into
//      MEMORY/STATE/isa-index.json. The index is append-only: an ISA that
//      leaves disk is tombstoned, never dropped. LoadContext's "Stalled ISAs"
//      block reads it. Freshness governs what is pushed; nothing governs what
//      exists or is findable.
//
//   2. WORK.JSON DRIFT (the original job). ISASync.hook.ts only fires on
//      PostToolUse Edit/Write of an ISA, so ISAs abandoned mid-run (stranded at
//      `phase: verify`) that later fell out of work.json never re-sync and Pulse
//      /agents can't see them. This runs the canonical `syncToWorkJson` for
//      every in-window ISA in one pass. ISA frontmatter is ground truth
//      (Algorithm v6.3.0 doctrine); work.json converges to it, never the reverse.
//
// INDEXING IS NOT GATED ON --fix. `--audit` means "no writes to work.json or to
// ISA frontmatter"; the index still updates, because indexing is append-only
// memory capture, not a mutation of state anyone reasons about. `--no-index`
// opts out entirely.
//
// RETIRED: `--abandon-old-verify` used to rewrite stranded ISAs to
// `phase: complete`. That erased the exact backlog signal the index exists to
// carry. Stranded ISAs are now flagged `stranded` in the index and
// synced to work.json as they are.
//
// THE SWEEP NEVER WRITES AN ISA FILE. Scoped precisely, the claim has three
// independent legs:
//
//   1. FILE. This file contains no write call — no writeFileSync, no
//      writeFrontmatterField.
//   2. CALL GRAPH, at the write. The only ISA write reachable from here is
//      syncToWorkJson's v6.9.0 Resume After Complete write-back, and the
//      `artifactReadOnly` option passed at the single --fix call site below
//      suppresses it beside the write itself, not from this file.
//   3. CALL GRAPH, by construction. That branch is in fact UNREACHABLE from
//      --fix even without the flag: the resume arms only when the registry
//      phase and the frontmatter phase are BOTH exactly `complete`, and
//      `classify()` returns "in-sync" for precisely that state — which the
//      `status !== "in-sync"` gate below then skips. Verified empirically
//      against a flag-stripped copy across the whole reachable classify space
//      (in-sync / drift / orphan, matching and mismatching case): zero ISA
//      bytes changed in every case, including the ones that did call sync.
//
// Leg 3 is why the flag is defense in depth rather than the load-bearing
// guard — and exactly why it is still worth having. Leg 3 is an emergent
// property of a classifier in THIS file; leg 2 holds no matter what that
// classifier does next. `test/hooks/IsaReconcileSweep.test.ts` pins both: the
// call site is asserted at source level (a fixture cannot exercise an
// unreachable branch, so a fixture-only test would pass vacuously forever).
//
// Usage:
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts                 (default: --audit + index)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --index-only    (index only, no work.json writes, quiet-friendly)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --fix           (sync drift into work.json + index)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --no-index      (legacy behavior: work.json only)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --max-age-days N  (work.json sync window; index is unbounded)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --json          (machine-readable)
//   bun run ~/.claude/LIFEOS/TOOLS/IsaReconcile.ts --quiet         (exit code + errors only; for the SessionStart async hook)
//
// @see ~/.claude/LIFEOS/DOCUMENTATION/Isa/IsaFormat.md · ~/.claude/hooks/lib/isa-index.ts (the index library)

import { readFileSync, statSync } from "fs";
import {
  parseFrontmatter,
  parseFrontmatterTolerant,
  normalizePhase,
  isaIndexEntryFrom,
  syncToWorkJson,
  readRegistry,
} from "../../hooks/lib/isa-utils";
import {
  discoverIsaSources,
  isaIndexPath,
  loadPickupKnobs,
  upsertIsaEntries,
  TERMINAL_PHASES,
  type IsaIndexEntry,
  type IsaSource,
} from "../../hooks/lib/isa-index";

const args = process.argv.slice(2);
const indexOnly = args.includes("--index-only");
const fix = args.includes("--fix") && !indexOnly;
const audit = !fix || args.includes("--audit");
const noIndex = args.includes("--no-index");
const asJson = args.includes("--json");
const quiet = args.includes("--quiet") && !asJson;

if (args.includes("--abandon-old-verify")) {
  console.error(
    "[IsaReconcile] --abandon-old-verify is RETIRED: rewriting stranded ISAs to " +
      "phase:complete erased the backlog signal. Stranded ISAs are flagged in the index instead. " +
      "Proceeding without it.",
  );
}

// Scope the work.json sync window. ISAs older than this are reported and
// INDEXED but never written to work.json (work.json is a bounded view; the
// index is the unbounded memory). Override with --max-age-days N.
const knobs = loadPickupKnobs();
const maxAgeIdx = args.indexOf("--max-age-days");
const MAX_AGE_DAYS =
  maxAgeIdx >= 0 && args[maxAgeIdx + 1] ? Number(args[maxAgeIdx + 1]) : knobs.reconcileMaxAgeDays;
const STRANDED_AGE_DAYS = knobs.strandedAfterDays;

type DriftStatus = "in-sync" | "drift" | "orphan" | "stranded-verify";

interface DriftRow {
  slug: string;
  kind: "work" | "tool";
  isaPhase: string;
  workPhase: string;
  inWorkJson: boolean;
  ageDays: number;
  status: DriftStatus;
  action: "noop" | "synced" | "skipped" | "indexed-only";
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

// ── Sweep ─────────────────────────────────────────────────────────────────

const sources: IsaSource[] = discoverIsaSources();

// Sort by mtime ascending (oldest first) so when we sync, the newest ISAs get
// the highest updatedAt and survive the row cap inside syncToWorkJson.
const sorted = sources
  .map((s) => {
    try {
      return { ...s, mtime: statSync(s.path).mtimeMs };
    } catch {
      return null;
    }
  })
  .filter((x): x is IsaSource & { mtime: number } => x !== null)
  .sort((a, b) => a.mtime - b.mtime);

const rows: DriftRow[] = [];
const indexEntries: IsaIndexEntry[] = [];
let scanned = 0;
let errors = 0;
const errorList: string[] = [];
/** ISAs whose frontmatter does not parse strictly (title-first layout, etc.).
 *  Indexed anyway — reported so the layout can be normalized, never skipped. */
const unparseable: string[] = [];

for (const source of sorted) {
  scanned++;
  try {
    const content = readFileSync(source.path, "utf-8");
    // INDEXING NEVER SKIPS. An ISA whose frontmatter won't parse is still the
    // memory of real work — dropping it here would rebuild the very
    // invisibility this index removes. The tolerant read covers title-first ISAs; a
    // total parse failure still indexes on derived fields (dir name, H1,
    // mtime, ISC counts) and is reported as a normalization finding.
    const fm = parseFrontmatterTolerant(content);
    const strict = parseFrontmatter(content);
    if (!strict) {
      unparseable.push(source.dirName);
    }

    // WORK ISAs key work.json by `slug`; tool ISAs and hand-written ISAs may
    // omit it. The index keys by path, so it never needs the frontmatter slug —
    // only the work.json leg does.
    const slug = fm.slug || source.dirName;
    const isaPhase = normalizePhase(fm.phase || fm.status);
    const days = ageDays(source.mtime);

    // One definition of "ISA → index entry", shared with the live edit path.
    indexEntries.push(
      isaIndexEntryFrom(fm, source.path, content, {
        kind: source.kind,
        mtimeMs: source.mtime,
        source: "sweep",
        strandedAfterDays: STRANDED_AGE_DAYS,
      }),
    );

    // ── work.json leg ──
    // Persistent tool ISAs never enter work.json: it is the per-session
    // dashboard view, and a tool ISA is not a session. They are index-only.
    if (source.kind === "tool" || !fm.slug) {
      rows.push({
        slug, kind: source.kind, isaPhase, workPhase: "n/a", inWorkJson: false,
        ageDays: days, status: "orphan", action: "indexed-only",
      });
      continue;
    }

    // Re-read the registry each iteration: syncToWorkJson rewrites work.json
    // and runs its own cleanup, so what was true at loop start may not be now.
    const liveRegistry = readRegistry();
    const work = liveRegistry.sessions[fm.slug];
    const workPhase = work?.phase || "MISSING";
    const inWorkJson = !!work;
    const status = classify(isaPhase, inWorkJson, workPhase, days);

    let action: DriftRow["action"] = "noop";
    if (fix && status !== "in-sync") {
      // Out-of-window ISAs stay out of work.json (the view stays bounded) —
      // they are already in the index above, which is the point.
      // Old-completed rows would be filtered straight back out by
      // /api/algorithm; skipping them keeps cap room for active-phase ISAs.
      const isOldCompleted = TERMINAL_PHASES.has(isaPhase) && days > 1;
      if (days > MAX_AGE_DAYS || isOldCompleted) {
        action = "skipped";
      } else {
        // Stranded verify-phase ISAs sync AS THEY ARE. No frontmatter rewrite:
        // a stranded ISA is real in-flight backlog, and flipping it to complete
        // was the signal-erasing bug this index exists to prevent.
        //
        // `artifactReadOnly` is the STRUCTURAL half of that promise: it
        // suppresses the v6.9.0 resume write-back inside syncToWorkJson, the
        // one call-graph path by which this sweep could write an ISA file.
        // The resume cannot arm from here today (header leg 3) — but that is
        // an accident of the two gates above, both of which live in this file
        // while the write lives in another. This option is the half that stays
        // true when those gates change. Do not drop it; the source-level
        // assertion in test/hooks/IsaReconcileSweep.test.ts will fail.
        syncToWorkJson(fm, source.path, content, undefined, { artifactReadOnly: true });
        action = "synced";
      }
    }

    rows.push({ slug: fm.slug, kind: source.kind, isaPhase, workPhase, inWorkJson, ageDays: days, status, action });
  } catch (e) {
    errors++;
    errorList.push(`${source.dirName}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Publish the index ─────────────────────────────────────────────────────

let indexed = 0;
let indexWritten = false;
if (!noIndex && knobs.enabled) {
  // reconcileMissing: this is the authoritative full sweep, so entries whose
  // artifact has left disk get tombstoned here. They are NEVER removed.
  indexWritten = upsertIsaEntries(indexEntries, { reconcileMissing: true });
  indexed = indexEntries.length;
  if (!indexWritten) {
    // NOT an error, and deliberately not a non-zero exit. The overwhelmingly
    // likely cause is another session's sweep holding the lock — which means
    // the same data is being written by someone else — and this sweep re-runs
    // at every session start regardless. Two sessions opening at once must not
    // print a hook failure at the principal. Real I/O failures surface the same way and
    // self-heal on the next run; the one caller that cannot tolerate a skip
    // (work.json eviction) checks the boolean itself.
    // Not under --quiet: the SessionStart registration runs quiet precisely so
    // routine lock contention between two sessions opening at once cannot print
    // at the principal. A skipped write is a no-op that the next sweep retries.
    if (!quiet) {
      console.error(`[IsaReconcile] index write skipped (lock held or I/O) — ${isaIndexPath()}; next sweep retries`);
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────

const counts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});
const actionCounts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.action] = (acc[r.action] || 0) + 1;
  return acc;
}, {});

if (asJson) {
  console.log(JSON.stringify({ scanned, indexed, indexWritten, indexPath: isaIndexPath(), errors, counts, actionCounts, rows, errorList, unparseable }, null, 2));
  process.exit(errors > 0 ? 1 : 0);
}

if (quiet) {
  if (errors > 0) {
    console.error(`[IsaReconcile] ${errors} error(s):`);
    for (const e of errorList) console.error(`  ${e}`);
  }
  process.exit(errors > 0 ? 1 : 0);
}

const mode = indexOnly ? "INDEX" : fix ? "FIX" : "AUDIT";
console.log(`\n═══ ISA Reconcile (${mode}) ═══════════════════════\n`);
console.log(`Scanned: ${scanned} ISA files (${sources.filter((s) => s.kind === "work").length} work, ${sources.filter((s) => s.kind === "tool").length} tool)`);
if (!noIndex && knobs.enabled) {
  console.log(`Indexed: ${indexed} entries → ${isaIndexPath()}${indexWritten ? "" : "  ⚠️ WRITE SKIPPED"}`);
}

if (!indexOnly) {
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
    .filter((r) => r.status !== "in-sync" && r.action !== "indexed-only")
    .sort((a, b) => a.ageDays - b.ageDays);

  if (interesting.length > 0) {
    console.log(`\nNon-in-sync rows (newest → oldest):`);
    for (const r of interesting) {
      const age = `${r.ageDays.toFixed(1)}d`.padStart(7);
      const actionTag = fix ? ` → ${r.action}` : "";
      console.log(
        `  [${r.status.padEnd(15)}] ${age} | ISA=${r.isaPhase.padEnd(10)} work=${r.workPhase.padEnd(10)} | ${r.slug}${actionTag}`,
      );
    }
  }
}

if (unparseable.length > 0) {
  console.log(`\n${unparseable.length} ISA(s) with non-standard frontmatter (INDEXED anyway — normalize when convenient):`);
  for (const d of unparseable) console.log(`  ${d}`);
}

if (errors > 0) {
  console.log(`\n${errors} error(s):`);
  for (const e of errorList) console.log(`  ${e}`);
}

if (audit && !fix && !indexOnly) {
  const strandedCount = counts["stranded-verify"] || 0;
  const otherDrift = (counts["drift"] || 0) + (counts["orphan"] || 0);
  const recentDrift = rows.filter((r) => r.status !== "in-sync" && r.ageDays <= MAX_AGE_DAYS).length;
  console.log(`\n${strandedCount} stranded verify-phase ISAs (>${STRANDED_AGE_DAYS}d old, not in work.json) — flagged in the index.`);
  console.log(`${otherDrift} total drift/orphan rows | ${recentDrift} within --max-age-days=${MAX_AGE_DAYS}.`);
  console.log(`\nRun with --fix to sync drift/orphans (≤${MAX_AGE_DAYS}d) into work.json. The index is already current.`);
}

process.exit(errors > 0 ? 1 : 0);
