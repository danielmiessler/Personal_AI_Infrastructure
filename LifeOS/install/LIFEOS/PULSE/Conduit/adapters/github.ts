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
 * `gh` is resolved from PATH and is never configurable: a config-named binary path
 * turns a config file into an arbitrary-execution surface, and the upside over
 * ambient PATH resolution is nil.
 *
 * One-shot, fault-isolated, and cursor-guarded exactly like the git adapter: a
 * failed feed read emits nothing and does NOT advance the cursor, so no window is
 * ever skipped; the re-scan overlap is de-duped by SHA at rollup.
 *
 * The cursor is NOT advanced here. `capture` is a pure read (feed → events); the
 * caller appends the events and then calls `commitGithubCursor` with the ones that
 * actually landed. That ordering is deliberate: advancing to wall-clock `now` at
 * read time skipped both a downstream append failure's window AND any event caught
 * in GitHub's ~60s feed-cache lag (created before the read, visible only after it).
 * The cursor now advances only to max(created_at) over appended events, so an
 * unseen lagged event is re-scanned next poll rather than jumped over.
 *
 * ported from public PR #1651, @elhoim
 */
import { execFileSync } from "node:child_process";
import type { ConduitConfig } from "../config.ts";
import { readState, writeState } from "../store.ts";
import type { ConduitEvent } from "../types.ts";

/** GitHub's own login rule. Guards the interpolation into the API path below. */
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** One `gh api` call → parsed JSON, or null on any failure (offline, unauthed, bad JSON). */
function ghApi(path: string, cfgDir?: string): unknown {
  try {
    const out = execFileSync("gh", ["api", "-H", "Accept: application/vnd.github+json", path], {
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

  // Resolve the login: explicit config wins, else ask gh who it's authed as.
  let login = config.githubUser;
  if (!login) {
    const me = ghApi("user", cfgDir) as { login?: string } | null;
    login = me?.login;
  }
  if (!login) return []; // gh missing / not authed / offline — silent no-op
  // A login is a path segment; anything outside GitHub's own charset could
  // redirect the call to an unrelated endpoint, so refuse rather than guess.
  if (!LOGIN_RE.test(login)) return [];

  const state = readState();
  const since =
    (state.lastGithubPollTs as string) ||
    new Date(Date.now() - config.pollIntervalSec * 2000).toISOString();

  const feed = ghApi(`users/${login}/events?per_page=100`, cfgDir);
  if (!Array.isArray(feed)) return []; // failed read — do NOT advance the cursor

  // GitHub's per-user feed caps at 100/page and this adapter does not paginate.
  // A full page means events may have been truncated (e.g. a burst after an
  // outage) — surface it instead of silently dropping the overflow.
  if (feed.length >= 100) {
    console.warn(
      `[conduit/github] feed returned a full ${feed.length}-item page for ${login}; ` +
        `events beyond the first page are not captured this poll (no pagination).`,
    );
  }

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
      // The per-user events feed can ship a MINIMAL pull_request (no title). The
      // head branch name is present and just as descriptive, so it stands in as
      // the label rather than spending an extra API call per PR.
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

  return events; // cursor is committed by the caller after the append — see commitGithubCursor
}

/**
 * Persist the poll cursor AFTER the caller has appended `appended`. Advances only
 * to max(created_at) over events that actually landed — never to wall-clock now —
 * so a downstream append failure retries its window next poll, and an event still
 * inside GitHub's feed-cache lag is re-scanned rather than skipped. Empty ⇒ leave
 * the cursor untouched (never jump it forward past events we did not see).
 */
export function commitGithubCursor(appended: ConduitEvent[]): void {
  let max = "";
  for (const e of appended) if (e.ts > max) max = e.ts;
  if (max) writeState({ lastGithubPollTs: max });
}
