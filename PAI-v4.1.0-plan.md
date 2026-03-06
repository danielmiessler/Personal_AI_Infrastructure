# PAI v4.1.0 Architecture Improvements Plan

## Context

After reviewing PAI v4.0.3, 99 open community PRs, and an independent architectural review (ARCHITECTURAL_REVIEW.md), improvements fall into three categories:

**Original 8 from architectural review:**
- Documentation too heavy for runtime context (SKILLSYSTEM 1059 lines, THEHOOKSYSTEM 1327 lines)
- Algorithm god document (383 lines) — phases, ISC methodology, capability selection all mixed
- 21 hooks with 4 redundant terminal-state hooks (~469 lines of near-duplicate code)
- Full voice system (VoiceServer, 2 hooks, 7 Algorithm curls) — not needed, remove entirely
- PRD file writes on ALL effort tiers including 2-minute Standard tasks
- TELOS goal files not in always-loaded context
- RPG examples cluttering Algorithm core doc
- Migration history cluttering MEMORYSYSTEM.md

**3 high-priority additions surfaced by PR review:**
- `getPaiDir()` portability (#873): 49 files have hardcoded `$HOME/.claude` — must fix before we add more
- ModeClassifier hook (#840): LLM picks NATIVE mode ~91% of the time due to template attractor bias in CLAUDE.md — Algorithm barely triggers
- PreCompact context preservation (redesigned from #799): Algorithm's documented #1 failure mode (late-phase context rot) has no mitigation — use PreCompact hook (not PostCompact/SessionStart, which have no compaction signal)

**5 additions from ARCHITECTURAL_REVIEW.md + recommendation review:**
- `settings.json` bloat: `spinnerVerbs` (~500 entries) + `spinnerTipsOverride` (~200 entries) + `_docs` fields inflate the file to 1,057 lines — extract to separate config files
- Batch inference: RatingCapture + UpdateTabTitle + SessionAutoName each make a separate Haiku call on every prompt — consolidate into one `PromptAnalysis.hook.ts` call (66% cost/latency reduction)
- Memory retention: `events.jsonl` grows unbounded; `MEMORY/STATE/` session files never cleaned — add size cap and age-based cleanup
- Algorithm overhead: "Micro" tier concept is already addressed by ModeClassifier routing trivial prompts to NATIVE — confirm in v3.8.0
- Hook smoke tests: ModeClassifier regex and PreCompact output format tested with `bun:test` before ship

**Algorithm direction:** Lean + scaffold gates — merge v3.6.0's effort-gated cognitive scaffolding (self-interrogation, constraint extraction, confidence tags, coverage map, quality gates QG2-7) into v3.7.0, then split the combined file. Produces v3.8.0.

**Goal:** Fork GitHub repo, create `Releases/v4.1.0/` from v4.0.3 baseline, apply all improvements.

---

## Step 0: Fork & Setup

```bash
# Fork repo on GitHub
gh repo fork danielmiessler/Personal_AI_Infrastructure --clone=false

# The local repo is already at /Users/deven/Projects/PersonalAI
# Create a new branch for v4.1.0 work
cd /Users/deven/Projects/PersonalAI
git checkout -b v4.1.0-improvements

# Copy v4.0.3 release as v4.1.0 baseline
cp -r Releases/v4.0.3 Releases/v4.1.0
```

All changes are made inside `Releases/v4.1.0/.claude/`.

---

## Step 0.5: Apply getPaiDir() Portability (#873)

49 files in v4.0.3 have hardcoded `$HOME/.claude` or `~/.claude` paths that break installs using `CLAUDE_CONFIG_DIR`. Must be applied to the v4.1.0 baseline **before** we add any new files (to avoid creating more portability debt).

The `getPaiDir()` function already exists in `hooks/lib/paths.ts`. The work is mechanical: replace all inline `join(homedir(), '.claude', ...)` and `$HOME/.claude/...` patterns with `paiPath(...)` calls using the existing utility.

Key files affected (from PR #873): all `hooks/*.hook.ts`, `PAI/Tools/*.ts`, `settings.json` env block.

---

## Step 1: Merge v3.6.0 Scaffolding into v3.7.0 → Create v3.8.0, Then Split

**Why merge first, then split:** v3.7.0 is the authoritative base (has PRD-as-record, context compaction rules, invocation obligation, Splitting Test). v3.6.0 adds effort-gated cognitive scaffolding v3.7.0 is missing. Merge the additive features, then extract the three separable concerns into their own files.

**Features to port from v3.6.0 into v3.7.0's OBSERVE phase:**

1. **Self-interrogation** (after reverse engineering):
   - Standard: Q1 + Q4 only (one line each)
   - Extended+: All 5 questions checking for missed constraints, numbers, prohibitions, abstraction gaps

2. **Constraint extraction** (after self-interrogation):
   - Standard: Compact numbered list `EX-1: constraint`
   - Extended+: 4-scan protocol (Quantitative / Prohibitions / Requirements / Implicit) with constraint count + gate (0 constraints at Extended+ = BLOCKED)

3. **Confidence tags on ISC criteria:**
   - `[E]` = Explicit (user stated), `[I]` = Inferred, `[R]` = Reverse-engineered
   - Used by THINK phase to focus pressure testing on `[I]` and `[R]`

4. **Priority classification (Extended+ only):**
   - `[CRITICAL]` = from explicit constraint/prohibition — failure = task failure
   - `[IMPORTANT]` = from inferred requirement
   - `[NICE]` = from reverse-engineered ideal state

5. **Constraint-to-ISC Coverage Map (Extended+ only):**
   - Every [EX-N] must map to ≥1 ISC — unmapped constraints are BLOCKED

6. **ISC Quality Gates QG2-QG7** (in addition to existing QG1 count gate):
   - QG2: length (8-12 words), QG3: state-based (not verb-started), QG4: binary testable
   - QG5: anti-criteria present, QG6: coverage map complete (Extended+), QG7: no abstracted numbers (Extended+)

**Drafting constraint for effort-gating:** Every scaffolding step added from v3.6.0 must use unambiguous binary conditional language. Never "consider" or "optionally" — always "IF effort is Standard: [exact required output]. IF effort is Extended+: [exact required output]." If any gate condition is vague, the LLM defaults to running all scaffolding on every task, defeating the entire purpose.

**Voice curls (applies in this step):** Remove all 7 phase-transition `curl http://localhost:8888/notify` commands from v3.8.0 entirely. Voice system is removed in Step 3. Do not replace with fire-and-forget variants — just delete.

**Then split into separate files:**
- `PAI/Algorithm/ISC-Methodology.md` — Splitting Test, decomposition domain table, granularity example (~70 lines)
- `PAI/Algorithm/CapabilitySelection.md` — capability selection methodology, platform capabilities table, examples (~70 lines)
- `PAI/Algorithm/Examples.md` — two RPG examples (~40 lines)

Replace extracted sections in core with one-line references:
```
*Full decomposition guide: [ISC-Methodology.md](ISC-Methodology.md)*
*Full capability selection: [CapabilitySelection.md](CapabilitySelection.md)*
```

**Result:** `v3.8.0.md` (~270 lines, down from 383; richer OBSERVE, leaner body, no voice curls). Update `CLAUDE.md` reference and `PAI/Algorithm/LATEST` to `v3.8.0`.

**Update CLAUDE.md:** Change `PAI/Algorithm/v3.7.0.md` → `PAI/Algorithm/v3.8.0.md` in ALGORITHM mode instruction.

---

## Step 2: Consolidate 4 Terminal Hooks → TerminalState.hook.ts

**Files to remove (after consolidation):**
- `hooks/UpdateTabTitle.hook.ts` (251 lines)
- `hooks/ResponseTabReset.hook.ts` (38 lines)
- `hooks/SetQuestionTab.hook.ts` (131 lines)
- `hooks/KittyEnvPersist.hook.ts` (53 lines)

**File to create:** `hooks/TerminalState.hook.ts`

The new file reads `tool_name`/`hook_event_name` from stdin and routes to one of 4 existing handler functions. All lib imports remain identical (`lib/tab-setter.ts`, `lib/tab-constants.ts`, `lib/identity.ts`, `lib/paths.ts`).

**Structure:**
```typescript
// Route by hook event
const event = input.hook_event_name;
if (event === 'SessionStart') handleSessionStart(input);
else if (event === 'UserPromptSubmit') handleUserPromptSubmit(input);
else if (event === 'Stop') handleStop(input);
else if (event === 'PreToolUse' && input.tool_name === 'AskUserQuestion') handleAskUserQuestion(input);
```

**Important:** The `handleUserPromptSubmit` handler ported from `UpdateTabTitle.hook.ts` must NOT include the voice fetch block (lines 216-240 of the original). That block is removed entirely in Step 3 — do not port it.

**settings.json changes** — replace 4 separate hook registrations with 4 entries all pointing to `TerminalState.hook.ts`:
```json
// In PreToolUse (matcher: AskUserQuestion):
{"type": "command", "command": "${PAI_DIR}/hooks/TerminalState.hook.ts"}
// In UserPromptSubmit:
{"type": "command", "command": "${PAI_DIR}/hooks/TerminalState.hook.ts"}
// In Stop:
{"type": "command", "command": "${PAI_DIR}/hooks/TerminalState.hook.ts"}
// In SessionStart:
{"type": "command", "command": "${PAI_DIR}/hooks/TerminalState.hook.ts"}
```

---

## Step 3: Remove Voice System (Tier 1)

Voice input/output is not used. The full runtime voice system is dead weight — remove it cleanly.

**Files to delete:**
- `VoiceServer/` — entire directory (11 files: server.ts, start/stop/restart/status/install/uninstall.sh, voices.json, pronunciations.json, menubar/)
- `hooks/VoiceCompletion.hook.ts`
- `hooks/handlers/VoiceNotification.ts`
- `PAI-Install/public/assets/voice-male.mp3`
- `PAI-Install/public/assets/voice-female.mp3`

**Code to remove from existing files:**
- `hooks/lib/identity.ts` — remove `mainDAVoiceID` field from identity object and return type
- `settings.json` — remove `daidentity.mainDAVoiceID` field and any ElevenLabs key references
- `PAI/Tools/pai.ts` — remove `VOICE_SERVER` constant and any voice fetch calls
- `hooks/handlers/DocCrossRefIntegrity.ts` — remove VoiceNotification import and any `sendVoice()` calls
- `PAI/Tools/IntegrityMaintenance.ts` — remove voice notification calls
- `PAI-Install/engine/actions.ts` — remove voice server start/stop orchestration
- `PAI-Install/engine/detect.ts` — remove `validateElevenLabsKey()` function
- `PAI-Install/engine/steps.ts` — remove voice setup installation step
- `PAI-Install/engine/validate.ts` — remove voice server health check
- `settings.json` Stop hooks — remove `VoiceCompletion.hook.ts` registration

**Deferred (Tier 2 — not in v4.1.0):**
- 180+ skill `SKILL.md` files contain curl examples to `localhost:8888/notify`. These are documentation/templates — they don't execute at runtime. Leave them for a future cleanup pass.

**Scope note:** After this step, no hook, tool, or runtime file references the voice server. The curl examples in skill docs are dead text — harmless.

---

## Step 3.5: Add ModeClassifier Hook (#840)

**Problem:** LLM picks NATIVE mode ~91% of the time. CLAUDE.md presents NATIVE format first, which acts as a template attractor — the LLM pattern-matches to the simpler format instead of following the semantic classification rules.

**Fix:** Add `ModeClassifier.hook.ts` as a `UserPromptSubmit` hook that runs **before** `PromptAnalysis` in the hook chain. Uses deterministic regex (no API call, <20ms) to classify prompts and injects `<mode>ALGORITHM</mode>` or `<mode>MINIMAL</mode>` into `additionalContext`.

```typescript
// Core classification logic
const words = prompt.trim().split(/\s+/);
const isMinimal = /^(hi|hello|thanks|ok|done|yes|no|\d+[\s\-:]*)$/i.test(prompt.trim());

// ALGORITHM requires: action verb AND (technical object OR multi-step length)
// Action verb alone is not sufficient — "update my status", "add a comma" are NATIVE
// write|add|update|remove|set are included — the tech object gate handles disambiguation
const hasActionVerb = /\b(build|create|implement|fix|debug|refactor|analyze|design|review|plan|migrate|convert|optimize|research|investigate|compare|write|add|update|remove|set)\b/i.test(prompt);

// Technical object: code, file, function, system, API, database, etc.
const hasTechnicalObject = /\b(code|file|function|class|api|endpoint|database|schema|config|hook|hook|script|test|build|deploy|server|component|module|service|bug|error|feature|algorithm|query|migration)\b/i.test(prompt);

// Multi-step: long request OR "and then", "also", "step", numbered lists
const isComplex = words.length > 30 || /\b(and then|also|step|first|second|finally|\d+\))\b/i.test(prompt);

const isAlgorithm = hasActionVerb && (hasTechnicalObject || isComplex);

const mode = isMinimal ? 'MINIMAL' : isAlgorithm ? 'ALGORITHM' : 'NATIVE';

// Always log classification for observability
console.error(`[ModeClassifier] ${mode} (words:${words.length}, verb:${hasActionVerb}, techObj:${hasTechnicalObject}, complex:${isComplex})`);

// Dry-run mode: log only, don't inject (for calibration periods)
if (process.env.MODE_CLASSIFIER_DRY_RUN === '1') process.exit(0);
```

**Correct behavior — false positives fixed, false negatives restored:**
- "update my status" → NATIVE (verb present, no technical object) ✓
- "add a comma here" → NATIVE (verb present, no technical object) ✓
- "write back to them that I agree" → NATIVE (verb present, no technical object) ✓
- "write unit tests for the auth module" → ALGORITHM (verb + technical object) ✓
- "add authentication middleware to the API" → ALGORITHM (verb + technical object) ✓
- "update the database schema migration" → ALGORITHM (verb + technical object) ✓
- "build a REST API endpoint" → ALGORITHM (verb + technical object) ✓
- "fix the authentication bug" → ALGORITHM (verb + technical object) ✓

**Ship with enforcement + logging active.** The `MODE_CLASSIFIER_DRY_RUN=1` env var is available for anyone who wants observe-only behavior without a code change.

**Critical unverified assumption:** `additionalContext` injection must actually override the LLM's CLAUDE.md pattern matching. Before shipping Step 3.5, run a quick smoke test: send a prompt that would normally classify NATIVE (no action verb, no tech object), inject `<mode>ALGORITHM</mode>`, and verify the LLM follows the injected mode. If the LLM ignores the injection, the entire Step 3.5 strategy needs rethinking — possibly replacing `additionalContext` with a system-level prepend or restructuring CLAUDE.md mode order.

**settings.json:** Register as first hook in `UserPromptSubmit` array (before PromptAnalysis).

---

## Step 3.6: Add PreCompactContext Hook (redesigned from #799)

**Problem:** After Claude Code compacts a long conversation, identity and behavioral context is summarized or dropped. PR #799 proposed detecting compaction via `input.source === 'compact'` on SessionStart — but verified research shows no such field exists in the SessionStart payload `{session_id, transcript_path, hook_event_name, cwd}`. That approach cannot work.

**Correct approach:** Use the `PreCompact` hook event, which Claude Code fires *before* compaction and supports `additionalContext` injection. Context injected here is included in the compaction *input*, so it survives *into* the compact summary — strictly better than post-hoc recovery.

**Fix:** Add `PreCompactContext.hook.ts` as a `PreCompact` hook. Fires before compaction and injects a compact (~800 token) identity + state block:

```typescript
// hooks/PreCompactContext.hook.ts
const identity = getIdentity();
const algoState = readAlgoState(data.session_id); // from STATE/algorithms/{sessionId}.json

const recoveryBlock = `
## COMPACT PRESERVATION BLOCK
DA: ${identity.daName} | Principal: ${identity.principalName} | TZ: ${identity.timezone}
${algoState?.phase ? `Algorithm phase: ${algoState.phase} | Effort: ${algoState.effort}` : ''}
Key rules: Follow CLAUDE.md mode selection. Algorithm ISC must be measurable state.
PRD path: ${algoState?.prd_path ?? 'none'}
`.trim();

console.log(JSON.stringify({ additionalContext: recoveryBlock }));
process.exit(0);
```

**Why this works:** The compact summary includes all context provided at compaction time. The preservation block becomes part of the compact, so it's present after compaction without any detection logic.

**settings.json:** Register under `PreCompact` hook event (currently unconfigured in v4.0.3 — this is the first use).

**Required integration test before shipping:** The unit tests in Step 3.9 validate output shape but cannot confirm Claude Code consumes PreCompact `additionalContext` correctly. Before shipping, manually verify: trigger a long conversation that reaches compaction, confirm the preservation block content appears in the post-compact context summary. If Claude Code doesn't pass PreCompact `additionalContext` into the compaction input, this hook needs a fallback design.

---

## Step 3.7: Reduce settings.json Bloat

**Problem:** `settings.json` is 1,057 lines. Two sections dominate:
- `spinnerVerbs`: ~500 entries of custom loading verbs for the terminal spinner UI
- `spinnerTipsOverride.tips`: ~200 entries of tips shown while Claude thinks
- `_docs` fields throughout: JSON doesn't support comments so docs are stored as data keys

The spinner fields are Claude Code UI configuration (not passed to the LLM model), but they make `settings.json` unwieldy — hard to diff, hard to maintain, easy to break with a stray comma.

**Fix:**
1. Extract `spinnerVerbs` array to `config/spinner-verbs.json` — update `settings.json` to reference it (or remove the override if Claude Code supports external file references; otherwise keep as-is but document separately)
2. Extract `spinnerTipsOverride.tips` array to `config/spinner-tips.json` — same approach
3. Remove all `_docs` fields from `settings.json` — create `settings.README.md` in the same directory with the documentation
4. Create `PAI/dev/settings.README.md` with the full field documentation currently embedded as `_docs`

**Expected result:** `settings.json` drops from ~1,057 lines to ~300-350 lines. Remaining content is purely functional configuration. Voice fields removed in Step 3 account for additional reduction.

---

## Step 3.8: Batch Prompt Inference → PromptAnalysis.hook.ts

**Problem:** Three hooks each make a separate Haiku API call on every `UserPromptSubmit`:
- `RatingCapture.hook.ts` — implicit sentiment (1 Haiku call)
- `UpdateTabTitle.hook.ts` / `TerminalState.hook.ts` UserPromptSubmit handler — tab title summary (1 Haiku call)
- `SessionAutoName.hook.ts` — session name generation (1 Haiku call)

That's 3 API round-trips (~3-6s combined) on every prompt, even for trivial inputs.

**Fix:** Replace all three inference calls with a single `PromptAnalysis.hook.ts` that makes one Haiku call returning all three values. The individual hooks become lightweight readers of the shared result written to `MEMORY/STATE/prompt-analysis/{session_id}-{prompt_hash}.json`.

```typescript
// PromptAnalysis.hook.ts — fires first in UserPromptSubmit chain
// Skip for trivial prompts (< 10 chars)
if (cleanPrompt.length < 10) process.exit(0);

// Skip session name if already named
const alreadyNamed = !!readSessionName(data.session_id);

const result = await inference({
  level: 'fast',
  expectJson: true,
  systemPrompt: `Analyze this user prompt. Return JSON only:
{
  "tab_title": "2-4 word gerund sentence ending in period",
  "sentiment": { "rating": 1-10, "confidence": 0.0-1.0 },
  ${!alreadyNamed ? '"session_name": "descriptive-kebab-name",' : ''}
}`,
  userPrompt: cleanPrompt,
  timeout: 8000,
});

// Write shared result for downstream hooks to read
writeAnalysisResult(data.session_id, promptHash, result);
```

**Downstream hooks** (`RatingCapture`, `TerminalState` UserPromptSubmit handler, `SessionAutoName`) check for the shared result first; fall back to their existing logic only if `PromptAnalysis` didn't run.

**settings.json:** Register `PromptAnalysis.hook.ts` as second hook in `UserPromptSubmit` (after `ModeClassifier`, before `RatingCapture`).

**Expected result:** 3 API calls → 1 per prompt. ~66% reduction in per-prompt inference cost. Net latency: ~2s (one Haiku round-trip) vs ~6s (three sequential round-trips).

**Latency note:** `PromptAnalysis` blocks the downstream hook chain while waiting for the API response. Previously each hook independently handled its own latency in sequence. The net behavior is better (~2s vs ~6s) but the single blocking call is now the critical path — if Haiku is slow, everything waits. This is an acceptable tradeoff.

---

## Step 3.9: Hook Smoke Tests

Add targeted `bun:test` tests for the two new hooks with the most failure modes:

**`tests/ModeClassifier.test.ts`** — 20 prompts, assert correct classification:
```typescript
import { test, expect } from 'bun:test';
import { classify } from '../hooks/ModeClassifier.hook';

// ALGORITHM cases
test('build prompt → ALGORITHM', () => expect(classify('build a REST API')).toBe('ALGORITHM'));
test('long prompt → ALGORITHM', () => expect(classify('a'.repeat(26).split('').join(' '))).toBe('ALGORITHM'));
// MINIMAL cases
test('rating → MINIMAL', () => expect(classify('7')).toBe('MINIMAL'));
test('thanks → MINIMAL', () => expect(classify('thanks')).toBe('MINIMAL'));
// NATIVE cases
test('question → NATIVE', () => expect(classify('what is the difference between X and Y')).toBe('NATIVE'));
// ... 15 more covering edge cases
```

**`tests/PreCompactContext.test.ts`** — verify output is valid JSON with `additionalContext` key:
```typescript
test('output is valid hook JSON', () => {
  const output = runHook(mockInput);
  const parsed = JSON.parse(output);
  expect(parsed).toHaveProperty('additionalContext');
  expect(typeof parsed.additionalContext).toBe('string');
  expect(parsed.additionalContext.length).toBeGreaterThan(50);
});
```

**`tests/PromptAnalysis.test.ts`** — verify short-prompt skip and JSON output shape (mock inference call).

Tests live in `Releases/v4.1.0/tests/`. Run with `bun test` from the `.claude/` directory.

---

## Step 3.10: Memory Retention Policy

**Problem:** `events.jsonl` is append-only with no size limit. `MEMORY/STATE/` accumulates session state files indefinitely. No cleanup mechanism exists.

**Fix:**

1. Add retention config to `settings.json`:
```json
"memory": {
  "retention": {
    "eventsMaxSizeMB": 100,
    "stateMaxAgeDays": 30
  }
}
```

2. Add cleanup to the `Stop` handler in `TerminalState.hook.ts` (built in Step 2). Gate on a daily frequency to avoid redundant scans for active users with many sessions:

```typescript
// Only run cleanup once per 24h
const lastCleanup = readLastCleanupTimestamp(); // from MEMORY/STATE/last-cleanup.json
if (Date.now() - lastCleanup < 86_400_000) process.exit(0);

// Run cleanup:
// - If events.jsonl > eventsMaxSizeMB: rename to events.{YYYY-MM-DD}.jsonl, start fresh
// - Delete MEMORY/STATE/algorithms/ files older than stateMaxAgeDays
// - Delete MEMORY/STATE/kitty-sessions/ files older than stateMaxAgeDays
writeLastCleanupTimestamp();
```

This keeps the Stop handler fast for high-frequency users (20+ sessions/day).

---

## Step 4: Session-Safe PRD State + Skip PRD for Standard Tier

**Problem A (from #854):** Context recovery reads "most recent PRD by mtime" — this fails with concurrent sessions, recovering into the wrong session's PRD.

**Fix A:** The `STATE/algorithms/{sessionId}.json` file already exists but the AI's recovery instructions in v3.7.0 point at mtime instead of it. Update v3.8.0 context recovery section:
```
# Context Recovery (updated)
Read SESSION-specific state: MEMORY/STATE/algorithms/{session_id}.json
→ has: phase, effort, prd_path, active flag
Then read that PRD directly. Never use mtime to find PRDs.
```

**Problem B:** PRD stub + 7 phase-transition edits for every Standard (<2min) task.

**Fix B in v3.8.0.md:** Gate PRD creation on effort level:
```
**If effort is Extended or higher:** Create PRD stub now (current behavior).
**If effort is Standard:** Skip PRD. Track ISC in-memory only.
  → LEARN phase: write single entry to algorithm-reflections.jsonl.
```

Both fixes go into v3.8.0.md's OBSERVE and Context Recovery sections.

---

## Step 5: Add TELOS Digest to Always-Loaded Context

**Create:** `PAI/USER/TELOS/DIGEST.md`

Template content (user fills in their own):
```markdown
# TELOS Digest — [Name]'s Goals & Context

## Current Mission
[1-2 sentence mission statement]

## Top 3 Active Goals
1. [Goal] — [why it matters, current status]
2. [Goal] — [why it matters, current status]
3. [Goal] — [why it matters, current status]

## Core Beliefs
[3-5 bullet beliefs that shape decisions]

## Active Challenges
[2-3 current obstacles]

## How I Work Best
[2-3 preferences/working style notes]
```

**Add to settings.json `loadAtStartup`:**
```json
"PAI/USER/TELOS/DIGEST.md"
```
(alongside existing AISTEERINGRULES.md and PROJECTS.md entries)

---

## Step 6: Strip Runtime Doc Weight from SKILLSYSTEM.md and THEHOOKSYSTEM.md

**Create:** `PAI/dev/` directory for reference-only docs

**Move full versions:**
- `PAI/SKILLSYSTEM.md` → `PAI/dev/SKILLSYSTEM-Reference.md`
- `PAI/THEHOOKSYSTEM.md` → `PAI/dev/THEHOOKSYSTEM-Reference.md`

**Create slim runtime versions:**

`PAI/SKILLSYSTEM.md` (target: ~80 lines):
- YAML frontmatter rules (USE WHEN, TitleCase, 1024 char limit)
- Workflow routing table format
- Personal vs System skill naming (_ALLCAPS vs TitleCase)
- Customization pattern (check USER/SKILLCUSTOMIZATIONS/{Skill}/ before running)
- Directory structure (SKILL.md + Workflows/ + Tools/ only)
- Named topic links — NOT just "Full spec": "For YAML frontmatter field definitions → dev/SKILLSYSTEM-Reference.md §Frontmatter. For workflow file format → §Workflows. For skill versioning → §Versioning."

`PAI/THEHOOKSYSTEM.md` (target: ~80 lines):
- 8 event types with triggers (one-line each)
- Hook output protocol (exit codes, JSON format)
- Hook file convention (shebang, stdin read, event routing)
- Named topic links: "For full payload schemas → dev/THEHOOKSYSTEM-Reference.md §Payloads. For security hook patterns → §Security. For hook testing → §Testing."

**Remove from runtime loading:** Verify neither file is in `loadAtStartup` (they're not — they're loaded on-demand via CONTEXT_ROUTING.md, which is fine since they're referenced rarely).

---

## Step 7: Separate Migration History from MEMORYSYSTEM.md

**Create:** `PAI/MEMORY-CHANGELOG.md`

Move lines 339-394 (Migration History section, 7 versions v1.0-v7.2) from MEMORYSYSTEM.md into MEMORY-CHANGELOG.md.

Replace in MEMORYSYSTEM.md with:
```markdown
## Change History
See [MEMORY-CHANGELOG.md](MEMORY-CHANGELOG.md) for version history.
```

---

## Step 8: Clean Fluff from CLAUDE.md / Algorithm

**In v3.8.0.md critical rules section:**
- Remove duplicate "CRITICAL FAILURE — worse than not listing it, because it's dishonest" (appears 3x, keep 1x)

**In CLAUDE.md MINIMAL mode:**
- Remove `🔧 CHANGE` and `✅ VERIFY` blocks from MINIMAL format — ratings/acknowledgments don't need change logs

**In AISTEERINGRULES.md:**
- The Bad/Correct examples are valuable for new users but add ~30% length — keep them, they're worth the weight

---

## Step 9: Update Releases/v4.1.0/README.md

Create release notes documenting all changes.

---

## Step 10: Commit & PR

```bash
cd /Users/deven/Projects/PersonalAI
git add Releases/v4.1.0/
git commit -m "feat: PAI v4.1.0 — architecture improvements"
gh pr create --repo DevenDucommun/Personal_AI_Infrastructure \
  --title "PAI v4.1.0 — Architecture Improvements" \
  --body "..."
```

---

## Files Modified (v4.1.0 only)

| File | Change |
|------|--------|
| `hooks/lib/paths.ts` et al. (49 files) | Replace hardcoded `$HOME/.claude` with `paiPath()` |
| `PAI/Algorithm/v3.7.0.md` | SOURCE ONLY — not modified directly |
| `PAI/Algorithm/v3.8.0.md` | NEW — v3.7.0 + v3.6.0 scaffolding + split refs + no voice curls + session-safe recovery + Standard PRD skip (~270 lines) |
| `PAI/Algorithm/ISC-Methodology.md` | NEW — ~70 lines |
| `PAI/Algorithm/CapabilitySelection.md` | NEW — ~70 lines |
| `PAI/Algorithm/Examples.md` | NEW — ~40 lines |
| `PAI/Algorithm/LATEST` | `v3.7.0` → `v3.8.0` |
| `CLAUDE.md` | Update Algorithm reference to v3.8.0; clean MINIMAL format |
| `hooks/TerminalState.hook.ts` | NEW — consolidated ~300 lines (no voice), includes Stop-time retention cleanup |
| `hooks/UpdateTabTitle.hook.ts` | DELETED |
| `hooks/ResponseTabReset.hook.ts` | DELETED |
| `hooks/SetQuestionTab.hook.ts` | DELETED |
| `hooks/KittyEnvPersist.hook.ts` | DELETED |
| `hooks/VoiceCompletion.hook.ts` | DELETED |
| `hooks/handlers/VoiceNotification.ts` | DELETED |
| `VoiceServer/` | DELETED (entire directory, 11 files) |
| `PAI-Install/public/assets/voice-male.mp3` | DELETED |
| `PAI-Install/public/assets/voice-female.mp3` | DELETED |
| `hooks/lib/identity.ts` | Remove `mainDAVoiceID` field |
| `PAI/Tools/pai.ts` | Remove `VOICE_SERVER` constant + voice calls |
| `hooks/handlers/DocCrossRefIntegrity.ts` | Remove VoiceNotification import + calls |
| `PAI/Tools/IntegrityMaintenance.ts` | Remove voice notification calls |
| `PAI-Install/engine/actions.ts` | Remove voice server orchestration |
| `PAI-Install/engine/detect.ts` | Remove `validateElevenLabsKey()` |
| `PAI-Install/engine/steps.ts` | Remove voice setup step |
| `PAI-Install/engine/validate.ts` | Remove voice health check |
| `hooks/ModeClassifier.hook.ts` | NEW — deterministic mode pre-classification |
| `hooks/PreCompactContext.hook.ts` | NEW — inject identity/state block before compaction so it survives into compact summary |
| `hooks/PromptAnalysis.hook.ts` | NEW — single Haiku call replacing 3 separate inference calls (tab title + sentiment + session name) |
| `hooks/SessionAutoName.hook.ts` | Read from PromptAnalysis shared result; skip own inference if result present |
| `hooks/RatingCapture.hook.ts` | Read from PromptAnalysis shared result; skip own inference if result present |
| `tests/ModeClassifier.test.ts` | NEW — 20-prompt regression suite for classification logic |
| `tests/PreCompactContext.test.ts` | NEW — output shape validation |
| `tests/PromptAnalysis.test.ts` | NEW — short-prompt skip and JSON shape validation |
| `settings.json` | Hook registrations updated; voice fields removed; retention config added; TELOS/DIGEST.md in loadAtStartup; spinner arrays extracted |
| `config/spinner-verbs.json` | NEW — extracted from settings.json |
| `config/spinner-tips.json` | NEW — extracted from settings.json |
| `PAI/dev/settings.README.md` | NEW — settings _docs fields relocated here |
| `PAI/SKILLSYSTEM.md` | Slimmed to ~80 lines |
| `PAI/THEHOOKSYSTEM.md` | Slimmed to ~80 lines |
| `PAI/dev/SKILLSYSTEM-Reference.md` | NEW — full original |
| `PAI/dev/THEHOOKSYSTEM-Reference.md` | NEW — full original |
| `PAI/MEMORYSYSTEM.md` | -57 lines (migration history removed) |
| `PAI/MEMORY-CHANGELOG.md` | NEW — migration history |
| `PAI/USER/TELOS/DIGEST.md` | NEW — template |
| `Releases/v4.1.0/README.md` | NEW — release notes |

---

## Execution Order (dependencies matter)

1. Fork + branch + copy v4.0.3 → v4.1.0
2. **Step 0.5** — Apply getPaiDir() portability across 49 files (must be first)
3. **Step 1** — Build v3.8.0.md (merge scaffolding + split + remove voice curls + PRD fixes)
4. **Step 2** — Consolidate 4 terminal hooks → TerminalState.hook.ts (without voice block)
5. **Step 3** — Remove voice system (VoiceServer, 2 hooks, identity field, install steps, assets)
6. **Step 3.5** — Add ModeClassifier.hook.ts (with tightened regex + dry-run mode)
7. **Step 3.6** — Add PreCompactContext.hook.ts (PreCompact event, not SessionStart)
8. **Step 3.7** — Extract spinnerVerbs/spinnerTips from settings.json
9. **Step 3.8** — Add PromptAnalysis.hook.ts (batch inference); update RatingCapture + SessionAutoName to read shared result
10. **Step 3.9** — Add hook smoke tests (ModeClassifier, PreCompactContext, PromptAnalysis)
11. **Step 3.10** — Add memory retention config + Stop-handler cleanup
12. **Step 5** — Add TELOS DIGEST.md + loadAtStartup
13. **Step 6** — Slim SKILLSYSTEM.md + THEHOOKSYSTEM.md → dev/
14. **Step 7** — Migrate MEMORYSYSTEM.md history
15. **Step 8** — Clean CLAUDE.md MINIMAL format, deduplicate Algorithm rules
16. Write README, commit, push, create PR

---

## Verification

1. `settings.json` valid JSON: `bun -e "JSON.parse(require('fs').readFileSync('settings.json','utf8'))"`
2. `PAI/Algorithm/LATEST` contains `v3.8.0`
3. `v3.8.0.md` references to `ISC-Methodology.md` and `CapabilitySelection.md` resolve (files exist)
4. `v3.8.0.md` contains zero occurrences of `localhost:8888`
5. `hooks/ModeClassifier.hook.ts` registered first in `UserPromptSubmit` hooks array
6. `hooks/PromptAnalysis.hook.ts` registered second in `UserPromptSubmit` (after ModeClassifier)
7. `hooks/PreCompactContext.hook.ts` registered under `PreCompact` event (not SessionStart)
8. All 4 original terminal hook files deleted; `TerminalState.hook.ts` exists with all 4 handlers
9. `VoiceServer/` directory does not exist
10. `hooks/VoiceCompletion.hook.ts` does not exist
11. `hooks/handlers/VoiceNotification.ts` does not exist
12. No `mainDAVoiceID` in `identity.ts` or `settings.json`
13. No `localhost:8888` in any `.ts` file under `hooks/` or `PAI/Tools/`
14. `bun test` passes all tests in `tests/` directory
15. TELOS/DIGEST.md in `loadAtStartup` array
16. `config/spinner-verbs.json` and `config/spinner-tips.json` exist
17. `PAI/dev/SKILLSYSTEM-Reference.md` and `THEHOOKSYSTEM-Reference.md` exist with full original content
18. MEMORYSYSTEM.md migration history section removed, MEMORY-CHANGELOG.md exists
19. No remaining hardcoded `$HOME/.claude` in any hook or tool file
20. PR created on DevenDucommun fork targeting danielmiessler/Personal_AI_Infrastructure
