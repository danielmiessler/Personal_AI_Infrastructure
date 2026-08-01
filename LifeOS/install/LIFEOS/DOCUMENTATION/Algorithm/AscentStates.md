---
version: 1.3.0
last_updated: 2026-07-30
convention: pai-freshness-v1
source_of_truth: LIFEOS/TOOLS/ascent.ts
---

# Ascent States — what a run is doing, everywhere

> **The table is code, not this file.** `LIFEOS/TOOLS/ascent.ts` is the single source of truth for every icon, name, colour and tab background. This doc explains the model; it never restates the values. Change an icon there and every surface changes at once.

## The problem this solved

The Algorithm has no phases left. The 8-station enum was retired 2026-07-14; `phase:` in ISA frontmatter is a minimal lifecycle bracket, and everything interesting about a run — what it's doing this minute — is *derived* from run data.

But the display never caught up. As of 2026-07-27 the same concept was spelled four different ways:

| Surface | Vocabulary it used |
|---|---|
| Kitty tabs | 9 retired station keys + `STARTING`/`SCOPING`/`CLIMBING`, icons `👁️🧠📋🔨⚡✅📚🧭🏔️` |
| Pulse board | `basecamp` / `routefinding` / `ascending` / `verifying` / `summit` / `camped` / `done` / `session` |
| ISA HTML mirror | `scoping` / `climbing` / `learning` / `done` |
| Status line | nothing at all |
| cmux sidebar | retired stations only — every current run fell through to the default |

Nothing agreed with anything. A run read `CLIMBING` in a tab and `Ascending` on the board, and three separate hand-maintained allowlists had silently stopped matching the live vocabulary — causing real bugs, not just cosmetic drift (see § Drift bugs below).

## The model

**One derivation, two fidelities.**

`deriveAscent(input)` resolves a run's state from what its data actually shows. Declared stations rot; derived states can't, because they *are* the data.

- **Hooks** call it with what the ISA declares → the **bracket**.
- **Pulse** calls it with the live tool stream on top → the **in-flight detail**.

Both agree on the bracket, so a Kitty tab can never contradict the board — the board is just more precise. The status line reads a resolved blob written onto the `work.json` row at sync time, so bash holds zero derivation logic and cannot drift.

```
ISA frontmatter phase:  ─┐
claims closed / total   ─┼─►  deriveAscent()  ─►  AscentState  ─►  ASCENT[state]
tracked / active        ─┤                                          │
live tool stream        ─┘  (Pulse only)                            │
                                                                    ├─► Kitty tab (icon, colour)
                                                                    ├─► cmux sidebar (pill, progress)
                                                                    ├─► work.json .ascent → status line
                                                                    ├─► Pulse board lane
                                                                    └─► ISA HTML mirror stage bar
```

## The states

The theme is climbing a hill you had to name first — the Algorithm's own loop. A run marks the summit (states what done means), ascends, anchors each hold in evidence, and leaves a cairn.

**SIX states since 2026-07-30** ({{PRINCIPAL_NAME}}: "unify them into six and then synchronize the six across the whole system"). These are UI/UX indicators only — the Algorithm itself doesn't consume them. The fold: Routefinding and Roped merged into Ascending (exploring and delegating are *how* you climb, not stages), Summit merged into Cairn (a minutes-long transient that was almost always an empty column). Legacy keys resolve forever via `LEGACY_ASCENT_ALIASES`.

| State | What it means | How it's derived |
|---|---|---|
| **Traverse** | Live work with no ISA — moving, no route declared | untracked + live |
| **Marking** | Articulating what done means — claims not yet on the hill | tracked + live + no claims parsed, or `phase: scoping`/`marking` |
| **Ascending** | On the wall — exploring, building, delegating; everything that moves the climb | tool stream exploring/building/delegating, or `phase: climbing` with no stream |
| **Anchoring** | Weighting a hold before trusting it — probes running, evidence landing | tool stream verifying |
| **Camped** | Quiet mid-hill — resumable, not dead | tracked + gone quiet |
| **Cairn** | Closed out — every claim held; the marker proving the route went | closed ≥ total, `phase: learn`, or `phase: complete` |
| *Idle* | Nothing running (not a run state; never a column) | untracked + quiet (hidden) |

**Anchoring is the verification doctrine in one word.** A climber weights a hold before trusting it; a claim closes on evidence, never on "should work."

## What the model writes

Nothing new. The ISA still declares a **minimal bracket** — an active value at run start, `complete` at close, updated in between only when it genuinely changes. `marking` is accepted alongside `scoping`; both resolve identically, so the vocabulary can converge without a migration. Every retired station name still parses forever.

This is deliberate: the fix was to make the *display* derive more, not to make the model declare more.

## Drift bugs this design prevents — and the ones it didn't

Deriving from the table removes the bug wherever the derivation is actually used. It does nothing for a consumer that quietly keeps its own list, which is why this class has now recurred five times. Enforcement, not design, is what closed it: the `/ic` `ascent-vocabulary` gate, whose **phase-key lane** (2026-07-30) fails any bracketed literal in `hooks/`, `LIFEOS/TOOLS/` or Pulse src that enumerates 3+ `PHASE_TO_ASCENT` keys. Literals whose statement already references the table are exempt — a filter applied to derived keys is derivation, not a second spelling.

