/**
 * Pulse module: local-intelligence
 *
 * Read-only over the LocalIntelligence skill output at
 * MEMORY/DATA/LocalIntelligence/latest.json. Serves the LOCAL dashboard tab.
 *
 * Endpoints:
 *   GET  /api/local-intelligence            — latest digest
 *   POST /api/local-intelligence/refresh    — kick off a refresh, returns run_id
 *   (health() integrates into /api/pulse/health)
 *
 * The module does NO scraping or fetching itself. All network I/O lives in the
 * skill's Tools/Refresh.ts. This module spawns that script for refreshes and
 * reads the resulting JSON for serves.
 */

import { spawn } from "node:child_process"
import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"
import { randomUUID } from "node:crypto"

const HOME = process.env.HOME ?? homedir()
const MODULE_NAME = "local-intelligence"

// Primary path: user-scoped customizations directory (per {{PRINCIPAL_NAME}} directive 2026-05-03).
// Fallback path: legacy MEMORY/DATA path (used when customizations file absent).
const CUSTOMIZATIONS_DIR = join(HOME, ".claude", "LIFEOS", "USER", "CUSTOMIZATIONS", "SKILLS", "LocalIntelligence")
const LEGACY_DATA_DIR = join(HOME, ".claude", "LIFEOS", "MEMORY", "DATA", "LocalIntelligence")
const LATEST_PATH = join(CUSTOMIZATIONS_DIR, "latest.json")
const LEGACY_LATEST_PATH = join(LEGACY_DATA_DIR, "latest.json")
const DATA_DIR = CUSTOMIZATIONS_DIR  // alias for existing references in this file
const RUNS_DIR = join(CUSTOMIZATIONS_DIR, "runs")
const REFRESH_SCRIPT = join(HOME, ".claude", "skills", "LocalIntelligence", "Tools", "Refresh.ts")

async function readLatest(): Promise<string | null> {
  try { return await readFile(LATEST_PATH, "utf8") } catch {}
  try { return await readFile(LEGACY_LATEST_PATH, "utf8") } catch {}
  return null
}

interface ModuleState {
  running: boolean
  startedAt: Date | null
  lastRefresh: string | null
  lastRefreshOk: boolean | null
  sourcesOk: number
  sourcesFailed: number
}

const state: ModuleState = {
  running: false,
  startedAt: null,
  lastRefresh: null,
  lastRefreshOk: null,
  sourcesOk: 0,
  sourcesFailed: 0,
}

export async function start(): Promise<void> {
  state.running = true
  state.startedAt = new Date()
  await mkdir(DATA_DIR, { recursive: true }).catch(() => {})
  await mkdir(RUNS_DIR, { recursive: true }).catch(() => {})
  await readLatestMeta()
  console.log(`[${MODULE_NAME}] started`)
}

export async function stop(): Promise<void> {
  state.running = false
  console.log(`[${MODULE_NAME}] stopped`)
}

export function health(): { status: string; details?: Record<string, unknown> } {
  return {
    status: state.running ? "healthy" : "stopped",
    details: {
      uptime: state.startedAt
        ? Math.floor((Date.now() - state.startedAt.getTime()) / 1000)
        : 0,
      last_refresh: state.lastRefresh,
      last_refresh_ok: state.lastRefreshOk,
      sources_ok: state.sourcesOk,
      sources_failed: state.sourcesFailed,
    },
  }
}

async function readLatestMeta(): Promise<void> {
  const raw = await readLatest()
  if (!raw) return
  try {
    const j = JSON.parse(raw) as {
      meta?: { generated_at?: string; sources_used?: string[]; sources_failed?: string[] }
    }
    state.lastRefresh = j.meta?.generated_at ?? null
    state.sourcesOk = j.meta?.sources_used?.length ?? 0
    state.sourcesFailed = j.meta?.sources_failed?.length ?? 0
    state.lastRefreshOk = state.sourcesOk > 0
  } catch {
    /* unparseable — empty-state path */
  }
}

