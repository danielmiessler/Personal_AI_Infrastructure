#!/usr/bin/env bun
/**
 * @version 1.0.3
 * PublicPushGate.hook.ts — PreToolUse:Bash lane of PreToolGuard.
 *
 * The gap this closes (2026-08): the release pipeline has 23 gates, but
 * ad-hoc public repos had zero deterministic scrub — a session could create
 * and push a public repo gated only by a self-written grep. This lane is the
 * zero → one fix: no Bash-driven push to a PUBLIC GitHub repo, and no
 * `gh repo create --public` / `gh repo edit --visibility public`, proceeds
 * until the repo's HEAD tree AND reachable history pass a deny-scan.
 *
 * Patterns: LIFEOS/USER/SECURITY/PublicScrubPatterns.txt (private, one
 * case-insensitive ERE per line, # comments). Generic secret signatures are
 * built in so the gate still bites on installs without a pattern file.
 *
 * Fail policy (mirrors EgressClassGuard's shape):
 *   - not push-shaped / non-GitHub remote / visibility UNDETERMINED → allow
 *     (fail-OPEN: never brick every push while offline)
 *   - destination CONFIRMED public → scan must complete clean; a scan error
 *     or any hit blocks (fail-CLOSED once the dangerous fact is confirmed)
 * Visibility is cached 24h in MEMORY/STATE/public-push-gate.json; a repo
 * flipped public mid-cache is caught by the `gh repo edit` trigger itself.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const HOME = process.env.HOME ?? homedir();
const PATTERN_FILE = join(HOME, ".claude/LIFEOS/USER/SECURITY/PublicScrubPatterns.txt");
const CACHE_FILE = join(HOME, ".claude/LIFEOS/MEMORY/STATE/public-push-gate.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_SCAN_MAX_COMMITS = 400;

// Shippable generic secret signatures — never personal, never rot.
const GENERIC_PATTERNS = [
  "sk-ant-[A-Za-z0-9_-]{10}",
  "ghp_[A-Za-z0-9]{20}",
  "github_pat_[A-Za-z0-9_]{20}",
  "AKIA[0-9A-Z]{16}",
  "xox[bpars]-[A-Za-z0-9-]{10}",
  "-----BEGIN [A-Z ]*PRIVATE KEY-----",
];

type BlockResult = { block: true; message: string } | null;

function sh(cmd: string[], cwd?: string): { ok: boolean; out: string } {
  try {
    const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
    return { ok: r.exitCode === 0, out: new TextDecoder().decode(r.stdout).trim() };
  } catch {
    return { ok: false, out: "" };
  }
}

function loadPatterns(): string[] {
  const patterns = [...GENERIC_PATTERNS];
  try {
    if (existsSync(PATTERN_FILE)) {
      for (const line of readFileSync(PATTERN_FILE, "utf-8").split("\n")) {
        const t = line.trim();
        if (t && !t.startsWith("#")) patterns.push(t);
      }
    }
  } catch {
    /* generic set still applies */
  }
  return patterns;
}

