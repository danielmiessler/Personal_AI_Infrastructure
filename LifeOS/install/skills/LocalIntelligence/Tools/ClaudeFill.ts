#!/usr/bin/env bun
/**
 * ClaudeFill.ts — AI gap-filler for digest sections the deterministic
 * fetchers couldn't populate.
 *
 * Spawns ONE `claude --print` subprocess with WebSearch/WebFetch enabled and
 * asks it to research every empty section in a single pass, returning strict
 * JSON. All output passes deterministic validation before it touches the
 * digest — a malformed or fabricated-looking item is dropped, never persisted.
 *
 * This is the bridge until real per-source fetchers exist: fetchers win when
 * they return data; the fill only covers sections that came back empty or
 * unavailable. The fetch layer can later move to a cloud worker producing the
 * same Digest JSON without this file changing shape.
 *
 * Billing: mirrors LIFEOS/TOOLS/Inference.ts — no --bare, strip
 * ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN so the subprocess uses
 * subscription OAuth, and unset CLAUDECODE so nested-session detection
 * doesn't refuse to start.
 */

import type { Digest, FetchResult, Hometown, Item, SectionKey } from "./Types.ts"

const SECTION_ASKS: Record<SectionKey, string> = {
  construction: "new construction projects or notable building permits (last 14 days)",
  crime: "crime trends, notable incidents, or police department updates (last 7 days)",
  business: "business openings, closures, or expansions (last 30 days)",
  officials: "news about the mayor, city council, school board, or other public officials (last 14 days)",
  legislation: "pending or recently passed city ordinances and council agenda items (last 30 days)",
  elections: "upcoming local elections, ballot measures, or candidate filings",
  arrests: "recent notable arrests or police blotter items (last 7 days)",
  news: "general local news headlines (last 7 days)",
}

const MAX_ITEMS_PER_SECTION = 10
const DEFAULT_TIMEOUT_MS = 480_000

export interface FillOutcome {
  digest: Digest
  filled: SectionKey[]
  attempted: SectionKey[]
  errors: string[]
}

function needsFill(r: FetchResult): boolean {
  return r.source_status !== "ok" || r.items.length === 0
}

function buildPrompt(home: Hometown, sections: SectionKey[]): string {
  const place = [home.city, home.state, home.county ? `${home.county} County` : null]
    .filter(Boolean)
    .join(", ")
  const asks = sections.map((k) => `- "${k}": ${SECTION_ASKS[k]}`).join("\n")
  return `You are a civic-intelligence researcher. Using web search, find real, current local items for ${place}.

Sections to research:
${asks}

Rules:
- Every item MUST come from a real page you found via search. Never invent items, URLs, or dates.
- Prefer official sources (city site, county records, local papers, Patch, police department pages).
- If you find nothing credible for a section, return an empty items array for it — that is a valid answer.
- Dates: use YYYY-MM-DD of the underlying event/publication.

Output ONLY a JSON object, no prose, no markdown fences, with exactly these keys: ${sections.map((s) => `"${s}"`).join(", ")}.
Each value: {"items": [{"title": string, "source": string (publication/site name), "url": string, "date": "YYYY-MM-DD", "summary": string (1-2 sentences)}]}`
}

/** Deterministic validation — the only path from model output into the digest. */
export function validateSection(raw: unknown): { items: Item[]; dropped: number } {
  const out: Item[] = []
  let dropped = 0
  const items = (raw as { items?: unknown })?.items
  if (!Array.isArray(items)) return { items: out, dropped }
  for (const it of items.slice(0, MAX_ITEMS_PER_SECTION * 2)) {
    const o = it as Record<string, unknown>
    const title = typeof o?.title === "string" ? o.title.trim() : ""
    const url = typeof o?.url === "string" ? o.url.trim() : ""
    const source = typeof o?.source === "string" ? o.source.trim() : ""
    const date = typeof o?.date === "string" ? o.date.trim() : ""
    const summary = typeof o?.summary === "string" ? o.summary.trim() : undefined
    if (!title || !source || !/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) {
      dropped++
      continue
    }
    out.push({ title, source, url, date, summary })
    if (out.length >= MAX_ITEMS_PER_SECTION) break
  }
  return { items: out, dropped }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object in output")
  return JSON.parse(trimmed.slice(start, end + 1))
}

async function spawnResearch(prompt: string, model: string, timeoutMs: number): Promise<string> {
  const claudePath = Bun.which("claude") ?? `${process.env.HOME}/.local/bin/claude`
  const env: Record<string, string | undefined> = { ...process.env }
  // Subscription billing + nested-session safety (mirrors Inference.ts).
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
  delete env.CLAUDECODE

  const proc = Bun.spawn(
    [
      claudePath,
      "--print",
      "--model", model,
      "--output-format", "text",
      "--setting-sources", "",
      "--system-prompt", "",
      "--tools", "WebSearch,WebFetch",
      "--allowedTools", "WebSearch,WebFetch",
    ],
    { stdin: new Blob([prompt]), stdout: "pipe", stderr: "pipe", env: env as Record<string, string> }
  )
  const timer = setTimeout(() => proc.kill("SIGTERM"), timeoutMs)
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  clearTimeout(timer)
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`claude exited ${exitCode}: ${stderr.slice(0, 300)}`)
  }
  return output
}

/**
 * Fill every empty/unavailable section of the digest via one web-research
 * pass. Returns a NEW digest — the input is not mutated. Fetcher results with
 * items always win; fill never overwrites an "ok" section.
 */
export async function claudeFill(
  digest: Digest,
  home: Hometown,
  opts: { model?: string; timeoutMs?: number } = {}
): Promise<FillOutcome> {
  const keys = Object.keys(SECTION_ASKS) as SectionKey[]
  const attempted = keys.filter((k) => needsFill(digest[k]))
  const errors: string[] = []
  if (attempted.length === 0) return { digest, filled: [], attempted, errors }

  let parsed: Record<string, unknown>
  try {
    const raw = await spawnResearch(
      buildPrompt(home, attempted),
      opts.model ?? "sonnet",
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    )
    parsed = extractJson(raw) as Record<string, unknown>
  } catch (err) {
    errors.push(`claude-fill: ${(err as Error).message}`)
    return { digest, filled: [], attempted, errors }
  }

  const next: Digest = structuredClone(digest)
  const filled: SectionKey[] = []
  for (const key of attempted) {
    const { items, dropped } = validateSection(parsed[key])
    if (dropped > 0) errors.push(`claude-fill ${key}: dropped ${dropped} invalid item(s)`)
    if (items.length === 0) continue
    next[key] = { items, source_status: "ok", errors: digest[key].errors }
    filled.push(key)
  }

  // Recompute meta source bookkeeping for filled sections.
  next.meta.sources_used = keys.filter((k) => next[k].source_status === "ok")
  next.meta.sources_failed = keys.filter((k) => next[k].source_status === "unavailable")
  next.meta.errors = [...next.meta.errors, ...errors]
  return { digest: next, filled, attempted, errors }
}
