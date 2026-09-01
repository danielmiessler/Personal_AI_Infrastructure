/**
 * Docker collector — containers on this machine's Docker daemon.
 *
 * Two calls: `docker ps -aq` enumerates ALL container IDs (running or not),
 * then one `docker inspect` over the batch returns canonical JSON — no
 * `--format` templates, whose field names drift across Docker versions.
 * Containers are keyed by NAME, not ID: a recreate (compose up, image
 * upgrade) rotates the ID but keeps the name, and keying by ID would churn
 * a fresh asset per recreate — same reason Launchd.ts keys on Label.
 */

import { hostname } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

type RawContainer = {
  Id: string;
  Name: string;
  Created: string;
  State: { Status: string; Running: boolean; StartedAt: string };
  HostConfig: { RestartPolicy?: { Name?: string } };
  Config: { Image: string; Labels?: Record<string, string> | null };
  NetworkSettings: {
    Ports?: Record<string, Array<{ HostIp: string; HostPort: string }> | null> | null;
    Networks?: Record<string, unknown> | null;
  };
  Mounts?: Array<{ Type?: string; Destination?: string }>;
};

// Absent source ⇒ degrade, never throw (ratchet gate 3, same class as a
// missing `gh` in Github.ts). Docker not installed, or installed with the
// daemon stopped, are both normal states on most machines — throwing would
// make `atlas sync` exit non-zero forever on every install without Docker.
const DEGRADED: CollectResult = { complete: false, assets: [], edges: [] };

async function run(args: string[]): Promise<{ code: number; out: string } | null> {
  try {
    const proc = Bun.spawn(["docker", ...args], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { code, out };
  } catch {
    return null; // ENOENT — docker CLI not installed
  }
}

/** "5432/tcp" → ["0.0.0.0:5432->5432/tcp", ...]; exposed-but-unpublished ports stay as "5432/tcp". */
function portStrings(ports: RawContainer["NetworkSettings"]["Ports"]): string[] {
  const result: string[] = [];
  for (const [containerPort, bindings] of Object.entries(ports ?? {})) {
    if (!bindings || bindings.length === 0) result.push(containerPort);
    else for (const b of bindings) result.push(`${b.HostIp}:${b.HostPort}->${containerPort}`);
  }
  return result;
}

export const docker: Collector = {
  name: "docker",
  async collect(): Promise<CollectResult> {
    const ls = await run(["ps", "-aq", "--no-trunc"]);
    // null = CLI absent; non-zero = daemon not running/reachable. Both normal.
    if (ls === null || ls.code !== 0) return DEGRADED;
    const ids = ls.out.split("\n").map((l) => l.trim()).filter(Boolean);

    const host = hostname();
    const machineKey = `machine:${host}`;
    const assets: AssetObs[] = [{ kind: "machine", key: machineKey, name: host }];
    const edges: EdgeObs[] = [];
    if (ids.length === 0) return { complete: true, assets, edges };

    const inspect = await run(["inspect", ...ids]);
    if (inspect === null) return DEGRADED;
    let raw: RawContainer[];
    try {
      raw = JSON.parse(inspect.out) as RawContainer[];
    } catch (error) {
      if (inspect.code !== 0) return DEGRADED; // daemon died mid-run — no usable output
      // Zero exit with unparseable output is a schema regression, not an
      // absent source — throw so it surfaces instead of silently under-counting.
      throw new Error(`docker inspect exited 0 but returned unparseable output (contract regression?): ${(error as Error).message}`);
    }
    // Non-zero inspect exit with parseable output = some containers vanished
    // between ps and inspect (normal churn). Keep what came back, never sweep.
    const complete = inspect.code === 0;

    for (const c of raw) {
      const name = c.Name.replace(/^\//, "");
      const key = `docker:container:${name}`;
      assets.push({
        kind: "container",
        key,
        name,
        attrs: {
          id: c.Id.slice(0, 12),
          image: c.Config.Image,
          state: c.State.Status,
          running: c.State.Running,
          created_at: c.Created,
          // Docker stamps never-started containers with a year-1 sentinel.
          started_at: c.State.StartedAt?.startsWith("0001-") ? null : c.State.StartedAt,
          restart_policy: c.HostConfig.RestartPolicy?.Name || "no",
          ports: portStrings(c.NetworkSettings.Ports),
          networks: Object.keys(c.NetworkSettings.Networks ?? {}),
          // Destinations only — bind-mount sources are host paths and don't
          // belong in the exported snapshot.
          mounts: (c.Mounts ?? []).map((m) => `${m.Type ?? "?"}:${m.Destination ?? "?"}`),
          compose_project: c.Config.Labels?.["com.docker.compose.project"] ?? null,
        },
      });
      edges.push({ kind: "RUNS_ON", srcKey: key, dstKey: machineKey, srcKind: "container", dstKind: "machine" });
    }
    return { complete, assets, edges };
  },
};
