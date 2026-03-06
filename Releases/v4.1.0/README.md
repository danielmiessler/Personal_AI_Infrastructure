<div align="center">

# PAI v4.1.0 — Architecture Improvements

**Algorithm v3.8.0 · Hook consolidation · Path portability · Mode classification · Post-compaction recovery**

</div>

---

## What's New

### Algorithm v3.8.0 — Richer OBSERVE, Leaner Core

The Algorithm gains cognitive scaffolding from v3.6.0 while the core file shrinks from 383 → ~270 lines via splitting.

**New in OBSERVE phase:**
- **Self-interrogation** — 2 questions (Standard) or 5 (Extended+) after reverse engineering
- **Constraint extraction** — compact list (Standard) or 4-scan protocol (Extended+); Extended+ gate: 0 constraints = BLOCKED
- **Confidence tags** on ISC criteria: `[E]` Explicit, `[I]` Inferred, `[R]` Reverse-engineered
- **Priority classification** (Extended+): `[CRITICAL]`, `[IMPORTANT]`, `[NICE]`
- **Constraint-to-ISC Coverage Map** (Extended+): every EX-N maps to ≥1 ISC
- **ISC Quality Gates QG2-QG7** alongside existing QG1 count gate

**Other Algorithm changes:**
- Voice curls fire-and-forget (`curl ... &`) — no longer block phase transitions
- Standard effort: skip PRD, track ISC in-memory, write JSONL in LEARN
- Context recovery uses `MEMORY/STATE/algorithms/{session_id}.json` — fixes concurrent session bug
- Core split into: `ISC-Methodology.md`, `CapabilitySelection.md`, `Examples.md`

### Hook Consolidation — 4 → 1

`UpdateTabTitle`, `ResponseTabReset`, `SetQuestionTab`, and `KittyEnvPersist` merged into `TerminalState.hook.ts`. Voice fetch is now fire-and-forget.

### ModeClassifier Hook (PR #840)

Deterministic regex hook (<20ms, no API) runs first on every `UserPromptSubmit`. Injects `<mode_hint>` to prevent LLM from defaulting to NATIVE due to template attractor bias in CLAUDE.md (~91% NATIVE selection rate → reduced).

### PostCompactRecovery Hook (PR #799)

`SessionStart` hook with `compact` matcher. Re-injects identity + Algorithm format rules + current phase after compaction. Mitigates Algorithm's #1 failure mode (late-phase context rot).

### Path Portability (PR #873)

22 TypeScript files updated: `join(homedir(), '.claude', ...)` → `paiPath(...)`. PAI now respects `CLAUDE_CONFIG_DIR` / `PAI_DIR` env override.

### TELOS Digest in Always-Loaded Context

`PAI/USER/TELOS/DIGEST.md` template added and registered in `loadAtStartup`. Fill in mission, top 3 goals, core beliefs, active challenges, working style — injected at every session start.

### Slimmed Runtime Docs

| File | Before | After | Full content |
|------|--------|-------|-------------|
| `PAI/SKILLSYSTEM.md` | 1,059 lines | ~80 lines | `PAI/dev/SKILLSYSTEM-Reference.md` |
| `PAI/THEHOOKSYSTEM.md` | 1,327 lines | ~80 lines | `PAI/dev/THEHOOKSYSTEM-Reference.md` |

### Memory System Cleanup

Migration history (7 versions) moved from `MEMORYSYSTEM.md` to `PAI/MEMORY-CHANGELOG.md`.

### CLAUDE.md Cleanup

- Version bumped to 4.1.0, Algorithm ref updated to v3.8.0
- MINIMAL format simplified: removed `🔧 CHANGE` and `✅ VERIFY` blocks

---

## Files Changed

| File | Change |
|------|--------|
| 22 hook/tool `.ts` files | `paiPath()` portability |
| `PAI/Algorithm/v3.8.0.md` | NEW |
| `PAI/Algorithm/ISC-Methodology.md` | NEW — split |
| `PAI/Algorithm/CapabilitySelection.md` | NEW — split |
| `PAI/Algorithm/Examples.md` | NEW — split |
| `PAI/Algorithm/LATEST` | `v3.7.0` → `v3.8.0` |
| `CLAUDE.md` | Version, Algorithm ref, MINIMAL format |
| `hooks/TerminalState.hook.ts` | NEW — consolidated |
| `hooks/ModeClassifier.hook.ts` | NEW |
| `hooks/PostCompactRecovery.hook.ts` | NEW |
| `hooks/UpdateTabTitle.hook.ts` | DELETED |
| `hooks/ResponseTabReset.hook.ts` | DELETED |
| `hooks/SetQuestionTab.hook.ts` | DELETED |
| `hooks/KittyEnvPersist.hook.ts` | DELETED |
| `settings.json` | Hook registrations, TELOS digest, version 4.1.0 |
| `PAI/SKILLSYSTEM.md` | Slimmed |
| `PAI/THEHOOKSYSTEM.md` | Slimmed |
| `PAI/dev/SKILLSYSTEM-Reference.md` | NEW |
| `PAI/dev/THEHOOKSYSTEM-Reference.md` | NEW |
| `PAI/MEMORYSYSTEM.md` | History section removed |
| `PAI/MEMORY-CHANGELOG.md` | NEW |
| `PAI/USER/TELOS/DIGEST.md` | NEW — template |

---

## v4.1.0 Improvements (2026-03-06)

Post-release quality pass addressing 10 failing verification items:

- **Voice disabled-by-default** — all voice calls gated behind `voice.enabled` config flag
- **ModeClassifier dual-gate** — two-gate system (verb + tech object) eliminates false positives
- **Batched inference** — new `PromptAnalysis.hook.ts` batches tab title + session name into single Haiku call (~50% reduction)
- **Spinner extraction** — 424 verbs + 202 tips extracted to `config/` for contributor maintenance
- **Test suite** — 37 tests across ModeClassifier, PostCompactRecovery, and PromptAnalysis
- **Memory retention** — daily-gated cleanup for events.jsonl rotation and stale state files
- **Path fix** — `identity.ts` uses `paiPath()` instead of hardcoded `$HOME/.claude`

See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## Installation

Copy `.claude/` to your home directory. Run `install.sh` for guided setup.

**Upgrading from v4.0.3:** Replace `.claude/` with this release. `MEMORY/` data is unaffected.
