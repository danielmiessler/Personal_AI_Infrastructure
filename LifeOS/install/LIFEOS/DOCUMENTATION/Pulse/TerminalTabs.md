---
version: 2.0.0
---

# Terminal Tab State System

## Overview

Every Kitty tab shows two orthogonal signals, both drawn from the ONE ascent table (`LIFEOS/TOOLS/ascent.ts`):

- **The tab COLOR is the run's ascent state** — the same staging the Pulse phase list uses ({{PRINCIPAL_NAME}}, 2026-08-12: "tab colors the same as the color of the task in the phase list"). Traverse is gray (off-scheme — no ISA), then the arc escalates blue → green: marking → ascending → anchoring → camped → cairn. Tabs wear the dark register of each hue (`tabBg`); Pulse wears the brights (`color`). Same table row, two registers.
- **A second emoji on the title is the ACTIVITY** — whether anything is moving and whether {{PRINCIPAL_NAME}} is the blocker: `⚡` working, `⏳` waiting on him (question or approval), `✅` done, `💤` quiet. Table: `TAB_ACTIVITY`; defaults derive from the state (`defaultTabActivity`), and only the question/approval stamps override with `⏳`.

Title shape: `{stateIcon}{activityGlyph} {description}` — e.g. `🧗⚡ Fixing tab colors.`, `🧗⏳ APPROVE: Bash git push…`, `🪨✅ Fixed tab colors`.

**The 2026-08-12 fold:** the old generic color layer (working orange, thinking purple, native orange, question teal, blocked amber) is RETIRED. Every live stamp routes through `setAscentTab`, so a painted tab is always one of the six state colors; "waiting on you" is carried by the ⏳ glyph, not a special color. `TAB_COLORS` in `hooks/lib/tab-constants.ts` keeps the retired entries only for stale state files.

**Text Colors:**
- Active tab: White `#FFFFFF`
- Inactive tab: Gray `#A0A0A0`

**Active Tab Background:** Always Dark Blue `#002B80` (regardless of state)

**Key Design:** State colors only affect **inactive** tabs. The active tab always stays dark blue so you can quickly identify which tab you're in. When you switch away from a tab, you see its state color.

## How It Works

### Two-Hook Architecture

**1. UserPromptSubmit (Start of Work)**
- Hook: `PromptProcessing.hook.ts`
- Re-stamps a live run's ascent state, or `traverse` for un-ISA'd work (default `⚡`)
- Announces via voice server (desktop channel)

**2. Stop (End of Work)**
- Hook: `TabState.hook.ts` → `handlers/TabState.ts`
- Stamps `cairn` (`🪨✅`) with a past-tense summary
- Voice completion notification handled separately by `VoiceCompletion.hook.ts` (also registered on Stop)

`TabState.hook.ts` additionally handles the PreToolUse/PostToolUse `AskUserQuestion` legs and PermissionRequest: both stamp `⏳` ON THE RUN'S ASCENT COLOR (carrying `previousTitle`/`previousAscent` for the restore), and the PostToolUse leg restores the prior state. `SessionAnalysis.hook.ts`, named here in earlier versions of this doc, is retired — see `ObservabilitySystem.md` § Session State Tracking.

### State Detection Logic

```typescript
function detectResponseState(lastMessage, transcriptPath): ResponseState {
  // Check for AskUserQuestion tool → 'awaitingInput'
  // Check for error patterns in STATUS section → 'error'
  // Default → 'completed'
}
```

**Awaiting Input Detection:**
- Scans last 20 transcript entries for `AskUserQuestion` tool use

**Error Detection:**
- Checks `📊 STATUS:` section for: error, failed, broken, problem, issue
- Checks for error keywords + error emoji combination

## Examples

