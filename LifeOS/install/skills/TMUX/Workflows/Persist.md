# Persist

Leave a team running after you disconnect, and pick it back up later. This is the capability CMUX does not have.

## Why it works

tmux sessions belong to a server that outlives its clients. Your SSH connection dropping, your terminal closing, and the leader process exiting all leave the work running. This is the reason to reach for this skill on a remote host rather than a GUI cockpit.

What it does not survive: a reboot, or the tmux server being killed. Sessions are memory-resident.

## Detach and reattach

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T boot-team --name migration --tiers runner
bun $T send --target %40 --enter "bun run migrate:prod"
# ...disconnect, go home, come back...

tmux ls -F '#{session_id} #{session_name} #{session_attached}'
tmux attach -t '$5'          # detach again with the prefix key, then d
```

From inside an attached session the prefix key (`C-b` by default) then `d` detaches without stopping anything.

## Inspect without attaching

Reading does not require a client, which matters when you are checking on work from a script or another machine:

```bash
bun $T read --target %40 --lines 100
bun $T monitor --session '$5' --once
```

## Cleaning up

```bash
bun $T kill --target '$5'      # ID, never a name
bun $T doctor                  # lists sessions this tool created and any leaked buffers
```

`doctor` exists because detached work is easy to forget. It reports orphaned sessions from earlier runs so they do not accumulate silently.

## The one thing to be careful about

Never tear down by name. tmux resolves a target as exact match, then glob, then **unambiguous prefix** — so `kill-session -t migration` will destroy `migration-archive` if that is the only other match, with exit code 0 and no warning. The wrapper refuses bare names for this reason; if you are typing raw tmux instead, anchor the name (`-t '=migration'`) or use the session ID.
