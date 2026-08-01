#!/usr/bin/env bun
/**
 * atlas — the LifeOS asset graph CLI.
 *
 *   atlas sync [collector ...] [--targeted <scope>]   reconcile (default: all collectors)
 *   atlas tick                                        events-then-hourly entry for launchd
 *   atlas status                                      per-collector runs + asset/edge counts
 *   atlas owns <key>                                  what deleting <key> orphans (OWNS closure)
 *   atlas blast <key>                                 what operationally relies on <key>
 *   atlas exposed <key>                               which credentials <key> would leak if compromised
 *   atlas stale                                       assets no longer observed
 *   atlas unregistered                                active domains missing security-plane coverage
 *   atlas sql "<select>"                              read-only SQL passthrough
 *   atlas export                                      write the redacted Pulse snapshot
 *
 * Atlas is DERIVED EVIDENCE. For destructive ops the provider's authority API remains
 * the authority; `atlas owns` runs alongside it, never instead of it (Algorithm claim 16).
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { EVENTS_PATH, SNAPSHOT_PATH, Store, type Collector } from "./Store";
import { cloudflare } from "./collectors/Cloudflare";
import { github } from "./collectors/Github";
import { projects } from "./collectors/Projects";
import { infraInventory } from "./collectors/InfraInventory";
import { launchd } from "./collectors/Launchd";
import { gear } from "./collectors/Gear";
import { secrets } from "./collectors/Secrets";

const COLLECTORS: Record<string, Collector> = Object.fromEntries(
  [cloudflare, github, projects, infraInventory, launchd, gear, secrets].map((c) => [c.name, c]),
);

const FULL_SYNC_INTERVAL_MS = 60 * 60 * 1000;

async function runSync(names: string[], scope: string): Promise<number> {
  const store = new Store();
  let failures = 0;
  try {
    for (const name of names) {
      const collector = COLLECTORS[name];
      if (!collector) {
        console.error(`unknown collector: ${name} (have: ${Object.keys(COLLECTORS).join(", ")})`);
        failures++;
        continue;
      }
      try {
        const result = await collector.collect(scope === "full" ? undefined : scope);
        const { runId, swept } = store.applyRun(name, scope, result);
        console.log(
          `✓ ${name}: ${result.assets.length} assets, ${result.edges.length} edges ` +
          `(run ${runId}, ${result.complete ? "complete" : "PARTIAL"}${swept ? ", swept" : ""})`,
        );
      } catch (err) {
        // A failed collector writes NOTHING — prior graph state stays intact.
        failures++;
        console.error(`✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(store.exportSnapshot()));
  } finally {
    store.close();
  }
  return failures;
}

/** Consume hint events (from the PostToolUse hook) → targeted syncs. Hints never write facts. */
async function processEvents(): Promise<boolean> {
  if (!existsSync(EVENTS_PATH)) return false;
  const claimed = `${EVENTS_PATH}.processing`;
  renameSync(EVENTS_PATH, claimed); // atomic claim; new hints start a fresh file
  const lines = readFileSync(claimed, "utf8").split("\n").filter(Boolean);
  const sources = new Set<string>();
  for (const line of lines) {
    try {
      const evt = JSON.parse(line) as { source?: string };
      if (evt.source && COLLECTORS[evt.source]) sources.add(evt.source);
    } catch { /* malformed hint = ignored; reconciliation heals */ }
  }
  if (sources.size === 0) return false;
  console.log(`events: ${lines.length} hints → targeted sync of [${[...sources].join(", ")}]`);
  // Targeted scope: full re-collect of the hinted source, but scope != 'full' so it can never sweep.
  await runSync([...sources], "targeted:events");
  return true;
}

