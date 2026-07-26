# Tmux.ts — reference

JSON-in / JSON-out wrapper that drives tmux as an agent cockpit. Every subcommand prints **exactly one JSON object** to stdout and exits `0` when `ok` is `true`, non-zero otherwise. `monitor` without `--once` prints one JSON object per poll pass. Errors are always structured objects with an `error` string and a machine-readable `code`; a stack trace never reaches stdout.

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
bun $T <subcommand> [flags]
```

Every tmux call is made with `Bun.spawn` and an argv array. There is no shell anywhere in this tool, so no payload is ever interpolated into a command string.

## Global flags

| Flag | Meaning |
|---|---|
| `--socket <name>` | Talk to a private server via `tmux -L <name>` instead of the default socket. Also settable as `TMUX_SKILL_SOCKET`. Must match `^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`. |
| `--help`, `-h` | Usage text (plain text, not JSON). |

**State file.** Sessions this tool creates are recorded at `~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/state.json` (override with `TMUX_SKILL_STATE`). `kill` consults it, so a teardown can only reach objects this tool created. The file is an optimisation for safety, not for correctness: if it cannot be written, read-only subcommands still succeed and `kill` simply refuses more often.

## Targeting rules

`--target` and `--session` accept **only tmux object IDs**: `$N` (session), `@N` (window), `%N` (pane). Names are refused with `code: "not-an-id"`.

This is not pedantry. `tmux -t` resolves a target exact → fnmatch → **unambiguous prefix**. With sessions `prod` and `production-work` present, `kill-session -t production` destroys `production-work`, exits `0`, and prints no warning. Where a name is unavoidable internally (the duplicate-name check), it is anchored as `=name`, which defeats prefix resolution.

Get IDs from `list` / `tree`, or from the object each creating subcommand returns.

## Subcommands

### `ping`

Server reachability and version.

```json
{"ok":true,"version":"tmux 3.6","socket":"default","serverRunning":true,
 "sessions":1,"generation":"3265593:1785086482","nested":false}
```

`ok:true` with `serverRunning:false` is a normal answer, not a failure — tmux is installed and no server is up. `start-server` is deliberately not used to test reachability: it does not leave a server running when there are no sessions, because it exits as soon as the invoking command returns. Reachability is the exit code of `list-sessions`; the version is `tmux -V`.

### `send --target <id> "<text>" [--enter]`

Types literal text into a pane. A session or window ID resolves to its active pane.

| Flag | Meaning |
|---|---|
| `--target <id>` | Required. `%N` preferred; `$N`/`@N` resolve to the active pane. |
| `--enter` | Press Enter after the text, and **consent to newlines in the payload**. |

```json
{"ok":true,"target":"%1","bytes":20,"entered":true}
```

**The newline rule.** `send` refuses text containing `\r` or `\n` unless `--enter` was explicitly passed (`code: "multiline-refused"`, exit 1). This is the tool's single most important control, because **no transport prevents a newline from executing**. Measured on tmux 3.6 against a ready bash pane, all of `send-keys -l`, `paste-buffer`, `paste-buffer -p`, `paste-buffer -r` and `paste-buffer -p -r` ran the payload. `man tmux` explains why: on output, LF in a buffer is replaced with a separator (CR by default), and `-p` inserts bracketed-paste codes only *if the application requested bracketed paste mode* — a state no `#{...}` format variable exposes, so you cannot even detect whether it applied. **The control is therefore the payload, not the transport.** Never treat `paste-buffer` as a safe way to move untrusted text into a pane.

Practical consequence: before sending agent output, file contents, or a fetched page into a pane, strip newlines yourself. Passing `--enter` on multi-line text is allowed and will execute every line — that is what the flag means.

Two smaller guards:
- Keys are always sent with `send-keys -l` (literal). Without `-l`, a payload word like `Enter` or `C-c` is interpreted as a keypress.
- `--` terminates flag parsing, so a payload starting with `-` is not read as an option. This is required, not decorative: `send-keys -l "-x-plain"` fails with `unknown flag -x`.
- If the wrapper is running inside the pane it is targeting (`$TMUX_PANE` matches on the same server), it refuses with `code: "self-target"`.

### `read --target <id> [--lines N]`

Captures pane text. Default `--lines 80`.

