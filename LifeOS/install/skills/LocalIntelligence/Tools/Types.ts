/**
 * Shared types for the LocalIntelligence skill.
 */

import type { Hometown } from "./Hometown.ts"
export type { Hometown }

export interface Item {
  title: string
  source: string
  url: string
  date: string  // ISO 8601 if known, free-form date string otherwise
  summary?: string
  metadata?: Record<string, unknown>
}

export type SourceStatus = "ok" | "unavailable" | "empty"

export interface FetchResult {
  items: Item[]
  source_status: SourceStatus
  errors?: string[]
}

export type SectionKey =
  | "construction"
  | "crime"
  | "business"
  | "officials"
  | "legislation"
  | "elections"
  | "arrests"
  | "news"

export interface Digest {
  meta: {
    city: string
    state: string
    county?: string
    zip?: string
    generated_at: string
    sources_used: string[]
    sources_failed: string[]
    errors: string[]
    /** True on dated digests reconstructed by Tools/Backfill.ts. */
    backfilled?: boolean
  }
  construction: FetchResult
  crime: FetchResult
  business: FetchResult
  officials: FetchResult
  legislation: FetchResult
  elections: FetchResult
  arrests: FetchResult
  news: FetchResult
}

export type Fetcher = (home: Hometown) => Promise<FetchResult>

export const EMPTY_RESULT: FetchResult = { items: [], source_status: "empty" }

export function unavailable(reason: string): FetchResult {
  return { items: [], source_status: "unavailable", errors: [reason] }
}
