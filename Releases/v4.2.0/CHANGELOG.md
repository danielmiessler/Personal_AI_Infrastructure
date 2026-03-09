# v4.2.0 Changelog

Branch: `v4.2.0`
Date: 2026-03-09

---

## 1. Atomic writes for JSON state files

**Problem:** Multiple hooks fire in parallel for the same event (Stop fires 5, UserPromptSubmit fires 4). Concurrent writes to the same JSON file could produce partial/corrupt reads.

**Fix:** All JSON state writes now use write-to-tmp-then-rename. POSIX `rename()` is atomic — readers see either the old or new file, never a partial write.

- Created `hooks/lib/atomic.ts` — `atomicWriteJSON(path, data)` and `atomicWriteText(path, content)`
- Converted: `SessionCleanup.hook.ts`, `handlers/SystemIntegrity.ts`, `handlers/DocCrossRefIntegrity.ts`, `handlers/UpdateCounts.ts`, `lib/tab-setter.ts`
- Tests: `tests/AtomicWrite.test.ts` (9 tests)

---

## 2. Algorithm micro-effort tier (v3.9.0)

**Problem:** Standard tier requires reading a 350-line file, creating a PRD, and 7 phase transitions. For simple 1-3 file changes this ceremony takes longer than the work.

**New Micro tier:**
- Budget: <30s | ISC: 1–4 | Files: 1–3 | No design decisions
- Handled fully inline in CLAUDE.md — never loads Algorithm file
- Collapsed format: Task → Work → Change → Verify

**Lazy-load:** CLAUDE.md now pre-classifies effort tier. Micro stays inline. Standard+ loads `PAI/Algorithm/v3.9.0.md`.

- Created `PAI/Algorithm/v3.9.0.md` — adds Micro tier to Algorithm spec
- Updated `CLAUDE.md` — Micro pre-classification + inline format
- Updated `hooks/lib/recovery-block.ts` — version reference bumped to v3.9.0
- Tests: `tests/PostCompactRecovery.test.ts` (updated version assertions)

---

## 3. Hook payload validation

**Problem:** Claude Code broke the transcript format once (`human` → `user`). Hook payloads have no runtime validation — a format change causes silent failures with no error message.

**Fix:** Structural validation layer for all 6 hook event types. Fail-open design: unknown events pass, missing optional fields warn, missing required fields return null.

- Created `hooks/lib/payload-schema.ts` — `validatePayload()` for `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd`, `PreToolUse`, `PostToolUse`
- Updated `hooks/lib/hook-io.ts` — validates after parse, logs warnings/errors to stderr
- No external dependencies — hand-rolled structural validation (fast, zero overhead)
- Tests: `tests/PayloadSchema.test.ts` (29 tests, 9 describe blocks)

---

## 4. Split monolithic settings.json

**Problem:** 1,082-line JSON file with no comment syntax. `_docs` fields consumed context tokens as data. A single typo in any section breaks the entire system.

**Fix:** Split into 5 JSONC domain files (JSON with comments). `BuildSettings.ts` merges them into `settings.json` at SessionStart (only when config files are newer).

**New config files (source of truth):**
- `config/identity.jsonc` — `daidentity` + `principal`
- `config/hooks.jsonc` — all hook registrations + `statusLine`
- `config/permissions.jsonc` — allow/deny/ask lists
- `config/notifications.jsonc` — ntfy, Discord, Twilio routing
- `config/preferences.jsonc` — env, voice, memory, techStack, mcpServers, etc.

