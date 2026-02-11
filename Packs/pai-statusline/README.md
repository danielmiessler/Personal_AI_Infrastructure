---
name: PAI Status Line
pack-id: danielmiessler-pai-statusline-v2.3.0
version: 2.3.0
author: danielmiessler
description: Rich terminal status line for Claude Code showing context usage, git status, memory stats, learning signals with sparklines, and inspirational quotes
type: feature
purpose-type: [display, observability, ux]
platform: claude-code
dependencies: [jq]
keywords: [statusline, status, terminal, display, context, git, memory, learning, sparklines, quotes, ux, observability]
---

<p align="center">
  <img src="../icons/pai-statusline.png" alt="PAI Status Line" width="256">
</p>

# PAI Status Line (pai-statusline)

> Rich terminal status line for Claude Code - real-time visibility into context, git, memory, learning, and more

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your DA and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | Purpose |
|-----------|---------|
| statusline-command.sh | Main status line script (833 lines) |
| settings.json config | Status line configuration block |

**Summary:**
- **Files created:** 1 (statusline-command.sh)
- **Settings updated:** statusLine configuration block
- **Dependencies:** `jq` (JSON processor - install via `apt install jq` on Linux or `brew install jq` on macOS)

## The Problem

Claude Code provides basic information, but lacks rich terminal feedback:

- No visual context usage indicator
- No git status at a glance
- No memory/learning statistics
- No trend visualization for ratings
- No inspirational content
- No location/weather context

Working without visibility into these metrics means:
- Context exhaustion surprises you
- Git state requires manual checking
- Learning progress is invisible
- No ambient information display

## The Solution

The PAI Status Line provides a comprehensive terminal display:

**Display Sections:**

```
── │ PAI STATUSLINE │ ──────────────────────────────────────────────────────
LOC: San Francisco, California │ 14:30 │ 18°C Clear
ENV: CC: 1.0.17 │ PAI: v2.3 │ Skills: 65 │ Workflows: 9 │ Hooks: 15
────────────────────────────────────────────────────────────────────────────
◉ CONTEXT: ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁  23% (47k/200k) │ ⏱ 2m34s
────────────────────────────────────────────────────────────────────────────
◈ PWD: .claude │ Branch: main │ Age: 2h │ Mod: 3 New: 1 │ ↑2
────────────────────────────────────────────────────────────────────────────
◎ MEMORY: 📁 544 Work │ ✦ 1765 Ratings │ ⊕ 790 Sessions │ ◇ 18 Research
✿ LEARNING: │ 7.2EXP │ 15m: 7.5 60m: 7.1 1d: 7.3 1w: 7.0 1mo: 6.8
   ├─ 15m:  ▃▄▅▄▃▅▆▅▄▃▂▃▄▅▆▅▄▃▂▁▂▃▄▅▄▃▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁
   ├─ 60m:  ▂▃▄▅▄▃▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁
   ├─ 1d:   ▁▂▃▄▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄
   ├─ 1w:   ▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄
   └─ 1mo:  ▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅
────────────────────────────────────────────────────────────────────────────
✦ "The only way to do great work is to love what you do." —Steve Jobs
```

**Features:**

| Section | Information |
|---------|-------------|
| **Header** | PAI branding, location, time, weather |
| **Environment** | Claude Code version, PAI version, skill/workflow/hook counts |
| **Context** | Visual progress bar with gradient colors, percentage, token counts, duration |
| **Git** | Directory, branch, commit age, modified/new files, sync status |
| **Memory** | Work projects, ratings, sessions, research file counts |
| **Learning** | Latest rating, time-windowed averages (15m, 1h, 1d, 1w, 1mo), sparkline trends |
| **Quote** | Rotating inspirational quotes with intelligent line wrapping |

**Responsive Modes:**

The status line adapts to terminal width:

| Mode | Width | Features |
|------|-------|----------|
| nano | <35 | Minimal - time, basic stats |
| micro | 35-54 | Compact - key metrics only |
| mini | 55-79 | Balanced - most information |
| normal | 80+ | Full - all features including sparklines |

