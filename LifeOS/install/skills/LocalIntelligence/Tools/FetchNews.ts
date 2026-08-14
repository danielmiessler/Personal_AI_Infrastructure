#!/usr/bin/env bun
/**
 * FetchNews — local news headlines for the hometown.
 *
 * Universal sources:
 *  - Patch RSS at https://patch.com/<state-slug>/<city-slug>/feed
 *  - Google News topic search keyed on "<city>, <state>"
 *  - Optional regional outlet RSS via CUSTOMIZATIONS/SKILLS PREFERENCES.md
 *
 * v1 actually attempts Patch RSS — it's the most reliable universal source.
 */

import type { FetchResult, Hometown, Item } from "./Types.ts"
import { unavailable, EMPTY_RESULT } from "./Types.ts"

export async function fetchNews(home: Hometown): Promise<FetchResult> {
  const patchUrl = `https://patch.com/${home.stateSlug}/${home.citySlug}/feed`
  try {
    const res = await fetch(patchUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      return unavailable(`Patch returned ${res.status} for ${patchUrl}`)
    }
    const xml = await res.text()
    const items = parsePatchRss(xml).slice(0, 7)
    if (items.length === 0) return EMPTY_RESULT
    return { items, source_status: "ok" }
  } catch (err) {
    return unavailable(`Patch fetch failed: ${(err as Error).message}`)
  }
}

function parsePatchRss(xml: string): Item[] {
  const out: Item[] = []
  const itemBlocks = xml.split(/<item[\s>]/).slice(1)
  for (const block of itemBlocks) {
    const title = matchTag(block, "title")
    const link = matchTag(block, "link")
    const pubDate = matchTag(block, "pubDate")
    const description = matchTag(block, "description")
    if (!title || !link) continue
    out.push({
      title: title.trim(),
      source: "Patch",
      url: link.trim(),
      date: pubDate ? new Date(pubDate).toISOString() : "",
      summary: stripHtml(description ?? "").slice(0, 240),
    })
  }
  return out
}

function matchTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i")
  return block.match(re)?.[1]
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

if (import.meta.main) {
  const { readHometown } = await import("./Hometown.ts")
  const home = await readHometown()
  console.log(JSON.stringify(await fetchNews(home), null, 2))
}