**Build engine:**
- Created `hooks/handlers/BuildSettings.ts` — merges config/*.jsonc + spinner files → settings.json
- JSONC comment stripping (`//` and `/* */`) without breaking URLs
- Structural validation with descriptive error messages
- Preserves runtime state (`counts`, `feedbackSurveyState`) across rebuilds
- Called at SessionStart alongside `BuildCLAUDE.ts` (no-op when config unchanged)
- Also called post-install from `install.sh`

**settings.json is now a generated file** — edit config/*.jsonc instead.

- Tests: `tests/BuildSettings.test.ts` (26 tests)

---

## 5. Upgrade CLI (`pai upgrade`)

**Problem:** Upgrading PAI required manually copying files, risking data loss and providing no rollback.

**Fix:** `pai upgrade --source <path>` command with full safety guarantees.

**Upgrade flow:**
1. Validate source directory (must have hooks/, PAI/Tools/, CLAUDE.md, etc.)
2. Check dependencies (Bun version, Claude Code presence)
3. Validate manifest.json checksums against source files
4. Backup current `~/.claude` → `~/.claude-backup-YYYY-MM-DD`
5. Copy new files, preserving user data (MEMORY, PAI/USER, identity.jsonc, MCPs)
6. Run post-upgrade migrations (BuildSettings.ts, BuildCLAUDE.ts)
7. Auto-rollback on failure

**Preserved paths (never overwritten):**
- `MEMORY/` — session history
- `PAI/USER/` — personal content
- `config/identity.jsonc` — DA name, voice IDs
- `config/preferences.jsonc` — personal preferences
- `MCPs/` — custom MCP configs
- `.mcp.json` — active MCP profile

**New files:**
- `PAI/Tools/upgrade.ts` — upgrade engine (backup, validate, install, rollback, migrate)
- `PAI/Tools/GenerateManifest.ts` — generates `manifest.json` with SHA-256 checksums
- `manifest.json` — 1130-file release manifest for v4.2.0
- `PAI/Tools/pai.ts` — added `upgrade` command

**Usage:**
```bash
k upgrade --source ~/Downloads/pai-4.2.0/.claude
k upgrade --source /tmp/pai-release --dry-run
k upgrade --help
```

- Tests: `tests/Upgrade.test.ts` (31 tests)

---

## Test suite summary

| File | Tests | What it covers |
|------|-------|----------------|
| `AtomicWrite.test.ts` | 9 | Atomic write correctness, concurrency safety |
| `ModeClassifier.test.ts` | 36 | ALGORITHM/NATIVE/MINIMAL classification |
| `PostCompactRecovery.test.ts` | 11 | Recovery block content, version assertions |
| `PayloadSchema.test.ts` | 29 | Hook payload validation, fail-open behavior |
| `BuildSettings.test.ts` | 26 | JSONC parsing, config merge, validation |
| `Upgrade.test.ts` | 31 | Backup, manifest check, install, rollback |
| **Total** | **143** | |

Run from `Releases/v4.2.0/`:
```bash
bun test ./.claude/tests/*.test.ts
```

---

## Files changed

**New files (17):**
- `hooks/lib/atomic.ts`
- `hooks/lib/classify.ts`
- `hooks/lib/recovery-block.ts`
- `hooks/lib/payload-schema.ts`
- `PAI/Algorithm/v3.9.0.md`
- `config/identity.jsonc`
- `config/hooks.jsonc`
- `config/permissions.jsonc`
- `config/notifications.jsonc`
- `config/preferences.jsonc`
- `hooks/handlers/BuildSettings.ts`
- `PAI/Tools/upgrade.ts`
- `PAI/Tools/GenerateManifest.ts`
- `manifest.json`
- `tests/AtomicWrite.test.ts`
- `tests/BuildSettings.test.ts`
- `tests/Upgrade.test.ts`

**Modified files (11):**
- `CLAUDE.md` — Micro tier pre-classification, lazy-load
- `hooks/lib/hook-io.ts` — payload validation integration
- `hooks/lib/recovery-block.ts` — v3.9.0 version reference
- `hooks/handlers/BuildCLAUDE.ts` — (no logic change)
- `PAI/Algorithm/LATEST` — `v3.8.0` → `v3.9.0`
- `settings.json` — now generated; added BuildSettings.ts hook, version 4.2.0
- `config/README.md` — documents new source-of-truth architecture
- `install.sh` — runs BuildSettings.ts post-install
- `PAI/Tools/pai.ts` — added `upgrade` command
- `tests/ModeClassifier.test.ts` — (no change)
- `tests/PostCompactRecovery.test.ts` — v3.9.0 version assertion