```json
{"ok":true,"target":"%1","requestedLines":5,"returnedLines":3,
 "scrollbackLines":3,"text":"...$ echo hi\nhi\n...$ "}
```

Implemented as `capture-pane -p -J -S -` with the tail sliced in TypeScript, because **`capture-pane -S -N` is a scrollback START OFFSET, not a line count** — on a 24-row pane, `-S -10` returns 34 lines. Trailing blank rows are dropped before slicing, since `capture-pane` emits every row of the pane and a mostly-empty pane would otherwise return N empty strings that read as "the agent printed nothing".

`returnedLines` may be smaller than `requestedLines`; `scrollbackLines` is the total non-blank content available.

### `boot-team --name <n> --tiers a,b,c [--cwd <path>]`

One session, one titled pane per tier. Default tiers: `orchestrator,lead,worker,worker`.

```json
{"ok":true,"session":"$0","name":"debug","window":"@0",
 "generation":"3265593:1785086482","socket":"default","layout":"main-vertical",
 "panes":[{"id":"%0","role":"orchestrator","left":0,"top":1,"width":80,"height":49}],
 "verified":true}
```

`verified` is `true` when the number of panes tmux reports matches the number of tiers requested; the geometry in `panes` is read back from `#{pane_left}`/`#{pane_top}`, not assumed.

Two sizing behaviours are worked around. **Naive successive splits halve the remaining space exponentially** and fail with `no space for new pane` around seven panes, so each new pane splits the LEAD pane and the window is re-flowed with `select-layout main-vertical`. **`new-session -d` without `-x`/`-y` gives an 80×24 window** that fails past four panes, so explicit dimensions are passed, scaled to the tier count. Verified working at nine tiers.

Every window this tool creates is configured with `remain-on-exit on`, `allow-rename off`, `automatic-rename off`, `pane-border-status top` and a `pane-border-format`. See *Window options* below.

### `race --feature <f> --agents N [--cmd "<command>"] [--cwd <path>]`

N panes in one session, titled `race-1` … `race-N`, each optionally running the same command. Session is named `race-<feature>`. `--feature` must match `^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$`. `--cmd` must be a single line. Without `--cmd` the panes are created but nothing is typed.

```json
{"ok":true,"session":"$1","name":"race-login-500","window":"@1","feature":"login-500",
 "command":"echo racer-online","panes":[{"id":"%4","role":"race-1"}],
 "geometry":[...],"verified":true}
```

### `fleet --name <n> --grid RxC [--cmds "a;b;c"] [--cwd <path>]`

A **deterministic** R×C grid. Cells fill row-major; `--cmds` are assigned in the same order and any shortfall leaves cells empty. Maximum 64 panes.

```json
{"ok":true,"session":"$2","name":"alpha","window":"@2","grid":{"rows":3,"cols":2},
 "cells":[[{"id":"%8","row":0,"col":0,"cmd":"echo a","left":0,"top":1,"width":59,"height":11}]],
 "verified":true,"measured":{"distinctRows":3,"panesPerRow":[2,2,2]}}
```

`select-layout tiled` is **not** used, because it ignores the requested shape and computes its own near-square arrangement from the pane count — `1x5` and `5x1` both produce 3 rows × 2 columns. The grid is built explicitly with `split-window -v` / `-h` and percentage sizing, then **verified from `#{pane_left}`/`#{pane_top}`**: `verified` is `true` only when the count of distinct `pane_top` values equals R and every row holds exactly C panes. `measured` shows what was actually observed, so a `false` is diagnosable rather than mysterious.

If the window is too small for the requested grid, `split-window` fails and the error carries `hint: "the window may be too small for the requested grid"` along with the session ID so the partial session can be torn down.

### `mini-fleet [--hosts <csv>] [--name <n>]`

One SSH pane per host, titled with the host name.

Hosts come from `--hosts name=ssh-target,name2=ssh-target2` (an entry with no `=` uses the same string for both), or, when the flag is absent, from `~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/fleet.json`:

```json
{"hosts":[{"name":"alpha","ssh":"user@host"},{"name":"beta","ssh":"user@other"}]}
```

No host is ever hardcoded. A missing config returns `code: "no-fleet-config"` with the path and expected shape. Host names must match the safe-name charset and SSH targets must match `^[A-Za-z0-9._@:%+/-]+$` — anything shell-metacharacter-shaped is refused with `code: "bad-host"`, because the target is typed into a live shell as a word of an `ssh` command.

