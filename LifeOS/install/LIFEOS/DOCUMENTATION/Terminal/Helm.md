---
version: 1.3.2
---

# Helm — the LifeOS Terminal (Optional)

## Overview

**This entire page is optional.** LifeOS runs in any terminal. But if you want the reference setup — the exact terminal LifeOS was built in — it has a name: **Helm**, a configuration layer on kitty (not a fork; upstream kitty installs via brew, unmodified). Helm gives you a **live-controlled tab bar** (top strip or left sidebar, one keystroke apart), vim-style pane navigation, a modal mux mode (Helm Deck), project sessions, the Tokyo Night Storm theme, and the remote-control socket that lets LifeOS hooks paint live session state onto your tabs.

Helm ships inside LifeOS. There is nothing to clone and nothing else to track: the whole thing lives next to this page.

```
LIFEOS/DOCUMENTATION/Terminal/
├── install.sh                      # one-command install (kitty, config link, Helm.app, helm on PATH)
├── bin/helm                        # the `helm` command — doctor, update
└── kitty/
    ├── kitty.conf                  # main config — tabs, theme, fonts, shortcuts
    ├── TabBar.ts                   # live tab-bar control — edge, width, dock, hide (bun)
    ├── tab_bar.py                  # custom top-edge bar — tabs share the full window width evenly
    ├── deck.conf                   # Helm Deck modal mux mode (cmd+;)
    ├── tokyo-night-storm.conf      # standalone theme file
    ├── cairn_clear_watcher.py      # clears the green "done" tab stamp on view
    ├── tab_refit_watcher.py        # re-fits the left sidebar when titles change
    ├── deck/DeckBar.ts             # session picker overlay (bun)
    └── sessions/example.kitty-session  # project session template
```

## Install

**Preferred** — one command. Installs kitty and a Nerd Font if they're missing, moves an existing `~/.config/kitty` *directory* aside with a timestamped backup (if it's already a symlink, only the link is repointed and it tells you where it used to point), links Helm's config in, builds a `Helm.app` wrapper for Spotlight and the Dock, and puts `helm` on your PATH:

```bash
bash ~/.claude/LIFEOS/DOCUMENTATION/Terminal/install.sh
```

Because the installer *links* rather than copies, updating LifeOS updates Helm — no separate update step. Run `helm doctor` any time to check the install. The installer is macOS-first: on Linux it expects you to have installed kitty yourself, then does everything else.

**Manual**, if you'd rather not run a script:

```bash
# 1. Kitty + a Nerd Font.  macOS:
brew install --cask kitty font-hack-nerd-font
#    Linux: install kitty from your package manager or https://sw.kovidgoyal.net/kitty/
#    and install any Nerd Font (https://www.nerdfonts.com) for the tab-bar icons.

# 2. Copy the config set into place (this overwrites — back up ~/.config/kitty first)
mkdir -p ~/.config/kitty
cp -R ~/.claude/LIFEOS/DOCUMENTATION/Terminal/kitty/ ~/.config/kitty/

# 3. Launch kitty (or reload with shift+cmd+r inside it)
```

The manual path gives you the same terminal, minus the `Helm.app` wrapper and the `helm` command. Note that the config's helper scripts reference `~/.config/kitty` by absolute path, so install there rather than at a custom `XDG_CONFIG_HOME`. Everything below explains what you just got.

## The tab bar — top strip or left sidebar, driven live

The bar starts as a top strip (`tab_bar_edge top`, `tab_bar_style custom`): `tab_bar.py` makes the tabs share the full window width evenly — few tabs get long titles, many tabs shrink, recomputed on every redraw. Vertical bars keep the default powerline drawing. `ctrl+cmd+e` flips it to a **left sidebar** at runtime via `TabBar.ts`, which drives the bar over kitty's remote-control socket — no config edit, no reload. Session titles are long — project names, run summaries, state icons — and the vertical stack reads like a list instead of truncating into a horizontal strip. With LifeOS tab-title hooks active (see [Terminal Tab State](../Pulse/TerminalTabs.md)), the bar becomes a live dashboard of every running session.

TabBar.ts commands (state persists in `~/.cache/kitty-tabbar-state.json`):

