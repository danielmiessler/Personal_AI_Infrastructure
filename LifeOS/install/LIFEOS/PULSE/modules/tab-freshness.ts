/**
 * Pulse Tab Freshness Module
 *
 * Universal per-tab data-source freshness for the Pulse dashboard. Each tab in
 * the AppHeader consumes a known set of files / directories on disk; this
 * module maps `tabId → string[]` of source paths and exposes:
 *
 *   GET /api/tab-freshness?tab=<id>
 *
 * Returns a payload shaped to match the FreshnessIndicator component's
 * `FreshnessData` interface so the existing pill UI renders without
 * transformation:
 *
 *   {
 *     tabId: "telos",
 *     dataDate: "2026-05-04",
 *     label: "TELOS context",
 *     daysOld: 0,
 *     tier: "fresh" | "aging" | "stale" | "unknown",
 *     perFile: [{ name, date, source, ageMinutes?, expectedEveryMinutes? }],
 *     ageMinutes?: 840,           // present when a source declares a cadence:
 *     expectedEveryMinutes?: 15,  // the source furthest behind its cadence
 *   }
 *
 * Tier mapping: ≤7d fresh · ≤30d aging · >30d stale · null unknown, measured on
 * the most recent source. A source that declares `expectedEveryMinutes` (a
 * machine-written ledger with a known cadence) is also measured in minutes
 * against that cadence (≤2× fresh · ≤10× aging · >10× stale), and the worse of
 * the two verdicts is the tab's tier.
 *
 * Unregistered tabs return `tier: "unknown"` with HTTP 200 — never 404, so
 * the client pill stays visible across all routes.
 */