### `monitor [--session <id>] [--once] [--interval N] [--no-voice]`

Classifies every pane and voices key transitions. Default interval 3 seconds; runs until SIGINT unless `--once`. Without `--session` it covers every pane on the socket.

```json
{"ok":true,"socket":"default","panes":[{
  "id":"%1","session":"$0","window":"@0","title":"lead",
  "state":"failed","confidence":"definitive",
  "signals":{
    "exit":{"present":true,"dead":true,"status":"7","state":"failed"},
    "process":{"present":false,"descendants":0},
    "screen":{"present":true,"state":"working"}},
  "disagreements":["screen=working (weak) overruled by failed (definitive)"],
  "currentCommand":"bash","commandResolvedOneLevelOnly":true,
  "textTail":"..."}]}
```

**States:** `done`, `failed`, `working`, `idle`, `awaiting-input`.

**Three layers, each labelled with its own confidence:**

| Layer | Signal | Confidence | Answers |
|---|---|---|---|
| `exit` | `#{pane_dead}` + `#{pane_dead_status}` | `definitive` | The process exited, and with what status. |
| `process` | count of direct children of `#{pane_pid}`, from `ps -eo pid=,ppid=` | `strong` | Is anything running. |
| `screen` | regex over the last 40 captured lines | `weak` | Guesswork. |

**Resolution:** the exit layer wins outright when the pane is dead. Otherwise, a `screen` reading of `awaiting-input` wins — this is the one case where the weak layer decides, because the process layer answers "is something running" and structurally *cannot* express "waiting for a human" (a shell blocked in `read` has zero children and looks identical to an idle shell). Otherwise the process layer wins. Every time the screen layer disagrees with the chosen state, the disagreement is listed in `disagreements` rather than hidden, and `confidence` always names the layer that actually decided.

`currentCommand` is reported but **never used for classification**, because `pane_current_command` resolves one level only: `bash run.sh` reports `bash` while the real work runs underneath. `commandResolvedOneLevelOnly` is in every record as a standing warning. The process layer is immune to this, since it counts children rather than matching names.

**Voice** fires via `voice` on a *transition* into `done`, `failed`, `awaiting-input`, or `working → idle`. That last one matters on tmux: a command that finishes while its shell survives never produces a dead pane, so "back at a prompt" is the ordinary completion signal. `--no-voice` suppresses notifications while keeping the JSON.

### `list` / `tree` [--session <id>]

Structured topology — sessions → windows → panes, with real fields rather than regex-scraped stdout. `tracked` marks sessions this tool created on the current server generation, and `role` carries the title assigned at creation.

Two fields are deliberately handled with care. **`pane_current_path` never appears**, in any template: it carries raw filesystem bytes that can contain the field delimiter or a newline, producing extra fields or extra records, and neither `#{q:}` nor a base64 modifier (which does not exist in tmux 3.6) can escape it. Query it alone if you need it. **`pane_title` is always the last field**, so a delimiter inside a title rejoins into the title rather than shifting every column.

Note that `pane_title` defaults to the **machine hostname**, not an empty string, so an untitled pane is not `""` and raw topology output can contain a hostname. Do not paste `tree` output anywhere public unmodified.

### `flash --target <id> [--bell]`

Attention signal. **Degraded relative to CMUX, and the JSON says so on every call.**

```json
{"ok":true,"target":"%0","window":"@0",
 "actions":["display-message","transient-border-style","select-pane"],
 "bell":"skipped","degraded":true,"degradedReason":"..."}
```

tmux has no GUI pulse, so `flash` does what tmux can: a `display-message` on the status line, a red pane border held for ~1.2 s and then restored with `set-option -u`, and `select-pane` to move focus. **All of it is visible only to an ATTACHED client** — and the operator this skill is built for is usually detached, in which case `flash` accomplishes nothing they will see. `monitor`'s voice notification through Pulse is the real attention mechanism.

`--bell` is opt-in and reports `bell: "sent-as-input-byte"`, because the only way to ring a terminal from tmux is `send-keys -H 07`, which writes byte `0x07` into the pane's **input** stream. A live prompt or TUI may echo or swallow it, and it lands in whatever the agent is typing. That is why it is not the default.

Border styling is scoped with `-w` to the window this tool created and restored with `-u`. Nothing is ever set with `-g`.

