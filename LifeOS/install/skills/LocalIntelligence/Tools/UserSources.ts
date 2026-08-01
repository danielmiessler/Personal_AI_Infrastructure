#!/usr/bin/env bun
/**
 * UserSources.ts — user-configured deterministic sources for the digest.
 *
 * Reads `LIFEOS/USER/CUSTOMIZATIONS/SKILLS/LocalIntelligence/sources.json`
 * (city-specific, private, release-stripped) and fetches each entry with a
 * generic handler. The skill body stays city-agnostic: every URL, agency ID,
 * and publication name lives in the user config, never here.
 *
 * Supported source types:
 *   "rss"  — RSS 2.0 / Atom. Maps <item>/<entry> → Item.
 *   "json" — any JSON GET endpoint + a small mapping spec:
 *            items_path (dot path to the array), map.title (template with
 *            {field} placeholders), map.date / map.summary (field or template),
 *            link (fixed URL or {field} template for per-item links).
 *
 * Results MERGE into the digest: a section a built-in fetcher already filled
 * gets user items prepended (deduped by title); empty sections become "ok".
 * Every fetch failure degrades to meta.errors — one dead source never blanks
 * the digest (same contract as the built-in fetchers).
 */

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"

import type { Digest, Item, SectionKey } from "./Types.ts"

const CONFIG_PATH = join(
  homedir(), ".claude", "LIFEOS", "USER", "CUSTOMIZATIONS", "SKILLS", "LocalIntelligence", "sources.json"
)

const SECTION_KEYS: SectionKey[] = [
  "construction", "crime", "business", "officials",
  "legislation", "elections", "arrests", "news",
]

export interface UserSource {
  section: SectionKey
  name: string
  type: "rss" | "json"
  url: string
  /** json: dot-path to the items array (default: the response root). */
  items_path?: string
  /** json: field templates. {field} placeholders resolve from each item. */
  map?: { title?: string; date?: string; summary?: string }
  /** Per-item link: fixed URL or {field} template (default: source url). */
  link?: string
  /** Optional deeper-window URL used by Tools/Backfill.ts (defaults to url). */
  backfill_url?: string
  max_items?: number
  /** Capitalize the first letter of mapped titles (raw API enums read rough). */
  title_case?: boolean
  /**
   * Split aggregator titles on their final " - " and promote the suffix to the
   * item's source (Google News pattern: "Headline - Publication").
   */
  strip_title_suffix?: boolean
  /** Case-insensitive substring the title must contain (regional-feed filter). */
  filter_title?: string
  /**
   * Drop items whose parseable date is older than N days (aggregator search
   * feeds rank by relevance and happily return decade-old stories). Items with
   * unparseable dates are kept.
   */
  max_age_days?: number
  enabled?: boolean
}

function tooOld(dateStr: string, maxAgeDays?: number): boolean {
  if (!maxAgeDays || !dateStr) return false
  const t = new Date(dateStr).getTime()
  if (!Number.isFinite(t)) return false
  return Date.now() - t > maxAgeDays * 86_400_000
}

const DEFAULT_MAX_ITEMS = 7
const FETCH_TIMEOUT_MS = 20_000
const UA = "LifeOS-LocalIntelligence/1.0 (+personal civic digest)"

export async function loadUserSources(): Promise<UserSource[]> {
  let raw: string
  try {
    raw = await readFile(CONFIG_PATH, "utf8")
  } catch {
    return [] // no config = no user sources, not an error
  }
  const parsed = JSON.parse(raw) as { sources?: UserSource[] }
  return (parsed.sources ?? []).filter(
    (s) => s.enabled !== false && SECTION_KEYS.includes(s.section) && s.url && s.name
  )
}

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj
  )
}

function template(spec: string, item: Record<string, unknown>): string {
  return spec.replace(/\{([\w.]+)\}/g, (_, f) => {
    const v = get(item, f)
    return v == null ? "" : String(v)
  }).replace(/\s+/g, " ").trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

function tag(block: string, ...names: string[]): string {
  for (const n of names) {
    const m = block.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, "i"))
    if (m) return decodeEntities(m[1])
  }
  return ""
}

/** Atom <link href="..."/> has no text content — handled separately. */
function atomLink(block: string): string {
  const m = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i)
  return m ? m[1] : ""
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/json, text/xml, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  })
}