## Line-by-Line Explanation

Each line of the status line serves a specific purpose in the PAI ecosystem:

### Line 1: PAI Header
```
── │ PAI STATUSLINE │ ──────────────────────────────────────────────────────
```
**What it does:** Visual branding and section header
**PAI integration:** Identifies this as a PAI system component. The decorative lines help visually separate the status line from Claude Code output.

### Line 2: Location & Time
```
LOC: San Francisco, California │ 14:30 │ 18°C Clear
```
**What it does:** Shows your current location, local time, and weather
**PAI integration:** Context awareness - your DA knows where and when you're working. Useful for time-sensitive tasks and creating location-aware responses.
**Data source:** ip-api.com (location), Open-Meteo (weather), both with caching

### Line 3: Environment
```
ENV: CC: 1.0.17 │ PAI: v2.3 │ Skills: 65 │ Workflows: 9 │ Hooks: 15
```
**What it does:** Shows software versions and PAI system inventory
**PAI integration:**
- **CC (Claude Code)**: The underlying platform version
- **PAI**: Your PAI installation version from settings.json
- **Skills**: Count of installed skill directories in `$PAI_DIR/skills/`
- **Workflows**: Count of workflow files across all skills
- **Hooks**: Count of active hooks in `$PAI_DIR/hooks/`

This line shows the "surface area" of your PAI system at a glance.

### Line 4: Context Usage
```
◉ CONTEXT: ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁  23% (47k/200k) │ ⏱ 2m34s
```
**What it does:** Visual context window usage with precise metrics
**PAI integration:** This is critical for session management. Claude Code has a limited context window (typically 200k tokens). As context fills up:
- **Green (0-33%)**: Plenty of room
- **Yellow (34-66%)**: Getting full, consider wrapping up
- **Red (67-100%)**: Session will soon need fresh start

The timer shows session duration. The bucket visualization (⛁) fills left-to-right with a color gradient.

**Why this matters:** Prevents surprise context exhaustion. When you see red, you know to finish current task and start fresh.

### Line 5: Git Status
```
◈ PWD: .claude │ Branch: main │ Age: 2h │ Mod: 3 New: 1 │ ↑2
```
**What it does:** Shows current git repository state
**PAI integration:** Your DA often works with code. This line shows:
- **PWD**: Current working directory (basename)
- **Branch**: Active git branch
- **Age**: Time since last commit (color-coded: cyan=fresh, indigo=stale)
- **Mod**: Modified files count
- **New**: Untracked files count
- **↑/↓**: Commits ahead/behind remote

**Why this matters:** Before committing or pushing, you can see the repo state at a glance without running `git status`.

### Line 6: Memory Statistics
```
◎ MEMORY: 📁 544 Work │ ✦ 1765 Ratings │ ⊕ 790 Sessions │ ◇ 18 Research
```
**What it does:** Shows PAI memory system statistics
**PAI integration:** The MEMORY system is how PAI remembers across sessions:
- **📁 Work**: Active work directories in `MEMORY/WORK/` - ongoing projects and tasks
- **✦ Ratings**: Entries in `ratings.jsonl` - your feedback signals over time
- **⊕ Sessions**: Session log files (`.jsonl`) - captured conversation history
- **◇ Research**: Research outputs from agent completions in `MEMORY/RESEARCH/`

**Why this matters:** Shows the depth of PAI's accumulated knowledge about your work patterns.

### Line 7: Learning Signal
```
✿ LEARNING: │ 7.2EXP │ 15m: 7.5 60m: 7.1 1d: 7.3 1w: 7.0 1mo: 6.8
```
**What it does:** Shows rating trends across multiple time windows
**PAI integration:** This is the core of PAI's learning feedback loop:
- **✿**: Green florette symbol representing growth
- **7.2EXP**: Latest rating (EXP=explicit user rating, IMP=inferred from sentiment)
- **Time windows**: Average ratings over 15 minutes, 1 hour, 1 day, 1 week, 1 month

Colors indicate rating quality (green=high, red=low). Trending data helps identify if performance is improving or declining.

