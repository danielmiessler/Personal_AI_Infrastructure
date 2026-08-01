---
last_updated: 2026-07-22T04:00:00Z
last_updated_by: da
convention: pai-freshness-v1
version: 1.1.1
---

# Atlas — the LifeOS Asset Graph

> **Atlas is a graph-based current-state asset management system.** It maintains the current state of everything in the ecosystem as a queryable graph: Cloudflare workers, domains, DNS records, repos, projects, scanner targets, launchd services, machines, gear — one local SQLite system of record, reconciled from sources of authority, surfaced as the ATLAS tab in Pulse. It is the current-state half of the LifeOS thesis made concrete: before you can climb toward an ideal state you need an accurate picture of the state you're in.

Modeled on CNCF Cartography's design (sync-and-expire collectors, per-source observations, first/last-seen stamps on every fact), rebuilt LifeOS-native: TypeScript, bun:sqlite, no server daemon, no Neo4j. Design hardened by a 2026-07-21 cross-vendor audit (see `LIFEOS/ATLAS/ISA.md` Decisions).

## Where things live

| Piece | Path |
|---|---|
| CLI + store + collectors | `LIFEOS/ATLAS/` (`Atlas.ts`, `Store.ts`, `collectors/*.ts`) |
| ISA (persistent state-of-record) | `LIFEOS/ATLAS/ISA.md` |
| Database (SQLite, WAL) | `~/.local/state/lifeos/atlas/atlas.db` — **outside both git repos, by design** |
| Redacted Pulse snapshot | `~/.local/state/lifeos/atlas/snapshot.json` |
| Event hints | `~/.local/state/lifeos/atlas/events.jsonl` |
| Hint hook | `hooks/AtlasEventCapture.hook.ts` (PostToolUse: Bash, Write, Edit, MultiEdit) |
| Background service | `com.lifeos.atlas` (launchd: 15-min tick + WatchPaths on events file) |
| Pulse | module `PULSE/modules/atlas.ts` → `GET /api/atlas`, `GET/POST /api/atlas/insights` → page `/atlas` (tier1 nav): live d3-force graph + Insights + Browse + Gaps tabs |
| Insights cache | `MEMORY/STATE/atlas-insights.json` (Inference narrative, keyed by metric content hash) |
| Tests | `LIFEOS/ATLAS/tests/store.test.ts` (sweep invariants) |

## Architecture

**One writer class, one reader artifact.** Collectors are the only thing that writes graph facts. Pulse reads the exported snapshot, never the live DB. `atlas sql` opens read-only. This keeps the WAL single-writer model honest with zero daemon.

**Observations, not assertions.** Every asset carries per-collector `source_observation` rows — the same domain can be observed by `cloudflare`, `projects`, and `infra-inventory` at once, on ONE asset (canonical keys like `domain:example.com`, `cloudflare:worker:mysite`, `github:repo:owner/name`). An asset's lifecycle derives from ALL observations: active while any collector still sees it; stale, then expired, only when everyone has stopped. One source going quiet expires that source's observation, never the asset.

**Sync-and-expire with hard gates (the Cartography pattern, plus audit teeth).** Each run stamps what it saw. Sweeping — marking observations unfresh — happens ONLY on a successful, enumeration-complete, `full`-scope run, and only within that collector's own observations. A partial page, an API error, a rate limit → `PARTIAL` run, no sweep, prior state intact. Targeted runs are structurally incapable of expiring anything.

**Two-tier updates: reconciliation is truth, hints are latency.**
- *Reconciliation:* `atlas tick` runs a full sync when the last one is >1h old (launchd fires every 15 min).
- *Hints:* the `AtlasEventCapture` hook watches mutating tool calls (wrangler deploys, `gh repo` mutations, edits to PROJECTS.md/GEAR.md/infra-inventory.ts, launchctl ops) and appends `{ts, source}` hints. The launchd WatchPaths fires, `atlas tick` consumes the hints, and runs a *targeted* re-collect of just those sources. **Hints never write facts** — the collector re-pulls truth from the authority. A missed hint costs nothing; the hourly cycle heals.

**No secrets, ever (Anti-claim A1).** No token, key, or cookie value is stored, logged, or exported. Credential-class assets, when added, carry references only, and the snapshot strips their attrs at export. Even value-free, the graph is a map of the estate — hence local-only, outside git, behind FDE.

## Collectors (v1)

| Collector | Source of authority | Produces |
|---|---|---|
| `cloudflare` | CF API (token from `~/.claude/.env`, header auth only) | domains (zones + hostnames + workers.dev hosts), dns_records, workers (with `cron`/`workers_dev`/`queue_consumer` attrs), kv/r2/d1; edges: OWNS, SERVES (custom domain + workers.dev), ROUTE (zone routes), CALLS (service bindings, worker→worker) |
| `github` | `gh repo list` | repos (visibility, archived, pushed_at) |
| `projects` | `USER/PROJECTS.md` main table | projects; SERVES → domains, DEPLOYED_FROM → repos |
| `infra-inventory` | `ARBOL/Shared/infra-inventory.ts` (observed, never replaced) | targets, security-plane system node; MONITORS → domains, REGISTERED_IN |
| `launchd` | `~/Library/LaunchAgents/com.{lifeos,pai}.*` (plutil always `-o -`) | services, this machine; RUNS_ON edges |
| `gear` | `USER/GEAR.md` tables | devices with category/role |
| `secrets` | the incident-response credential registry (`GenerateRegistry.ts --json`) + tier shapes (`DetectCriticalKeys.ts --format json`) | credentials (priority/cadence/vendor/dependencies attrs), orphaned credentials; HOLDS edges from this machine and from the config repo when the env file is tracked in it |

