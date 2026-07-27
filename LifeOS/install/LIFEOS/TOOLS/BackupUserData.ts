#!/usr/bin/env bun
/**
 * BackupUserData.ts — mirror the USER tree to its private GitHub repo.
 *
 * The USER tree (`~/.config/LIFEOS/USER`, mounted as `~/.claude/LIFEOS/USER`) is the
 * principal's life-state: identity, TELOS, projects, operational rules, Conduit history.
 * `Config/ConfigSystem.md` § Two-repo sync specifies it as its own PRIVATE GitHub repo.
 * This tool is the recurring half of that mechanism: it checks for changes, commits them,
 * and pushes — designed to run unattended from cron.
 *
 * Guarantees (each is an ISC in MEMORY/WORK/20260727-083500_user-data-github-backup/ISA.md):
 *   - Never pushes to a remote it cannot confirm is PRIVATE (fails closed).
 *   - Never pushes to the public LifeOS repo.
 *   - Never commits recognizable secret material.
 *   - Never runs twice concurrently (exclusive lock).
 *   - No-ops silently when nothing changed.
 *
 * Usage:
 *   bun BackupUserData.ts                          # the hourly path
 *   bun BackupUserData.ts --dry-run                # stage + scan, no commit/push
 *   bun BackupUserData.ts --check-remote <url>     # test the public-repo guard
 *   bun BackupUserData.ts --check-visibility <o/r> # test the privacy gate
 *
 * Environment:
 *   LIFEOS_USER_DIR   override the USER tree location
 *   LIFEOS_GH_BIN     GitHub CLI binary/wrapper to use for the privacy check (default: gh)
 */

import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, statSync, unlinkSync, writeSync } from "fs"
import { dirname, join } from "path"
import { homedir } from "os"

const HOME = process.env.HOME ?? homedir()
const GH_BIN = process.env.LIFEOS_GH_BIN ?? "gh"
const LOG_PATH = join(HOME, ".claude", "LIFEOS", "MEMORY", "OBSERVABILITY", "user-backup.jsonl")
const LOCK_STALE_MS = 30 * 60 * 1000
const MAX_SCAN_BYTES = 1_000_000

/** Patterns that must never reach the mirror, private repo or not. */
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["private-key-block", /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["openai-key", /\bsk-[A-Za-z0-9_-]{32,}/],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{32,}/],
  ["slack-token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["google-key", /\bAIza[0-9A-Za-z_-]{35}/],
  ["aws-key-id", /\bAKIA[0-9A-Z]{16}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./],
]

type RunResult = { code: number; stdout: string; stderr: string }

function run(cmd: string[], cwd?: string): RunResult {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" })
  return {
    code: p.exitCode ?? 1,
    stdout: new TextDecoder().decode(p.stdout).trim(),
    stderr: new TextDecoder().decode(p.stderr).trim(),
  }
}

function log(event: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), tool: "BackupUserData", ...event })
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true })
    appendFileSync(LOG_PATH, line + "\n")
  } catch {
    /* logging must never be the reason a backup fails */
  }
  console.log(line)
}

function die(status: string, message: string, extra: Record<string, unknown> = {}): never {
  log({ status, message, ...extra })
  process.exit(1)
}

/** The USER tree, following the symlink the live tree mounts it through. */
function resolveUserDir(): string {
  const override = process.env.LIFEOS_USER_DIR
  if (override) return override
  const mounted = join(HOME, ".claude", "LIFEOS", "USER")
  try {
    return realpathSync(mounted)
  } catch {
    return join(HOME, ".config", "LIFEOS", "USER")
  }
}

/**
 * Reject remotes that are, or could be, the public LifeOS repo. The mirror is for the two
 * private repos only; public release goes through the shadow-release pipeline instead.
 */
