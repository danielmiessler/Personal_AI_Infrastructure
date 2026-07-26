# Monitor

Watch a team without watching a screen, and get told when something finishes.

## Run it

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T monitor --session '$3'              # continuous, until SIGINT
bun $T monitor --session '$3' --once       # single pass, for scripts
bun $T monitor --session '$3' --interval 5 # poll spacing in seconds
```

Each pass prints one JSON object: every pane, its classification, and **how confident that classification is**.

## How a state is decided

Three signals, strongest first. The JSON says which one produced the answer, so a caller can tell a fact from a guess.

| Signal | Strength | What it proves |
|---|---|---|
| `pane_dead` + `pane_dead_status` | definitive | the process exited, and its real exit code |
| child-process walk from `pane_pid` | strong | something is genuinely still running |
| screen-text heuristic | weak | the screen *looks* idle, done, or prompting |

When signals disagree, the stronger one wins and the disagreement is reported rather than hidden.

The weak layer is weak for a concrete reason: `pane_current_command` resolves only one level, so a process under a wrapper reports the wrapper. An agent launched as `bash run.sh` shows `bash` while the real work runs, which makes "back to a shell" a false finish signal from the first tick. Treat anything tagged low-confidence as a hint, not a result.

## Voice

On a transition into done or awaiting-input, `monitor` POSTs to Pulse at `localhost:31337/notify` so you hear about it. This is the attention mechanism that actually works when nobody is attached to the terminal.

## What a false done costs

A wrong "done" fires a notification, may cause an orchestrator to collect an empty result and move on, and may get a pane killed. That is why exit status is preferred over screen text wherever it exists, and why `remain-on-exit` is set at boot — without it an exited pane is destroyed and there is no status left to read.
