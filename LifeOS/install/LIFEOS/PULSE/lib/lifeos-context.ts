/**
 * lifeos-context — the per-turn LifeOS context block for SDK-backed channels.
 *
 * Reads the four files that anchor situational awareness (DA identity,
 * principal identity, TELOS, projects) plus the two hot-layer memory files and
 * assembles a single markdown blob for the SDK system prompt. Extracted from
 * the retired Telegram module (2026-07-15) — the Siri bridge and any future
 * remote channel import it from here.
 */

import { join } from "path"
import { readFile } from "fs/promises"
import { loadLifeosConfig } from "../../TOOLS/LifeosConfig"
import { read as readMemory, type ReadResult as MemoryReadResult } from "../../TOOLS/MemoryWriter"
import { getRelevantContext } from "../../TOOLS/MemoryRetriever"

const HOME = process.env.HOME ?? ""
const LIFEOS_DIR = join(HOME, ".claude", "LIFEOS")

// Ceiling on the per-turn LifeOS memory injection — fits DA + PRINCIPAL
// identity + TELOS + active sessions + the two _MEMORY.md hot-layer files
// (ISA ISC-29; worst case ~50k under ISC-30).
const CONTEXT_BLOCK_MAX_CHARS = 60_000

// DA display name from LifeosConfig ([da].name); "LifeOS" fallback (PR #1457).
const DA_NAME = ((): string => {
  try { const n = loadLifeosConfig().da.name; if (n && typeof n === "string" && n.length > 0) return n } catch { /* default */ }
  return "LifeOS"
})()

// Principal display name from LifeosConfig ([principal].name); generic fallback
// keeps a not-yet-configured install functional (public issue #1143).
const PRINCIPAL_NAME = ((): string => {
  try { const n = loadLifeosConfig().principal.name; if (n && typeof n === "string" && n.length > 0) return n } catch { /* default */ }
  return "Principal"
})()

function log(level: "info" | "warn" | "error", msg: string, data?: unknown) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    component: "lifeos-context",
    msg,
    ...(data ? { data } : {}),
  }))
}

const CONTEXT_SOURCES: ReadonlyArray<{ rel: string; label: string }> = [
  { rel: "USER/DIGITAL_ASSISTANT/DA_IDENTITY.md", label: "DA_IDENTITY" },
  { rel: "USER/PRINCIPAL/PRINCIPAL_IDENTITY.md", label: "PRINCIPAL_IDENTITY" },
  { rel: "USER/TELOS/PRINCIPAL_TELOS.md", label: "PRINCIPAL_TELOS" },
  { rel: "USER/PROJECTS.md", label: "PROJECTS" },
]

// Hot-layer memory files — read via MemoryWriter.read() so frontmatter, comments,
// and malformed entries are stripped before injection. Mtimes participate in the
// 60s cache invalidation alongside CONTEXT_SOURCES so a fresh Reviewer write is
// visible on the next turn within the cache window (ISA ISC-31).
const MEMORY_SOURCES: ReadonlyArray<{ rel: string; title: string }> = [
  { rel: "USER/PRINCIPAL/PRINCIPAL_MEMORY.md", title: "PRINCIPAL MEMORY" },
  { rel: "USER/DIGITAL_ASSISTANT/DA_MEMORY.md", title: "DA MEMORY" },
]

const CONTEXT_CACHE_TTL_MS = 60_000
let cachedContext: { text: string; builtAt: number; mtimes: Record<string, number> } | null = null

/**
 * Format a hot-layer memory file for injection into the LifeOS CONTEXT block.
 * Header pattern per ISA ISC-25/26/27. Empty file renders the empty-but-ready
 * signal so the model sees the file exists and is wired up.
 */
function formatMemoryBlock(title: string, r: MemoryReadResult): string {
  const header = `## ${title} [${r.count}/${r.cap_entries} entries · ${r.chars_used}/${r.cap_chars} chars]`
  if (r.count === 0) return `${header}\n(no entries yet)`
  return `${header}\n${r.entries.join("\n")}`
}

/**
 * Read the four files that anchor situational awareness — who the principal
 * is, who the DA is, what the principal's goals are, what's in flight today —
 * and assemble a single markdown blob for the SDK system prompt.
 *
 * Cached with a 60s TTL plus per-file mtime invalidation, so a busy session
 * doesn't pay 4 fs reads + assembly per turn but a freshly-edited TELOS or
 * PROJECTS entry takes effect on the very next message. Each file is read with
 * its own try/catch so a missing source degrades to a placeholder rather than
 * blowing up the whole turn.
 */
