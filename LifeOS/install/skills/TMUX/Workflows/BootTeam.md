# BootTeam

Boot a 3-tier orchestrator → lead → worker team in one tmux session, then drive it with send/read.

## When

You want a team laid out so you can watch every agent at once: a lead pane on the left, a worker column on the right, all in one session named after the team. Unlike a GUI cockpit, this survives your connection dropping.

## Boot it

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T boot-team --name auth-fix --cwd ~/Projects/App \
  --tiers orchestrator,lead,worker,worker
```

Creates session `auth-fix`, puts the lead pane left and a worker column right, titles each pane by role, sets `remain-on-exit` so a crashed agent leaves evidence, and returns the session ID plus one pane ID per role:

```json
{"ok":true,"session":"$3",
 "panes":[{"role":"orchestrator","pane":"%10"},
          {"role":"lead","pane":"%11"},
          {"role":"worker","pane":"%12"},
          {"role":"worker","pane":"%13"}]}
```

Those IDs are your address book. Hold them, not pane indexes — indexes shift as panes open and close, IDs do not.

## Drive it

```bash
# prompt the lead; --enter types AND submits
bun $T send --target %11 --enter \
  "You lead this team. Break the JWT refresh bug into two tasks, one per worker."

# fan out
bun $T send --target %12 --enter "Fix the token expiry check in src/auth/refresh.ts."

# read anyone back
bun $T read --target %12 --lines 40
```

`send` without `--enter` types without submitting. That distinction is real but it is **not a safety boundary**: any newline inside the text executes it regardless, which is why the wrapper refuses multi-line text unless `--enter` was passed. Never pipe another agent's output, a file, or a fetched page into `send` without stripping newlines.

## Flat comms

Every agent is a pane, so any agent can prompt any other agent. A worker that finishes early hands results sideways:

```bash
bun $T send --target %11 --enter "Task A merged, tests green. Free for more."
```

The tiers are a convention for layout and thinking, not a routing constraint.

## Scale

Verified from 1 to 9 tiers. The lead pane is split each time and the layout re-applied, so tier 7 does not hit `no space for new pane` the way naive successive splitting does.

## Watch it

Hand long-running observation to `Workflows/Monitor.md`, which classifies each pane and speaks when one finishes. To leave the team running and reattach later, see `Workflows/Persist.md`.
