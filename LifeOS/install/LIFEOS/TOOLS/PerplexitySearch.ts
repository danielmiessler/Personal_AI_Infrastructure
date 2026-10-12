#!/usr/bin/env bun
/**
 * PerplexitySearch.ts - Perplexity Agent API web research client
 *
 * Real-time, grounded web research with inline citations via Perplexity's
 * Agent API (POST /v1/agent). Returns a synthesized answer plus a numbered
 * citation list. Used by the Research skill / PerplexityResearcher agent as the
 * primary web-research tool.
 *
 * Usage:
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts --model sonar-pro "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts --model sonar-reasoning "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts --recency week "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts --system "You are a ..." "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts --json "<query>"
 *
 * Models:
 *   sonar (default), sonar-pro, sonar-reasoning, sonar-reasoning-pro,
 *   sonar-deep-research   legacy Sonar names, all sent as perplexity/sonar,
 *                         Perplexity's own model on the Agent API
 *   <provider>/<model>    any Agent API model id, passed through
 *   fast|low|medium|high|xhigh
 *                         Agent API preset, passed through; presets run on
 *                         models Perplexity selects, which may be third-party
 *
 * Options:
 *   --model <id>       legacy name, Agent API model id or preset (default: sonar)
 *   --recency <span>   Freshness filter: hour | day | week | month | year
 *   --system <prompt>  Override the system prompt
 *   --max-tokens <n>   Cap output tokens (default: 2048 for a model; a preset's own cap)
 *   --json             Emit {content, citations, usage} as JSON
 *
 * Environment:
 *   PERPLEXITY_API_KEY   Perplexity API key (required)
 *
 * Exit codes: 0 ok, 1 error (missing key, API failure, empty response)
 *
 * @author LifeOS System
 * @version 1.1.0
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}

// Load environment — mirrors the cross-vendor search-tool env convention
function loadEnv(): Record<string, string> {
  // Canonical .env is ~/.claude/.env — never $LIFEOS_CONFIG_DIR/.env, which
  // resolves to the dead ~/.claude/LIFEOS/.env path (public issue #1490).
  const envPath = join(homedir(), '.claude', '.env')
  const env: Record<string, string> = {}
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // ignore — fall back to process.env
  }
  return env
}

const env = loadEnv()
const API_KEY = process.env.PERPLEXITY_API_KEY || env.PERPLEXITY_API_KEY
const API_URL = 'https://api.perplexity.ai/v1/agent'
const DEFAULT_MODEL = 'sonar'
const DEFAULT_SYSTEM = 'Be precise and concise. Include inline citations.'
const DEFAULT_MAX_TOKENS = 2048

// Legacy Sonar names all map to perplexity/sonar, so existing callers stay on a
// Perplexity model. Perplexity's migration guide suggests presets instead, but
// presets run on models Perplexity selects (often third-party) at a higher price;
// callers who want one pass the preset name explicitly.
const LEGACY_MODELS = new Set(['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research'])
const PRESETS = new Set(['fast', 'low', 'medium', 'high', 'xhigh'])

function resolveModel(id: string): { model: string } | { preset: string } {
  if (LEGACY_MODELS.has(id)) return { model: 'perplexity/sonar' }
  if (PRESETS.has(id)) return { preset: id }
  return { model: id }
}

interface Parsed { content: string; citations: string[]; usage: any }

function parseArgs(argv: string[]) {
  const opts = {
    model: DEFAULT_MODEL,
    recency: '',
    system: '',
    maxTokens: 0,
    json: false,
  }
  const rest: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') opts.json = true
    else if (a === '--model') opts.model = argv[++i]
    else if (a === '--recency') opts.recency = argv[++i]
    else if (a === '--system') opts.system = argv[++i]
    else if (a === '--max-tokens') opts.maxTokens = parseInt(argv[++i], 10) || opts.maxTokens
    else rest.push(a)
  }
  return { opts, query: rest.join(' ').trim() }
}

async function perplexity(query: string, opts: ReturnType<typeof parseArgs>['opts']): Promise<Parsed> {
  const webSearch: Record<string, unknown> = { type: 'web_search' }
  if (opts.recency) webSearch.filters = { search_recency_filter: opts.recency }
  const target = resolveModel(opts.model)
  const explicitModel = 'model' in target
  const body: Record<string, unknown> = { ...target, input: query }
  // A preset ships its own instructions, output cap and tools, and any field sent
  // alongside it overrides that default; so send ours only for an explicit model,
  // or when the caller set them. A model needs web_search listed to search at all.
  if (explicitModel || opts.recency) body.tools = [webSearch]
  if (explicitModel || opts.system) body.instructions = opts.system || DEFAULT_SYSTEM
  if (explicitModel || opts.maxTokens) body.max_output_tokens = opts.maxTokens || DEFAULT_MAX_TOKENS
  if (explicitModel) body.temperature = 0.2

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json() as any
  if (!res.ok || data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : (data.error?.message || `HTTP ${res.status}`))
  }
  if (data.status === 'failed' || data.status === 'cancelled') throw new Error(`response ${data.status}`)
  if (data.status === 'incomplete') {
    console.error(`${colors.yellow}Warning: response incomplete (output cap reached?)${colors.reset}`)
  }

  const output: any[] = Array.isArray(data.output) ? data.output : []
  const parts = output
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((part: any) => part.type === 'output_text')
  const content = parts.map((part: any) => part.text ?? '').join('')

  // Citations: url_citation annotations when present. Otherwise the search results,
  // placed by their id, because inline [n] markers in the answer refer to that id.
  const urls = (list: any[]) => list.map((x) => x?.url).filter((u): u is string => typeof u === 'string')
  let citations = [...new Set(urls(parts.flatMap((part: any) => part.annotations ?? []).filter((a: any) => a.type === 'url_citation')))]
  if (!citations.length) {
    const results: any[] = output.filter((item) => item.type === 'search_results').flatMap((item) => item.results ?? [])
    const byId: string[] = []
    for (const r of results) {
      if (Number.isInteger(r?.id) && r.id > 0 && typeof r.url === 'string') byId[r.id - 1] ??= r.url
    }
    citations = byId.length ? Array.from(byId, (u) => u ?? '') : [...new Set(urls(results))]
  }
  return { content: content.trim(), citations, usage: data.usage ?? {} }
}

const USAGE = `Usage: bun ~/.claude/LIFEOS/TOOLS/PerplexitySearch.ts [options] "<query>"

Options:
  --model <name>     sonar (legacy names map to perplexity/sonar) | <provider/model> | <preset>   (default: sonar)
  --recency <span>   hour | day | week | month | year      (bias toward fresh sources)
  --json             machine-readable output
  -h, --help         this message — costs nothing, sends no request`

async function main() {
  const argv = process.argv.slice(2)

  // --help must NEVER reach the API. Without this guard, `--help` was parsed as a
  // QUERY and billed as a live Perplexity call (found 2026-07-27 when an audit
  // probed the tool's own documented health check and got charged an essay about
  // the help flag). A usage probe has to be free, or nobody will run it.
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(argv.length === 0 ? 1 : 0)
  }

  const { opts, query } = parseArgs(argv)

  if (!API_KEY) {
    console.error(`${colors.red}Error: PERPLEXITY_API_KEY not set in ~/.claude/.env${colors.reset}`)
    process.exit(1)
  }
  if (!query) {
    console.error(`${colors.red}Error: no query provided${colors.reset}`)
    console.error(USAGE)
    process.exit(1)
  }

  let result: Parsed
  try {
    result = await perplexity(query, opts)
  } catch (e: any) {
    console.error(`${colors.red}Perplexity API error: ${e.message}${colors.reset}`)
    process.exit(1)
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (!result.content) {
    console.error(`${colors.red}Error: empty response from Perplexity${colors.reset}`)
    process.exit(1)
  }

  console.log(result.content)
  if (result.citations.length) {
    console.log(`\n${colors.dim}Sources:${colors.reset}`)
    result.citations.forEach((u, i) => console.log(`${colors.dim}[${i + 1}]${colors.reset} ${u}`))
  }
}

main()
