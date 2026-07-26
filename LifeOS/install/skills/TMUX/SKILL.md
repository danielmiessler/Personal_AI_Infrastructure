---
name: TMUX
version: 1.0.0
description: "Drives tmux as an agent cockpit — boot, race, monitor and steer visible agent teams on Linux, macOS or any SSH-reachable host, and keep them running after you disconnect. USE WHEN tmux, agent cockpit, boot an agent team, orchestrate agents, three-tier orchestration, agent race, needle-in-haystack hotfix, agent fleet, 2x2 fleet, watch/monitor my agents, send a prompt to a running agent, multiplexer, terminal cockpit, orchestrator lead worker, detach, reattach, survive disconnect, keep running after I log off, drive a TUI that has no API. NOT FOR one-shot in-harness subagents with no terminal to watch (use Delegation), split-pane teammates when a human is at a terminal (that is the built-in `teammateMode` setting, not a skill), the Pulse dashboard itself (use Pulse), browser deploy-verification (use Interceptor), or macOS GUI cockpit work (use CMUX)."
effort: medium
---

# TMUX

An agent you can't see is an agent you can't improve — and on a headless box, tmux is the only cockpit there is. One command boots a named team of agents you can watch, prompt, and steer, and unlike a GUI multiplexer the team **survives your connection dropping**.

Everything routes through one wrapper: `bun ~/.claude/skills/TMUX/Tools/Tmux.ts <subcommand>`. No socket password, no GUI, no app to launch. tmux starts its own server on demand.

This is the Linux/SSH counterpart to `CMUX`, which is macOS-only. Same subcommands, same recipes, different substrate. See `DESIGN.md` for the full parity matrix including the two things tmux cannot do.

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| "boot a team", "3-tier team", "orchestrator/lead/workers" | `Workflows/BootTeam.md` |
| "race agents", "hotfix race", "throw N agents at this", "needle in a haystack" | `Workflows/AgentRace.md` |
| "fleet", "2x2 fleet", "named teams", "the remote fleet", "mini-fleet" | `Workflows/Fleet.md` |
| "watch/monitor my agents", "tell me when they're done" | `Workflows/Monitor.md` |
| "detach", "reattach", "survive disconnect", "keep running after I log off" | `Workflows/Persist.md` |

## Quick Reference

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T doctor                                            # environment + safety self-check
bun $T ping                                              # version + server reachability
bun $T boot-team --name debug --tiers orchestrator,lead,worker,worker
bun $T race --feature login-500 --agents 4               # first-to-solve wins
bun $T fleet --name alpha --grid 2x2 --cmds "claude;codex;claude;bun test --watch"
bun $T mini-fleet                                        # SSH panes from USER fleet.json
bun $T send --target %3 "run the tests" --enter
bun $T read --target %3 --lines 40
bun $T monitor --session '$1'                            # classify + voice on transition
bun $T kill --target '$1'                                # ID-targeted teardown
```

**The loop:** `send` (type) → `--enter` (submit) → `read` (confirm it ran) → `kill` (tear down). A `send` without `--enter` that claims the agent is working is a false done-claim; round-trip through `read` before believing anything.

**What stays underneath:** Pulse (`localhost:31337`) is still the dashboard, voice still fires via `/notify`, the Algorithm, memory and model routing are untouched. This replaces the terminal-watching layer only.

## Gotchas

The highest-value section here. Every one was measured on tmux 3.6, not inferred.

- **A newline in the text executes it, and no send mechanism prevents that.** `send-keys -l`, `paste-buffer`, `paste-buffer -p`, `paste-buffer -r` and `paste-buffer -p -r` all ran the payload in testing. `man tmux`: LF in a buffer is replaced with a separator (CR by default) on output, and `-p` inserts bracket codes only *if the application requested bracketed paste mode* — which no `#{...}` format exposes, so you cannot detect whether it did anything. **The control is the payload, not the transport:** the wrapper refuses text containing `\r`/`\n` unless `--enter` was explicitly passed. Never send agent output, file contents, or fetched pages into a pane without stripping newlines first.

