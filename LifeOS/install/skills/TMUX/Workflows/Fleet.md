# Fleet

Stand up named fleets — a local grid of agents, or one SSH pane per remote host.

## Local grid

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T fleet --name alpha --grid 2x2 \
  --cmds "claude 'watch src/api';claude 'watch src/web';bun test --watch;btop"
```

Session `alpha`, a real 2×2 of panes, one command per cell, IDs returned. Fewer commands than cells leaves the extras as shells.

The grid is built by explicit row and column splits and the geometry is verified, because `select-layout tiled` ignores the shape you asked for: it computes its own near-square arrangement from the pane count, so `1x5` and `5x1` both come out as 3 rows by 2 columns. `--grid 1x5` here gives one row of five.

## Remote mini-fleet

```bash
bun $T mini-fleet                                    # hosts from USER config
bun $T mini-fleet --hosts "box-a=user@box-a,box-b=user@box-b"   # ad hoc
```

Config lives at `~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/fleet.json`, shape `{"hosts":[{"name":"box-a","ssh":"user@box-a"}]}`. No hostnames live in this skill — the config is private and user-owned.

Each host becomes its own pane; from there `send` and `read` work exactly as they do locally. An SSH pane whose connection drops shows as a dead pane with its exit status rather than silently vanishing.

## Identity and attention

tmux has no GUI chrome, so per-fleet identity is pane titles, border status, and session-scoped styling:

```bash
bun $T flash --target %20 --bell
```

`flash` is `display-message` plus the terminal bell plus a transient border. It is a genuinely weaker signal than a GUI pulse and it only reaches an attached client. When nobody is attached — the normal case here — `monitor`'s voice notification is the real attention mechanism.

## Reusable recipes

The command IS the recipe. Save the exact `fleet` or `mini-fleet` invocation as a shell alias or one-line script and re-run it to rebuild the same team. Sessions also persist across disconnection, so a fleet often does not need rebuilding at all — reattach instead (`Workflows/Persist.md`).
