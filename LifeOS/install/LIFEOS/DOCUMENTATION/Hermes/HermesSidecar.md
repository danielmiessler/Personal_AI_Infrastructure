---
last_updated: 2026-08-01T13:05:00-07:00
last_updated_by: da
convention: pai-freshness-v1
version: 1.2.0
---

# Hermes Sidecar — talk to your LifeOS as an agent

> **What it is.** An optional second front door onto a LifeOS install. Hermes
> runs beside LifeOS and mounts it: same constitution, same identity, same
> skills, same understanding of what is sensitive — reachable from a terminal
> today and, once the injection defense lands, from a messaging channel.
>
> **What it is not.** A second assistant with its own memory and its own
> opinions. There is one brain. The sidecar is another way into it.

## Why a sidecar rather than a bot

Every channel bot ever written re-implements the assistant badly: its own
prompt, its own memory, its own drift. The sidecar inverts that. Hermes supplies
the *engine and the channels*; LifeOS supplies the *identity, the rules, and the
knowledge*. When Hermes rots or something better appears, the mount moves and
nothing about who the assistant is has to be rewritten.

## The load-bearing idea: secrets get used, never seen

A full mount looks alarming until you notice what LifeOS skills actually are.
They are CLI-first — the real work is a `bun .../Tools/X.ts` subprocess that
reads its own credentials in its own memory and prints a result.

So the agent invokes the tool and receives the *answer*. The token does its job
without ever entering the model's context. That single property is what makes it
safe to hand an agent the whole tree: **a successful prompt injection finds
nothing to exfiltrate, because the secrets were never in the conversation.**

Everything below is machinery around that idea.

## Architecture

```
LifeOS install (read-only to the sidecar)          Hermes install
├── LIFEOS/HERMES/           ← sidecar code        $HERMES_HOME (default ~/.hermes)
│   ├── Policy.ts            deny-set definition   ├── SOUL.md        ← generated
│   ├── RenderSoul.ts        constitution+identity ├── config.yaml    ← patched
│   ├── Mount.ts             installer/sync        ├── .env           ← sandbox root
│   └── plugin/              the guard             ├── cron/          ← read by Pulse
├── LIFEOS/USER/             ← content, never code └── plugins/lifeos/← installed
└── skills/                  ← mounted read-only       ├── guard.py
                                                       └── policy.json ← generated
$HERMES_WORKSPACE (default ~/HermesWorkspace)   ← the only place the agent may write
~/.local/bin/<da-name>                          ← launcher: cd to LifeOS root, exec hermes
```

Three paths, three jobs, and keeping them straight is most of understanding the
mount: the **LifeOS tree** is read-only input, **`$HERMES_HOME`** holds generated
state and the guard, and **`$HERMES_WORKSPACE`** is the only writable scratch.
Both Hermes paths are overridable by environment variable; `Mount.ts` honours
whatever is set, so a non-default install needs no edits.

**Code and content never mix.** Everything under `LIFEOS/HERMES/` is
install-generic: no identity, no home paths, no instance literals — it ships
publicly as-is. Everything personal is *read* from `LIFEOS/USER/` at render time
and *written* into `$HERMES_HOME`, which lives outside the LifeOS repo entirely.
Nothing generated is ever committed back.

## The four controls

Reading is not the security boundary — the principal *wants* the agent to read
everything. The boundary is what can leave, and what can be reached.

**1. Read guard (`pre_tool_call`).** A plugin hook vetoes any tool call whose
path or command touches credential material: env files, token stores, SSH/AWS/
GPG directories, key material by extension, harness config, security state. It
fires before every tool, built-ins included, and returns a block the model
cannot route around. Everything else in the tree is open, which is the point.

Three bypasses it handles explicitly, because each defeats a naive matcher:

| Bypass | Handling |
|---|---|
| Symlinks (`LIFEOS/USER` is one) | matches the literal path *and* the resolved realpath |
| Case (macOS is case-insensitive) | all matching lowercased |
| Traversal / relative paths | resolved to absolute before matching |

