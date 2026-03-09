<div align="center">

# PAI v4.2.0 — Reliability & Maintainability

**Algorithm v3.9.0 · Atomic writes · Payload validation · Split config · Upgrade CLI**

</div>

---

## What's New

### Atomic Writes — Data Integrity for Concurrent Hooks

Claude Code fires all hooks for the same event in parallel (Stop runs 5 hooks, UserPromptSubmit runs 4). Previously, concurrent writes to the same JSON state file could produce corrupt reads.

All JSON state writes now use **write-to-tmp-then-rename**. POSIX `rename()` is atomic — readers see either the old or the new file, never a partial write.

New shared utility: `hooks/lib/atomic.ts` — `atomicWriteJSON()` and `atomicWriteText()` used across all state-writing hooks.

---

### Algorithm v3.9.0 — Micro Tier

A new **Micro** effort tier handles single bounded changes (1–3 files, under 30 seconds) without loading the Algorithm file or creating a PRD.

| Tier | When | Format |
|------|------|--------|
| **Micro** | 1–3 files, no design decisions, clearly <30s | Inline in CLAUDE.md |
| **Standard+** | Everything else | Loads `PAI/Algorithm/v3.9.0.md` |

CLAUDE.md now pre-classifies effort tier before any file loads. Micro stays inline. Standard+ lazy-loads the Algorithm file. This eliminates unnecessary ceremony for simple tasks while preserving full rigor for complex ones.

---

### Hook Payload Validation

Claude Code broke the transcript format once (`human` → `user`), causing silent hook failures. Now all 6 hook event types have structural validation at the adapter layer.

`hooks/lib/payload-schema.ts` validates `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd`, `PreToolUse`, and `PostToolUse` payloads. **Fail-open design:** unknown events pass, missing optional fields warn, missing required fields return null with stderr logging.

No external dependencies — hand-rolled structural validation with zero overhead.

---

### Split Monolithic settings.json

The 1,082-line `settings.json` is now a **generated file**. Edit the domain config files instead:

```
~/.claude/config/
├── identity.jsonc      # DA name, voices, personality + Principal identity
├── hooks.jsonc         # All 21 hook registrations + statusLine
├── permissions.jsonc   # allow/deny/ask lists
├── notifications.jsonc # ntfy, Discord, Twilio routing
├── preferences.jsonc   # env vars, techStack, mcpServers, etc.
├── spinner-verbs.json  # Personality text (424 entries)
└── spinner-tips.json   # Feature tips (202 entries)
```

`hooks/handlers/BuildSettings.ts` merges these into `settings.json` at SessionStart — only when config files are newer (no-op otherwise). Runtime state (`counts`, `feedbackSurveyState`) is preserved across rebuilds.

**Benefits:** JSONC comments instead of `_docs` data fields. Smaller blast radius for config errors. Cleaner git diffs.

---

### Upgrade CLI

```bash
k upgrade --source ~/Downloads/pai-4.2.0/.claude
```

Safe upgrades with full rollback:

1. Validates source is a real PAI release
2. Checks Bun version and Claude Code presence
3. Verifies SHA-256 checksums against `manifest.json`
4. Backs up current `~/.claude` → `~/.claude-backup-YYYY-MM-DD`
5. Installs new files, **preserving** personal data
6. Runs post-upgrade migrations (BuildSettings, BuildCLAUDE)
7. **Auto-rollbacks** on any install failure

**Preserved across upgrades:**
`MEMORY/` · `PAI/USER/` · `config/identity.jsonc` · `config/preferences.jsonc` · `MCPs/` · `.mcp.json`

`manifest.json` ships with each release (1130 files, SHA-256 per file). Regenerate for your own fork: `bun ~/.claude/PAI/Tools/GenerateManifest.ts`

---

## Files Changed

| File | Change |
|------|--------|
| `hooks/lib/atomic.ts` | NEW — atomicWriteJSON / atomicWriteText |
| `hooks/lib/classify.ts` | NEW — extracted from ModeClassifier |
| `hooks/lib/recovery-block.ts` | NEW — extracted from PostCompactRecovery |
| `hooks/lib/payload-schema.ts` | NEW — validatePayload() for all 6 events |
| `PAI/Algorithm/v3.9.0.md` | NEW — adds Micro tier |
| `PAI/Algorithm/LATEST` | `v3.8.0` → `v3.9.0` |
| `config/identity.jsonc` | NEW — source of truth for identity |
| `config/hooks.jsonc` | NEW — source of truth for hooks |
| `config/permissions.jsonc` | NEW — source of truth for permissions |
| `config/notifications.jsonc` | NEW — source of truth for notifications |
| `config/preferences.jsonc` | NEW — source of truth for preferences |
| `config/README.md` | Updated — documents new architecture |
| `hooks/handlers/BuildSettings.ts` | NEW — config merge engine |
| `PAI/Tools/upgrade.ts` | NEW — upgrade engine |
| `PAI/Tools/GenerateManifest.ts` | NEW — manifest generator |
| `PAI/Tools/pai.ts` | Added `upgrade` command |
| `manifest.json` | NEW — 1130-file release manifest |
| `CLAUDE.md` | Micro tier, lazy-load |
| `hooks/lib/hook-io.ts` | Payload validation |
| `settings.json` | Generated; version 4.2.0 |
| `install.sh` | Runs BuildSettings.ts post-install |
| `tests/AtomicWrite.test.ts` | NEW — 9 tests |
| `tests/BuildSettings.test.ts` | NEW — 26 tests |
| `tests/Upgrade.test.ts` | NEW — 31 tests |
| `tests/PostCompactRecovery.test.ts` | v3.9.0 version assertion |

---

## Test Suite

143 tests across 6 files. Run from `Releases/v4.2.0/`:

```bash
bun test ./.claude/tests/*.test.ts
```

---

## Installation

Copy `.claude/` to your home directory. Run `install.sh` for guided setup.

**Upgrading from v4.1.0:**

```bash
k upgrade --source /path/to/pai-4.2.0/.claude
```

Or manually: replace `.claude/` with this release. `MEMORY/` and `PAI/USER/` data are unaffected.

See [CHANGELOG.md](CHANGELOG.md) for full implementation details.