import { existsSync, statSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "node:os";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? homedir()
const LIFEOS_DIR = join(HOME, ".claude", "LIFEOS")
const USER_DIR = join(LIFEOS_DIR, "USER")
const TELOS_DIR = join(USER_DIR, "TELOS")

// ── Per-tab data-source registry ──
//
// Each entry lists files (or directories) whose mtime contributes to the
// tab's freshness. Globs are expanded shallowly: a directory entry contributes
// every direct *.md, *.json, *.jsonl, *.yaml and *.yml file. Missing files are
// silently ignored — the tab can still render `unknown` rather than 500.

export interface SourceSpec {
  /** Display name shown in tooltip (short — under 30 chars). */
  name: string
  /** Absolute path on disk. */
  path: string
  /** When `true`, expand to direct *.md / *.json / *.jsonl / *.yaml / *.yml children at runtime. */
  expand?: boolean
  /**
   * Minutes between writes of a machine-written source (a ledger a job rewrites,
   * a job's state file). When set, the source's age is also judged against this
   * cadence via `tierFromCadence`. Applies to file entries, not to the children
   * of an expanded directory; a path listed here and again through an expansion
   * counts once, keeping the cadence.
   */
  expectedEveryMinutes?: number
}

const REGISTRY: Record<string, SourceSpec[]> = {
  telos: [
    { name: "TELOS.md", path: join(TELOS_DIR, "TELOS.md") },
    { name: "PRINCIPAL_TELOS.md", path: join(TELOS_DIR, "PRINCIPAL_TELOS.md") },
    { name: "LIFEOS_STATE.json", path: join(TELOS_DIR, "LIFEOS_STATE.json") },
    { name: "CURRENT_STATE/", path: join(TELOS_DIR, "CURRENT_STATE"), expand: true },
    { name: "IDEAL_STATE/", path: join(TELOS_DIR, "IDEAL_STATE"), expand: true },
  ],
  work: [
    { name: "STATE/work.json", path: join(LIFEOS_DIR, "MEMORY", "STATE", "work.json") },
    { name: "WORK/config.yaml", path: join(USER_DIR, "WORK", "config.yaml") },
    { name: "PROJECTS.md", path: join(USER_DIR, "PROJECTS.md") },
  ],
  health: [
    { name: "HEALTH/", path: join(USER_DIR, "HEALTH"), expand: true },
    { name: "IDEAL_STATE/HEALTH.md", path: join(TELOS_DIR, "IDEAL_STATE", "HEALTH.md") },
  ],
  finances: [
    { name: "FINANCES/", path: join(USER_DIR, "FINANCES"), expand: true },
    { name: "IDEAL_STATE/MONEY.md", path: join(TELOS_DIR, "IDEAL_STATE", "MONEY.md") },
  ],
  business: [
    { name: "BUSINESS/", path: join(USER_DIR, "BUSINESS"), expand: true },
  ],
  local: [
    { name: "LOCAL/", path: join(USER_DIR, "LOCAL"), expand: true },
    { name: "PRINCIPAL_IDENTITY.md", path: join(USER_DIR, "PRINCIPAL", "PRINCIPAL_IDENTITY.md") },
  ],
  knowledge: [
    { name: "KNOWLEDGE/", path: join(LIFEOS_DIR, "MEMORY", "KNOWLEDGE"), expand: true },
  ],
  hooks: [
    { name: "hooks/", path: join(HOME, ".claude", "hooks"), expand: true },
    { name: "settings.json", path: join(HOME, ".claude", "settings.json") },
  ],
  algorithm: [
    { name: "ALGORITHM/", path: join(LIFEOS_DIR, "ALGORITHM"), expand: true },
    { name: "RULES/", path: join(LIFEOS_DIR, "RULES"), expand: true },
    { name: "LIFEOS_SYSTEM_PROMPT.md", path: join(LIFEOS_DIR, "LIFEOS_SYSTEM_PROMPT.md") },
    { name: "OPERATIONAL_RULES.md", path: join(USER_DIR, "CONFIG", "OPERATIONAL_RULES.md") },
  ],
  skills: [
    { name: "skills/", path: join(HOME, ".claude", "skills"), expand: true },
  ],
  agents: [
    { name: "agents/", path: join(HOME, ".claude", "agents"), expand: true },
  ],
  docs: [
    { name: "DOCUMENTATION/", path: join(LIFEOS_DIR, "DOCUMENTATION"), expand: true },
  ],
  arbol: [
    { name: "USER/CUSTOMIZATIONS/ARBOL/", path: join(USER_DIR, "CUSTOMIZATIONS", "ARBOL"), expand: true },
  ],
  security: [
    { name: "USER/SECURITY/", path: join(USER_DIR, "SECURITY"), expand: true },
  ],
  performance: [
    { name: "MEMORY/OBSERVABILITY/", path: join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY"), expand: true },
    // The tab's ledgers are machine-written, so they are also judged against the cadence of
    // their writers. The cost-aggregation job (PULSE.toml, every 15 min) appends to
    // session-costs.jsonl only when a new session appears but rewrites its state file on
    // every run, so that file is the job's heartbeat; usage-daily.jsonl is rebuilt nightly by
    // the opt-in com.lifeos.usage-aggregator launchd job and is absent until that is installed.
    { name: "Performance/aggregator-state.json", path: join(LIFEOS_DIR, "PULSE", "Performance", "aggregator-state.json"), expectedEveryMinutes: 15 },
    { name: "OBSERVABILITY/usage-daily.jsonl", path: join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY", "usage-daily.jsonl"), expectedEveryMinutes: 24 * 60 },
  ],
  synapse: [
    { name: "KNOWLEDGE/Ideas/", path: join(LIFEOS_DIR, "MEMORY", "KNOWLEDGE", "Ideas"), expand: true },
    { name: "_X/State/", path: join(HOME, ".claude", "skills", "_X", "State") },
  ],
  ledger: [
    { name: "SYSTEMUPDATES/index.json", path: join(LIFEOS_DIR, "MEMORY", "SYSTEMUPDATES", "index.json") },
    { name: "SYSTEMUPDATES/deploys.jsonl", path: join(LIFEOS_DIR, "MEMORY", "SYSTEMUPDATES", "deploys.jsonl") },
    { name: "VERSION", path: join(LIFEOS_DIR, "VERSION") },
    { name: "STATE/integrity/", path: join(LIFEOS_DIR, "MEMORY", "STATE", "integrity"), expand: true },
  ],
  assistant: [
    { name: "DA_IDENTITY.md", path: join(USER_DIR, "DIGITAL_ASSISTANT", "DA_IDENTITY.md") },
    { name: "PRINCIPAL_IDENTITY.md", path: join(USER_DIR, "PRINCIPAL", "PRINCIPAL_IDENTITY.md") },
  ],
  gear: [
    { name: "GEAR.md", path: join(USER_DIR, "GEAR.md") },
  ],
  atlas: [
    { name: "atlas/snapshot.json", path: join(HOME, ".local", "state", "lifeos", "atlas", "snapshot.json") },
    { name: "atlas/atlas.db", path: join(HOME, ".local", "state", "lifeos", "atlas", "atlas.db") },
  ],
}

// ── Module state ──

const MODULE_NAME = "tab-freshness"

interface ModuleState {
  running: boolean
  startedAt: Date | null
  cache: Map<string, { payload: unknown; expiresAt: number }>
}

const state: ModuleState = {
  running: false,
  startedAt: null,
  cache: new Map(),
}

const CACHE_TTL_MS = 60_000

// ── Helpers ──

interface ResolvedSource {
  name: string
  path: string
  exists: boolean
  mtime: Date | null
  expectedEveryMinutes?: number
}

function resolveSpec(spec: SourceSpec): ResolvedSource[] {
  if (!existsSync(spec.path)) {
    return [{ name: spec.name, path: spec.path, exists: false, mtime: null }]
  }
  const stat = statSync(spec.path)
  if (spec.expand && stat.isDirectory()) {
    const out: ResolvedSource[] = []
    let entries: string[] = []
    try {
      // ported from public PR #1741, @elhoim — `.yml` is as valid a YAML suffix as `.yaml`
      entries = readdirSync(spec.path).filter((e) => e.endsWith(".md") || e.endsWith(".json") || e.endsWith(".jsonl") || e.endsWith(".yaml") || e.endsWith(".yml"))
    } catch {
      // unreadable dir — record as missing
      return [{ name: spec.name, path: spec.path, exists: false, mtime: null }]
    }
    for (const e of entries) {
      const p = join(spec.path, e)
      try {
        const s = statSync(p)
        if (s.isFile()) {
          out.push({ name: `${spec.name.replace(/\/$/, "")}/${e}`, path: p, exists: true, mtime: s.mtime })
        }
      } catch {
        // ignore single-file failure
      }
    }
    if (out.length === 0) {
      // directory exists but no qualifying children — treat directory mtime as the signal
      return [{ name: spec.name, path: spec.path, exists: true, mtime: stat.mtime }]
    }
    return out
  }
  return [{ name: spec.name, path: spec.path, exists: true, mtime: stat.mtime, expectedEveryMinutes: spec.expectedEveryMinutes }]
}

// Pull `last_reviewed` (preferred) or `last_updated` from a markdown file's
// frontmatter. Returns null if neither is present or the file is unreadable.
// This lets the freshness pill prefer the principal-curated date over a hot
// auto-generated mtime where available.
function readFrontmatterDate(filePath: string): Date | null {
  try {
    const content = readFileSync(filePath, "utf-8")
    if (!content.startsWith("---")) return null
    const end = content.indexOf("\n---", 3)
    if (end < 0) return null
    const fm = content.slice(0, end)
    const reviewed = fm.match(/^last_reviewed:\s*([^\s\n]+)/m)
    if (reviewed) {
      const d = new Date(reviewed[1])
      if (!isNaN(d.getTime())) return d
    }
    const updated = fm.match(/^last_updated:\s*([^\s\n]+)/m)
    if (updated) {
      const d = new Date(updated[1])
      if (!isNaN(d.getTime())) return d
    }
    return null
  } catch {
    return null
  }
}

function tierFromDays(daysOld: number | null): "fresh" | "aging" | "stale" | "unknown" {
  if (daysOld == null) return "unknown"
  if (daysOld <= 7) return "fresh"
  if (daysOld <= 30) return "aging"
  return "stale"
}

// A machine-written source is judged against its own cadence: within twice the
// cadence it is on time, within ten times it is lagging, beyond that it stopped.
function tierFromCadence(ageMinutes: number, expectedEveryMinutes: number): "fresh" | "aging" | "stale" {
  if (ageMinutes <= 2 * expectedEveryMinutes) return "fresh"
  if (ageMinutes <= 10 * expectedEveryMinutes) return "aging"
  return "stale"
}

const TIER_RANK: Record<FreshnessPayload["tier"], number> = { unknown: 0, fresh: 1, aging: 2, stale: 3 }

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`
  return `${Math.round(minutes / 1440)} d`
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface FreshnessFilePayload {
  name: string
  date: string | null
  source: "state" | "content" | "filename" | "mtime" | "unknown"
  /** Minutes since the last write and the declared cadence; only on sources that declare one. */
  ageMinutes?: number
  expectedEveryMinutes?: number
}

export interface FreshnessPayload {
  tabId: string
  dataDate: string | null
  label: string
  daysOld: number | null
  tier: "fresh" | "aging" | "stale" | "unknown"
  perFile: FreshnessFilePayload[]
  /** The cadence source furthest behind its cadence; only when the tab declares one that exists. */
  ageMinutes?: number
  expectedEveryMinutes?: number
}

function computeTabFreshness(tabId: string): FreshnessPayload {
  const specs = REGISTRY[tabId]
  if (!specs) {
    return {
      tabId,
      dataDate: null,
      label: "no data sources registered",
      daysOld: null,
      tier: "unknown",
      perFile: [],
    }
  }
  return computeFreshness(tabId, specs)
}

/** Freshness of an explicit source list; the registry-independent core, exported for tests. */
export function computeFreshness(tabId: string, specs: SourceSpec[]): FreshnessPayload {
  // A path listed explicitly and again through a directory expansion counts once,
  // and the entry carrying a cadence wins whatever the registry order.
  const byPath = new Map<string, ResolvedSource>()
  for (const r of specs.flatMap((s) => resolveSpec(s))) {
    const prev = byPath.get(r.path)
    if (!prev || (r.expectedEveryMinutes && !prev.expectedEveryMinutes)) byPath.set(r.path, r)
  }
  const perFile: FreshnessFilePayload[] = []
  let mostRecent: Date | null = null
  let anyExist = false
  let lagging: { name: string; ageMinutes: number; expectedEveryMinutes: number } | null = null
  const now = Date.now()
  for (const r of byPath.values()) {
    if (!r.exists || !r.mtime) {
      perFile.push({ name: r.name, date: null, source: "unknown" })
      continue
    }
    anyExist = true
    // Prefer frontmatter date for .md files
    const fmDate = r.path.endsWith(".md") ? readFrontmatterDate(r.path) : null
    const effective = fmDate ?? r.mtime
    const file: FreshnessFilePayload = {
      name: r.name,
      date: isoDate(effective),
      source: fmDate ? "content" : "mtime",
    }
    if (r.expectedEveryMinutes) {
      const ageMinutes = Math.floor((now - effective.getTime()) / 60_000)
      file.ageMinutes = ageMinutes
      file.expectedEveryMinutes = r.expectedEveryMinutes
      if (!lagging || ageMinutes / r.expectedEveryMinutes > lagging.ageMinutes / lagging.expectedEveryMinutes) {
        lagging = { name: r.name, ageMinutes, expectedEveryMinutes: r.expectedEveryMinutes }
      }
    }
    perFile.push(file)
    if (!mostRecent || effective > mostRecent) mostRecent = effective
  }
  const daysOld = mostRecent
    ? Math.floor((now - mostRecent.getTime()) / 86_400_000)
    : null
  let tier = tierFromDays(anyExist ? daysOld : null)
  let label = anyExist ? `${perFile.filter((p) => p.date).length} of ${perFile.length} sources dated` : "no sources on disk"
  if (lagging) {
    const cadenceTier = tierFromCadence(lagging.ageMinutes, lagging.expectedEveryMinutes)
    if (TIER_RANK[cadenceTier] > TIER_RANK[tier]) {
      tier = cadenceTier
      label = `${lagging.name} written ${formatMinutes(lagging.ageMinutes)} ago, expected every ${formatMinutes(lagging.expectedEveryMinutes)}`
    }
  }
  return {
    tabId,
    dataDate: mostRecent ? isoDate(mostRecent) : null,
    label,
    daysOld,
    tier,
    perFile,
    ...(lagging ? { ageMinutes: lagging.ageMinutes, expectedEveryMinutes: lagging.expectedEveryMinutes } : {}),
  }
}

// ── Lifecycle ──

export async function start(): Promise<void> {
  console.log(`[${MODULE_NAME}] Starting...`)
  state.running = true
  state.startedAt = new Date()
  console.log(`[${MODULE_NAME}] Started — ${Object.keys(REGISTRY).length} tabs registered`)
}

export async function stop(): Promise<void> {
  console.log(`[${MODULE_NAME}] Stopping...`)
  state.running = false
  state.cache.clear()
  console.log(`[${MODULE_NAME}] Stopped`)
}

export function invalidate(): void {
  state.cache.clear()
}

export function health(): { status: string; details?: Record<string, unknown> } {
  if (!state.running) return { status: "stopped" }
  return {
    status: "healthy",
    details: {
      uptime_s: state.startedAt ? Math.floor((Date.now() - state.startedAt.getTime()) / 1000) : 0,
      tabs_registered: Object.keys(REGISTRY).length,
      cache_entries: state.cache.size,
    },
  }
}

// ── HTTP handler ──

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (pathname !== "/api/tab-freshness") return null
  const url = new URL(req.url)
  const tabId = (url.searchParams.get("tab") ?? "").trim().toLowerCase()
  if (!tabId) {
    return Response.json({
      tabId: "",
      dataDate: null,
      label: "missing ?tab= query parameter",
      daysOld: null,
      tier: "unknown",
      perFile: [],
    }, { status: 200 })
  }
  // 60s in-process cache
  const now = Date.now()
  const cached = state.cache.get(tabId)
  if (cached && now < cached.expiresAt) {
    return Response.json(cached.payload)
  }
  const payload = computeTabFreshness(tabId)
  state.cache.set(tabId, { payload, expiresAt: now + CACHE_TTL_MS })
  return Response.json(payload)
}