It also covers `execute_code`, not just `terminal` — a two-line Python snippet
reads any file the process can reach, and a guard watching only the shell has a
documented hole.

**2. Write sandbox.** `HERMES_WRITE_SAFE_ROOT` hard-blocks writes outside the
workspace and Hermes' own state. The LifeOS tree is read-only at the filesystem
level; nothing the agent does can edit it directly.

**3. Typed write API** *(planned)*. Persistence goes through the LifeOS memory
API, which tier-gates every write and surfaces it as a proposal — the same path
a terminal session uses. The agent never writes files; it calls an API bound by
the same rules. Until this lands, the sidecar is read-plus-CLI only.

**4. Provenance tainting** *(required before any channel)*. Content arriving
from an untrusted source — an inbound message, a fetched page — is marked, and a
turn that has consumed tainted input requires explicit approval for privileged
tool calls. This is what stops "agent reads a malicious page" from becoming a
compromise, and it is the hard gate on enabling the gateway.

### Honest limits

- Controls 1 and 2 are real enforcement. Control 3 is not built yet; control 4
  is not built yet, and **the gateway must not be enabled until it is.**
- Hermes' own docs are explicit that deny rules are "not a sandbox against a
  deliberately adversarial process." True isolation is a separate OS user or a
  container — which costs the seamless mount. Worth re-asking the day the
  sidecar answers messages unattended.
- Plugins are **opt-in**. An installed-but-disabled guard looks present in every
  listing while enforcing nothing, so enabling is part of installing.

## Installing

```bash
# 1. Install Hermes (pinned, no Playwright — LifeOS uses Interceptor)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh -o install.sh
# review it, then:
bash install.sh --non-interactive --skip-setup --skip-browser --commit <reviewed-sha>

# 2. Authenticate (its OWN session — never import a sibling agent's tokens)
hermes auth add openai-codex --type oauth --no-browser

# 3. Mount LifeOS
bun LIFEOS/HERMES/Mount.ts

# 4. Install the launcher (below) and start from it, never from bare `hermes`
```

`Mount.ts` is idempotent and is the only supported way to change any of this:

- renders `SOUL.md` from live LifeOS sources,
- installs *and enables* the guard plugin with a generated policy,
- patches `config.yaml` (soul cap, skills mount, approval policy),
- creates `$HERMES_WORKSPACE` and sets `HERMES_WRITE_SAFE_ROOT` to
  `$HERMES_WORKSPACE:$HERMES_HOME` in `$HERMES_HOME/.env`.

Re-run it after editing identity, TELOS, or the system prompt. `--check` reports
drift without writing; wire it into a freshness job if the install should never
serve a stale identity.

**`Mount.ts` is the only writer of `config.yaml`, and the deny list is reconciled
rather than seeded.** Both were learned on 2026-07-31. Mount used to skip the
approvals block whenever one already existed, so a hand-edited list could never be
corrected and `--check` still called the install clean — which is how `*.claude*`
sat in a live deny list while `Policy.ts` was the stated source of truth. It also
finished by shelling out to `hermes plugins enable lifeos`, and that command rewrites
the file from a stock template: a 236-line config came back as 46 lines of defaults,
losing the model and agent blocks, the skills mount, the approvals list, and the
enabled Telegram and Photon platforms. Every mount discarded its own work and took
the chat channels with it. The plugin is now enabled by editing `plugins.enabled`
in the config Mount already owns. Don't reintroduce the shell-out, and don't
hand-edit the deny list — change `Policy.ts` and re-mount.

**Deny globs match paths, not substrings.** `*.env*` also matches `os.environ` and
`process.env`, which is not a hypothetical: six of the guard's first eleven blocks
were ordinary code touching no file, and the mail-monitor cron died on it. A glob
that fires on normal work teaches everyone to route around the guard, so the env
rules are path-anchored (`*/.env*`, `* .env*`, and the quoted forms). The same
mistake in the other direction is worse: `*.claude*` denied every command naming
the LifeOS tree, which is every skill CLI, since all of them live under it. The
mount's whole premise is invoking those tools. What that glob was actually
protecting — harness config and security state — is now named directly
(`*.claude/settings*`, `*LIFEOS/USER/SECURITY*`).