| Scenario | Tab Appearance | Inactive fill |
|----------|----------------|---------------|
| Untracked work in flight | `🥾⚡ Researching pet stores.` | Traverse dark gray `#3B4048` |
| Run articulating done | `📐⚡ Marking the summit.` | Marking dark blue `#1E3A6F` |
| Run building | `🧗⚡ Fixing auth bug.` | Ascending dark cyan `#0F4666` |
| Probes running | `⚓⚡ Testing the hold.` | Anchoring dark teal `#135247` |
| Question pending | `🧗⏳ Auth method` | The run's own state color |
| Approval pending | `🧗⏳ APPROVE: Bash git push…` | The run's own state color |
| Run gone quiet | `⛺💤 Fixing auth bug.` | Camped dim slate `#262B40` (off the gradient — a pause isn't progress) |
| Turn finished | `🪨✅ Fixed auth bug` | Cairn dark green `#0A4D33` |

**Note:** Active tab always shows dark blue (#002B80). State colors only visible when a tab is inactive — you see the whole hillside from whichever tab you're in: gray hasn't declared a route, blue-to-teal is climbing, ⏳ means you are the blocker, green is done.

### The state machine behind the paint

The color axis follows `deriveAscent()` — the same derivation the Pulse board uses, so a tab can never contradict a lane. The activity axis is stamped by whichever hook fired last: `PromptProcessing` (⚡ on submit), `TabState` PreToolUse/PermissionRequest (⏳) and PostToolUse (restore to ⚡), `handlers/TabState.ts` at Stop (✅ via cairn).

## Mode/Tier Token (title prefix) — RETIRED 2026-07-11

> **History only.** The mode/tier token was retired 2026-07-11 when mode/tier classification (MINIMAL/NATIVE/ALGORITHM, E1–E5) was abolished system-wide and `TheRouter.hook.ts` — the authoritative classifier described below — was deleted. No successor stamps an `E{tier}`/`N` token. The last token plumbing (`setModeToken`, `MODE_TOKEN_RE`) was deleted in the 2026-07-14 phase-machinery deep strip — nothing lingers in `tab-setter.ts`/`PromptProcessing.hook.ts` (stale claim flagged via public issue #1598, @anikinsasha). The Algorithm Phase Tab System below still runs (phase icons/colors), minus the tier-token prefix. The description below is kept for history.

Every tab title used to lead with a **mode/tier token** so you could see at a glance what kind of turn each tab was running:

- **`N`** — a NATIVE turn. Rendered in a lighter, brighter orange (`#C2660A`, the `native` state in `TAB_COLORS`) so native work is visually distinct from Algorithm's darker build/execute oranges.
- **`E1`–`E5`** — an ALGORITHM run at that effort tier.

Canonical title format: **`{TOKEN} {ICON} {summary}`** — e.g. `N ⚙️ Fixing tab titles.` or `E3 🔨 Building phase tabs.`

**Single authority — historical (2026-07-01 coordination fix; moot since the mode/tier system was deleted 2026-07-11).** The mode/tier token was owned by ONE writer — `TheRouter.hook.ts`, the authoritative classifier — so the tab, `work.json`, and the Pulse Agents/Lattice page all projected the SAME decision. Before this fix, `PromptProcessing.hook.ts` stamped the token from its own 8-verb `isNativeMode()` shadow-classifier, which diverged from TheRouter and showed `N` on ALGORITHM turns (e.g. a prompt like "analyze… and fix" has none of the 8 verbs); the correct tier token only appeared once an ISA existed and its phase advanced.

Where the token came from (all historical — TheRouter deleted 2026-07-11):

- **TheRouter (authority — historical, deleted 2026-07-11)** — the instant it classified, `TheRouter.hook.ts` calls `setModeToken(sessionId, token)` (`tab-setter.ts`): `E{tier}` for ALGORITHM, `N` for NATIVE (MINIMAL leaves the tab). `setModeToken` sets/replaces ONLY the leading token, preserves the live working description, and clears any prior-turn `✅ completed` state — so a stale "done" can't linger into live work, in EITHER direction (an ALGORITHM turn never shows `N`, a NATIVE turn after an ALGORITHM turn clears the stale `E{tier}`/`✅`). TheRouter also persists the tier into `work.json` (`markAlgorithmStarting(uuid, hint, tier)`) so the Agents page is tier-correct before any ISA exists.
- **PromptProcessing (description only)** — sets the working gerund description; it no longer classifies mode. It recovered the token TheRouter stamped (both deleted 2026-07-11) via `extractModeToken(readTabState())`, but ONLY when the tab shows live work — a stale completion/idle token is dropped (TheRouter re-stamps the authoritative one ~concurrently). This is the race contract: TheRouter owns the token, PromptProcessing owns the description, each preserves the other's field.
- **AlgoPhase + ISASync (phase)** *(historical — AlgoPhase retired 2026-07-14)* — both stamped `setPhaseTab(phase, sessionUUID, undefined, eLevel)` at transitions (idempotent, same `E{tier}`+phase-icon output): `AlgoPhase.ts` on the explicit CLI phase write (the SAME write that updates `work.json`, keeping tab ↔ Agents-page congruent), `ISASync.hook.ts` on the ISA-edit phase change (catches the scaffold and manual edits). `eLevel` comes from the row `effort` / ISA frontmatter via `effortToCanonicalELevel()`.
- **Completion** (historical, pre-2026-07-11) — `handlers/TabState.ts` calls `setPhaseTab('COMPLETE', …)` with no `eLevel`; `setPhaseTab` recovers the existing token (`extractModeToken`), so `N`/`E3` carries through to the green done state.

Historical symbol map (all deleted 2026-07-11): `stripPrefix()`, `extractModeToken()`, `setModeToken()` (all in `tab-setter.ts`) parse/mutate the token + icon; `MODE_TOKEN_RE` is the shared `^(N|E[1-5])\s+` matcher.

## Ascent Tab System (2026-07-27)

Separate from the State System above, **Algorithm runs** drive tab titles/colors via `setAscentTab()` in `hooks/lib/tab-setter.ts`. The title format is `{ICON} {description}` — for example `🧗 Fixing Algorithm state sync.`

**There are no phases and no per-surface icon tables.** Every glyph, label, colour and tab background comes from **`LIFEOS/TOOLS/ascent.ts`**, the one table also read by the cmux sidebar, `work.json`, the status line, the Pulse board, and the ISA HTML mirror. Change an icon there and it changes on every surface at once — that is the point of the file. See `LIFEOS/DOCUMENTATION/Algorithm/AscentStates.md` for the state set and what each one means.

Two fidelities, one derivation (`deriveAscent`):

- **Hooks** pass what the ISA declares and get the **bracket** — Marking, Ascending, Cairn (plus Camped when a tracked run goes quiet).
- **Pulse** passes the live tool stream on top and gets the **in-flight detail** — Anchoring, when the stream is verification-dominated (the 2026-07-30 six-state fold merged the other detail states into Ascending).

Both agree on the bracket, so a tab can never contradict the board; the board is simply more precise. An unrecognised phase value resolves through `PHASE_TO_ASCENT` instead of falling off a `switch`, which is what let the vocabulary rot silently twice before (see below).

**Why this replaced `PHASE_TAB_CONFIG` / `setPhaseTab`:** the old design hand-listed valid phase names in four separate places. When the Algorithm's vocabulary moved in 8.x, three of those lists were never updated — so `ISASync` stopped repainting tabs mid-run, `PromptProcessing` wiped a run's tab on every follow-up prompt, and `ACTIVE_LOOKUP_PHASES` in `isa-utils.ts` stopped matching any current run at SessionEnd. All three were vocabulary-drift bugs of the same shape, and all three are structurally impossible now: the lists are derived from the table.

**Two drivers feed `setAscentTab`** (a third, `LIFEOS/TOOLS/AlgoPhase.ts`, was retired 2026-07-14 in the agents-dashboard deep strip — phase is now written only via ISA frontmatter):

1. **`ISASync.hook.ts` (PostToolUse, Edit on ISA.md)** — the primary driver: fires when the Algorithm executor edits the ISA frontmatter `phase:` field (catches the scaffold write and manual phase edits), writes `work.json` (including the resolved `ascent` blob the status line reads) AND stamps the tab.
2. **`LIFEOS/PULSE/VoiceServer/voice.ts::tryPhaseCapture` (out-of-process)** — fires when an Algorithm phase-announcement voice call hits `/notify` with `phase` + `slug`. The daemon resolves the kitty socket via the per-session file at `MEMORY/STATE/kitty-sessions/{sessionUUID}.json` (written by `KittyEnvPersist.hook.ts` at SessionStart).

**Cross-process support details:**

- `tab-setter.ts::kittenBin()` resolves the `kitten` binary via `command -v`, falling back to `/Applications/kitty.app/Contents/MacOS/kitten` — required because the Pulse daemon runs under launchd with a restricted PATH that doesn't include `/Applications/*`.
- All `kitten @` invocations in `tab-setter.ts` pass `--match="id:{windowId}"` so the daemon (which has no focused kitty window) targets the correct tab instead of whichever tab happens to be focused.
- Fallback chain for socket discovery: process env (`KITTY_LISTEN_ON`) → per-session file → default `/tmp/kitty-$USER` socket.

## Terminal Compatibility

Requires **Kitty terminal** with remote control enabled:

```bash
# kitty.conf
allow_remote_control yes
listen_on unix:/tmp/kitty
```

## Implementation Details

### Kitty Commands Used

```bash
# Set tab title
kitty @ set-tab-title "Title here"

# Set tab colors
kitten @ set-tab-color --self \
  active_bg=#1244B3 active_fg=#FFFFFF \
  inactive_bg=#022800 inactive_fg=#A0A0A0
```

### Hook Files

Tab painting was consolidated into one hook, `TabState.hook.ts`, on 2026-07-10 — it dispatches on `hook_event_name`, merging the three former painters (`SetQuestionTab`, `QuestionAnswered`, `ResponseTabReset`, all deleted). Working-state on prompt submit stays in `PromptProcessing.hook.ts`.

| File | Event | Purpose |
|------|-------|---------|
| `PromptProcessing.hook.ts` | UserPromptSubmit | Set working state (italic text) |
| `TabState.hook.ts` (← `SetQuestionTab`) | PreToolUse (AskUserQuestion) | Set question state (teal); save previousTitle for restore |
| `TabState.hook.ts` (← `QuestionAnswered`) | PostToolUse (AskUserQuestion) | Restore working/orange state after the answer |
| `TabState.hook.ts` (← `ResponseTabReset`) → `handlers/TabState.ts` | Stop | Set final/completion state |

### Color Constants

ALL run-state colors and glyphs live in `LIFEOS/TOOLS/ascent.ts` — `ASCENT[state].tabBg/tabFg` (dark register) and `color` (Pulse brights), plus `TAB_ACTIVITY` for the ⚡/⏳/✅/💤 glyphs. Never restate the hex values in a consumer or in docs; `hooks/TabTitleComposition.test.ts` pins the staging. `hooks/lib/tab-constants.ts` keeps only `ACTIVE_TAB_BG` (#002B80), the idle entry, and retired legacy entries for stale state files.

**Key Point:** `active_bg` is always set to `#002B80` (dark blue). State colors are applied to `inactive_bg` only.

## Debugging

### Check Current Tab Colors

```bash
kitty @ ls | jq '.[].tabs[] | {title, id}'
```

### Manually Reset All Tabs to Completed

```bash
kitten @ set-tab-color --match all \
  active_bg=#002B80 active_fg=#FFFFFF \
  inactive_bg=#022800 inactive_fg=#A0A0A0
```

### Test State Colors

```bash
# Inference (purple) - inactive only
kitten @ set-tab-color --self active_bg=#002B80 inactive_bg=#1E0A3C

# Working (orange) - inactive only
kitten @ set-tab-color --self active_bg=#002B80 inactive_bg=#804000

# Completed (green) - inactive only
kitten @ set-tab-color --self active_bg=#002B80 inactive_bg=#022800

# Awaiting input (teal) - inactive only
kitten @ set-tab-color --self active_bg=#002B80 inactive_bg=#0D4F4F
```

**Note:** Always set `active_bg=#002B80` to maintain consistent dark blue for active tabs.

## Benefits

- **Visual Task Tracking** - See state at a glance without reading titles
- **Multi-Session Management** - Quickly identify which tabs need attention
- **Color-Coded Priority** - Teal tabs need input, green tabs are done
- **Automatic** - No manual updates needed, hooks handle everything

---

**Last Updated:** 2026-06-18
**Status:** Production - Implemented via hook system + out-of-process daemon phase updates. Mode/tier token (`N` / `E1`–`E5`) + lighter-orange native color added 2026-06-18.
