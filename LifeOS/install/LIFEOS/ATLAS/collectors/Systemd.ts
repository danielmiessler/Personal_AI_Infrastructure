/**
 * Systemd collector — LifeOS background services (com.lifeos.* / com.pai.*) on this
 * machine, Linux sibling of Launchd.ts (which degrades harmlessly here since
 * ~/Library/LaunchAgents never exists on Linux). Reads unit files directly —
 * no `systemctl show` shelling per unit, since OnUnitActiveSec/OnBootSec are
 * plain text in the .timer file and this stays a pure fs read like Launchd's
 * plutil calls, just without the subprocess.
 *
 * ported from public PR #1743, @schmetti-dev
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, hostname } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

const UNITS_DIR = join(homedir(), ".config/systemd/user");

/** First `Key=value` match for `key` inside `[section]`, or null. Plain unit-file INI, no subprocess. */
function unitValue(text: string, section: string, key: string): string | null {
  const secMatch = text.match(new RegExp(`\\[${section}\\][^\\[]*`));
  if (!secMatch) return null;
  const m = secMatch[0].match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
}

/**
 * systemd time-span → seconds. Handles the shapes the LifeOS unit templates
 * actually emit ("3600", "60min", "1h", "30s") — not the full grammar.
 */
function parseDuration(s: string): number | null {
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(\d+)\s*(s|min|h)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "h" ? n * 3600 : m[2] === "min" ? n * 60 : n;
}

export const systemd: Collector = {
  name: "systemd",
  async collect(): Promise<CollectResult> {
    const host = hostname();
    const machineKey = `machine:${host}`;
    const assets: AssetObs[] = [{ kind: "machine", key: machineKey, name: host }];
    const edges: EdgeObs[] = [];

    // Absent source ⇒ degrade, never throw (ratchet gate 3, same as Launchd.ts) —
    // a machine without this dir (macOS, or a fresh Linux box pre-install) reports
    // incompleteness rather than a permanent sync failure.
    if (!existsSync(UNITS_DIR)) return { complete: false, assets: [], edges: [] };
    const files = readdirSync(UNITS_DIR).filter((f) => /^com\.(lifeos|pai)\..*\.(service|timer)$/.test(f));
    // Group by label (strip .service/.timer) so a paired unit reports one asset
    // with both its schedule (from the .timer) and its exec (from the .service).
    const labels = new Map<string, { service?: string; timer?: string }>();
    for (const f of files) {
      const isTimer = f.endsWith(".timer");
      const label = f.replace(/\.(service|timer)$/, "");
      const entry = labels.get(label) ?? {};
      if (isTimer) entry.timer = f; else entry.service = f;
      labels.set(label, entry);
    }

    for (const [label, { service, timer }] of labels) {
      let onUnitActiveSec: number | null = null;
      let onBootSec: string | null = null;
      let persistent = false;
      if (timer) {
        const text = readFileSync(join(UNITS_DIR, timer), "utf8");
        const active = unitValue(text, "Timer", "OnUnitActiveSec");
        onUnitActiveSec = active ? parseDuration(active) : null;
        onBootSec = unitValue(text, "Timer", "OnBootSec");
        persistent = unitValue(text, "Timer", "Persistent") === "true";
      }
      assets.push({
        kind: "service",
        key: `service:${label}`,
        name: label,
        attrs: {
          service_unit: service ?? null,
          timer_unit: timer ?? null,
          on_unit_active_sec: onUnitActiveSec,
          on_boot_sec: onBootSec,
          persistent,
          backend: "systemd",
        },
      });
      edges.push({ kind: "RUNS_ON", srcKey: `service:${label}`, dstKey: machineKey, srcKind: "service", dstKind: "machine" });
    }
    return { complete: true, assets, edges };
  },
};