### The launcher

Hermes must run **from the LifeOS root**, or it loads no project context and the
mount is half-blind. That is what the launcher is for — a small script on
`PATH`, named after the DA, that refuses to start if the guard is missing:

```bash
#!/usr/bin/env bash
set -euo pipefail
LIFEOS_ROOT="${LIFEOS_ROOT:-$HOME/.claude}"
[ -d "$LIFEOS_ROOT" ] || { echo "no LifeOS install at $LIFEOS_ROOT" >&2; exit 1; }
[ -f "$HOME/.hermes/plugins/lifeos/policy.json" ] || {
  echo "sidecar guard not installed — run: bun $LIFEOS_ROOT/LIFEOS/HERMES/Mount.ts" >&2; exit 1; }
cd "$LIFEOS_ROOT"
exec hermes "$@"
```

The guard check is the load-bearing line. Running stock `hermes` from the LifeOS
root gives a full read mount with **no** credential guard in front of it, and
nothing about the session would look wrong. Launch through the script, always.

Working from the LifeOS root is safe because the guard blocks credential
material at the tool boundary and the write-sandbox keeps the tree read-only —
not because the working directory fences anything.

### Authentication

Use a **fresh device-code login**, never an import of another tool's tokens.
OAuth refresh tokens are single-use, so a shared token means the two clients
race and one of them breaks. Hermes' own installer recommends the same.

### Skills are the default path

Mounting the skills directory puts them on disk; it does not make the agent use
them. Both halves are required, and both are Mount's job (principal directive,
2026-08-01: Hermes routes requests through LifeOS — same skills, same
capabilities as the terminal):

- `config.yaml` gets `skills.external_dirs` pointing at the install's `skills/`
  tree, so Hermes' own skill loader sees them.
- The soul gets a **skills-routing tier**: doctrine stating that LifeOS skills
  are the default capability path — a matching request executes that skill's
  SKILL.md workflow, never a handrolled equivalent — plus a capability index,
  one line per skill, rendered live from each `SKILL.md`'s frontmatter by
  `renderSkillRouting()` in `RenderSoul.ts`.

The index is generated at mount time from the mounted tree, so adding a skill
and re-mounting is the whole update; nothing in `LIFEOS/HERMES/` names a skill.
Summaries are the description's first clause (the part before USE WHEN), because
the agent routes on what a skill does and reads the SKILL.md for triggers and
workflow before executing.

### The soul cap

Hermes truncates its identity file at `context_file_max_chars` (default 20,000)
**silently**. A LifeOS constitution alone is near that, so `Mount.ts` sets an
explicit, generous cap and refuses to write a soul that exceeds it. A truncated
identity fails quietly, which is the worst way to fail.

### One renderer, not two

`LIFEOS/HERMES/RenderSoul.ts` is the canonical renderer — `Mount.ts` calls it,
and it renders the full constitution against the 100,000-char cap `Mount.ts`
writes into `config.yaml` (raised from 80k on 2026-08-01 when the skills
capability index joined the soul).

`LIFEOS/TOOLS/RenderHermesSoul.ts` is its **superseded** predecessor: a
standalone compressor built for the stock 20,000 cap, which squeezes identity
into a 19,500-char budget and also writes `$HERMES_WORKSPACE/.hermes.md`. It has
no inbound callers. Run it against a mounted install and it silently replaces
the full soul with the compressed one — the constitution goes with it. Don't;
re-run `Mount.ts` instead.

### Output format

The terminal output contract — banner, CHANGE/VERIFY sections, closer line — is
CLI presentation and is stripped by default. Rendering it into a chat bubble is
what broke earlier chat-bot attempts: identity injected as prose, then policed
with an egress regex. The *rules* carry over; the ASCII does not. Pass
`--keep-output-format` to override.

## Verifying an install

Trust these, not the config file:

```bash
python3 LIFEOS/HERMES/plugin/test_guard.py     # deny + allow cases
bun LIFEOS/HERMES/Mount.ts --check             # identity/config drift
```

Then verify end-to-end, which is the part that actually matters. A model
refusing a sensitive read proves *nothing* — it may simply be complying with the
soul, leaving the guard untested. Ask it to read a denied file **using the tool
explicitly** and confirm it reports the guard's verbatim block message, then
check the audit trail:

```bash
cat "$HERMES_HOME/plugins/lifeos/blocked.jsonl"
```

Every block is recorded there with tool, target, and reason. The plugin owns
that file because Hermes' own logger drops plugin warnings on some
configurations, and a security control with no audit trail cannot be reviewed
after the fact.

## Where it shows up in LifeOS

Separate but integrated: Hermes keeps its own install, its own process tree, and
its own vendor label — and LifeOS owns its health, reporting it wherever LifeOS
reports the health of anything else.

**The process.** `LIFEOS/HERMES/Health.ts` is the one probe. It reconciles three
sources that can disagree — what the supervisor thinks it has, what
`gateway_state.json` last claimed, and whether that pid is alive right now — into
one of `up` / `degraded` / `flapping` / `down` / `absent`, plus per-channel state
and a problem list. Read-only by design: it never starts, stops, or restarts
anything.

`flapping` exists as its own state because a crash-looping gateway satisfies both
the supervisor and the state file continuously while being down nearly all the
time. Uptime therefore comes from the live process, never from the state file's
write age, which a flapping gateway refreshes forever.

**Where it renders.**

- `bun LIFEOS/TOOLS/Services.ts status` — the gateway is a registered service
  under the `sidecar` category, like every other background service.
- Pulse `/assistant` → **Hermes (sidecar)** — status, uptime, pid, a chip per
  channel, and any problems, above the cron-job list. Served from
  `/assistant/tasks` as the `hermes` field.
- The menu bar — one Hermes row carrying the status, coloured by state. `down`
  and `flapping` also raise an actionable feed entry; `degraded` does not, since
  a channel that was never given credentials is a standing config gap rather
  than news.

**Jobs, separately.** `scheduled.ts` also exports `hermesJobs()` (from
`$HERMES_HOME/cron/jobs.json`) and `hermesTicker()` (the scheduler's own
liveness, reported apart from the job list because a healthy job list on a dead
ticker is exactly the failure that looks fine). Both feed `aggregateTasks()` in
`LIFEOS/PULSE/Assistant/module.ts` under `source: "hermes"`. Create and edit jobs
with `hermes cron` — Pulse reports, it does not own them.

Every Hermes read in a Pulse payload is best-effort: an absent install, an absent
cron file, or unreadable JSON degrades to empty or `absent`, so a broken sidecar
can never take down the dashboard or the menu bar.

### The core files, in Pulse

Health answers *is it running*. The **Hermes** tab on Pulse `/assistant` answers
*what is it, and change it* — every file the sidecar's behaviour depends on, read
and edited from the dashboard. Served by `LIFEOS/PULSE/modules/hermes.ts` at
`/api/hermes`.

The files are grouped by **plane**, because the three are governed differently and
a flat list would hide that:

| Plane | What | Editable |
|-------|------|----------|
| **source** | `LIFEOS_SYSTEM_PROMPT.md`, DA + principal identity and memory, TELOS, PROJECTS | Yes — this is the real lever, since SOUL.md is rendered from it |
| **runtime** | `$HERMES_HOME`: `SOUL.md`, `config.yaml`, `policy.json`, the installed guard, `cron/jobs.json`, `.env`, `auth.json` | Only the hand-maintained ones |
| **code** | `LIFEOS/HERMES/*` — RenderSoul, Mount, Policy, Health, the plugin, bunker config, ISA | Yes, gated on `assertClean()` |

Three rules make it safe to put a file editor on a dashboard:

- **Generated files are read-only.** `SOUL.md`, `policy.json`, and the installed
  plugin copies are shown in full and refuse writes with a 409 naming their
  generator, because a hand edit there survives exactly until the next mount. The
  row links to the sources to edit instead.