### Lines 8-12: Sparklines (Normal Mode Only)
```
   ├─ 15m:  ▃▄▅▄▃▅▆▅▄▃▂▃▄▅▆▅▄▃▂▁▂▃▄▅▄▃▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁
```
**What it does:** Visual rating trends over time
**PAI integration:** Each sparkline shows 58 time buckets for that period:
- Bar height indicates average rating in that time slice
- Color indicates direction: blue/green=above baseline, orange/red=below
- Empty spaces (dim) mean no data for that time slice

**Why this matters:** Visual pattern recognition - see at a glance if ratings are trending up, down, or stable.

### Line 13: Quote
```
✦ "The only way to do great work is to love what you do." —Steve Jobs
```
**What it does:** Displays an inspirational quote
**PAI integration:** Ambient inspiration. Quotes rotate every 30 seconds (when API key is configured). Long quotes wrap intelligently across two lines, breaking at word boundaries.

**Why this matters:** Subtle reminder of broader purpose while doing detailed work.

---

## How It Fits Into PAI

The status line is the **observability layer** of PAI. It connects to multiple PAI subsystems:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAI ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Skills  │   │  Hooks   │   │  Memory  │   │ Settings │     │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘     │
│       │              │              │              │            │
│       └──────────────┼──────────────┼──────────────┘            │
│                      │              │                           │
│                      ▼              ▼                           │
│              ┌───────────────────────────┐                      │
│              │     STATUS LINE           │ ◄── You are here    │
│              │  (Observability Layer)    │                      │
│              └───────────────────────────┘                      │
│                      │                                          │
│                      ▼                                          │
│              ┌───────────────────────────┐                      │
│              │    Terminal Display       │                      │
│              └───────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Integration points:**
1. **Skills** → Counted and displayed (Skills: N)
2. **Hooks** → Counted and displayed (Hooks: N), also invokes status line via Stop hook
3. **Memory** → Reads WORK, RESEARCH, SIGNALS directories for counts and sparklines
4. **Settings** → Reads PAI version, configured via statusLine block

The status line runs after every Claude Code response (via the Stop hook lifecycle), providing real-time feedback on system state.

---

## Architecture

```
statusline-command.sh
├── Terminal width detection (Kitty IPC, stty, tput fallbacks)
├── JSON input parsing (context, model, timing data)
├── Resource counting (skills, workflows, hooks, memory)
├── Location/weather caching (1hr/15min TTL)
├── Rating analysis with jq (time windows, trends, sparklines)
├── Quote rotation with intelligent wrapping
└── ANSI color output (Tailwind-inspired palette)
```

**Data Sources:**

- **Context data**: Passed via JSON from Claude Code hooks
- **Git status**: Direct git commands
- **Location**: ip-api.com with 1-hour cache
- **Weather**: Open-Meteo API with 15-minute cache
- **Ratings**: `$PAI_DIR/MEMORY/LEARNING/SIGNALS/ratings.jsonl`
- **Quotes**: ZenQuotes API (requires API key for unlimited)

## Configuration

The status line is configured in `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "${PAI_DIR}/statusline-command.sh"
  }
}
```

**Optional Environment Variables:**

| Variable | Purpose |
|----------|---------|
| `ZENQUOTES_API_KEY` | Unlimited quote access (optional) |
| `PAI_DIR` | PAI installation directory (defaults to `~/.claude`) |

## Color Palette

The status line uses a Tailwind-inspired color scheme:

- **Context bar**: Green → Yellow → Orange → Red gradient based on usage
- **Ratings**: Color-coded by value (green=high, red=low)
- **Sparklines**: Diverging from baseline (blue=above, orange=below)
- **Git**: Age-based coloring (fresh=cyan, stale=indigo)
- **Learning**: Green florette symbol for growth theme

---

## See Also

- [PAI Hook System](../pai-hook-system/) - Event automation framework
- [PAI Core Install](../pai-core-install/) - Foundation skill
- [PAI Voice System](../pai-voice-system/) - Audio notifications