export async function buildLifeosContextBlock(query?: string): Promise<string> {
  const { stat } = await import("fs/promises")

  // Cheap mtime probe to decide if the cache is still valid. Both the four
  // identity/TELOS/projects sources AND the two hot-layer memory files
  // participate so a Reviewer-driven memory write invalidates the cache on the
  // next turn within the 60s window.
  const mtimes: Record<string, number> = {}
  const probeRels = [
    ...CONTEXT_SOURCES.map((s) => s.rel),
    ...MEMORY_SOURCES.map((s) => s.rel),
  ]
  await Promise.all(probeRels.map(async (rel) => {
    try {
      const st = await stat(join(LIFEOS_DIR, rel))
      mtimes[rel] = st.mtimeMs
    } catch {
      mtimes[rel] = 0
    }
  }))

  // When a query is provided, the relevant-memory injection makes the block
  // query-dependent — skip the static cache. The MemoryRetriever has its own
  // per-query cache that absorbs repeated calls within a turn cluster.
  if (cachedContext && !query) {
    const age = Date.now() - cachedContext.builtAt
    const mtimesUnchanged = Object.entries(mtimes)
      .every(([k, v]) => cachedContext!.mtimes[k] === v)
    if (age < CONTEXT_CACHE_TTL_MS && mtimesUnchanged) {
      return cachedContext.text
    }
  }

  const readSafe = async (rel: string, label: string): Promise<string> => {
    try {
      const raw = await readFile(join(LIFEOS_DIR, rel), "utf8")
      return raw.trim()
    } catch (err) {
      log("warn", "context-block: file unavailable", { rel, error: String(err).slice(0, 120) })
      return `(${label} unavailable on disk)`
    }
  }

  // PROJECTS.md is mostly a stable routing table; the volatile part is the
  // "Open Sessions to Resume" section. Inject only that slice — the rest of
  // the file is reachable via the SDK's Read tool on demand.
  const extractActiveSessions = (projectsBody: string): string => {
    const m = projectsBody.match(/##\s+Open Sessions to Resume[\s\S]*$/)
    return m ? m[0].trim() : "(no Open Sessions section found)"
  }

  const [daIdentity, principalIdentity, principalTelos, projectsBody] = await Promise.all(
    CONTEXT_SOURCES.map(({ rel, label }) => readSafe(rel, label)),
  )
  const activeSessions = extractActiveSessions(projectsBody)

  // Hot-layer memory reads. readMemory degrades gracefully on missing files
  // (returns zero-entry result, ISC-32) and silently drops malformed entries
  // at read time (ISC-19). Both files are validated by MemoryWriter at write
  // time too, so this is belt-and-suspenders, not the primary gate.
  const memoryBlocks = MEMORY_SOURCES.map(({ rel, title }) => {
    try {
      const r = readMemory(join(LIFEOS_DIR, rel))
      if ("code" in r) {
        log("warn", "context-block: memory read returned error", { rel, code: r.code })
        return `## ${title} [0/48 entries · 0/12288 chars]\n(no entries yet)`
      }
      return formatMemoryBlock(title, r)
    } catch (err) {
      log("warn", "context-block: memory read threw", { rel, error: String(err).slice(0, 120) })
      return `## ${title} [0/48 entries · 0/12288 chars]\n(no entries yet)`
    }
  })

  const today = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  })

  // Per-turn relevant-memory retrieval (F6). Only runs when a query is given —
  // typically the latest user message in the active exchange. Pure BM25 over
  // the typed-item corpus (KNOWLEDGE + the two _MEMORY.md files); synchronous
  // and cheap. Returns empty string when nothing scores above threshold —
  // keeps the prompt free of irrelevant noise.
  let relevantMemoryBlock = ""
  if (query && query.trim().length > 0) {
    try {
      const ctx = getRelevantContext(query)
      relevantMemoryBlock = ctx.markdownBlock
    } catch (err) {
      log("warn", "context-block: relevant-memory retrieval failed", { error: String(err).slice(0, 120) })
    }
  }

  // Ordering rule (ISA ISC-24 + ISC-76): memory hot-layer blocks land AFTER
  // PRINCIPAL_IDENTITY, BEFORE PRINCIPAL_TELOS. The per-turn RELEVANT MEMORY
  // block lands immediately after the hot-layer, so the model sees:
  //   identity → durable memory → relevant retrieved memory → goals.
  let block = [
    "## LifeOS CONTEXT (refreshed every turn, do not narrate this header)",
    "",
    `**Today:** ${today} (America/Los_Angeles)`,
    "",
    `### About you (${DA_NAME})`,
    daIdentity,
    "",
    `### About ${PRINCIPAL_NAME}`,
    principalIdentity,
    "",
    memoryBlocks[0],
    "",
    memoryBlocks[1],
    ...(relevantMemoryBlock ? ["", relevantMemoryBlock] : []),
    "",
    `### ${PRINCIPAL_NAME}'s TELOS`,
    principalTelos,
    "",
    "### Active sessions / in-flight work",
    activeSessions,
  ].join("\n")

  // Trailing marker tells the model this is a hard cut — it can Read the
  // source files directly if it needs more.
  if (block.length > CONTEXT_BLOCK_MAX_CHARS) {
    block = block.slice(0, CONTEXT_BLOCK_MAX_CHARS - 200) +
      "\n\n…[context truncated to fit per-turn budget — Read the source files directly if you need more]"
  }

  // Only cache the query-free baseline. Query-driven blocks are per-turn.
  if (!query) {
    cachedContext = { text: block, builtAt: Date.now(), mtimes }
  }
  return block
}
