#!/usr/bin/env bun
/**
 * GeminiSearch.ts - Google Gemini grounded-search client
 *
 * Multi-perspective web research via the Gemini API with Google Search grounding.
 * Used by the Research skill / GeminiResearcher agent as its invocation path.
 *
 * WHY THIS EXISTS (2026-07-27): GeminiResearcher previously drove the `gemini`
 * CLI, which was BROKEN for every non-interactive call — the principal's account
 * authenticates as `oauth-personal` against a Workspace domain, so the CLI exits
 * with `ProjectIdRequiredError` unless GOOGLE_CLOUD_PROJECT is set. 26 live
 * Research call sites were dispatching a dead agent. `GEMINI_DEFAULT_AUTH_TYPE`
 * does NOT override the cached OAuth credential (probed), and switching
 * `~/.gemini/settings.json` to api-key auth would change the principal's own
 * interactive `gemini` session. So the agent talks to the REST API directly with
 * the API key instead — deterministic, no CLI auth entanglement, and the
 * principal's interactive CLI is left exactly as it was.
 *
 * Usage:
 *   bun ~/.claude/LIFEOS/TOOLS/GeminiSearch.ts "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/GeminiSearch.ts --model gemini-3.6-flash "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/GeminiSearch.ts --no-search "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/GeminiSearch.ts --json "<query>"
 *
 * Options:
 *   --model <id>       Gemini model id (default: CROSS_VENDOR.geminiResearcher)
 *   --no-search        Disable Google Search grounding (pure model answer)
 *   --system <prompt>  Prepend a system instruction
 *   --max-tokens <n>   Cap output tokens (default: 2048)
 *   --json             Emit raw API JSON
 *   -h, --help         Usage — costs nothing, sends no request
 *
 * Environment:
 *   GOOGLE_API_KEY     Gemini API key from ~/.claude/.env (required)
 *
 * Exit codes: 0 ok, 1 error (missing key, API failure, empty response)
 *
 * @author LifeOS System
 * @version 1.0.0
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { CROSS_VENDOR } from './models'

const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m',
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const USAGE = `Usage: bun ~/.claude/LIFEOS/TOOLS/GeminiSearch.ts [options] "<query>"

Options:
  --model <id>       Gemini model id (default: ${CROSS_VENDOR.geminiResearcher})
  --no-search        Disable Google Search grounding
  --system <prompt>  Prepend a system instruction
  --max-tokens <n>   Cap output tokens (default: 2048)
  --json             Emit raw API JSON
  -h, --help         this message — costs nothing, sends no request`

/** Canonical .env is ~/.claude/.env — never $LIFEOS_CONFIG_DIR/.env. */
function loadEnv(): Record<string, string> {
  const envPath = join(homedir(), '.claude', '.env')
  const env: Record<string, string> = {}
  try {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // fall through to process.env
  }
  return env
}

const ENV = loadEnv()
const API_KEY = ENV.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || ''

interface Opts {
  model: string
  search: boolean
  system?: string
  maxTokens: number
  json: boolean
}

function parseArgs(argv: string[]): { opts: Opts; query: string } {
  const opts: Opts = { model: CROSS_VENDOR.geminiResearcher, search: true, maxTokens: 2048, json: false }
  const rest: string[] = []
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--model': opts.model = argv[++i] ?? opts.model; break
      case '--no-search': opts.search = false; break
      case '--system': opts.system = argv[++i]; break
      case '--max-tokens': opts.maxTokens = Number(argv[++i]) || opts.maxTokens; break
      case '--json': opts.json = true; break
      default: rest.push(argv[i])
    }
  }
  return { opts, query: rest.join(' ').trim() }
}

interface Parsed { text: string; citations: string[]; raw: unknown }

async function gemini(query: string, opts: Opts): Promise<Parsed> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: query }] }],
    generationConfig: { maxOutputTokens: opts.maxTokens, temperature: 0.2 },
  }
  // Google Search grounding is the entire reason this agent exists — a Gemini
  // answer without it is just another ungrounded model, not a third research
  // substrate. Opt-out is explicit.
  if (opts.search) body.tools = [{ google_search: {} }]
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }

  const res = await fetch(`${API_BASE}/${opts.model}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json() as any
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `HTTP ${res.status}`)
  }

  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? [])
    .map((p: any) => p.text ?? '')
    .join('')
    .trim()

  // Grounding metadata carries the sources the answer actually used. Unverified
  // URLs are the #1 research failure mode, so surface them rather than letting
  // the model paraphrase sources it never cited.
  const chunks = cand?.groundingMetadata?.groundingChunks ?? []
  const citations: string[] = chunks
    .map((c: any) => c.web?.uri || c.retrievedContext?.uri)
    .filter((u: unknown): u is string => typeof u === 'string')

  return { text, citations: [...new Set(citations)], raw: data }
}

async function main() {
  const argv = process.argv.slice(2)

  // --help must NEVER reach the API (same rule as PerplexitySearch.ts, where an
  // unguarded --help was parsed as a query and billed as a live call).
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(argv.length === 0 ? 1 : 0)
  }

  const { opts, query } = parseArgs(argv)

  if (!API_KEY) {
    console.error(`${colors.red}Error: GOOGLE_API_KEY not set in ~/.claude/.env${colors.reset}`)
    process.exit(1)
  }
  if (!query) {
    console.error(`${colors.red}Error: no query provided${colors.reset}`)
    console.error(USAGE)
    process.exit(1)
  }

  let result: Parsed
  try {
    result = await gemini(query, opts)
  } catch (e: any) {
    console.error(`${colors.red}Gemini API error: ${e.message}${colors.reset}`)
    process.exit(1)
  }

  if (opts.json) {
    console.log(JSON.stringify(result.raw, null, 2))
    return
  }

  if (!result.text) {
    console.error(`${colors.red}Gemini returned an empty response${colors.reset}`)
    process.exit(1)
  }

  console.log(result.text)
  if (result.citations.length) {
    console.log(`\n${colors.bold}Sources${colors.reset}`)
    result.citations.forEach((u, i) => console.log(`${colors.dim}[${i + 1}]${colors.reset} ${colors.cyan}${u}${colors.reset}`))
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`${colors.red}${e?.message ?? e}${colors.reset}`)
    process.exit(1)
  })
}
