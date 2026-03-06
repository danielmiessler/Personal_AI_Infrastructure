# v4.1.0 Improvement Changelog

Changes made on the `v4.1.0-improvements` branch after the initial v4.1.0 release.

---

## 2026-03-06 — Remaining Gap Fixes

Commit: `a33febe`
Branch: `v4.1.0-improvements`

### Architectural review

An automated review scored the initial v4.1.0 implementation at 8/20 on a verification checklist. 10 items failed, 2 were partial. The fixes below address all actionable gaps.

### Voice system: disable-by-default

The original release shipped voice fully enabled with `localhost:8888` curls baked into the Algorithm and hooks. Rather than deleting the voice system entirely, it is now **disabled by default** and gated behind a single config flag.

- Created `hooks/lib/voice.ts` — shared utility exporting `isVoiceEnabled()` and `announce()`
- Added `voice.enabled: false` to `settings.json`
- Guarded all voice `fetch()` calls in `TerminalState.hook.ts`, `VoiceCompletion.hook.ts`, `VoiceNotification.ts`, `DocCrossRefIntegrity.ts`
- Removed raw `curl localhost:8888` blocks from `PAI/Algorithm/v3.8.0.md`, replaced with optional/disabled-by-default instructions

### ModeClassifier: dual-gate fix

The original single regex caused false positives (e.g. "write back to them" → ALGORITHM). Replaced with a two-gate system:

1. **Gate 1:** Action verb match (`write`, `build`, `create`, `implement`, etc.)
2. **Gate 2:** Technical object OR complexity indicator (`function`, `API`, `system`, multi-step phrases, etc.)

Both gates must pass for ALGORITHM classification. This eliminates conversational false positives while preserving correct routing for technical prompts.

### Batched inference: PromptAnalysis hook

Previously, three separate Haiku calls fired on every `UserPromptSubmit` (tab title, sentiment, session name). Created `hooks/PromptAnalysis.hook.ts` to batch tab title + session name into a single call.

- Writes result to `MEMORY/STATE/prompt-analysis/{session_id}.json`
- Registered second in `UserPromptSubmit` (after ModeClassifier)
- `TerminalState.hook.ts` and `SessionAutoName.hook.ts` updated to read the shared result with fallback to their own inference
- ~50% inference reduction (2 calls instead of 3); sentiment analysis not batched because it requires transcript context

### Spinner extraction to config/

`settings.json` had ~630 lines of inline spinner content. Extracted to canonical maintenance files:

- `config/spinner-verbs.json` — 424 verbs
- `config/spinner-tips.json` — 202 tips
- `config/README.md` — documents the config directory

Note: `settings.json` retains inline arrays (Claude Code reads settings.json directly). The config files serve as the editable source of truth for contributors.

### Test suite

Created the project's first tests:

- `tests/ModeClassifier.test.ts` — 25 test cases covering ALGORITHM, NATIVE, and edge cases
- `tests/PostCompactRecovery.test.ts` — 7 tests for recovery block content and structure
- `tests/PromptAnalysis.test.ts` — 5 tests for batched inference output format

### Memory retention

Added automatic cleanup with a daily frequency gate:

- `memory.retention` config in `settings.json` (`eventsMaxSizeMB: 100`, `stateMaxAgeDays: 30`)
- `SessionCleanup.hook.ts` extended with `runRetentionCleanup()` — rotates `events.jsonl` when over size limit, deletes stale state files older than threshold
- Daily gate prevents cleanup from running more than once per day

### Path fix: identity.ts

Replaced hardcoded `join(HOME, '.claude/settings.json')` with `paiPath()` import from `./paths.ts`, consistent with the rest of the codebase's portability approach.

---

## Files changed

**New files (8):**
- `hooks/lib/voice.ts`
- `hooks/PromptAnalysis.hook.ts`
- `config/spinner-verbs.json`
- `config/spinner-tips.json`
- `config/README.md`
- `tests/ModeClassifier.test.ts`
- `tests/PostCompactRecovery.test.ts`
- `tests/PromptAnalysis.test.ts`

**Modified files (10):**
- `PAI/Algorithm/v3.8.0.md`
- `hooks/ModeClassifier.hook.ts`
- `hooks/TerminalState.hook.ts`
- `hooks/SessionAutoName.hook.ts`
- `hooks/SessionCleanup.hook.ts`
- `hooks/VoiceCompletion.hook.ts`
- `hooks/handlers/VoiceNotification.ts`
- `hooks/handlers/DocCrossRefIntegrity.ts`
- `hooks/lib/identity.ts`
- `settings.json`

---

## Verification score

After these fixes: 18/20 pass, 2 remaining (VoiceServer directory retained intentionally for opt-in use; PostCompactRecovery uses SessionStart+compact design instead of PreCompact event — valid alternative).
