/**
 * GitHub collector — repos via the gh CLI (already authenticated on this machine).
 */

import type { CollectResult, Collector } from "../Store";

export const github: Collector = {
  name: "github",
  async collect(): Promise<CollectResult> {
    // Absent source ⇒ degrade, never throw (ratchet gate 3, from the v7.15.0
    // Forge finding on the `secrets` collector). `atlas sync` runs every
    // collector and turns the failure count into its exit code, so throwing
    // because `gh` is missing or unauthenticated makes sync exit non-zero
    // forever on any machine without an authenticated gh — most public
    // installs. Absent/unusable tool is a normal state here, not a fault.
    // A PRESENT and working gh that returns garbage is still a fault, but
    // there is no way to tell that apart from "not logged in" at this layer,
    // so incompleteness is reported rather than raised: `complete: false`
    // keeps the sweeper from deleting real assets on an empty read.
    const DEGRADED: CollectResult = { complete: false, assets: [], edges: [] };
    let out: string;
    try {
      const proc = Bun.spawn(
        ["gh", "repo", "list", "--limit", "300", "--json", "name,owner,url,visibility,isArchived,pushedAt"],
        { stdout: "pipe", stderr: "pipe" },
      );
      out = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code !== 0) return DEGRADED; // gh present but unusable: not logged in, API down
    } catch {
      return DEGRADED; // ENOENT — gh not installed
    }
    // Zero exit with nothing to say is still the absent-source class.
    if (out.trim() === "") return DEGRADED;
    // But zero exit with output we cannot parse is NOT: gh ran, succeeded, and
    // returned something unexpected, which means its contract changed or our
    // query is wrong. Degrading here would convert a schema regression into
    // permanent silent incompleteness — `complete: false` stops the sweeper, so
    // nothing is deleted and nothing complains, and the graph just quietly stops
    // tracking repos. That is worse than a loud failure, so this one throws.
    let repos: Array<{
      name: string; owner: { login: string }; url: string; visibility: string; isArchived: boolean; pushedAt: string;
    }>;
    try {
      repos = JSON.parse(out) as typeof repos;
    } catch (error) {
      throw new Error(`gh repo list exited 0 but returned unparseable output (contract regression?): ${(error as Error).message}`);
    }
    return {
      complete: repos.length < 300, // 300 hits the limit → possibly truncated → never sweep on it
      assets: repos.map((r) => ({
        kind: "repo",
        key: `github:repo:${r.owner.login}/${r.name}`,
        name: `${r.owner.login}/${r.name}`,
        attrs: { url: r.url, visibility: r.visibility.toLowerCase(), archived: r.isArchived, pushed_at: r.pushedAt },
      })),
      edges: [],
    };
  },
};
