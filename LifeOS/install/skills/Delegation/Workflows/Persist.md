# Persist — work that must outlive the session

Run something on **this** machine that survives the session ending, and stay able to inspect or steer it afterwards.

## When this, and when not

Delegation's other patterns end when the session does. Managed Agents survive disconnection but run in a cloud sandbox, so they cannot touch this host's filesystem, repo, or `.env`. Detached tmux is the remaining case: **local** work that must **outlive** the session.

| Need | Use |
|------|-----|
| Parallel work inside this session | Agent teams / subagents (default) |
| Outlives the session, cloud-acceptable | Managed Agents |
| Outlives the session, must touch this host | **detached tmux** (this workflow) |
| Watch teammates in split panes | `teammateMode: "tmux"` — built in, no tooling needed |
| Long-running non-Claude process, or a TUI with no API | **detached tmux** (this workflow) |

If a human is at a terminal and wants to see teammates working, that is `teammateMode` (`auto` picks tmux when the leader is already inside tmux, then iTerm2, then in-process). Do not rebuild it.

## Ideal state

The work runs detached under a name you chose, keeps running when the connection drops, can be reattached and read at any time, and tears down without touching anything else on the host.

## The commands

```bash
# start detached — capture the session ID, do not rely on the name
SID=$(tmux new-session -d -s build-api -P -F '#{session_id}' 'bun run build')

# so a crashed pane leaves evidence instead of vanishing.
# remain-on-exit is a WINDOW option: -w and a window target, per window.
WID=$(tmux list-windows -t "$SID" -F '#{window_id}' | head -1)
tmux set-option -w -t "$WID" remain-on-exit on

# what is running
tmux list-sessions -F '#{session_id} #{session_name} #{session_attached}'
tmux list-panes -t "$SID" -F '#{pane_id} #{pane_pid} #{pane_dead} #{pane_current_command}'

# read without attaching
tmux capture-pane -p -t "$SID" -S -200

# attach (from any later session, over any connection)
tmux attach -t "$SID"      # detach again with the prefix key then d

# tear down the exact thing you started
tmux kill-session -t "$SID"
```

## Gotchas — every one of these was verified on tmux 3.6, not inferred

- **`-t` prefix-matches, so name-targeting kills the wrong session.** Targets resolve exact → fnmatch → *unambiguous prefix*. With sessions `prod` and `production-work` present, `kill-session -t production` destroys `production-work` — no wildcard typed, no warning, exit 0. Capture `#{session_id}` at creation and target `$N`. Where a name is unavoidable, anchor it: `has-session -t '=prod'` matches only `prod`. Never use `kill-session -a` (it kills everything *except* the target). This bites hardest because the documented cleanup advice for orphaned team sessions is name-based.

- **`send-keys` executes on an embedded newline — there is no "type without running".** `send-keys -l` writes bytes to the pty and LF *is* Enter, so text containing `\n` runs even when no Enter key is sent. Anything you did not author this turn — file contents, pane output, fetched pages, another agent's text — goes in as a paste, never as keys:
  ```bash
  tmux load-buffer -b tmp payload.txt
  tmux paste-buffer -p -b tmp -t "$SID"   # -p = bracketed paste, lands in the input buffer
  tmux delete-buffer -b tmp
  ```
  Belt and braces: reject `\r`/`\n` in text unless the caller explicitly asked to submit, since bracketed paste only helps if the receiving program honours it — readline does, a raw-mode TUI may not.

- **Without `remain-on-exit on`, a finished pane disappears.** Default is `off`, so an exited pane is destroyed: `pane_dead` is never observable, the `pane-died`/`pane-exited` hooks never fire, and `capture-pane` on it errors. A crashed job leaves no trace it ever ran. Set it at creation or you cannot tell "finished" from "never started".

- **`remain-on-exit` is a *window* option, and setting it session-scoped silently does nothing.** `tmux set-option -t "$SID" remain-on-exit on` returns success and has no effect — panes still vanish on exit. It needs `-w` against a window target, and it applies per window, so a window created later does not inherit it. With it set correctly you also get the exit status for free: `#{pane_dead}` → `1`, `#{pane_dead_status}` → the real exit code. Verified both ways; the silently-ineffective form is the easy mistake.

- **`pane_current_command` resolves one level only.** A process started directly reports itself; the same process under a wrapper reports the wrapper — `bash run.sh` shows `bash` even while the real work runs. Treating "back to a shell" as "finished" is wrong from the first tick and stays wrong. Walk children from `#{pane_pid}`, or match an allowlist of expected commands.

- **Never set `-g` hooks or options.** A global hook fires for sessions you did not create, and the obvious cleanup `set-hook -gu` removes the operator's own global hooks for that event too. Scope everything to `-t "$SID"`.

- **Keep `pane_current_path` out of delimited `-F` templates.** It carries raw filesystem bytes and a directory name may contain your delimiter or a newline, silently producing extra fields or extra records. `#{q:...}` does not escape them and `#{b64:...}` does not exist in tmux 3.6 — it expands to empty. Query that field alone.

- **Session IDs are stable per server, not forever.** `%N`/`@N`/`$N` are monotone and never recycled within a server process, but a server restart resets the counters. Do not persist an ID across a restart and assume it means the same thing.

- **Sessions are memory-resident.** They survive disconnection and the leader exiting. They do not survive a reboot or the server being killed.

- **An agent you start by typing `claude ...` into a pane is a sibling process, not a teammate.** It does not appear in the subagent registry, does not count against concurrency caps, returns screen text rather than a result object, and carries whatever permission flags its own invocation gave it. A teammate spawned by `teammateMode` inherits the lead's permission mode, and its prompts bubble up to the lead for approval. Reach for the built-in path unless you specifically need a process the CLI cannot spawn.

## Verify before claiming it worked

A detached start that failed exits silently. Confirm the session exists and the process is alive — `list-panes` showing `pane_dead=0` with the expected command — before reporting the work as running.
