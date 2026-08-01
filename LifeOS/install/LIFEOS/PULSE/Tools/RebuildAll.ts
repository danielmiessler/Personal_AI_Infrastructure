#!/usr/bin/env bun
import { loadAllManifests } from "../lib/manifest-loader";
import { runAdapter, type AdapterResult } from "../adapters/AdapterRunner";
import { writeIndex, type IndexEntry, readMeta, isStale } from "../lib/data-plane";

const args = process.argv.slice(2);
const force = args.includes("--force");

const manifests = loadAllManifests();
if (manifests.length === 0) {
  console.error("error: no manifests found in LIFEOS/PULSE/pages/");
  process.exit(1);
}

console.log(`Rebuilding ${manifests.length} page(s)${force ? " (--force, bypassing cache)" : ""}…`);
const start = Date.now();
const results = await Promise.allSettled(manifests.map((m) => runAdapter(m, { force })));
const wallMs = Date.now() - start;

const entries: IndexEntry[] = [];
const crashes: string[] = [];
let success = 0, cached = 0, failed = 0;
console.log("\n┌─ page ─────────────────┬─ status ──────────┬─ cost USD ─┬─ latency ms ─┐");
for (let i = 0; i < manifests.length; i++) {
  const m = manifests[i]!;
  const r = results[i]!;
  if (r.status === "fulfilled") {
    const a: AdapterResult = r.value;
    if (a.status === "success") success++;
    else if (a.status === "cached") cached++;
    else failed++;
    const meta = readMeta(m.id);
    const stale = isStale(m.id, m.staleAfterHours);
    entries.push({
      id: m.id,
      title: m.title,
      kind: m.dataType.replace("PageSchema", "").toLowerCase(),
      lastBuildAt: meta?.lastBuildAt ?? "",
      hasError: a.status !== "success" && a.status !== "cached",
      costUSD: a.costUSD,
      provenance: meta?.provenance ?? "template",
      staleSinceHours: stale?.stale ? Math.round(stale.ageHours) : undefined,
    });
    console.log(`│ ${m.id.padEnd(22)} │ ${a.status.padEnd(17)} │ ${a.costUSD.toFixed(4).padStart(10)} │ ${String(a.latencyMs).padStart(12)} │`);
  } else {
    // runAdapter rejected instead of returning a result — a bug in the adapter
    // itself, not a page-level build failure. Keep the reason: "unhandled" with
    // no message told an operator nothing. public PR #1648, @elhoim
    failed++;
    const reason = r.reason instanceof Error ? (r.reason.stack ?? r.reason.message) : String(r.reason);
    crashes.push(`${m.id}: ${reason}`);
    entries.push({
      id: m.id, title: m.title, kind: m.dataType.replace("PageSchema", "").toLowerCase(),
      lastBuildAt: "", hasError: true, costUSD: 0, provenance: "template",
    });
    console.log(`│ ${m.id.padEnd(22)} │ ${"crashed".padEnd(17)} │ ${"".padStart(10)} │ ${"".padStart(12)} │`);
  }
}
console.log("└────────────────────────┴───────────────────┴────────────┴──────────────┘");

for (const c of crashes) console.error(`\ncrashed — ${c}`);

writeIndex(entries);

const totalCost = entries.reduce((s, e) => s + e.costUSD, 0);
console.log(`\n${success} success · ${cached} cached · ${failed} failed · $${totalCost.toFixed(4)} total · ${wallMs}ms wall`);
process.exit(failed > 0 ? 1 : 0);
