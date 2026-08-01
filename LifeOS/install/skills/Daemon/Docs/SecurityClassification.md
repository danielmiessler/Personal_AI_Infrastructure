# Daemon Security Classification

Defines what data is public vs private for daemon aggregation. The aggregator uses this as its allowlist — only explicitly public content passes through.

## Core Principle

**Private by default. Promote known-safe.** Every field must be explicitly classified as public before the aggregator includes it. Unknown data is excluded.

## Source Classification

### ALWAYS PUBLIC (safe to publish verbatim)

| Source | Fields | Notes |
|--------|--------|-------|
| TELOS/BOOKS.md | All titles | Book preferences are public |
| TELOS/MOVIES.md | All titles | Movie preferences are public |
| TELOS/WISDOM.md | All quotes | Philosophical quotes, no PII |
| TELOS/MISSION.md | Public missions only | Philosophical / craft missions |
| daemon data: predictions | All | Public predictions with confidence |
| daemon data: daily_routine | All | Generic routine, no locations |
| daemon data: podcasts | All | Public preferences |

### PUBLIC WITH FILTERING (safe after security filter applied)

| Source | Public Fields | Filtered Out |
|--------|--------------|-------------|
| TELOS/GOALS.md | Public project goals | Revenue targets, follower counts, private repos |
| TELOS/MISSION.md | Public missions | Missions referencing private people |
| TELOS/CHALLENGES.md | General self-improvement challenges | Any referencing private people |
| PRINCIPAL_IDENTITY.md | Role, focus, career, interests, worldview | Partner name, private contacts |
| PROJECTS.md | Public repos and sites only | Private repos, internal tools |
| KNOWLEDGE/Ideas/ | Title + thesis only | Evidence, implications, internal refs |
| MEMORY/WORK/ | Abstracted topic themes | ISA details, task slugs, client info |
| daemon data: preferences | Generic preferences | Internal tooling specifics |
| daemon data: about | Bio text | Private names, internal paths |

### STRUCTURALLY EXCLUDED (aggregator never reads these)

| Source | Reason |
|--------|--------|
| LIFEOS/USER/CONTACTS.md | Contains real names, emails, phones |
| LIFEOS/USER/FINANCES/ | Financial data |
| LIFEOS/USER/HEALTH/ | Health data |
| LIFEOS/USER/TELOS/TELOS.md `## Traumas` | Deeply personal |
| LIFEOS/USER/BUSINESS/ | Business confidential |
| MEMORY/KNOWLEDGE/People/ | OSINT dossiers, consent not given |
| MEMORY/KNOWLEDGE/Companies/ | May contain proprietary intel |
| Any .env, .key, .pem file | Credentials |

### PROJECTS PUBLIC/PRIVATE CLASSIFICATION

The classification is config-driven, not hardcoded. The aggregator reads two user-zone config files in `LIFEOS/USER/DAEMON/`: a public-projects allowlist (one project name or repo URL per line; empty by default) and a private-projects blocklist (same format; empty by default).

If a project appears in neither list, the aggregator defaults to **exclude** (private by default). This file does not enumerate any specific project names — that data belongs in the user's own DAEMON config files, never in the public skill source.

## Entity Blocklist

These categories must never appear in public output. The SecurityFilter enforces them deterministically. **The literal values live in user-zone config files, NEVER in this public doc** — listing them here would itself be the leak this filter is designed to prevent.

### Names

The aggregator reads named blocklists from a free-form per-user file in `LIFEOS/USER/DAEMON/` (one name per line) AND from the user's contacts file in `LIFEOS/USER/`. Every name in the contacts file is automatically blocked from public output.

Public users seed both files via `/interview` (contacts phase) or by editing directly. The default is **empty** — the filter runs against whatever names the user lists.

### Aliases and Abbreviations

- Single-letter abbreviations used as person references (e.g., "X" / "B" / "M" when followed by identifying context like "X's calendar", "me and B")
- Relationship words ("my partner", "my girlfriend", "my mom") when followed by identifying context

These pattern classes are baked into the filter. Specific names that match them are sourced from user config (above), never enumerated here.

### Paths

The aggregator strips any path that matches:

- `/Users/<your-username>/` (or `/home/<your-username>/` on Linux) — strips your home dir from any output
- `~/.claude/` — internal LifeOS paths
- Common cloud-storage mount points and typical local-project root dirs

User-specific additional path patterns can be added to a free-form per-user file in `LIFEOS/USER/DAEMON/` (one path or glob per line).

### Credentials

- Any string matching: `sk-*`, `ghp_*`, `CLOUDFLARE_API_TOKEN`, `ANTHROPIC_API_KEY`
- Any string matching: `*_API_KEY`, `*_TOKEN`, `*_SECRET`

### Internal Architecture

- LifeOS internal system names when used as implementation details
- Hook filenames, tool paths, internal pipeline names
- Pulse port numbers, internal API endpoints

## Customization

Users customize this classification by placing overrides in `LIFEOS/USER/DAEMON/`:

```
LIFEOS/USER/DAEMON/public-projects.md     # opt-in projects
LIFEOS/USER/DAEMON/private-projects.md    # opt-out projects
LIFEOS/USER/DAEMON/blocked-names.md       # additional names to scrub
LIFEOS/USER/DAEMON/blocked-paths.md       # additional paths to scrub
LIFEOS/USER/DAEMON/SecurityOverrides.md   # free-form additional rules
```

Override file format:

```markdown
## Additional Blocked Names
- Name1
- Name2

## Additional Public Projects
- ProjectName

## Additional Excluded Paths
- /path/to/exclude
```

Why config-driven, not hardcoded: if this file enumerated any specific user's contacts, projects, or paths, then *publishing this file* would itself leak that data — exactly what the filter is supposed to prevent. The filter's *categories* are public; the *specific values* live in private USER-zone config.
