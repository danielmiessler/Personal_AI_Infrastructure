/**
 * Infra-inventory collector — observes the security scanner's curated target list.
 * Atlas OBSERVES infra-inventory.ts; it never replaces it (Anti-claim A4).
 * A MONITORS edge from a target to a domain is what `atlas unregistered` keys off.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

const INVENTORY = join(homedir(), ".claude/LIFEOS/USER/CUSTOMIZATIONS/ARBOL/Shared/infra-inventory.ts");

export const infraInventory: Collector = {
  name: "infra-inventory",
  async collect(): Promise<CollectResult> {
  // Absent source ⇒ degrade, never throw (ratchet gate 3). `atlas sync` runs
  // every collector and turns the failure count into its exit code, so throwing
  // because this machine simply lacks the source makes sync exit non-zero forever
  // on most public installs. A source that EXISTS but is malformed still throws.
    // INVENTORY lives in the private USER/CUSTOMIZATIONS tree, which release
    // tooling strips — exactly the shape of the original `secrets` finding.
    if (!existsSync(INVENTORY)) return { complete: false, assets: [], edges: [] };
    const mod = (await import(INVENTORY)) as { TARGETS: Array<Record<string, unknown>> };
    const assets: AssetObs[] = [];
    const edges: EdgeObs[] = [];

    assets.push({ kind: "system", key: "system:security-plane", name: "Bunker Security plane (Arbol scanner)" });

    for (const t of mod.TARGETS) {
      const name = String(t.name);
      const domain = String(t.domain);
      const key = `target:${name}`;
      assets.push({
        kind: "target",
        key,
        name,
        attrs: {
          type: t.type,
          source: t.source ?? "curated",
          protected_paths: (t.protectedPaths as string[] | undefined)?.length ?? 0,
          multi_tenant: t.multiTenant ?? false,
        },
      });
      edges.push({ kind: "MONITORS", srcKey: key, dstKey: `domain:${domain}`, srcKind: "target", dstKind: "domain" });
      edges.push({ kind: "REGISTERED_IN", srcKey: key, dstKey: "system:security-plane", srcKind: "target", dstKind: "system" });
    }
    return { complete: true, assets, edges };
  },
};