function remoteIsForbidden(url: string): { forbidden: boolean; reason?: string } {
  const slug = url
    .replace(/\.git$/, "")
    .replace(/^git@[^:]+:/, "")
    .replace(/^(?:https?|ssh):\/\/[^/]+\//, "")
  const [owner, repo] = slug.split("/")
  if (!owner || !repo) return { forbidden: true, reason: `cannot parse owner/repo from remote "${url}"` }
  if (/^lifeos$/i.test(repo)) return { forbidden: true, reason: `remote repo is named "${repo}" — that is the LifeOS distribution repo, not a USER-data mirror` }
  if (/^danielmiessler$/i.test(owner)) return { forbidden: true, reason: `remote owner "${owner}" is the public LifeOS upstream` }
  return { forbidden: false }
}

function remoteSlug(url: string): string {
  return url
    .replace(/\.git$/, "")
    .replace(/^git@[^:]+:/, "")
    .replace(/^(?:https?|ssh):\/\/[^/]+\//, "")
}

/** Fails closed: anything other than a confirmed PRIVATE answer blocks the push. */
function assertPrivate(slug: string): { ok: boolean; visibility: string; detail?: string } {
  const res = run([GH_BIN, "repo", "view", slug, "--json", "visibility,isPrivate"])
  if (res.code !== 0) return { ok: false, visibility: "unknown", detail: res.stderr || res.stdout }
  try {
    const parsed = JSON.parse(res.stdout) as { visibility?: string; isPrivate?: boolean }
    const visibility = parsed.visibility ?? "unknown"
    return { ok: parsed.isPrivate === true && visibility.toUpperCase() === "PRIVATE", visibility }
  } catch {
    return { ok: false, visibility: "unparseable", detail: res.stdout.slice(0, 200) }
  }
}

function scanStagedForSecrets(userDir: string): Array<{ file: string; pattern: string }> {
  const staged = run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"], userDir)
  if (staged.code !== 0 || !staged.stdout) return []
  const hits: Array<{ file: string; pattern: string }> = []
  for (const rel of staged.stdout.split("\n").filter(Boolean)) {
    const abs = join(userDir, rel)
    try {
      if (statSync(abs).size > MAX_SCAN_BYTES) continue
      const text = readFileSync(abs, "utf-8")
      for (const [name, re] of SECRET_PATTERNS) {
        if (re.test(text)) hits.push({ file: rel, pattern: name })
      }
    } catch {
      /* unreadable or binary — nothing to scan */
    }
  }
  return hits
}

function acquireLock(userDir: string): string {
  const lockPath = join(userDir, ".git", "lifeos-backup.lock")
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, "wx")
      writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`)
      closeSync(fd)
      return lockPath
    } catch {
      let ageMs = 0
      try {
        ageMs = Date.now() - statSync(lockPath).mtimeMs
      } catch {
        continue // lock vanished between attempts — retry
      }
      if (ageMs > LOCK_STALE_MS) {
        try {
          unlinkSync(lockPath)
        } catch {
          /* someone else cleaned it */
        }
        continue
      }
      log({ status: "locked", message: `another backup is running (lock age ${Math.round(ageMs / 1000)}s)` })
      process.exit(0)
    }
  }
  die("lock-failed", "could not acquire the backup lock")
}

function main(): void {
  const args = process.argv.slice(2)

  // --check-remote: exercise the public-repo guard without touching the repo.
  const remoteIdx = args.indexOf("--check-remote")
  if (remoteIdx !== -1) {
    const url = args[remoteIdx + 1] ?? ""
    const verdict = remoteIsForbidden(url)
    console.log(JSON.stringify({ url, ...verdict }))
    process.exit(verdict.forbidden ? 1 : 0)
  }

  // --check-visibility: exercise the privacy gate against an arbitrary repo.
  const visIdx = args.indexOf("--check-visibility")
  if (visIdx !== -1) {
    const slug = args[visIdx + 1] ?? ""
    const verdict = assertPrivate(slug)
    console.log(JSON.stringify({ slug, ...verdict }))
    process.exit(verdict.ok ? 0 : 1)
  }

  const dryRun = args.includes("--dry-run")
  const userDir = resolveUserDir()

  if (!existsSync(join(userDir, ".git"))) die("not-a-repo", `${userDir} is not a git repository`)

  const remote = run(["git", "remote", "get-url", "origin"], userDir)
  if (remote.code !== 0) die("no-remote", `no "origin" remote in ${userDir}`, { detail: remote.stderr })

  const forbidden = remoteIsForbidden(remote.stdout)
  if (forbidden.forbidden) die("forbidden-remote", forbidden.reason ?? "remote rejected")

  const slug = remoteSlug(remote.stdout)
  const privacy = assertPrivate(slug)
  if (!privacy.ok) {
    die("privacy-unconfirmed", `refusing to push: ${slug} is not confirmed PRIVATE (visibility=${privacy.visibility})`, {
      detail: privacy.detail,
    })
  }

  const lockPath = acquireLock(userDir)
  try {
    const branch = run(["git", "symbolic-ref", "--short", "HEAD"], userDir).stdout || "main"
    const dirty = run(["git", "status", "--porcelain"], userDir)
    if (dirty.code !== 0) die("status-failed", "git status failed", { detail: dirty.stderr })

    // Unpushed commits from a previously failed push still need a push, even with a clean tree.
    const ahead = run(["git", "rev-list", "--count", `origin/${branch}..HEAD`], userDir)
    const unpushed = ahead.code === 0 ? parseInt(ahead.stdout || "0", 10) : 0

    if (!dirty.stdout && unpushed === 0) {
      log({ status: "noop", message: "no changes", repo: slug, branch })
      return
    }

    let committed = 0
    if (dirty.stdout) {
      const add = run(["git", "add", "-A"], userDir)
      if (add.code !== 0) die("add-failed", "git add failed", { detail: add.stderr })

      const secrets = scanStagedForSecrets(userDir)
      if (secrets.length > 0) {
        run(["git", "reset"], userDir)
        die("secret-detected", `refusing to commit: ${secrets.length} secret pattern hit(s)`, { hits: secrets })
      }

      const files = run(["git", "diff", "--cached", "--name-only"], userDir).stdout.split("\n").filter(Boolean)
      committed = files.length
      if (dryRun) {
        log({ status: "dry-run", message: `${committed} file(s) would be committed`, repo: slug, branch, files: files.slice(0, 20) })
        run(["git", "reset"], userDir)
        return
      }

      const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
      const commit = run(["git", "commit", "-m", `backup: USER tree ${stamp} (${committed} file${committed === 1 ? "" : "s"})`], userDir)
      if (commit.code !== 0) die("commit-failed", "git commit failed", { detail: commit.stderr || commit.stdout })
    }

    if (dryRun) {
      log({ status: "dry-run", message: `${unpushed} unpushed commit(s) would be pushed`, repo: slug, branch })
      return
    }

    const push = run(["git", "push", "origin", branch], userDir)
    if (push.code !== 0) die("push-failed", "git push failed", { detail: push.stderr || push.stdout, repo: slug, branch })

    const localHead = run(["git", "rev-parse", "HEAD"], userDir).stdout
    const remoteHead = run(["git", "rev-parse", `origin/${branch}`], userDir).stdout
    if (localHead !== remoteHead) {
      die("push-unverified", "push reported success but local and remote HEAD differ", { localHead, remoteHead, repo: slug, branch })
    }

    log({ status: "pushed", message: `${committed} file(s) backed up`, repo: slug, branch, head: localHead })
  } finally {
    try {
      unlinkSync(lockPath)
    } catch {
      /* already gone */
    }
  }
}

main()
