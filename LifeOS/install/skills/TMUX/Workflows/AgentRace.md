# AgentRace

Race N agents at the same problem in one session, first to solve wins, kill the rest.

## When

A production bug where any one agent might solve it, but you cannot predict which framing lands. Instead of serial guessing, fan out and take the first correct answer. You spend compute, not wall-clock.

## Run it

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T race --feature checkout-500 --agents 4 --cwd ~/Projects/App \
  --cmd "claude 'The /checkout endpoint 500s on empty cart. Find and fix it.'"
```

One session, four panes titled `race-1`..`race-4`, the same command in each, and the pane IDs returned. Omit `--cmd` to get bare shells you `send` into afterwards.

## Watch for a winner

```bash
bun $T monitor --session '$7' --interval 3
```

`monitor` classifies each pane and speaks through Pulse the moment one finishes. Because `remain-on-exit` is set at boot, a pane that exits is retained with its real exit status, so a crash is distinguishable from a win — something a screen-text heuristic cannot do.

## Take the winner, kill the losers

```bash
bun $T read --target %32 --lines 80        # the one that finished first
bun $T kill --target %30                   # by ID, never by name
bun $T kill --target %31
```

Teardown is ID-only by design. A name like `race` would prefix-match a longer session such as `race-archive` and destroy it silently, so the wrapper refuses bare names.

## Why race instead of retry

Serial retries pay the full latency of every failed attempt before you learn anything. A race pays one attempt's latency total and lets the problem's shape pick the winner: the agent whose framing fit the bug finishes first.
