#!/usr/bin/env bun
/**
 * Backfill.ts — reconstruct dated digest history from the sources themselves.
 *
 * The Week/Month/Year views aggregate dated digest files, which normally
 * accumulate one per day going forward. But most sources carry their own
 * history: a local-data API serves months of dated records, and feed items
 * have publication dates. This tool fetches each user source with a deep
 * window and buckets every item into the dated digest file for the day it
 * actually happened — so range views are rich on day one.
 *
 *   bun run Tools/Backfill.ts [--days 365] [--dry-run]
 *
 * Guarantees:
 *   - Non-destructive: existing dated-file items are kept; new items merge in
 *     (dedupe url|title, existing win). latest.json is NEVER touched.
 *   - Items land on their own parseable date; unparseable, future, and
 *     today's items are skipped (today belongs to the live refresh).
 *   - Scaffolded days are marked `meta.backfilled: true`.
 *
 * Per-source deep window: `backfill_url` in sources.json wins; else any
 * `when:Nd` operator in the URL is widened to the backfill horizon; else the
 * plain url is used as-is.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"

import { readHometown, NoHometownError } from "./Hometown.ts"
import { loadUserSources, fetchSourceItems, type UserSource } from "./UserSources.ts"
import type { Digest, FetchResult, Item, SectionKey } from "./Types.ts"

const DATA_DIR = join(homedir(), ".claude", "LIFEOS", "MEMORY", "DATA", "LocalIntelligence")
const SECTION_KEYS: SectionKey[] = [
  "construction", "crime", "business", "officials",
  "legislation", "elections", "arrests", "news",
]
const PER_DAY_SECTION_CAP = 10
const FETCH_CAP = 2000

function parseDay(dateStr: string): string | null {
  if (!dateStr) return null
  let t = new Date(dateStr)
  if (!Number.isFinite(t.getTime())) return null
  return t.toISOString().slice(0, 10)
}

function emptyResult(): FetchResult {
  return { items: [], source_status: "empty" }
}

function scaffoldDigest(day: string, home: { city: string; state: string; county?: string; zip?: string }): Digest {
  return {
    meta: {
      city: home.city,
      state: home.state,
      county: home.county,
      zip: home.zip,
      generated_at: `${day}T12:00:00.000Z`,
      sources_used: [],
      sources_failed: [],
      errors: [],
      backfilled: true,
    },
    construction: emptyResult(),
    crime: emptyResult(),
    business: emptyResult(),
    officials: emptyResult(),
    legislation: emptyResult(),
    elections: emptyResult(),
    arrests: emptyResult(),
    news: emptyResult(),
  }
}

function backfillUrl(src: UserSource): string {
  if (src.backfill_url) return src.backfill_url
  return src.url.replace(/when%3A\d+d|when:\d+d/g, (m) =>
    m.includes("%3A") ? "when%3A365d" : "when:365d"
  )
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const daysIdx = args.indexOf("--days")
  const horizonDays = daysIdx !== -1 ? Number(args[daysIdx + 1]) || 365 : 365

  let home
  try {
    home = await readHometown()
  } catch (err) {
    if (err instanceof NoHometownError) {
      console.error(err.message)
      process.exit(2)
    }
    throw err
  }

  const citySlug = home.city.toLowerCase().replace(/\s+/g, "-")
  const stateSlug = home.state.toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() - horizonDays * 86_400_000).toISOString().slice(0, 10)

  const sources = await loadUserSources()
  // day -> section -> items
  const buckets = new Map<string, Map<SectionKey, Item[]>>()
  const skipped = { unparseable: 0, future_or_today: 0, beyond_horizon: 0 }
  const perSourceFetched: Record<string, number> = {}

  for (const src of sources) {
    let items: Item[] = []
    try {
      items = await fetchSourceItems(src, {
        urlOverride: backfillUrl(src),
        maxItems: FETCH_CAP,
        ignoreMaxAge: true,
      })
    } catch (err) {
      console.error(`[backfill] ${src.name} (${src.section}): ${(err as Error).message}`)
      continue
    }
    perSourceFetched[`${src.section}/${src.name}`] = items.length
    for (const it of items) {
      const day = parseDay(it.date)
      if (!day) { skipped.unparseable++; continue }
      if (day >= today) { skipped.future_or_today++; continue }
      if (day < cutoff) { skipped.beyond_horizon++; continue }
      if (!buckets.has(day)) buckets.set(day, new Map())
      const daySections = buckets.get(day)!
      if (!daySections.has(src.section)) daySections.set(src.section, [])
      daySections.get(src.section)!.push(it)
    }
  }

  await mkdir(DATA_DIR, { recursive: true })
  let daysWritten = 0
  let daysScaffolded = 0
  const itemsAdded: Record<string, number> = Object.fromEntries(SECTION_KEYS.map((k) => [k, 0]))

  for (const [day, daySections] of [...buckets.entries()].sort()) {
    const path = join(DATA_DIR, `${day}_${citySlug}_${stateSlug}_digest.json`)
    let digest: Digest
    try {
      digest = JSON.parse(await readFile(path, "utf8")) as Digest
    } catch {
      digest = scaffoldDigest(day, home)
      daysScaffolded++
    }

    let changed = false
    for (const [section, newItems] of daySections) {
      const existing = digest[section] ?? emptyResult()
      const seen = new Set(existing.items.map((it) => `${it.url}|${it.title.toLowerCase()}`))
      for (const it of newItems) {
        if (existing.items.length >= PER_DAY_SECTION_CAP) break
        const key = `${it.url}|${it.title.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        existing.items.push(it)
        itemsAdded[section]++
        changed = true
      }
      if (existing.items.length > 0) existing.source_status = "ok"
      digest[section] = existing
    }
    if (!changed) continue

    digest.meta.sources_used = SECTION_KEYS.filter((k) => digest[k]?.source_status === "ok")
    digest.meta.sources_failed = SECTION_KEYS.filter((k) => digest[k]?.source_status === "unavailable")
    daysWritten++
    if (!dryRun) await writeFile(path, JSON.stringify(digest, null, 2), "utf8")
  }

  console.log(JSON.stringify({
    dry_run: dryRun,
    horizon_days: horizonDays,
    sources_fetched: perSourceFetched,
    days_written: daysWritten,
    days_scaffolded: daysScaffolded,
    items_added: itemsAdded,
    skipped,
  }, null, 2))
}