/** Extract the repo working dir the command operates in. */
export function repoDirFor(command: string, cwd: string | undefined): string {
  const dashC = /\bgit\s+-C\s+([^\s;|&]+)/.exec(command);
  const cd = /(?:^|&&|;)\s*cd\s+([^\s;|&]+)/.exec(command);
  let dir = dashC?.[1] ?? cd?.[1] ?? cwd ?? process.cwd();
  dir = dir.replace(/^["']|["']$/g, "");
  if (dir.startsWith("~/")) dir = join(HOME, dir.slice(2));
  if (dir.startsWith("$HOME/")) dir = join(HOME, dir.slice(6));
  // Unexpanded shell vars or vanished paths: fall back to the session cwd so the
  // scan runs somewhere real (a bad cwd would fail-closed for the wrong reason).
  if (dir.includes("$") || !existsSync(dir)) dir = cwd ?? process.cwd();
  return dir;
}

/** owner/repo from the push remote's URL, GitHub only. */
function githubSlug(dir: string, command: string): string | null {
  const remoteArg = /\bgit\b[^\n]*\bpush\b\s+(?:-[^\s]+\s+)*([A-Za-z][A-Za-z0-9_-]*)\b/.exec(command);
  const remote = remoteArg?.[1] ?? "origin";
  const { ok, out } = sh(["git", "remote", "get-url", remote], dir);
  const url = ok ? out : sh(["git", "remote", "get-url", "origin"], dir).out;
  const m = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(url);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** "public" | "private" | "unknown", with a 24h cache. */
function visibility(slug: string): string {
  let cache: Record<string, { v: string; ts: number }> = {};
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch { /* fresh cache */ }
  const hit = cache[slug];
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.v;
  const { ok, out } = sh(["gh", "api", `repos/${slug}`, "--jq", ".visibility"]);
  const v = ok && (out === "public" || out === "private" || out === "internal") ? out : "unknown";
  if (v !== "unknown") {
    try {
      cache[slug] = { v, ts: Date.now() };
      mkdirSync(dirname(CACHE_FILE), { recursive: true });
      writeFileSync(CACHE_FILE, JSON.stringify(cache));
    } catch { /* cache is best-effort */ }
  }
  return v;
}

/** Deny-scan HEAD tree + reachable history. Returns matches or null; throws on scan failure. */
function scan(dir: string, patterns: string[]): string | null {
  const args = patterns.flatMap((p) => ["-e", p]);
  const head = Bun.spawnSync(["git", "grep", "-I", "-i", "-n", "-E", ...args, "HEAD"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
  // git grep: 0 = matches, 1 = clean, >1 = error
  if (head.exitCode > 1) throw new Error("HEAD scan failed");
  if (head.exitCode === 0) return new TextDecoder().decode(head.stdout).slice(0, 1500);
  // Local branches + tags only: that is what a push can ship. Remote-tracking
  // refs would keep a scrubbed-then-rewritten repo permanently blocked — the
  // gate must never refuse the remediation path it demands.
  const count = sh(["git", "rev-list", "--count", "--branches", "--tags"], dir);
  if (!count.ok) throw new Error("rev-list failed");
  if (parseInt(count.out, 10) <= HISTORY_SCAN_MAX_COMMITS) {
    const revs = sh(["git", "rev-list", "--branches", "--tags"], dir);
    if (!revs.ok) throw new Error("rev-list failed");
    const hist = Bun.spawnSync(["git", "grep", "-I", "-i", "-n", "-E", ...args, ...revs.out.split("\n").filter(Boolean)], { cwd: dir, stdout: "pipe", stderr: "pipe" });
    if (hist.exitCode > 1) throw new Error("history scan failed");
    if (hist.exitCode === 0) return "IN HISTORY (older commit blobs):\n" + new TextDecoder().decode(hist.stdout).slice(0, 1500);
  }
  return null;
}

export function check(input: any): BlockResult {
  const command = input?.tool_input?.command;
  if (typeof command !== "string") return null;

  const isPush = /\bgit\b[^\n]*\bpush\b/.test(command);
  const isCreatePublic = /\bgh\s+repo\s+create\b[^\n]*--public\b/.test(command);
  const isFlipPublic = /\bgh\s+repo\s+edit\b[^\n]*--visibility[= ]+public\b/.test(command);
  if (!isPush && !isCreatePublic && !isFlipPublic) return null;

  const dir = repoDirFor(command, input?.cwd);
  let confirmedPublic = isCreatePublic || isFlipPublic;

  if (isPush && !confirmedPublic) {
    const slug = githubSlug(dir, command);
    if (!slug) return null; // non-GitHub / unresolvable → fail-open
    const v = visibility(slug);
    if (v === "private" || v === "internal") return null;
    if (v === "unknown") return null; // offline → fail-open, release gates remain the backstop
    confirmedPublic = true;
  }

  // Destination is public (or becoming public): the scan must complete clean.
  try {
    const hits = scan(dir, loadPatterns());
    if (hits) {
      return {
        block: true,
        message:
          `[PublicPushGate] BLOCKED: this repo's destination is PUBLIC and the deny-scan hit.\n${hits}\n` +
          `Fix the content (and history if flagged) before pushing. Patterns: LIFEOS/USER/SECURITY/PublicScrubPatterns.txt (private). Never quote patterns into scannable artifacts.\n`,
      };
    }
  } catch (err) {
    return {
      block: true,
      message: `[PublicPushGate] BLOCKED: destination is PUBLIC but the deny-scan could not complete (${err}). A public push without a completed scan is exactly the gap this gate exists to close; fix the scan, then push.\n`,
    };
  }
  return null;
}

if (import.meta.main) {
  const input = JSON.parse(readFileSync(0, "utf-8"));
  const r = check(input);
  if (r?.block) {
    process.stderr.write(r.message);
    process.exit(2);
  }
  process.exit(0);
}
