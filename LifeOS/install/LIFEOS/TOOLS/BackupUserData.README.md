# BackupUserData — hourly USER-tree backup to a private GitHub repo

> Companion to `LIFEOS/TOOLS/BackupUserData.ts`. This is the recurring half of the
> two-repo sync specified in `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md`.

## What it backs up, and what it doesn't

The USER tree — `~/.config/LIFEOS/USER`, mounted into the live tree as the symlink
`~/.claude/LIFEOS/USER` — is the principal's life-state: identity, DA identity, TELOS,
projects, operational rules, Conduit history, work config. It is the half of LifeOS that is
*yours*, and the half `BackupBeforeUpgrade.sh` deliberately does **not** capture (that
script archives the SYSTEM tree and stores `LIFEOS/USER` as a bare symlink entry).

Excluded by `.gitignore` in the USER tree:

- **Secrets** — `.env*`, `*.pem`, `*.key`, key material, `CONFIG/CREDENTIALS/*`. Credentials
  live in `~/.claude/.env` by design and are never mirrored, private repo or not.
- **Regenerable caches** — `CACHE/`, `*-cache.json`, `*-cache.txt`.
- **Noise** — `node_modules/`, editor swap files.

## How it runs

An hourly user crontab entry (`17 * * * *`) invokes the tool. It checks for changes,
commits them, and pushes. When nothing changed it exits `0` with `status=noop` and creates
no commit, so the repo history is a record of real change, not of the clock.

> **Scheduling is Linux-only.** The tool itself is platform-neutral: it shells out to `git`
> and the GitHub CLI and nothing else. The *schedule* below is a Linux user crontab, and
> that is the only scheduler this has been verified on. On macOS, cron is deprecated in
> favour of `launchd`; wrap the same command in a `launchd` agent (see
> `com.lifeos.pulse.plist` for the shape LifeOS already uses) rather than assuming the
> crontab path works.

```
SHELL=/bin/sh
PATH=/usr/bin:/bin
LIFEOS_GH_BIN=<absolute path to your gh binary or wrapper>
17 * * * * <absolute path to bun> <absolute path to>/BackupUserData.ts >/dev/null 2>><logdir>/user-backup.err.log
```

Absolute paths are required: cron's environment has neither the login `PATH` nor the shell
profile. `LIFEOS_GH_BIN` exists because the GitHub CLI may be a wrapper rather than a plain
`gh` on `PATH` (e.g. when LifeOS runs as a system user distinct from the principal's own
account, bridging to the principal's `gh` config via `GH_CONFIG_DIR`).

Every run appends one JSON line to `LIFEOS/MEMORY/OBSERVABILITY/user-backup.jsonl` with a
`status` of `pushed`, `noop`, `locked`, or a failure code. That file is the log to read when
asking "is my life-state actually backed up?".

## The four refusals

The tool fails closed. Each refusal is a non-zero exit with a logged reason, never a
silent skip:

1. **Non-private remote.** Every run re-checks the remote's visibility via `gh repo view
   --json visibility,isPrivate` and pushes only on a confirmed `PRIVATE`. `PUBLIC`, an API
   error, an unparseable answer, or a missing `gh` all block the push. Privacy is verified
   per-run rather than once at setup because a repo can be flipped public at any time.
2. **The LifeOS distribution repo.** A remote whose repo is named `LifeOS` (any case) or
   whose owner is the public upstream is rejected outright. USER data never goes near the
   public release path — that path is the shadow-release pipeline and its 14 gates.
3. **Secret material.** Staged files are scanned for private-key blocks, GitHub / OpenAI /
   Anthropic / Slack / Google / AWS credentials, and JWTs before the commit is created. A
   hit unstages everything and aborts.
4. **A concurrent run.** An exclusive lock at `.git/lifeos-backup.lock` means two overlapping
   invocations produce one commit, not a race. Locks older than 30 minutes are treated as
   stale and stolen.

## Manual use

```bash
bun BackupUserData.ts                          # the hourly path — commit + push if changed
bun BackupUserData.ts --dry-run                # stage and scan, commit nothing
bun BackupUserData.ts --check-remote <url>     # test the distribution-repo guard
bun BackupUserData.ts --check-visibility <o/r> # test the privacy gate against any repo
```

`LIFEOS_USER_DIR` overrides the USER-tree location; otherwise the tool resolves the
`~/.claude/LIFEOS/USER` symlink and falls back to `~/.config/LIFEOS/USER`.

## Restore

The mirror is a plain git repo — restore is a clone, not a tool:

```bash
# 1. Stop the live service and quiesce any Claude Code session (same order as a
#    BackupBeforeUpgrade restore — hooks write into this tree continuously).
sudo systemctl stop lifeos-pulse.service

# 2. Clone the mirror to the USER-tree location.
git clone <your-private-user-data-repo> ~/.config/LIFEOS/USER

# 3. Confirm the live tree's symlink resolves into it.
ls -la ~/.claude/LIFEOS/USER

# 4. Re-source anything the mirror deliberately never carried: ~/.claude/.env,
#    CONFIG/CREDENTIALS/*, and the CACHE/ tree (which regenerates on its own).

# 5. Restart.
sudo systemctl start lifeos-pulse.service
```

Two things a restore does **not** give you: the SYSTEM tree (that's
`BackupBeforeUpgrade.sh`) and any secret (deliberately never captured, by the same doctrine
that keeps secrets out of the SYSTEM archive).

## Known limits

- **Torn writes.** `git add -A` snapshots whatever is on disk at that instant. A hook
  mid-write into `CONDUIT/` can be captured half-written. Acceptable for a mirror — the next
  hourly run captures the settled file — but it means a restored tree is
  crash-consistent, not transaction-consistent.
- **Push rejection is not auto-resolved.** If the remote has commits the local tree lacks
  (a second machine, or a web edit), the push fails loudly and the run exits non-zero rather
  than rebasing unattended. Resolve it by hand; the next hourly run then proceeds.
- **The documented `pre-push` trigger is not installed.** `ConfigSystem.md` describes
  `~/.claude/.git/hooks/pre-push` auto-pushing the USER tree before each SYSTEM-tree push.
  That requires `~/.claude` to be a git repo. Where it isn't, cron is the only trigger and
  this tool is the whole mechanism.