Found 2026-07-27, all fixed by deriving from `PHASE_TO_ASCENT`:

1. **`ISASync` stopped repainting tabs mid-run** — its `VALID_PHASES` allowlist gated the tab update; unknown values were dropped silently.
2. **`PromptProcessing` wiped a run's tab on every follow-up prompt** — its `ALGO_PHASES` set listed only retired stations, so `algoIteration` was always false and the generic orange gear overwrote the run's state. This was the exact regression a comment in that file claimed to have fixed.
3. **`ACTIVE_LOOKUP_PHASES` in `isa-utils.ts` matched no current run** — `scoping` and `climbing` were never added, so SessionEnd lookups missed every 8.x run.

Found 2026-07-30, when the new gate's first run enumerated the rest of the class:

4. **Both ISA nudge rows were silent for a week** — `AlgorithmNudge`'s `ACTIVE_PHASES` held the retired 8-station enum, so no run resolved as live and `stale-isa` never fired (last fire 2026-07-23; `toolCallsSinceISAEditAbs` = 0 across all 392 recorded sessions). Its sibling `hasRegisteredRun` counted the `native-<uuid>` placeholder as a registered run, so `late-isa` had never fired once. A nudge that doesn't fire breaks nothing visibly — nothing fails, so nothing tells you.
5. **`ULWorkSync` and `WorkSweep` each carried `["execute","verify","learn","complete"]`** — a modern `climbing` run read as an abandoned scaffold, so it was skipped for issue creation.

For consumers that hold only a phase string and no claim counts, `phaseBracket()` and `phaseHasWorkStarted()` are the sanctioned readers — feeding a countless row to `deriveAscent` correctly reports `marking`, which is the wrong answer to "has work started?".

### The row's `ascent` blob is derived state that we store

`work.json` rows carry a denormalized `{key, icon, label, color}` for exactly ONE consumer: `LIFEOS_StatusLine.sh`, which is a pure `jq` read and cannot derive anything. **The Pulse board does not read it** — `lifecycle.ts` re-derives with the live tool stream, so a stale blob corrupts the status line only. (Board drift is a different lane: stale `phase` in the row.)

Stored derived state has one rule: **any writer that moves a row's `phase` or `progress` recomputes the blob through `applyAscent()` in `hooks/lib/isa-utils.ts`** — the single derivation site, which reads `tracked` off the row's own `isa` pointer so placeholder rows resolve to 🥾 traverse rather than a run state.

Four writers touch rows. `syncToWorkJson`, `WorkReconcile` and `SessionCleanup` all call it; `upsertSession` writes placeholder rows and leaves them blob-less, which the status line handles by rendering no chip. Two of the four skipped the recompute until 2026-07-30 — `WorkReconcile` reconciled a row to `climbing 6/7` while its blob still said 📐 Marking, and `SessionCleanup` stamped `complete` over a blob still reading 🧗 Ascending — leaving six rows contradicting themselves. `WorkReconcile` now heals this BEFORE its per-ISA mtime memo, so a blob that was wrong at write time recovers without the ISA file ever changing.

## Consumers

| File | Reads |
|---|---|
| `hooks/lib/tab-constants.ts` | re-exports the table; owns only the non-run tab colours |
| `hooks/lib/tab-setter.ts` | `setAscentTab()`, cmux pill + progress, prefix stripping |
| `hooks/ISASync.hook.ts` | derives on phase change, stamps the tab |
| `hooks/lib/isa-utils.ts` | writes the `ascent` blob onto the `work.json` row |
| `hooks/PromptProcessing.hook.ts` | re-stamps the run's state across iterations; stamps `traverse` for un-ISA'd work and skill runs (the pre-Algorithm ⚙️ working gear is retired, 2026-07-28 — 🧠 thinking remains as the transient prompt-processing flash) |
| `hooks/TabState.hook.ts` | question flow — carries the run's ascent through the teal question stamp via `previousAscent`, restores it after (fallback `traverse`) |
| `hooks/handlers/TabState.ts` | stamps `cairn` at completion |
| `LIFEOS/LIFEOS_StatusLine.sh` | pure `jq` read of `.ascent` |
| `PULSE/Observability/src/lib/lifecycle.ts` | `deriveLifecycle` = `deriveAscent` + tool stream |
| `PULSE/Observability/.../WorkBoard.tsx` | static lanes from the table's `board` placement field (2026-07-30 — every run state is a permanent column; lane membership is table policy, never a component-local list), ordering, table glyphs |
| `LIFEOS/TOOLS/ISARender.ts` | stage bar + phase badge |
| `hooks/AlgorithmNudge.hook.ts` | `isTrackedRow` / `isInFlightRow` — which rows count as a registered run and as live, for the ISA nudge rows |
| `hooks/ULWorkSync.hook.ts`, `LIFEOS/TOOLS/WorkSweep.ts` | `phaseHasWorkStarted()` — has the run left articulation |
| `LIFEOS/TOOLS/IntegrityCheck.ts` | the gate: label + icon lanes, living-doc lane, phase-key lane |
