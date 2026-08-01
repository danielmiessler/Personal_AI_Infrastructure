#!/usr/bin/env bun
/**
 * Refresh.ts — orchestrator for the LocalIntelligence daily digest.
 *
 * Runs all eight fetchers via Promise.allSettled (one dead source never blanks
 * the digest), writes the dated JSON file plus the latest.json copy that the
 * Pulse module serves.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"

import { readHometown, NoHometownError } from "./Hometown.ts"
import { claudeFill } from "./ClaudeFill.ts"
import { applyUserSources } from "./UserSources.ts"
import type { Digest, FetchResult, Fetcher, Hometown, SectionKey } from "./Types.ts"
import { fetchConstruction } from "./FetchConstruction.ts"
import { fetchBusiness } from "./FetchBusiness.ts"
import { fetchOfficials } from "./FetchOfficials.ts"
import { fetchLegislation } from "./FetchLegislation.ts"
import { fetchElections } from "./FetchElections.ts"
import { fetchArrests } from "./FetchArrests.ts"
import { fetchNews } from "./FetchNews.ts"
import { fetchCrime } from "./FetchCrime.ts"

// Data plane: dated history + legacy latest.json live in MEMORY/DATA.
// Serving plane: the Pulse module reads CUSTOMIZATIONS latest.json FIRST
// (user-scoped primary path) — both latest copies are written on every persist
// so the module and the history endpoint never diverge again.
const DATA_DIR = join(homedir(), ".claude", "LIFEOS", "MEMORY", "DATA", "LocalIntelligence")
const CUSTOMIZATIONS_DIR = join(
  homedir(), ".claude", "LIFEOS", "USER", "CUSTOMIZATIONS", "SKILLS", "LocalIntelligence"
)

const fetchers: Record<SectionKey, Fetcher> = {
  construction: fetchConstruction,
  crime: fetchCrime,
  business: fetchBusiness,
  officials: fetchOfficials,
  legislation: fetchLegislation,
  elections: fetchElections,
  arrests: fetchArrests,
  news: fetchNews,
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

async function runOne(key: SectionKey, fn: Fetcher, home: Hometown): Promise<FetchResult> {
  try {
    return await fn(home)
  } catch (err) {
    const msg = (err as Error).message
    console.error(`[${key}] fetcher threw: ${msg}`)
    return { items: [], source_status: "unavailable", errors: [msg] }
  }
}

export async function refresh(home: Hometown): Promise<Digest> {
  const keys = Object.keys(fetchers) as SectionKey[]
  const results = await Promise.allSettled(
    keys.map((k) => runOne(k, fetchers[k], home))
  )

  const sections: Partial<Record<SectionKey, FetchResult>> = {}
  const sourcesUsed: string[] = []
  const sourcesFailed: string[] = []
  const errors: string[] = []

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const r = results[i]
    if (r.status === "fulfilled") {
      sections[key] = r.value
      if (r.value.source_status === "ok") sourcesUsed.push(key)
      if (r.value.source_status === "unavailable") sourcesFailed.push(key)
      for (const e of r.value.errors ?? []) errors.push(`${key}: ${e}`)
    } else {
      const msg = String(r.reason)
      sections[key] = { items: [], source_status: "unavailable", errors: [msg] }
      sourcesFailed.push(key)
      errors.push(`${key}: ${msg}`)
    }
  }

  const digest: Digest = {
    meta: {
      city: home.city,
      state: home.state,
      county: home.county,
      zip: home.zip,
      generated_at: new Date().toISOString(),
      sources_used: sourcesUsed,
      sources_failed: sourcesFailed,
      errors,
    },
    construction: sections.construction!,
    crime: sections.crime!,
    business: sections.business!,
    officials: sections.officials!,
    legislation: sections.legislation!,
    elections: sections.elections!,
    arrests: sections.arrests!,
    news: sections.news!,
  }

  return digest
}

function totalItems(digest: Digest): number {
  return Object.values(digest)
    .filter((v): v is FetchResult => typeof v === "object" && v !== null && "items" in v)
    .reduce((acc, r) => acc + r.items.length, 0)
}

async function readExistingLatest(): Promise<Digest | null> {
  for (const p of [join(CUSTOMIZATIONS_DIR, "latest.json"), join(DATA_DIR, "latest.json")]) {
    try {
      return JSON.parse(await readFile(p, "utf8")) as Digest
    } catch {}
  }
  return null
}

async function persist(
  digest: Digest
): Promise<{ datedPath: string; latestPaths: string[]; latestSkipped: boolean }> {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(CUSTOMIZATIONS_DIR, { recursive: true })
  const dateStr = todayDateString()
  const citySlug = digest.meta.city.toLowerCase().replace(/\s+/g, "-")
  const stateSlug = digest.meta.state.toLowerCase()
  const datedPath = join(DATA_DIR, `${dateStr}_${citySlug}_${stateSlug}_digest.json`)
  const json = JSON.stringify(digest, null, 2)
  await writeFile(datedPath, json, "utf8")

  // No-clobber guard: an all-empty run never overwrites a populated latest.
  // The dated file still records the (empty) run for history/debugging.
  if (totalItems(digest) === 0) {
    const existing = await readExistingLatest()
    if (existing && totalItems(existing) > 0) {
      return { datedPath, latestPaths: [], latestSkipped: true }
    }
  }

  const latestPaths = [join(CUSTOMIZATIONS_DIR, "latest.json"), join(DATA_DIR, "latest.json")]
  for (const p of latestPaths) await writeFile(p, json, "utf8")
  return { datedPath, latestPaths, latestSkipped: false }
}

if (import.meta.main) {
  const args = new Set(process.argv.slice(2))
  const withFill = args.has("--fill")
  try {
    const home = await readHometown()
    let digest = await refresh(home)
    // Deterministic user-configured sources run BEFORE the AI fill — a section
    // they populate never needs (or gets) model-researched items.
    const userSources = await applyUserSources(digest)
    let filled: SectionKey[] = []
    if (withFill) {
      const outcome = await claudeFill(digest, home)
      digest = outcome.digest
      filled = outcome.filled
    }
    const { datedPath, latestPaths, latestSkipped } = await persist(digest)
    const summary = {
      city: digest.meta.city,
      state: digest.meta.state,
      sources_used: digest.meta.sources_used,
      sources_failed: digest.meta.sources_failed,
      user_sources_merged: userSources.merged,
      claude_filled: filled,
      total_items: totalItems(digest),
      datedPath,
      latestPaths,
      latest_skipped_no_clobber: latestSkipped,
    }
    console.log(JSON.stringify(summary, null, 2))
  } catch (err) {
    if (err instanceof NoHometownError) {
      console.error(err.message)
      process.exit(2)
    }
    throw err
  }
}