- **`-t` prefix-matches, so name-targeting kills the wrong thing.** Targets resolve exact → fnmatch → *unambiguous prefix*. With sessions `prod` and `production-work`, `kill-session -t production` destroys `production-work` with exit 0 and no warning. The wrapper only destroys by ID (`$N`/`@N`/`%N`) captured at creation, and `=`-anchors any name it must use. `kill-session -a` (kill all *except* the target) is refused outright.

- **IDs are scoped to a server incarnation, not forever.** Kill the server and the next session is `$0` again, so a stored ID silently retargets something else. The wrapper stamps every ID with a generation token from `#{pid}` + `#{start_time}` and refuses to act when it no longer matches.

- **`remain-on-exit` is a WINDOW option; the session-scoped form silently no-ops.** `set-option -t "$SID" remain-on-exit on` returns success and does nothing. Without it set correctly with `-w`, an exited pane is destroyed: no `pane_dead`, no exit status, hooks never fire, and `capture-pane` errors. A crashed agent leaves no evidence it ever ran.

- **`capture-pane -S -N` is a scrollback start offset, not a line count.** On a 24-row pane, `-S -10` returns 34 lines. Use `-S -` and take the last N.

- **`select-layout tiled` ignores the grid you asked for.** It computes its own near-square shape from the pane count: `1x5` and `5x1` both produce 3 rows × 2 columns. `fleet --grid RxC` builds rows and columns explicitly and verifies the geometry, rather than trusting `tiled`.

- **Naive successive splits halve exponentially** and fail with `no space for new pane` around seven panes. Split the lead pane each time and re-apply `main-vertical`. Also pass explicit `-x`/`-y` to `new-session -d`, or you get an 80×24 window that fails past four panes.

- **Pane titles are invisible until you turn the border on.** `pane-border-status` defaults to `off`, so role titles render nowhere. `pane_title` also defaults to the machine hostname rather than empty, so raw topology output can carry a hostname — set titles explicitly and don't paste raw dumps anywhere public.

- **`pane_current_command` resolves one level only.** A process under a wrapper reports the wrapper: `bash run.sh` shows `bash` while the real work runs, so "back to a shell" never means "finished". `monitor` layers its signals and labels the weak ones as low-confidence in its JSON.

- **Never set anything with `-g`.** A global hook fires for sessions you did not create, and `set-hook -gu` cleanup strips the operator's own global hooks for that event. Everything is scoped to the session this tool created.

- **An agent you start by typing `claude ...` into a pane is a sibling process, not a teammate.** It does not appear in the subagent registry, does not count against concurrency caps, returns screen text rather than a result object, and carries whatever permission flags its own invocation gave it. A teammate spawned by the built-in `teammateMode` inherits the lead's permission mode and its prompts bubble up for approval. Reach for the built-in path when a human is at a terminal; reach for this skill when nobody is.

- **Sessions are memory-resident.** They survive disconnection, the leader exiting, and SSH dropping. They do not survive a reboot or the server being killed.

## What this cannot do

Stated plainly so nobody expects parity that isn't there:

- **No in-app browser pane.** CMUX can put a live browser beside an agent. tmux has no such surface. Use `Interceptor` in a separate flow.
- **Attention and identity are text, not chrome.** `flash` is `display-message` plus the terminal bell plus a transient border colour. There is no GUI pulse, and none of it is visible to someone who is currently detached.

Everything else in CMUX has a working equivalent here, plus three things CMUX cannot do: detach/reattach persistence, real exit-status capture, and structured topology without regex-scraping stdout.

## Examples

**Boot a debugging team and drive the lead:**
```
User: "boot a tmux team to chase the flaky test"
→ bun $T boot-team --name flaky --tiers orchestrator,lead,worker,worker
→ bun $T send --target %2 "find why auth.test.ts flakes; delegate repro to a worker" --enter
→ bun $T monitor --session '$1'
```

**Race a production hotfix:**
```
User: "prod login is 500ing — race it"
→ bun $T race --feature login-500 --agents 4
→ (four agents attack the same repo; first with a root cause wins)
→ bun $T read --target %7 ; bun $T kill --target <losers>
```

**Start something that outlives the session:**
```
User: "run the migration and let it finish after I log off"
→ bun $T boot-team --name migration --tiers runner
→ bun $T send --target %1 "bun run migrate:prod" --enter
→ disconnect; reattach later with tmux attach -t '$N'
```