function lastFullSyncAt(store: Store): number {
  const row = store.db
    .prepare("SELECT MAX(finished_at) AS t FROM sync_run WHERE scope = 'full' AND status = 'success'")
    .get() as { t: string | null };
  return row.t ? Date.parse(row.t) : 0;
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "sync": {
    const targetedIdx = rest.indexOf("--targeted");
    const scope = targetedIdx >= 0 ? `targeted:${rest[targetedIdx + 1] ?? "manual"}` : "full";
    const names = rest.filter((a, i) => !a.startsWith("--") && (targetedIdx < 0 || i !== targetedIdx + 1));
    process.exit(await runSync(names.length ? names : Object.keys(COLLECTORS), scope));
  }
  case "tick": {
    const handled = await processEvents();
    const store = new Store();
    const due = Date.now() - lastFullSyncAt(store) > FULL_SYNC_INTERVAL_MS;
    store.close();
    if (due) process.exit(await runSync(Object.keys(COLLECTORS), "full"));
    if (!handled) console.log("tick: nothing to do");
    process.exit(0);
  }
  case "status": {
    const store = new Store();
    console.log(JSON.stringify(store.status(), null, 2));
    store.close();
    break;
  }
  case "owns":
  case "blast": {
    const key = rest[0];
    if (!key) { console.error(`usage: atlas ${cmd} <canonical-key>`); process.exit(2); }
    const store = new Store();
    const rows = cmd === "owns" ? store.owns(key) : store.blast(key);
    if (!store.assetByKey(key)) console.error(`⚠️ ${key} not in graph — check the key, or sync first`);
    console.log(JSON.stringify(rows, null, 2));
    console.log(`${rows.length} asset(s). Derived evidence only — confirm against the provider authority API before destructive ops.`);
    store.close();
    break;
  }
  case "exposed": {
    const key = rest[0];
    if (!key) { console.error("usage: atlas exposed <canonical-key>"); process.exit(2); }
    const store = new Store();
    if (!store.assetByKey(key)) console.error(`⚠️ ${key} not in graph — check the key, or sync first`);
    const rows = store.exposed(key).map((r) => {
      let attrs: Record<string, unknown> = {};
      try { attrs = JSON.parse(String(r.attrs ?? "{}")); } catch { /* keep empty */ }
      return { credential: r.display_name, priority: attrs.priority ?? "UNKNOWN", vendor: attrs.vendor ?? "—", dependencies: attrs.dependencies ?? "—" };
    });
    const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "DEFER", "ORPHAN", "UNKNOWN"];
    rows.sort((a, b) => order.indexOf(String(a.priority)) - order.indexOf(String(b.priority)) || String(a.credential).localeCompare(String(b.credential)));
    console.log(JSON.stringify(rows, null, 2));
    const crit = rows.filter((r) => r.priority === "CRITICAL").length;
    console.log(`${rows.length} credential(s) exposed, ${crit} compromise-tier. Rotation order is this list, top down.`);
    console.log("Contain the asset BEFORE rotating — rotating into a live foothold just hands over the new value.");
    store.close();
    break;
  }
  case "stale": {
    const store = new Store();
    console.log(JSON.stringify(store.stale(), null, 2));
    store.close();
    break;
  }
  case "unregistered": {
    const store = new Store();
    console.log(JSON.stringify(store.unregistered(), null, 2));
    store.close();
    break;
  }
  case "sql": {
    const q = rest.join(" ");
    if (!q) { console.error('usage: atlas sql "SELECT ..."'); process.exit(2); }
    const store = new Store(undefined, { readonly: true }); // structurally cannot write
    console.log(JSON.stringify(store.db.prepare(q).all(), null, 2));
    store.close();
    break;
  }
  case "insights": {
    const store = new Store(undefined, { readonly: true });
    console.log(JSON.stringify(store.insights(), null, 2));
    store.close();
    break;
  }
  case "export": {
    const store = new Store();
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(store.exportSnapshot()));
    console.log(`snapshot → ${SNAPSHOT_PATH}`);
    store.close();
    break;
  }
  default:
    console.log("atlas: sync | tick | status | owns <key> | blast <key> | exposed <key> | stale | unregistered | insights | sql | export");
    process.exit(cmd ? 2 : 0);
}