async function fetchRss(src: UserSource): Promise<Item[]> {
  const res = await fetchWithTimeout(src.url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  const items: Item[] = []
  for (const block of blocks) {
    let title = tag(block, "title")
    const url = tag(block, "link") || atomLink(block)
    if (!title || !url) continue
    if (src.filter_title && !title.toLowerCase().includes(src.filter_title.toLowerCase())) continue
    const pubDate = tag(block, "pubDate", "published", "updated", "dc:date")
    if (tooOld(pubDate, src.max_age_days)) continue
    let source = src.name
    if (src.strip_title_suffix) {
      const cut = title.lastIndexOf(" - ")
      if (cut > 10) {
        source = `${title.slice(cut + 3).trim()} · ${src.name}`
        title = title.slice(0, cut).trim()
      }
    }
    // Aggregator descriptions are often just the title echoed back with the
    // publication appended — noise, not information. Drop those.
    let summary: string | undefined = tag(block, "description", "summary", "content").slice(0, 280) || undefined
    if (summary && summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) summary = undefined
    items.push({ title, source, url, date: pubDate, summary })
    if (items.length >= (src.max_items ?? DEFAULT_MAX_ITEMS)) break
  }
  return items
}

async function fetchJson(src: UserSource): Promise<Item[]> {
  const res = await fetchWithTimeout(src.url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = (await res.json()) as unknown
  const arr = src.items_path ? get(body, src.items_path) : body
  if (!Array.isArray(arr)) throw new Error(`items_path "${src.items_path ?? "(root)"}" is not an array`)
  const items: Item[] = []
  for (const rawItem of arr) {
    const o = rawItem as Record<string, unknown>
    let title = src.map?.title ? template(src.map.title, o) : ""
    if (!title) continue
    if (src.title_case) title = title.charAt(0).toUpperCase() + title.slice(1)
    const itemDate = src.map?.date ? template(src.map.date, o) : ""
    if (tooOld(itemDate, src.max_age_days)) continue
    const link = src.link ? template(src.link, o) : src.url
    items.push({
      title,
      source: src.name,
      url: link,
      date: itemDate,
      summary: src.map?.summary ? template(src.map.summary, o) || undefined : undefined,
    })
    if (items.length >= (src.max_items ?? DEFAULT_MAX_ITEMS)) break
  }
  return items
}

/**
 * Fetch one source's items with per-call overrides. Used by Backfill.ts to
 * pull deep windows (override URL, no item cap, no freshness filter — old
 * items are the whole point of a backfill).
 */
export async function fetchSourceItems(
  src: UserSource,
  opts: { urlOverride?: string; maxItems?: number; ignoreMaxAge?: boolean } = {}
): Promise<Item[]> {
  const s: UserSource = {
    ...src,
    url: opts.urlOverride ?? src.url,
    max_items: opts.maxItems ?? src.max_items,
    max_age_days: opts.ignoreMaxAge ? undefined : src.max_age_days,
  }
  return s.type === "rss" ? fetchRss(s) : fetchJson(s)
}

/**
 * Fetch all configured user sources and merge into the digest in place.
 * Returns the sections that gained items and any per-source errors.
 */
export async function applyUserSources(
  digest: Digest
): Promise<{ merged: SectionKey[]; errors: string[] }> {
  const sources = await loadUserSources()
  const merged = new Set<SectionKey>()
  const errors: string[] = []

  const results = await Promise.allSettled(
    sources.map(async (src) => ({
      src,
      items: src.type === "rss" ? await fetchRss(src) : await fetchJson(src),
    }))
  )

  for (let i = 0; i < sources.length; i++) {
    const r = results[i]
    const src = sources[i]
    if (r.status === "rejected") {
      errors.push(`user-source ${src.name} (${src.section}): ${String(r.reason?.message ?? r.reason)}`)
      continue
    }
    const { items } = r.value
    if (items.length === 0) continue
    const section = digest[src.section]
    const seen = new Set(section.items.map((it) => it.title.toLowerCase()))
    const fresh = items.filter((it) => !seen.has(it.title.toLowerCase()))
    section.items = [...fresh, ...section.items]
    section.source_status = "ok"
    merged.add(src.section)
  }

  // Rebuild meta bookkeeping after merge.
  digest.meta.sources_used = SECTION_KEYS.filter((k) => digest[k].source_status === "ok")
  digest.meta.sources_failed = SECTION_KEYS.filter((k) => digest[k].source_status === "unavailable")
  digest.meta.errors.push(...errors)
  return { merged: [...merged], errors }
}
