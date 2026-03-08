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

### Note: PromptAnalysis hook not included

A `PromptAnalysis.hook.ts` was prototyped to batch tab title + session name into a single Haiku call. It was removed after investigation confirmed that **Claude Code runs all hooks in the same event group in parallel** — making shared-file coordination between hooks within the same event impossible. The hook would have added a third concurrent Haiku call per prompt with no benefit.

The actual inference count is already minimal: 1 Haiku per prompt (TerminalState tab title) + 1 background Sonnet per session (SessionAutoName name quality, non-blocking). A future refactor could fold session name into TerminalState's existing call once Claude Code supports sequential hook execution ([issue #21533](https://github.com/anthropics/claude-code/issues/21533)).

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

Run from `Releases/v4.1.0/`:
```bash
bun test ./.claude/tests/ModeClassifier.test.ts
bun test ./.claude/tests/PostCompactRecovery.test.ts
```

Note: the `./` prefix is required — without it bun treats the argument as a test name filter rather than a file path.

### Memory retention

Added automatic cleanup with a daily frequency gate:

- `memory.retention` config in `settings.json` (`eventsMaxSizeMB: 100`, `stateMaxAgeDays: 30`)
- `SessionCleanup.hook.ts` extended with `runRetentionCleanup()` — rotates `events.jsonl` when over size limit, deletes stale state files older than threshold
- Daily gate prevents cleanup from running more than once per day

### Path fix: identity.ts

Replaced hardcoded `join(HOME, '.claude/settings.json')` with `paiPath()` import from `./paths.ts`, consistent with the rest of the codebase's portability approach.

---

## Files changed

**New files (6):**
- `hooks/lib/voice.ts`
- `config/spinner-verbs.json`
- `config/spinner-tips.json`
- `config/README.md`
- `tests/ModeClassifier.test.ts`
- `tests/PostCompactRecovery.test.ts`

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