### `voice "<message>"`

`POST http://localhost:31337/notify` with `{"message": "...", "voice_enabled": true}`, 5 s timeout.

```json
{"ok":true,"notified":true,"endpoint":"http://localhost:31337/notify"}
```

`ok:true` with `notified:false` means Pulse was unreachable — a notification failure never fails the caller.

### `kill --target <id>`

Teardown. Accepts `$N`, `@N` or `%N` and dispatches to `kill-session`, `kill-window` or `kill-pane`.

```json
{"ok":true,"killed":"$2","kind":"session","session":"$2","generation":"3265593:1785086482"}
```

Four refusals, all returning exit 1:

| `code` | When |
|---|---|
| `not-an-id` | The target is a name. Prefix resolution makes name-targeted destruction unsafe. |
| `not-owned` | The ID is not in the state file for this socket — this tool did not create it. There is no override flag. |
| `stale-generation` | The ID was recorded against a different server incarnation. |
| `refused` | `--all` / `-a` was passed. |

`--all` is refused outright because tmux's `kill-session -a` kills every session *except* the target — on a shared server that destroys the operator's work, and the flag name reads like it means the opposite.

**Generation tokens.** tmux object IDs restart at `$0`/`@0`/`%0` for every new server incarnation, so a stored ID silently retargets a different object after a restart. Every recorded ID is stamped with `#{pid}:#{start_time}` (both change on restart). If the running server's token does not match the recorded one, `kill` refuses and reports both values rather than guessing.

### `doctor`

Environment and safety self-check. Always `ok:true` unless tmux itself is missing.

```json
{"ok":true,"version":"tmux 3.6","socket":"default","serverRunning":true,
 "generation":"3374884:1785086678","nested":false,"nestedPane":null,
 "statePath":"~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/state.json",
 "trackedSessions":[{"id":"$0","name":"big","kind":"boot-team","panes":9,
   "windows":[{"window":"@0","remainOnExit":"on","paneBorderStatus":"top","allowRename":"off"}]}],
 "orphanedSessions":[],"leakedBuffers":["lifeos-tmux-orphan"],
 "warnings":["1 named buffer(s) with prefix lifeos-tmux- are still on the server"],
 "usesPasteBuffer":false}
```

Reports the tmux version; server reachability; whether it is running **nested** inside a tmux pane; per-window `remain-on-exit`, `pane-border-status` and `allow-rename` for every session this tool created, with a warning for each that is wrong; **orphaned sessions** (tracked but gone, or recorded against a dead generation); and **leaked named buffers** with the `lifeos-tmux-` prefix.

## Window options

Set with `-w` on every window this tool creates, never with `-g`:

| Option | Value | Why |
|---|---|---|
| `remain-on-exit` | `on` | Without it an exited pane is destroyed: no `pane_dead`, no `pane_dead_status`, hooks never fire, `capture-pane` errors, and a crashed agent leaves no evidence it ever ran. **This is a WINDOW option — the session-scoped form `set-option -t "$SID" remain-on-exit on` returns success and silently does nothing.** Panes added later by `split-window` inherit it (verified); windows added later by `new-window` do **not**, so it is applied per window. |
| `pane-border-status` | `top` | Defaults to `off`, which makes every role title invisible. |
| `pane-border-format` | `#{pane_index}:#{pane_title}` | Renders the role in the border. |
| `allow-rename` | `off` | Defaults to `off`, but an operator's config may set it `on`, which lets a pane's OSC 2 escape clobber its role title. Pinned per window. |
| `automatic-rename` | `off` | Defaults **on** and tracks the running command, so window names drift. (`rename-window` also turns it off implicitly.) |

**Nothing is ever set with `-g`.** A global option or hook reaches sessions this tool never created, and `set-hook -gu` cleanup would strip the operator's own global hooks for that event. No hooks are installed at all.

## Paste buffers

**This tool never uses `paste-buffer`.** `send-keys -l` is sufficient, and named buffers are a liability: they are server-global and readable with `show-buffer -b <name>` from any session, a same-name `load-buffer` silently overwrites a concurrent caller, `buffer-limit` only trims *automatic* buffers so named ones persist indefinitely, and `paste-buffer -d` does **not** delete the buffer when the paste fails. `doctor` still reports any buffer with the `lifeos-tmux-` prefix so a leak from another caller or an older build is visible.