async function spawnRefresh(): Promise<string> {
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}`
  const logPath = join(RUNS_DIR, `${runId}.log`)
  const out = await Bun.file(logPath).writer()
  const child = spawn("bun", ["run", REFRESH_SCRIPT, "--fill"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  })
  child.stdout.on("data", (b) => out.write(b))
  child.stderr.on("data", (b) => out.write(b))
  child.on("exit", async (code) => {
    out.write(`\n[exit] code=${code}\n`)
    await out.end()
    await readLatestMeta()
  })
  // Sidecar marker file proves the run was started.
  await writeFile(logPath + ".started", new Date().toISOString())
  return runId
}

// ── History aggregation (Week / Month / Year views) ──
//
// Dated digests written by the skill to MEMORY/DATA/LocalIntelligence/ are the
// history source of record. A range view merges every digest in the window per
// section, dedupes by URL (first-seen wins — newest digest scanned first), and
// stamps each item with the digest date it came from.

const RANGE_DAYS: Record<string, number> = { week: 7, month: 30, year: 365 }
const SECTION_KEYS = [
  "construction", "crime", "business", "officials",
  "legislation", "elections", "arrests", "news",
] as const

interface HistoryItem {
  title: string; source: string; url: string; date: string
  summary?: string; digest_date: string
}

async function buildHistory(range: string): Promise<Response> {
  const days = RANGE_DAYS[range]
  if (!days) {
    return Response.json({ error: "bad_range", valid: Object.keys(RANGE_DAYS) }, { status: 400 })
  }
  // (days - 1): the window is "today plus N-1 prior calendar days" — a full
  // N*24h subtraction spans N+1 calendar dates and renders as "8/7 days".
  const cutoff = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)

  let files: string[] = []
  try {
    files = (await readdir(LEGACY_DATA_DIR))
      .filter((f) => /^\d{4}-\d{2}-\d{2}_.*_digest\.json$/.test(f))
      .filter((f) => f.slice(0, 10) >= cutoff)
      .sort()
      .reverse() // newest first so dedupe keeps the freshest copy
  } catch {}

  const sections: Record<string, { items: HistoryItem[]; days_with_data: number }> =
    Object.fromEntries(SECTION_KEYS.map((k) => [k, { items: [], days_with_data: 0 }]))
  // Dedupe PER SECTION — a story can legitimately live in two sections
  // (a council vote is both legislation and officials); global dedupe was
  // silently emptying whichever section scanned second.
  const seen: Record<string, Set<string>> = Object.fromEntries(SECTION_KEYS.map((k) => [k, new Set()]))
  let meta: Record<string, unknown> | null = null
  let daysCovered = 0
  let firstDate: string | null = null
  let lastDate: string | null = null

  for (const f of files) {
    let digest: Record<string, any>
    try {
      digest = JSON.parse(await readFile(join(LEGACY_DATA_DIR, f), "utf8"))
    } catch { continue }
    const digestDate = f.slice(0, 10)
    daysCovered++
    if (!lastDate) lastDate = digestDate
    firstDate = digestDate
    if (!meta) meta = digest.meta ?? null
    for (const key of SECTION_KEYS) {
      const items = digest[key]?.items
      if (!Array.isArray(items) || items.length === 0) continue
      sections[key].days_with_data++
      for (const it of items) {
        // URL alone is NOT unique — fixed-link sources (e.g. a crime API whose
        // items all link to the site root) would collapse to one item.
        const dedupeKey = `${it?.url ?? ""}|${String(it?.title ?? "").toLowerCase()}`
        if (dedupeKey === "|" || seen[key].has(dedupeKey)) continue
        seen[key].add(dedupeKey)
        sections[key].items.push({
          title: it.title, source: it.source, url: it.url,
          date: it.date, summary: it.summary, digest_date: digestDate,
        })
      }
    }
  }

  return Response.json({
    range,
    window_days: days,
    days_covered: daysCovered,
    first_date: firstDate,
    last_date: lastDate,
    city: (meta?.city as string) ?? null,
    state: (meta?.state as string) ?? null,
    sections,
  }, { headers: { "Cache-Control": "no-cache" } })
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (req.method === "GET" && pathname === "/api/local-intelligence/history") {
    const range = new URL(req.url).searchParams.get("range") ?? "week"
    return buildHistory(range)
  }
  if (req.method === "GET" && pathname === "/api/local-intelligence") {
    const raw = await readLatest()
    if (raw) {
      return new Response(raw, {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      })
    }
    return Response.json(
      { error: "not_yet_generated", hint: "POST /api/local-intelligence/refresh to kick off a run" },
      { status: 404 }
    )
  }
  if (req.method === "POST" && pathname === "/api/local-intelligence/refresh") {
    const runId = await spawnRefresh()
    return Response.json({ status: "started", run_id: runId }, { status: 202 })
  }
  if (req.method === "GET" && pathname === "/api/local-intelligence/status") {
    let exists = false
    let mtime: string | null = null
    try {
      const s = await stat(LATEST_PATH)
      exists = true
      mtime = s.mtime.toISOString()
    } catch {}
    return Response.json({
      ...state,
      latest_exists: exists,
      latest_mtime: mtime,
    })
  }
  return null
}
