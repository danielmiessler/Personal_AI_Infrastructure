# Terminal Configuration (Kitty)

This directory contains the terminal configuration for [Kitty](https://sw.kovidgoyal.net/kitty/), a fast, feature-rich, GPU-based terminal emulator.

## Contents

- `kitty.conf` - Main Kitty configuration file
- `ZSHRC` - Shell configuration with PAI alias
- `shortcuts.md` - Keyboard shortcuts reference
- `ul-circuit-embossed-v5.png` - Background image

## Installation

1. **Install Kitty:**
   ```bash
   brew install --cask kitty
   ```

2. **Install Hack Nerd Font:**
   ```bash
   brew install --cask font-hack-nerd-font
   ```

3. **Copy configuration:**
   ```bash
   mkdir -p ~/.config/kitty
   cp ~/.claude/skills/PAI/USER/TERMINAL/kitty.conf ~/.config/kitty/
   ```

4. **Add shell aliases:**
   Add the contents of `ZSHRC` to your `~/.zshrc`:
   ```bash
   cat ~/.claude/skills/PAI/USER/TERMINAL/ZSHRC >> ~/.zshrc
   source ~/.zshrc
   ```

## Theme

This configuration uses **Tokyo Night Storm** with custom colors and a dark, professional aesthetic optimized for long coding sessions.

---

## Tab System

### Tab Bar Configuration

The tab bar uses Kitty's powerline style with these base settings:

```
tab_bar_edge top
tab_bar_style powerline
tab_bar_min_tabs 1
tab_title_template "{index}: {title}"
```

**Base Tab Colors (Static):**
- Active tab: Dark blue (`#1244B3`) with white text
- Inactive tab: Dark gray (`#1a1b26`) with muted text (`#787c99`)

### Dynamic Tab States

The PAI hook system dynamically updates tab titles and colors to provide real-time visual feedback about what the AI is doing. This creates a glanceable status system across multiple terminal tabs.

#### Color States (Inactive Tabs Only)

When a tab is inactive (not focused), the background color indicates the current state:

| State | Color | Hex | Visual Indicator |
|-------|-------|-----|------------------|
| **Inference/Thinking** | Dark Purple | `#1E0A3C` | 🧠 prefix, "…" suffix |
| **Actively Working** | Dark Orange | `#804000` | ⚙️ prefix, "…" suffix |
| **Awaiting User Input** | Dark Teal | `#085050` | ❓ prefix |
| **Completed Successfully** | Dark Green | `#022800` | ✓ prefix |
| **Error State** | Dark Orange | `#804000` | ⚠ prefix, "!" suffix |

**Note:** The active (focused) tab always remains dark blue (`#002B80`) regardless of state.

---

## Hook Integration

Three hooks work together to manage dynamic tab updates:

### 1. UpdateTabTitle.hook.ts (UserPromptSubmit)

**Trigger:** Every time a user submits a prompt

**Flow:**
1. Immediately sets tab to purple with "🧠Processing…" (inference state)
2. Calls Haiku AI to generate a 3-4 word gerund summary (e.g., "Fixing auth bug")
3. Updates tab to orange with "⚙️[Summary]…" (working state)
4. Announces the summary via voice server

**Summary Format:**
- Always starts with a gerund (Checking, Fixing, Creating, etc.)
- 3-4 words maximum
- Uses conversation context to resolve pronouns (it, that, this)

**Examples:**
- "Checking config"
- "Debugging auth"
- "Creating component"
- "Fixing type errors"

### 2. SetQuestionTab.hook.ts (PreToolUse: AskUserQuestion)

**Trigger:** When Claude invokes the AskUserQuestion tool

**Action:** Sets tab to teal with "❓𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡" title, indicating the system is waiting for user input.

### 3. tab-state.ts (Stop/Completion)

**Trigger:** When a response completes (via StopOrchestrator)

**States:**
- `completed` - Green background, ✓ prefix
- `awaitingInput` - Teal background, ? suffix
- `error` - Orange background, ⚠ prefix, ! suffix

**Title:** Extracts the voice line (🗣️) from the response for a completion summary.

---

## Kitty Remote Control

All hooks use Kitty's remote control feature to update tabs programmatically:

```bash
# Set tab title
kitty @ set-tab-title "My Title"

# Set tab colors (active stays blue, inactive shows state)
kitten @ set-tab-color --self \
  active_bg=#002B80 active_fg=#FFFFFF \
  inactive_bg=#804000 inactive_fg=#A0A0A0
```

**Requirements:**
- `allow_remote_control yes` in kitty.conf
- `listen_on unix:/tmp/kitty` for socket communication

---

## Glanceable Workflow

With multiple terminal tabs running different PAI sessions, you can instantly see:

1. **Purple tabs** - AI is thinking/inferring
2. **Orange tabs** - Actively working on a task
3. **Teal tabs** - Waiting for your input
4. **Green tabs** - Completed successfully
5. **The title** - Short description of current task

This enables efficient management of parallel AI sessions without needing to check each one individually.

---

## Troubleshooting

**Tabs not updating:**
- Verify `allow_remote_control yes` is in kitty.conf
- Check `KITTY_LISTEN_ON` environment variable is set
- Ensure hooks are enabled in Claude Code settings

**Colors not showing:**
- Tab colors only change on inactive tabs
- Active tab always remains dark blue by design
- Switch to another tab to see the state color

**Voice not working:**
- Voice server must be running (`~/.claude/VoiceServer/`)
- Tab updates work independently of voice
