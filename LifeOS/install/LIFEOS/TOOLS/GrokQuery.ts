#!/usr/bin/env bun
/**
 * GrokQuery.ts - xAI Grok chat-completions client
 *
 * Invocation path for the Grok agent (agents/Grok.md). OpenAI-compatible
 * chat completions against api.x.ai; model defaults from CROSS_VENDOR.grok
 * in models.ts so the pin has one home.
 *
 * ⚠️ DATA CLASS: PUBLIC ONLY — HARD CEILING. xAI had a context-recording
 * incident (conversation data retained/exposed from API traffic), so this
 * carrier is approved ({{PRINCIPAL_NAME}}, 2026-08-12) for non-sensitive tasks only.
 * Nothing from ~/.claude private trees, no USER data, no credentials, no
 * principal PII goes into a prompt through this tool. The Grok agent's
 * deny rules enforce the read side; this header is the send-side contract.
 *
 * Usage:
 *   bun ~/.claude/LIFEOS/TOOLS/GrokQuery.ts "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/GrokQuery.ts --model grok-4.6 "<query>"
 *   bun ~/.claude/LIFEOS/TOOLS/GrokQuery.ts --json "<query>"
 *
 * Options:
 *   --model <id>       Grok model id (default: CROSS_VENDOR.grok)
 *   --system <prompt>  Prepend a system instruction
 *   --max-tokens <n>   Cap output tokens (default: 2048)
 *   --json             Emit raw API JSON
 *   -h, --help         Usage — costs nothing, sends no request
 *
 * Environment (either one; direct xAI preferred when both exist):
 *   XAI_API_KEY         xAI API key — direct api.x.ai
 *   OPENROUTER_API_KEY  OpenRouter broker — same Grok models via x-ai/<model>
 *                       slugs (verified live 2026-08-12). Same PUBLIC-only
 *                       ceiling either way; the broker adds a party, it never
 *                       relaxes the rule.
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
  red: '\x1b[31m', cyan: '\x1b[36m',
}

const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const USAGE = `Usage: bun ~/.claude/LIFEOS/TOOLS/GrokQuery.ts [options] "<query>"

⚠️ PUBLIC data only — never Restricted Data in a prompt (see file header).

Options:
  --model <id>       Grok model id (default: ${CROSS_VENDOR.grok})
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
const XAI_KEY = ENV.XAI_API_KEY || process.env.XAI_API_KEY || ''
const OPENROUTER_KEY = ENV.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ''
// Route: direct xAI when a key exists, else the OpenRouter broker.
const ROUTE = XAI_KEY ? 'xai' : (OPENROUTER_KEY ? 'openrouter' : '')

interface Opts {
  model: string
  system?: string
  maxTokens: number
  json: boolean
}

function parseArgs(argv: string[]): { opts: Opts; query: string } {
  const opts: Opts = { model: CROSS_VENDOR.grok, maxTokens: 2048, json: false }
  const rest: string[] = []
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--model': opts.model = argv[++i] ?? opts.model; break
      case '--system': opts.system = argv[++i]; break
      case '--max-tokens': opts.maxTokens = Number(argv[++i]) || opts.maxTokens; break
      case '--json': opts.json = true; break
      default: rest.push(argv[i])
    }
  }
  return { opts, query: rest.join(' ').trim() }
}

interface Parsed { text: string; model: string; raw: unknown }

async function grok(query: string, opts: Opts): Promise<Parsed> {
  const messages: Array<{ role: string; content: string }> = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: query })

  // OpenRouter namespaces xAI models as x-ai/<model> (list verified live).
  const url = ROUTE === 'xai' ? XAI_URL : OPENROUTER_URL
  const key = ROUTE === 'xai' ? XAI_KEY : OPENROUTER_KEY
  const model = ROUTE === 'xai' || opts.model.includes('/') ? opts.model : `x-ai/${opts.model}`

  const res = await fetch(url, {
    method: 'POST',
    // Auth rides the header, never the URL (URLs leak to logs and history).
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: opts.maxTokens,
      temperature: 0.2,
    }),
  })

  const data = await res.json() as any
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error || `HTTP ${res.status}`)
  }

  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  // Report the model the API says actually ran, not the one we asked for —
  // a silent server-side substitution should be visible to the caller.
  return { text, model: data.model ?? opts.model, raw: data }
}

async function main() {
  const argv = process.argv.slice(2)

  // --help must NEVER reach the API (same rule as GeminiSearch.ts and
  // PerplexitySearch.ts, where an unguarded --help was billed as a live call).
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(argv.length === 0 ? 1 : 0)
  }

  const { opts, query } = parseArgs(argv)

  if (!ROUTE) {
    console.error(`${colors.red}Error: neither XAI_API_KEY nor OPENROUTER_API_KEY set in ~/.claude/.env${colors.reset}`)
    process.exit(1)
  }
  if (!query) {
    console.error(`${colors.red}Error: no query provided${colors.reset}`)
    console.error(USAGE)
    process.exit(1)
  }

  let result: Parsed
  try {
    result = await grok(query, opts)
  } catch (e: any) {
    console.error(`${colors.red}Grok API error: ${e.message}${colors.reset}`)
    process.exit(1)
  }

  if (opts.json) {
    console.log(JSON.stringify(result.raw, null, 2))
    return
  }

  if (!result.text) {
    console.error(`${colors.red}Grok returned an empty response${colors.reset}`)
    process.exit(1)
  }

  console.log(result.text)
  console.log(`${colors.dim}model: ${result.model} · route: ${ROUTE}${colors.reset}`)
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`${colors.red}${e?.message ?? e}${colors.reset}`)
    process.exit(1)
  })
}