Worker credentials come from the `cloudflare` collector, not `secrets` — each script's `/settings` response lists its `secret_text` binding NAMES, and the provider is the authority. Source-grepping a worker repo finds a small fraction, because most worker secrets are pushed with `wrangler secret put` and appear in no file.

v2 candidates (ISA § Not yet specified): UniFi/network devices, smart home, expenses/accounts, cloud observation feeder (D1 staging → local pull), credentials that live only at a vendor (OAuth grants, dashboard-issued tokens) — currently invisible to every collector.

## CLI

```
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts <cmd>

sync [collector ...]        full reconcile (all collectors default)
sync X --targeted <scope>   scoped upsert-only run (never sweeps)
tick                        events-then-hourly entry (what launchd runs)
status                      per-collector runs + counts
owns <key>                  OWNS closure — what deleting <key> orphans
blast <key>                 inbound operational closure — what relies on <key>
exposed <key>               credentials <key> would leak if compromised (priority-ordered)
stale                       assets no collector sees anymore
unregistered                domains something SERVES but no curated target MONITORS
sql "SELECT ..."            read-only SQL passthrough
export                      rewrite the redacted Pulse snapshot
```

**Credentials in the graph (2026-07-24).** Credentials are assets (`kind: credential`); whatever stores one gets a `HOLDS` edge to it. Because `HOLDS` is an operational edge kind, one relationship answers both directions: `atlas exposed <asset>` walks outbound (OWNS+HOLDS) for the incident-response question — *this got compromised, what did it leak* — while `atlas blast credential:X` walks inbound for the rotation question — *what breaks when I rotate this*. Exposure output is priority-ordered, compromise-tier first, and a credential the registry never classified still carries its tier when the shapes match, so the most dangerous entries can't sort to the bottom.

Values never enter the graph. Collectors read names only, and `exportSnapshot()` blanks credential attrs before anything reaches Pulse.

The join earned itself immediately: the first env↔graph reconciliation surfaced 64 credentials living only in Cloudflare Worker secrets that no inventory had ever seen, and took the estate-wide compromise-tier count from 3 to 11.

**Destructive-op doctrine:** `atlas owns`/`atlas blast` are DERIVED EVIDENCE for Algorithm claim 16 — run them for the blast-radius preview, then confirm against the provider's authority API before any delete. Atlas never replaces the authority; the CLI prints this reminder on every owns/blast call.

## What it catches (live examples from first sync)

- **Registration gaps:** `atlas unregistered` found 33 serving-but-uncurated domains on first run — apps with traffic but no auth-boundary assertions in the hourly scanner.
- **Blast radius:** `atlas owns domain:example.com` lists the DNS records and hostnames a zone deletion would orphan — the exact query whose absence caused INC-20260717-ullive-dns-deletion.
- **Drift:** an asset that stops being observed goes stale visibly (Pulse GAPS tab + lifecycle events) instead of silently vanishing.

## Pulse surfaces

- **Graph** — live `d3-force` simulation (the SVG is d3-owned, the shell is React): drag a node to pull it and pin it (double-click releases), scroll to zoom, drag the background to pan, hover to isolate a node's neighborhood. Node size encodes degree; color encodes kind; a kind-filter drives what's shown.
- **Insights** — deterministic metric tiles (`atlas insights`) PLUS an Inference-generated narrative across three axes: *running the system*, *security*, *how things interconnect*. The narrative is produced by shelling `Inference.ts --level high` over the metrics, cached to `MEMORY/STATE/atlas-insights.json` keyed by a metric content hash. When a sync changes the graph the hash moves, the cache goes `stale`, and the next view regenerates; a Regenerate button forces it. Same async pattern as the Algorithm tab's summary. This is the "run inference on updates" surface.
- **Browse** — every asset by kind with its per-source observations. **Gaps** — auth-curation gaps + stale + lifecycle events.

## Absence-metric rule (learned 2026-07-22)

**A metric that claims a thing is unused/orphaned/dead must be built on COMPLETE edge coverage — absence of one edge type is never absence of use.** The first insights pass called the overwhelming majority of workers "orphaned" because the collector only captured worker *custom domains*; it was blind to workers.dev origins, zone routes, service bindings, and cron triggers. The true unwired count was a small handful. Two guards now stand: (1) the Cloudflare collector captures all six invocation mechanisms before any orphan query runs; (2) the `unwired_workers` metric requires a worker to have NONE of {SERVES, ROUTE, CALLS-target, cron, workers.dev, queue}; (3) the insights narrative prompt forbids calling anything "unused/dead/orphaned" unless `unwired_workers` or a stale count backs it. When adding a new asset type, enumerate every way it can be connected before writing an absence query over it.

## Lineage

Cartography (Lyft → CNCF Sandbox 2024) proved the model: typed nodes/edges, intel modules, sync-and-expire, drift detection. Atlas keeps the model and swaps the substrate — SQLite for Neo4j (the 2026-07-21 audit's concurrency finding: embedded columnar graph engines are single-write-process; SQLite WAL matches the multi-process no-daemon topology), TS collectors for Python modules, recursive CTEs for Cypher. Research trail: `MEMORY/WORK/20260721-cartography-asset-graph-research/ISA.md`.
