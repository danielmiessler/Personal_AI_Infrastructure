/**
 * Launchd collector — LifeOS background services (com.lifeos.* / com.pai.*) on this machine.
 * plutil is ALWAYS called with `-o -` (a bare -extract rewrites the plist in place —
 * the 2026-07-10 incident that killed all 15 launchd jobs).
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, hostname } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

const AGENTS_DIR = join(homedir(), "Library/LaunchAgents");

async function plutilRaw(keypath: string, plist: string): Promise<string | null> {
  const proc = Bun.spawn(["plutil", "-extract", keypath, "raw", "-o", "-", plist], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return (await proc.exited) === 0 ? out.trim() : null;
}

export const launchd: Collector = {
  name: "launchd",
  async collect(): Promise<CollectResult> {
    const host = hostname();
    const machineKey = `machine:${host}`;
    const assets: AssetObs[] = [{ kind: "machine", key: machineKey, name: host }];
    const edges: EdgeObs[] = [];

  // Absent source ⇒ degrade, never throw (ratchet gate 3). `atlas sync` runs
  // every collector and turns the failure count into its exit code, so throwing
  // because this machine simply lacks the source makes sync exit non-zero forever
  // on most public installs. A source that EXISTS but is malformed still throws.
    if (!existsSync(AGENTS_DIR)) return { complete: false, assets: [], edges: [] };
    const plists = readdirSync(AGENTS_DIR).filter((f) => /^com\.(lifeos|pai)\..*\.plist$/.test(f));
    for (const f of plists) {
      const path = join(AGENTS_DIR, f);
      const label = (await plutilRaw("Label", path)) ?? f.replace(/\.plist$/, "");
      const interval = await plutilRaw("StartInterval", path);
      assets.push({
        kind: "service",
        key: `service:${label}`,
        name: label,
        attrs: { plist: f, start_interval: interval ? Number(interval) : null },
      });
      edges.push({ kind: "RUNS_ON", srcKey: `service:${label}`, dstKey: machineKey, srcKind: "service", dstKind: "machine" });
    }
    return { complete: true, assets, edges };
  },
};
