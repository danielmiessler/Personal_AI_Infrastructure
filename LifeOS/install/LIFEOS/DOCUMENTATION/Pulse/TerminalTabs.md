---
version: 1.4.2
---

# Terminal Tab State System

## Overview

The LifeOS system uses Kitty terminal tab colors and title suffixes to provide instant visual feedback on session state. At a glance, you can see which tabs are working, completed, waiting for input, or have errors.

## State System

| State | Icon | Format | Suffix | Inactive Background | When |
|-------|------|--------|--------|---------------------|------|
| **Inference** | 🧠 | Normal | `…` | Purple `#1E0A3C` | AI thinking (Haiku/Sonnet inference) |
| **Working** | ⚙️ | *Italic* | `…` | Orange `#804000` | Processing your request |
| **Completed** | ✓ | Normal | (none) | Green `#022800` | Task finished successfully |
| **Awaiting Input** | ❓ | **BOLD CAPS** | (none) | Teal `#0D4F4F` | AskUserQuestion tool used |
| **Error** | ⚠ | Normal | `!` | Orange `#804000` | Error detected in response |

**Text Colors:**
- Active tab: White `#FFFFFF`
- Inactive tab: Gray `#A0A0A0`

**Active Tab Background:** Always Dark Blue `#002B80` (regardless of state)

**Key Design:** State colors only affect **inactive** tabs. The active tab always stays dark blue so you can quickly identify which tab you're in. When you switch away from a tab, you see its state color.

## How It Works

### Two-Hook Architecture

**1. UserPromptSubmit (Start of Work)**
- Hook: `SessionAnalysis.hook.ts`
- Sets title with `…` suffix
- Sets background to orange (working)
- Announces via voice server

**2. Stop (End of Work)**
- Hook: `SessionAnalysis.hook.ts` → `handlers/TabState.ts`
- Detects final state (completed, awaiting input, error)
- Sets appropriate suffix and color
- Voice notification with completion message

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

| Scenario | Tab Appearance | Notes |
|----------|----------------|-------|
| AI inference running | `🧠 Analyzing…` (purple when inactive) | Brain icon shows AI is thinking |
| Processing request | `⚙️ 𝘍𝘪𝘹𝘪𝘯𝘨 𝘣𝘶𝘨…` (orange when inactive) | Gear icon + italic text |
| Task completed | `✓Fixing bug` (green when inactive) | Checkmark, normal text |
| Need clarification | `❓𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡` (teal when inactive) | Bold ALL CAPS |
| Error occurred | `⚠Fixing bug!` (orange when inactive) | Warning icon + exclamation |

**Note:** Active tab always shows dark blue (#002B80) background. State colors only visible when tab is inactive.

### One session, watched through the tab

Picture five tabs open across two projects. You type a prompt into tab three and switch away to read tab one. Here is the whole system doing its job, hands-off:

- The moment you submit, tab three goes **orange with an italic gear** and a `…` suffix — it is working. You didn't touch it; the UserPromptSubmit hook painted it.
- Mid-run the model stops to think, and the tab flips **purple with the 🧠 brain** — inference in flight — then back to orange when tool work resumes.
- The run finishes clean, so at Stop the tab settles to **green with a ✓** and no suffix. From tab one, you see green in your peripheral vision and know tab three is done without reading a word.
- Had the run instead asked you a question, the tab would be **teal, bold ALL CAPS** — the one color that means *you* are the blocker. Teal is the tab you walk back to first.

The active tab you are actually looking at never changes color — it stays dark blue — so "which tab am I in" and "what state is everything else in" never fight for the same signal.

### The state machine behind the paint

```mermaid
stateDiagram-v2
    [*] --> Working: you submit a prompt
    Working --> Inference: model starts thinking
    Inference --> Working: back to tool work
    Working --> Completed: response finished clean
    Working --> AwaitingInput: it asks a question
    Working --> Error: status reports a failure
    AwaitingInput --> Working: you answer
    Completed --> Working: next prompt
    Error --> Working: next prompt
```

Every edge is driven by a hook, never by hand: the working and inference states come from `PromptProcessing.hook.ts` on submit, and the three terminal states — completed, awaiting-input, error — are chosen by `handlers/TabState.ts` at Stop from what the transcript actually shows. A green tab is a claim the run finished; a teal tab is a claim it needs you.

### Text Formatting

- **Working state:** Uses Unicode Mathematical Italic (`𝘈𝘉𝘊...`) for italic appearance
- **Question state:** Uses Unicode Mathematical Bold (`𝗔𝗕𝗖...`) in ALL CAPS

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

```typescript
// hooks/lib/tab-constants.ts — single source of truth for tab colors/states
working:   { inactiveBg: '#804000', inactiveFg: '#A0A0A0', label: 'orange' },
thinking:  { inactiveBg: '#1E0A3C', inactiveFg: '#A0A0A0', label: 'purple' },
// full state map + active-tab colors live in the same file
const INACTIVE_TEXT = '#A0A0A0';        // Gray

// In TabState.hook.ts PreToolUse branch (via lib/tab-constants.ts)
const TAB_AWAITING_BG = '#0D4F4F';     // Dark teal (waiting for input)

// In handlers/TabState.ts (via lib/tab-constants.ts)
const TAB_COLORS = {
  awaitingInput: '#0D4F4F', // Dark teal
  completed: '#022800',     // Dark green
  error: '#804000',         // Dark orange
};

// Tab icons and formatting
const TAB_ICONS = {
  inference: '🧠',   // Brain - AI thinking
  working: '⚙️',     // Gear - processing (italic text)
  completed: '✓',    // Checkmark
  awaiting: '❓',    // Question (bold caps text)
  error: '⚠',       // Warning
};

const TAB_SUFFIXES = {
  inference: '…',
  working: '…',
  awaitingInput: '',  // No suffix, uses bold QUESTION
  completed: '',
  error: '!',
};
```

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
