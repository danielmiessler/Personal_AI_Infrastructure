/**
 * Conduit Pulse module — read-only dashboard surface over Conduit's daily records.
 *
 * Reads ONLY from USER/CONDUIT (no capture here — capture is the launchd job). Routes:
 *   GET /api/conduit/today   → today's live deterministic record
 *   GET /api/conduit/recent  → last N daily records (?days=7)
 *   GET /api/conduit/status  → module health
 *
 * Register in PULSE.toml under [modules].
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { loadConfig } from "../Conduit/config.ts"
import { DAILY_DIR, INSIGHTS_DIR, dailyPathsFor, insightPathFor } from "../Conduit/paths.ts"
import { buildDailyRecord } from "../Conduit/rollup.ts"
import { buildSourcesReport } from "../Conduit/sources.ts"
import { localDate, readDayEvents } from "../Conduit/store.ts"
import type { DailyRecord } from "../Conduit/types.ts"
import { CONDUIT_VERSION } from "../Conduit/version.ts"

const MODULE_NAME = "conduit"
const state = { running: false, startedAt: null as Date | null }

export async function start(): Promise<void> {
  state.running = true
  state.startedAt = new Date()
  console.log(`[${MODULE_NAME}] started (v${CONDUIT_VERSION})`)
}

export async function stop(): Promise<void> {
  state.running = false
  console.log(`[${MODULE_NAME}] stopped`)
}

export function health(): { status: string; details?: Record<string, unknown> } {
  const today = localDate(new Date())
  let eventsToday = 0
  try {
    eventsToday = readDayEvents(today).length
  } catch {
    /* ignore */
  }
  return {
    status: state.running ? "healthy" : "stopped",
    details: { version: CONDUIT_VERSION, eventsToday },
  }
}

/** Build today's record live from today's events (never persists). */
function todayRecord(): DailyRecord {
  const date = localDate(new Date())
  const config = loadConfig()
  return buildDailyRecord(date, readDayEvents(date), config.pollIntervalSec, CONDUIT_VERSION)
}

/** Read the last N persisted daily records (most recent first). */
function recentRecords(days: number): DailyRecord[] {
  if (!existsSync(DAILY_DIR)) return []
  const files = readdirSync(DAILY_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, days)
  const out: DailyRecord[] = []
  for (const f of files) {
    try {
      out.push(JSON.parse(readFileSync(dailyPathsFor(f.replace(/\.json$/, "")).json, "utf8")))
    } catch {
      /* skip unreadable */
    }
  }
  return out
}

const EMPTY_INSIGHT_NARRATIVE = "No hourly read yet — the insight job runs on the hour."

/** Most-recent insight file basename-date (YYYY-MM-DD), or null. */
function latestInsightDate(): string | null {
  if (!existsSync(INSIGHTS_DIR)) return null
  const dates = readdirSync(INSIGHTS_DIR)
    .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
  return dates.length ? dates[dates.length - 1] : null
}

/**
 * Serve the LATEST content-type read (Forge audit ISC-13): prefer today's file, else fall
 * back to the most recent one so a valid prior-day read isn't shown as empty after midnight.
 * A failed/empty read (contentTypes empty, or model "(failed)") is NOT a real read and is
 * served as available:false (Forge audit ISC-11) — a fallback never masquerades as a real one.
 */
function todayInsight(): unknown {
  const today = localDate(new Date())
  const useDate = existsSync(insightPathFor(today)) ? today : latestInsightDate()
  if (!useDate) {
    return { date: today, available: false, narrative: EMPTY_INSIGHT_NARRATIVE, contentTypes: [] }
  }
  try {
    const insight = JSON.parse(readFileSync(join(INSIGHTS_DIR, `${useDate}.json`), "utf8"))
    const isReal =
      Array.isArray(insight.contentTypes) && insight.contentTypes.length > 0 && insight.model !== "(failed)"
    if (!isReal) {
      return { date: useDate, available: false, narrative: insight.narrative || EMPTY_INSIGHT_NARRATIVE, contentTypes: [] }
    }
    // `stale` = the served read is from an earlier day; the UI's "updated Nd ago" already
    // makes this self-evident, and the flag lets it label it explicitly if desired.
    return { available: true, stale: useDate !== today, ...insight }
  } catch {
    return { date: today, available: false, narrative: "Insight file unreadable.", contentTypes: [] }
  }
}

/** Public accessor for other Pulse modules (e.g. menubar aggregator) — today's live record. */
export function todayRecordPublic(): DailyRecord {
  return todayRecord()
}

/** Run BuildInsight.ts on demand (the "Build insights now" button). Spawns the
 *  standalone script — same as the hourly launchd job — and returns its output. */
async function buildInsightNow(): Promise<Response> {
  const script = join(import.meta.dir, "..", "Conduit", "BuildInsight.ts")
  try {
    const proc = Bun.spawn(["bun", script], { stdout: "pipe", stderr: "pipe" })
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return Response.json(
      { ok: code === 0, output: ((out || "") + (err || "")).slice(-1500) },
      { status: code === 0 ? 200 : 500 },
    )
  } catch (e) {
    return Response.json({ ok: false, output: String(e) }, { status: 500 })
  }
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  const sub = pathname.replace(/^\/api\/conduit/, "") || "/"
  if (sub === "/build" && req.method === "POST") return buildInsightNow()
  if (sub === "/" || sub === "/today") return Response.json(todayRecord())
  if (sub === "/recent") {
    const days = Math.max(1, Math.min(90, Number(new URL(req.url).searchParams.get("days")) || 7))
    return Response.json(recentRecords(days))
  }
  if (sub === "/sources") return Response.json(buildSourcesReport())
  if (sub === "/insight") return Response.json(todayInsight())
  if (sub === "/status" || sub === "/health") return Response.json(health())
  return null // fall through to other routers
}
