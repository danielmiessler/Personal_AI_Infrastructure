# TMUX — design and CMUX parity

## Verdict

`CMUX` gives LifeOS a scriptable agent cockpit on macOS. It cannot run anywhere else, and its own SKILL.md says so: *"No Linux/WSL — that path is tmux."* This skill is that path. tmux is not a downgrade substitute; it wins on most axes and loses on two, both visual.

The object model maps cleanly. CMUX is `window ⊃ workspace ⊃ pane ⊃ surface`; tmux is `server ⊃ session ⊃ window ⊃ pane`. Throughout this skill: **a CMUX workspace is a tmux session** (one per agent team), **a CMUX surface is a tmux pane**.

## Parity matrix

| # | CMUX capability | CMUX mechanism | TMUX mechanism | Parity |
|---|---|---|---|---|
| 1 | `ping` — up + version | auto-launch GUI app, socket handshake | `tmux -V` + `list-sessions` exit code | **full, simpler** |
| 2 | `send --enter` | `send` + `send-key Enter` | `send-keys -l` + `Enter`, newline-refusing | **full, safer** |
| 3 | `read --lines N` | `read-screen` | `capture-pane -p -J -S -`, last N | **full** |
| 4 | `boot-team --tiers` | new-workspace + splits + rename-tab | `new-session` + lead-splits + `main-vertical` + `select-pane -T` | **full** |
| 5 | `race --agents N` | N surfaces, one command | N panes, one command, `race-N` titles | **full** |
| 6 | `fleet --grid RxC` | grid of surfaces | explicit row/column splits, geometry-verified | **full** |
| 7 | `mini-fleet` | SSH pane per host from USER config | identical, config under `SKILLS/TMUX/fleet.json` | **full** |
| 8 | `monitor` | poll `surface-health` + screen regex | poll `list-panes -F` + layered signals | **full, better** |
| 9 | `list` / `tree` | `tree --all`, regex-scraped refs | `list-panes -a -F`, real fields | **full, better** |
| 10 | `flash` | GUI pulse (`trigger-flash`) | `display-message` + bell + transient border | **degraded** |
| 11 | `voice` | POST `/notify` | identical | **full** |
| 12 | Flat comms, any agent → any agent | `send` to any surface | `send` to any pane ID | **full** |
| 13 | Per-team colour identity | cmux themes / `workspace-action` | session-scoped border + status styling | **partial** |
| 14 | In-app browser pane | `new-pane --type browser --url` | none | **absent** |
| 15 | Reusable boot recipes | the command is the recipe | identical | **full** |
| 16 | Teardown | `close-surface` | `kill --target` by ID, generation-checked | **full, safer** |

Thirteen full, two degraded, one absent.

## Where tmux is better, and why it matters

**Structured output instead of regex archaeology.** `cmux.ts` carries `extractFirstRef`/`extractRefs`, ~30 lines of regex trying to recover object references from human-readable stdout, with a UUID fallback when that fails. tmux `-F` templates return exactly the fields requested. The failure mode where a ref silently comes back `undefined` and a recipe proceeds against nothing does not exist here.

**Real done-detection.** CMUX's `classifyScreen()` matches prompt characters and the words "done" or "complete" against screen text. That is genuinely all cmux exposes. tmux gives `#{pane_dead}` and `#{pane_dead_status}` — the process exited, and its actual exit code. A crashed agent is distinguishable from a finished one, which CMUX cannot do at all.

**Persistence across disconnection.** A GUI multiplexer's sessions die with the app. tmux sessions are owned by a server that outlives clients, so an agent team survives SSH dropping, the leader exiting, and the operator going home. On a remote host this is the single most valuable property, and it has no CMUX equivalent.

**No auth wall.** CMUX's socket is default-deny and its own docs call this "the #1 gotcha" — driving it needs either a socket password in the environment or the orchestrator running inside a cmux surface. tmux's socket is uid-scoped filesystem permissions. Nothing to configure, nothing to leak.

## Where tmux is worse

**No browser surface (#14).** CMUX can place a live browser pane beside an agent so the agent edits and the page updates next to it. tmux is a terminal multiplexer; there is no such object. Not a gap that can be closed.

**Attention is text (#10, #13).** CMUX flashes a workspace and themes it by colour. tmux offers `display-message`, the terminal bell, and border/status styling. All of it requires an attached client to see, and the operator is usually detached — which is precisely the situation this skill is built for. `flash` is therefore honest about being a weak signal, and `monitor`'s voice notification through Pulse is the real attention mechanism.

## Safety design

Six behaviours were measured on tmux 3.6 during two adversarial reviews and shaped the wrapper. They are documented in SKILL.md § Gotchas; the short form:

1. Newlines execute regardless of send mechanism, so the payload is validated rather than the transport trusted.
2. `-t` prefix-matches, so destruction is ID-only with a generation token.
3. `remain-on-exit` is a window option whose session-scoped form silently no-ops.
4. `capture-pane -S -N` is an offset, not a count.
5. `select-layout tiled` ignores the requested grid.
6. Global (`-g`) options and hooks reach sessions this tool never created, and their cleanup damages the operator's own configuration.

## What this deliberately does not do

**It does not replace the built-in split-pane teammates.** Claude Code's `teammateMode` accepts `in-process`, `auto`, `tmux` and `iterm2`, and `auto` selects tmux when the leader is already running inside tmux. When a human is sitting at a terminal driving a team, that is the right path: teammates inherit the lead's permission mode, their prompts bubble up for approval, and no keystrokes are involved. This skill is for the case that setting cannot serve — a leader with no attached terminal, work that must outlive the connection, non-Claude processes, and TUIs with no API.

**It does not pretend keystroke-spawned agents are teammates.** An agent started by typing into a pane is a sibling process outside the session's control plane. SKILL.md says so where a reader will see it.
