#!/usr/bin/env bun

export type SearchDepth = 'basic' | 'advanced'
export type SearchTopic = 'general' | 'news' | 'finance'

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'
const DEFAULT_MAX_RESULTS = 5
const MAX_RESULTS = 20
const DEFAULT_SEARCH_DEPTH: SearchDepth = 'basic'
const DEFAULT_TOPIC: SearchTopic = 'general'

export interface TavilySearchOptions {
  searchDepth?: SearchDepth
  topic?: SearchTopic
  maxResults?: number
  includeAnswer?: boolean
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score?: number
  publishedDate?: string
}

export interface TavilySearchResponse {
  query: string
  answer?: string
  results: TavilySearchResult[]
}

interface SearchDependencies {
  apiKey?: string
  fetch: typeof fetch
}

export function getTavilyApiKey(env: Record<string, string | undefined> = process.env): string {
  return env.TAVILY_API_KEY?.trim() || ''
}

function normalizeMaxResults(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_RESULTS
  return Math.min(MAX_RESULTS, Math.max(1, Math.floor(value as number)))
}

function safeMessage(value: unknown, apiKey: string): string {
  const message = typeof value === 'string' && value.trim() ? value.trim() : 'request failed'
  return apiKey ? message.split(apiKey).join('[redacted]') : message
}

async function responsePayload(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json()
    return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function errorFromPayload(payload: Record<string, unknown>): string | undefined {
  const error = payload.error
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && typeof (error as Record<string, unknown>).message === 'string') {
    return (error as Record<string, string>).message
  }
  if (typeof payload.message === 'string') return payload.message
  return undefined
}

export function normalizeTavilyResponse(payload: unknown, query: string): TavilySearchResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Tavily returned an invalid response')
  }
  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.results)) {
    throw new Error('Tavily returned an invalid response')
  }

  const results = data.results.flatMap((item): TavilySearchResult[] => {
    if (typeof item !== 'object' || item === null) return []
    const result = item as Record<string, unknown>
    if (typeof result.url !== 'string' || !result.url.trim()) return []
    return [{
      title: typeof result.title === 'string' ? result.title : result.url,
      url: result.url,
      content: typeof result.content === 'string' ? result.content : '',
      ...(typeof result.score === 'number' ? { score: result.score } : {}),
      ...(typeof result.published_date === 'string' ? { publishedDate: result.published_date } : {}),
    }]
  })

  return {
    query,
    ...(typeof data.answer === 'string' && data.answer.trim() ? { answer: data.answer.trim() } : {}),
    results,
  }
}

export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {},
  dependencies: Partial<SearchDependencies> = {},
): Promise<TavilySearchResponse> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) throw new Error('No query provided')

  const apiKey = dependencies.apiKey?.trim() || getTavilyApiKey()
  if (!apiKey) throw new Error('TAVILY_API_KEY is not set')

  const searchDepth = options.searchDepth ?? DEFAULT_SEARCH_DEPTH
  const topic = options.topic ?? DEFAULT_TOPIC
  if (!['basic', 'advanced'].includes(searchDepth)) throw new Error('searchDepth must be basic or advanced')
  if (!['general', 'news', 'finance'].includes(topic)) throw new Error('topic must be general, news, or finance')

  const body = {
    api_key: apiKey,
    query: normalizedQuery,
    search_depth: searchDepth,
    topic,
    max_results: normalizeMaxResults(options.maxResults),
    include_answer: options.includeAnswer ?? false,
    include_raw_content: false,
    include_images: false,
  }
  const request = dependencies.fetch ?? globalThis.fetch.bind(globalThis)
  let response: Response
  try {
    response = await request(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(`Tavily API request failed: ${safeMessage(error instanceof Error ? error.message : undefined, apiKey)}`)
  }
  const payload = await responsePayload(response)
  if (!response.ok) {
    throw new Error(`Tavily API request failed (HTTP ${response.status}): ${safeMessage(errorFromPayload(payload), apiKey)}`)
  }
  return normalizeTavilyResponse(payload, normalizedQuery)
}

function usage(): string {
  return `Usage: bun ~/.claude/LIFEOS/TOOLS/TavilySearch.ts [options] "<query>"

Options:
  --search-depth <depth>  basic or advanced (default: basic)
  --topic <topic>         general, news, or finance (default: general)
  --max-results <n>       Number of sources, 1-20 (default: 5)
  --include-answer        Include Tavily's generated answer
  --json                  Emit normalized JSON
  -h, --help              Show this message without sending a request`
}

function parseArgs(argv: string[]): { options: TavilySearchOptions; json: boolean; query: string } {
  const options: TavilySearchOptions = {}
  let json = false
  const query: string[] = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--search-depth') options.searchDepth = argv[++index] as SearchDepth
    else if (arg === '--topic') options.topic = argv[++index] as SearchTopic
    else if (arg === '--max-results') options.maxResults = Number(argv[++index])
    else if (arg === '--include-answer') options.includeAnswer = true
    else if (arg === '--json') json = true
    else query.push(arg)
  }
  return { options, json, query: query.join(' ').trim() }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
    console.log(usage())
    process.exitCode = argv.length ? 0 : 1
    return
  }

  const { options, json, query } = parseArgs(argv)
  try {
    const result = await searchTavily(query, options)
    if (json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }
    if (result.answer) console.log(result.answer + '\n')
    result.results.forEach((item, index) => {
      console.log(`[${index + 1}] ${item.title}`)
      console.log(item.url)
      if (item.content) console.log(item.content)
      console.log('')
    })
  } catch (error) {
    console.error(`Tavily search error: ${error instanceof Error ? error.message : 'request failed'}`)
    process.exitCode = 1
  }
}

if (import.meta.main) main()