| Keys | Action |
|------|--------|
| `ctrl+cmd+e` | Toggle bar edge: top ↔ left sidebar |
| `alt+shift+l` / `alt+shift+h` | Widen / narrow (sidebar auto-fits to the widest title, these bound it) |
| `ctrl+cmd+d` | Dock — collapse the sidebar to mini state-icon stubs |
| `ctrl+cmd+b` | Hide / show the bar entirely |

It exists because of two kitty 0.48.2 quirks it works around: a bare `load-config` kills the bar (every apply carries an explicit `tab_bar_edge` override), and the vertical bar wraps over-long titles into a garbled second column (the template pre-slices titles to the sidebar width). Don't set `tab_title_max_length` in the conf — that's the third quirk; TabBar.ts owns width live.

The sidebar width only recomputes when TabBar.ts runs, so `tab_refit_watcher.py` (registered in kitty.conf) runs `TabBar.ts refit` whenever a tab title changes or a window closes; refit re-applies only if the auto-fit width actually moved. kitty attaches watchers at window creation, so tabs opened before the watcher was registered don't fire it until kitty restarts.

## Keyboard shortcuts

### Tabs

| Keys | Action |
|------|--------|
| `cmd+t` | New tab |
| `cmd+w` | Close tab |
| `ctrl+h` / `ctrl+l` | Previous / next tab |
| `ctrl+shift+h` / `ctrl+shift+l` | Move tab left / right |
| `cmd+shift+n` | New tab running your DA launch alias (`k` by default — edit to match yours) |
| `ctrl+cmd+e` `d` `b`, `alt+shift+l/h` | Tab-bar edge, dock, hide, width — see the tab bar section |

### Splits (panes)

| Keys | Action |
|------|--------|
| `cmd+shift+l` | Split right (side by side) |
| `cmd+shift+j` | Split down (stacked) |
| `cmd+shift+h` | Split left |
| `cmd+shift+k` | Split up |
| `cmd+h/j/k/l` | Move focus between panes, vim-style |
| `ctrl+cmd+h/j/k/l` | Resize the focused pane |

### Misc

| Keys | Action |
|------|--------|
| `shift+cmd+r` | Reload config |
| `shift+enter` | Literal newline (multi-line prompts) |
| `ctrl+enter` | Accept zsh autosuggestion |

## Helm Deck — the modal mux mode

`cmd+;` enters **mux mode** (a `◉ MUX` badge appears in the tab title). One bare vim key runs an action, then the mode exits — the tmux-prefix model without the tmux.

| Key (after `cmd+;`) | Action |
|------|--------|
| `h/j/k/l` | Walk panes |
| `v` / `s` | Vertical / horizontal split |
| `x` | Close pane |
| `z` | Zoom (toggle stack layout) |
| `t` | New tab |
| `1`–`9` | Jump to tab N |
| `shift+s` | Save current layout as a session |
| `g` | Go to a saved session |
| `space` | DeckBar — interactive session picker overlay |
| `esc` | Exit mux mode |

## Project sessions

A session file pins a project to a named tab with its own working directory, split layout, and tab color. Copy `sessions/example.kitty-session`, replace `<project>`, pick a color. `cmd+;` `shift+s` saves your current layout as one; `cmd+;` `g` jumps between them. Note kitty re-executes launch commands on restore — running programs don't carry over.

DeckBar (`cmd+;` `space`) and TabBar.ts both need [bun](https://bun.sh); DeckBar lists sessions and running tabs in an overlay with `j/k` + enter navigation.

## LifeOS integration

Two lines in `kitty.conf` wire the terminal into LifeOS:

- `allow_remote_control socket-only` + `listen_on unix:/tmp/kitty` — LifeOS hooks use the socket to set tab titles and colors as runs progress (working, waiting, done). Socket-only means only processes on your machine with access to the socket can drive kitty; nothing listens on the network.
- `watcher ~/.config/kitty/cairn_clear_watcher.py` — when a run completes, hooks paint the tab green; the watcher clears that "unread" stamp the first time you focus the tab, Herdr-style.

Both degrade gracefully: without LifeOS running, they do nothing.

## Theme

Tokyo Night Storm, with a custom blue active-tab (`#1244B3`) and purple selection. The palette is inline in `kitty.conf`; `tokyo-night-storm.conf` is the standalone copy if you want to `include` it in your own config instead. An optional background image line is commented out — point it at your own image if you want one.
