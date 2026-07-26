/**
 * github adapter — YOUR OWN commit + PR activity, from GitHub.
 *
 * The git adapter only sees commits in a LOCAL `git log`. A lot of real work never
 * lands there: PRs opened with `gh`, commits made through the GitHub API/web, work
 * on a machine other than this one. Those are invisible to git-log but they ARE
 * your activity — this adapter captures them straight from GitHub's per-user event
 * feed so BuildInsight reflects the work you actually did.
 *
 * Auth is delegated entirely to the `gh` CLI (no tokens handled here). `gh` already
 * honors GH_CONFIG_DIR, so when the GitHub account lives under a different OS user
 * than the one running Conduit, point `githubConfigDir` at that account's gh config.
 *
 * One-shot, fault-isolated, and cursor-guarded exactly like the git adapter: a
 * failed feed read emits nothing and does NOT advance the cursor, so no window is
 * ever skipped; the re-scan overlap is de-duped by SHA at rollup.
 */
import { execFileSync } from "node:child_process";
import type { ConduitConfig } from "../config.ts";
import { readState, writeState } from "../store.ts";
import type { ConduitEvent } from "../types.ts";

/** One `gh api` call → parsed JSON, or null on any failure (offline, unauthed, bad JSON). */
function ghApi(bin: string, path: string, cfgDir?: string): unknown {
  try {
    const out = execFileSync(bin, ["api", "-H", "Accept: application/vnd.github+json", path], {
      encoding: "utf8",
      timeout: 15_000,
      env: cfgDir ? { ...process.env, GH_CONFIG_DIR: cfgDir } : process.env,
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export function capture(config: ConduitConfig): ConduitEvent[] {
  const cfgDir = config.githubConfigDir;
  const bin = config.githubCliPath || "gh";

  // Resolve the login: explicit config wins, else ask gh who it's authed as.
  let login = config.githubUser;
  if (!login) {
    const me = ghApi(bin, "user", cfgDir) as { login?: string } | null;
    login = me?.login;
  }
  if (!login) return []; // gh missing / not authed / offline — silent no-op

  const state = readState();
  const since =
    (state.lastGithubPollTs as string) ||
    new Date(Date.now() - config.pollIntervalSec * 2000).toISOString();

  const feed = ghApi(bin, `users/${login}/events?per_page=100`, cfgDir);
  if (!Array.isArray(feed)) return []; // failed read — do NOT advance the cursor

  const events: ConduitEvent[] = [];
  for (const ev of feed as Array<Record<string, any>>) {
    const ts: string | undefined = ev.created_at;
    if (!ts || ts <= since) continue; // only strictly-new events
    const repo: string = ev.repo?.name ?? "";

    if (ev.type === "PushEvent") {
      for (const c of ev.payload?.commits ?? []) {
        if (c.distinct === false) continue; // skip commits already counted on another ref
        events.push({
          ts,
          type: "git-commit",
          source: "github",
          repo,
          detail: { sha: String(c.sha ?? "").slice(0, 10), subject: String(c.message ?? "").split("\n")[0] },
        });
      }
    } else if (ev.type === "PullRequestEvent") {
      const action: string = ev.payload?.action ?? "";
      if (action !== "opened" && action !== "reopened" && action !== "closed") continue;
      const pr = ev.payload?.pull_request ?? {};
      // The per-user events feed ships a MINIMAL pull_request (no title). The head
      // branch name is present and just as descriptive, so use it as the label
      // rather than spending an extra API call per PR to fetch the title.
      const branch = String(pr.head?.ref ?? "");
      events.push({
        ts,
        type: "github-pr",
        source: "github",
        repo,
        detail: {
          number: ev.payload?.number,
          action,
          branch,
          title: String(pr.title ?? branch), // `title` is what BuildInsight reads
        },
      });
    }
  }

  writeState({ lastGithubPollTs: new Date().toISOString() }); // advance only after a clean read
  return events;
}
