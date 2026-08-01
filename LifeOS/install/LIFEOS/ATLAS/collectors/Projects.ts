/**
 * Projects collector — parses PROJECTS.md's main table (deployed/live apps routing table).
 * Observes projects and links them to the domains they serve and repos they deploy from.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

const PROJECTS_PATH = join(homedir(), ".claude/LIFEOS/USER/PROJECTS.md");

const strip = (s: string) => s.replace(/\*\*/g, "").replace(/[🟡🟢🎯🚨⚠️]/gu, "").trim();

export const projects: Collector = {
  name: "projects",
  async collect(): Promise<CollectResult> {
  // Absent source ⇒ degrade, never throw (ratchet gate 3). `atlas sync` runs
  // every collector and turns the failure count into its exit code, so throwing
  // because this machine simply lacks the source makes sync exit non-zero forever
  // on most public installs. A source that EXISTS but is malformed still throws.
    if (!existsSync(PROJECTS_PATH)) return { complete: false, assets: [], edges: [] };
    const md = readFileSync(PROJECTS_PATH, "utf8");
    const assets: AssetObs[] = [];
    const edges: EdgeObs[] = [];

    // Main table only (stop at "## Routing Aliases").
    const main = md.split(/^## Routing Aliases/m)[0];
    const rows = main.split("\n").filter((l) => /^\|/.test(l)).slice(2); // drop header + separator

    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      if (cells.length < 4) continue;
      const name = strip(cells[0].split("(")[0]).replace(/\s+WIP.*$/, "").trim();
      if (!name) continue;
      const key = `project:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      assets.push({ kind: "project", key, name, attrs: { path: strip(cells[1]).slice(0, 200), deploy: strip(cells[3]).slice(0, 120) } });

      // URL column → served domains (skip localhost, ssh hosts, parenthetical notes).
      const urlCell = cells[2] ?? "";
      for (const m of urlCell.matchAll(/([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+)/gi)) {
        const host = m[1].toLowerCase();
        if (host.includes("localhost") || host.endsWith(".lan") || host.startsWith("github.com")) continue;
        if (host === "github.com" || host.endsWith(".workers.dev") === false && !host.includes(".")) continue;
        edges.push({ kind: "SERVES", srcKey: key, dstKey: `domain:${host}`, srcKind: "project", dstKind: "domain" });
      }
      // github.com/owner/repo anywhere in the row → DEPLOYED_FROM.
      for (const m of row.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+)/g)) {
        edges.push({
          kind: "DEPLOYED_FROM",
          srcKey: key,
          dstKey: `github:repo:${m[1]}/${m[2].replace(/\.git$/, "")}`,
          srcKind: "project",
          dstKind: "repo",
        });
      }
    }
    return { complete: true, assets, edges };
  },
};