- **Credential material is sealed.** `.env` and `auth.json` are listed with size
  and mtime and never read into a response. Same rule the guard enforces on the
  sidecar — a dashboard is not an exemption.
- **Files are addressed by id, never by path.** A `?path=` parameter on a
  localhost server is an arbitrary-file-read primitive; every reachable file is
  named in the module's registry, so traversal has nothing to traverse.

Writes to the code plane run `assertClean()` first, so a home path or a token
typed into the editor is refused at the boundary (422) rather than found at
release time. Every save keeps the previous bytes under
`LIFEOS/MEMORY/STATE/hermes-edits/`.

The tab also carries **mount drift**: `Mount.ts --check` renders as `current` or
`stale`, with a Re-mount button that runs the real installer and prints its
output. That is what closes the loop — edit a source file, see the mount go
stale, re-mount, watch SOUL.md's digest change.

### The restarter loop

Hermes blocks in-process gateway restarts (SIGTERM would kill the command
issuing them), and its workaround submits a helper job that sleeps and then
`launchctl kickstart -k`s the gateway. `launchctl submit` defaults KeepAlive to
**true**, so that helper relaunches itself forever and kills the gateway on every
pass. Found 2026-07-30 after hours of ~30-second restarts, and observed
re-submitting itself later the same evening.

`launchctl remove ai.hermes.gateway-restarter` clears it. The health probe names
that job directly whenever it is loaded, so the recurrence is visible instead of
silent. This is upstream behaviour in Hermes; LifeOS reports it rather than
patching a vendor install.

### Alerting

The sidecar is a Bunker app. `LIFEOS/HERMES/bunker.config.ts` puts it in the
registry, and the ISA's `## Test Strategy` rows are its probes, so
`com.lifeos.bunkermonitor` runs them every five minutes alongside every other
app and emails on green→red and red→green transitions. Two rows carry
`severity: critical` — the gateway being down or flapping, and the restarter
being loaded — which means either one pages as an outage rather than filing as
degraded, even while every other probe passes.

Nothing pages for `degraded` or `absent`. A channel that was never given its
credentials is a standing config gap, and an install with no sidecar is not a
fault; alerting on either would train the alert to be ignored, which costs more
than the coverage is worth. Both stay visible in Pulse and the menu bar.

```bash
bun Health.ts --assert-live          # exit 1 only on down / flapping
bun Health.ts --assert-no-restarter  # exit 1 while the looping job is loaded
bun test Health.test.ts              # the flap detector's own regression suite
```

One adjacent thing that is *not* the sidecar: `skills/LifeOS/Tools/InstallEngine.ts`
lists `hermes` (root `~/.hermes`) as a harness LifeOS can install *into*. That is
the reverse direction — LifeOS skills laid into a Hermes install — and it shares
nothing with the mount described here.

## Known behaviour worth knowing

The agent will sometimes answer a factual question about the install from
inference instead of reading the file, and be confidently wrong. Ask for
verbatim quotes when accuracy matters. This is model behaviour, not a mount
defect — but it is the reason the verification doctrine is in the soul, and it
is worth re-checking as models change.

## Installer integration

The LifeOS installer offers the sidecar as an optional step:

> *Install Hermes as well, so you can talk to your LifeOS as an agent?*

Choosing yes runs the steps above against the user's own install. Because
all generated artifacts land in `$HERMES_HOME` and all personal content is read
from that install's own `LIFEOS/USER/`, the same code produces a correctly
personalized sidecar on every machine with no per-install editing.

Declining costs nothing — LifeOS does not depend on the sidecar in any way.

## Removing it

```bash
hermes plugins disable lifeos
rm -rf ~/.hermes                 # the entire install, including its own credentials
rm -rf ~/HermesWorkspace         # scratch space; check it first, it is writable
rm -f ~/.local/bin/{{DA_NAME}}   # the launcher (named after your DA)
```

Nothing under the LifeOS tree is modified by the sidecar, so removal leaves no
trace in the install.