## Nested operation

`$TMUX` is set when this tool runs inside a pane. `ping` and `doctor` report `nested`, `doctor` warns about it, and `send` refuses to write into the pane the wrapper itself occupies. Running on one socket while targeting another with `--socket` is supported and is the recommended pattern for testing: it keeps the default socket, where the operator's real work lives, untouched.

## Degraded and absent capabilities

| Capability | Status | Detail |
|---|---|---|
| GUI flash / pulse | **degraded** | `display-message` + transient border + optional input-byte bell, attached clients only. See `flash`. |
| Per-team colour identity | **partial** | Border and status styling scoped to the session; no theming. |
| In-app browser pane | **absent** | tmux is a terminal multiplexer; there is no such object. Use `Interceptor` separately. |
| Screen-text done-detection | **weak by construction** | Reported at `confidence: "weak"` and overruled by stronger layers, rather than presented as fact. |

Three things this has that a GUI multiplexer does not: sessions that survive disconnection, real exit statuses via `pane_dead_status`, and structured topology without regex-scraping stdout.

## Error codes

`missing-flag`, `bad-flag`, `bad-name`, `bad-cwd`, `bad-host`, `name-taken`, `not-an-id`, `target-missing`, `self-target`, `multiline-refused`, `not-owned`, `stale-generation`, `refused`, `no-server`, `no-generation`, `no-hosts`, `no-fleet-config`, `bad-fleet-config`, `split-failed`, `capture-failed`, `kill-failed`, `tmux-missing`, `tmux-failed`, `unexpected-output`, `unknown-subcommand`, `unhandled`.

## Reproducing the verification run

Everything below runs on a private socket and destroys only what it creates.

```bash
T=~/.claude/skills/TMUX/Tools/Tmux.ts
export TMUX_SKILL_STATE=/tmp/tmux-skill-verify.json   # keep the real state file out of it
S=tmuxskill-verify                                    # never the default socket
rm -f "$TMUX_SKILL_STATE"; tmux -L $S kill-server 2>/dev/null

bun $T doctor  --socket $S                            # no server yet
bun $T ping    --socket $S
bun $T boot-team --socket $S --name debug --tiers orchestrator,lead,worker,worker
bun $T tree    --socket $S --session '$0'
bun $T send    --socket $S --target %1 "echo hello-from-lead" --enter
bun $T read    --socket $S --target %1 --lines 5

# anti-test: multi-line payload without --enter  -> multiline-refused, exit 1
bun $T send    --socket $S --target %2 "$(printf 'echo one\necho two')"
# anti-test: a name instead of an ID             -> not-an-id, exit 1
bun $T send    --socket $S --target debug "hi"

bun $T monitor --socket $S --session '$0' --once --no-voice
bun $T flash   --socket $S --target %0
bun $T race    --socket $S --feature login-500 --agents 4 --cmd "echo racer-online"
bun $T fleet   --socket $S --name alpha --grid 3x2 --cmds "echo a;echo b;echo c"
bun $T fleet   --socket $S --name wide  --grid 1x5   # must NOT come out as 3x2
bun $T fleet   --socket $S --name tall  --grid 5x1   # must NOT match 1x5
bun $T mini-fleet --socket $S --hosts "alpha=user@10.0.0.1,beta=user@10.0.0.2"
bun $T voice   --socket $S "verification run complete"

# anti-test: prefix targeting cannot reach an operator session
tmux -L $S new-session -d -s production-work
tmux -L $S display-message -p -t production "raw tmux resolves to #{session_name}"  # production-work
bun $T kill --socket $S --target production          # -> not-an-id, exit 1
bun $T kill --socket $S --target '$6'                # -> not-owned, exit 1 (untracked)
bun $T kill --socket $S --target '$1' --all          # -> refused, exit 1

bun $T kill --socket $S --target '$1'                # succeeds: this tool created it

# anti-test: stale generation
tmux -L $S kill-server; tmux -L $S new-session -d -s somebody-elses-work
bun $T kill --socket $S --target '$0'                # -> stale-generation, exit 1
bun $T doctor --socket $S                            # lists the orphans

tmux -L $S kill-server; rm -f "$TMUX_SKILL_STATE"    # clean up
```

Type check with `bun build --target bun ~/.claude/skills/TMUX/Tools/Tmux.ts --outdir /tmp/tmux-build`.
