/**
 * Gear collector — physical estate from GEAR.md (## section = category, bold-led bullets = items).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AssetObs, CollectResult, Collector } from "../Store";

const GEAR_PATH = join(homedir(), ".claude/LIFEOS/USER/GEAR.md");

export const gear: Collector = {
  name: "gear",
  async collect(): Promise<CollectResult> {
  // Absent source ⇒ degrade, never throw (ratchet gate 3). `atlas sync` runs
  // every collector and turns the failure count into its exit code, so throwing
  // because this machine simply lacks the source makes sync exit non-zero forever
  // on most public installs. A source that EXISTS but is malformed still throws.
    if (!existsSync(GEAR_PATH)) return { complete: false, assets: [], edges: [] };
    const md = readFileSync(GEAR_PATH, "utf8");
    const assets: AssetObs[] = [];
    let category = "uncategorized";
    for (const line of md.split("\n")) {
      const h = line.match(/^##\s+(.+)/);
      if (h) {
        category = h[1].replace(/[^\w\s/&-]/gu, "").trim();
        continue;
      }
      // Items are table rows: | **Item** | Model / Details | Use |
      const row = line.match(/^\|\s*\*\*([^*]+)\*\*\s*\|([^|]+)\|/);
      if (row) {
        const item = row[1].trim();
        const model = row[2].trim();
        if (!item || !model || /^-+$/.test(model)) continue;
        assets.push({
          kind: "device",
          key: `gear:${`${item} ${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}`,
          name: model,
          attrs: { category, role: item },
        });
      }
    }
    return { complete: true, assets, edges: [] };
  },
};
