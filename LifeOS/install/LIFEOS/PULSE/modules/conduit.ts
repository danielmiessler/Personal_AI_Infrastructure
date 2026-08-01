/**
 * Conduit Pulse module — read-only dashboard surface over Conduit's daily records.
 *
 * Reads ONLY from USER/CONDUIT (no capture here — capture is the launchd job). Routes:
 *   GET  /api/conduit/today         → today's live deterministic record
 *   GET  /api/conduit/recent        → last N daily records (?days=7)
 *   GET  /api/conduit/insight       → latest cached content-type read
 *   POST /api/conduit/insight/build → run the hourly insight job now (public PR #1647, @elhoim)
 *   GET  /api/conduit/status        → module health
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
// `building` gates the on-demand insight run. The job costs an inference call and
// takes seconds, so a second request while one is in flight must not start another
// — the same single-flight shape the atlas insights regenerate route uses.
// public PR #1647, @elhoim
const state = { running: false, startedAt: null as Date | null, building: false }

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

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  const sub = pathname.replace(/^\/api\/conduit/, "") || "/"
  if (sub === "/" || sub === "/today") return Response.json(todayRecord())
  if (sub === "/recent") {
    const days = Math.max(1, Math.min(90, Number(new URL(req.url).searchParams.get("days")) || 7))
    return Response.json(recentRecords(days))
  }
  if (sub === "/sources") return Response.json(buildSourcesReport())
  // On-demand insight run. The dashboard's empty state used to print a command for
  // the operator to paste; this is the button behind it. public PR #1647, @elhoim
  //
  // Fire-and-forget with a 202: buildInsight makes an inference call and can take
  // seconds, and holding the socket open for it would look like a hung dashboard.
  // The caller re-reads GET /insight, which now reports `building`.
  // BuildInsight is imported lazily so Pulse startup doesn't pull the inference
  // path into its module graph for a route most sessions never hit.
  if (sub === "/insight/build") {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 })
    if (state.building) return Response.json({ building: true, alreadyRunning: true }, { status: 202 })
    state.building = true
    void (async () => {
      try {
        const { buildInsight } = await import("../Conduit/BuildInsight.ts")
        await buildInsight(localDate(new Date()))
      } catch (err) {
        console.error(`[${MODULE_NAME}] on-demand insight failed: ${String(err)}`)
      } finally {
        state.building = false
      }
    })()
    return Response.json({ building: true }, { status: 202 })
  }
  if (sub === "/insight") return Response.json({ ...(todayInsight() as object), building: state.building })
  if (sub === "/status" || sub === "/health") return Response.json(health())
  return null // fall through to other routers
}
