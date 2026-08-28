#!/usr/bin/env bun

const API_ORIGIN = 'https://xquik.com'
const CONTRACT_VERSION = '2026-04-29'
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RESPONSE_BYTES = 8_000_000
const MAX_QUERY_CHARACTERS = 2048
const INTERACTIVE_LIMIT_MAX = 100
const USERNAME = /^[A-Za-z0-9_]{1,15}$/
const USER_ID = /^\d{1,32}$/
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export interface TweetPage {
  tweets: unknown[]
  has_next_page: boolean
  next_cursor: string
  filtered_count?: number
}

export interface BookmarkFolderPage {
  folders: unknown[]
  has_next_page: boolean
  next_cursor: string
}

interface ClientOptions {
  apiKey: string
  fetcher?: FetchLike
  apiOrigin?: string
}

interface PageOptions {
  cursor?: string
}

interface SearchOptions extends PageOptions {
  query: string
  limit: number
  sort: 'Latest' | 'Top'
}

interface UserTweetsOptions extends PageOptions {
  user: string
  limit: number
}

interface BookmarksOptions extends PageOptions {
  folderId?: string
}

type Environment = Record<string, string | undefined>

interface ParsedArguments {
  command: string
  options: Map<string, string>
}

interface OutputEnvelope<T> {
  source: 'xquik'
  content_trust: 'untrusted'
  request: Record<string, string | number>
  result: T
}

export class XquikClient {
  private readonly apiKey: string
  private readonly fetcher: FetchLike
  private readonly apiOrigin: string

  constructor(options: ClientOptions) {
    this.apiKey = requiredText(options.apiKey, 'XQUIK_API_KEY')
    this.fetcher = options.fetcher ?? fetch
    this.apiOrigin = normalizeOrigin(options.apiOrigin ?? API_ORIGIN)
  }

  async searchTweets(options: SearchOptions): Promise<TweetPage> {
    const query = boundedQuery(options.query)
    const limit = boundedLimit(options.limit)
    const params = new URLSearchParams({
      q: query,
      queryType: options.sort,
      limit: String(limit),
    })
    addOpaque(params, 'cursor', options.cursor)
    return validateTweetPage(await this.get('/api/v1/x/tweets/search', params))
  }

  async readUserTweets(options: UserTweetsOptions): Promise<TweetPage> {
    const user = userIdentifier(options.user)
    const limit = boundedLimit(options.limit)
    const params = new URLSearchParams({ pageSize: String(limit) })
    addOpaque(params, 'cursor', options.cursor)
    return validateTweetPage(
      await this.get(`/api/v1/x/users/${encodeURIComponent(user)}/tweets`, params),
    )
  }

  async readBookmarkFolders(): Promise<BookmarkFolderPage> {
    return validateBookmarkFolderPage(
      await this.get('/api/v1/x/bookmarks/folders', new URLSearchParams()),
    )
  }

  async readBookmarks(options: BookmarksOptions): Promise<TweetPage> {
    const params = new URLSearchParams()
    addOpaque(params, 'folderId', options.folderId)
    addOpaque(params, 'cursor', options.cursor)
    return validateTweetPage(await this.get('/api/v1/x/bookmarks', params))
  }

  private async get(route: string, params: URLSearchParams): Promise<unknown> {
    const url = new URL(route, this.apiOrigin)
    url.search = params.toString()

    const response = await this.fetcher(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': this.apiKey,
        'xquik-api-contract': CONTRACT_VERSION,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    const text = await readResponseText(response)
    const body = parseJson(text)
    if (!response.ok) {
      throw new Error(
        `Xquik request failed (${response.status}). ${errorMessage(body, this.apiKey)}`,
      )
    }
    if (body === undefined) {
      throw new Error('Xquik returned invalid JSON.')
    }
    return body
  }
}

export async function execute(
  argv: string[],
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<OutputEnvelope<TweetPage | BookmarkFolderPage> | { help: string }> {
  const parsed = parseArguments(argv)
  if (parsed.command === 'help') return { help: HELP }

  const client = new XquikClient({
    apiKey: environment.XQUIK_API_KEY ?? '',
    fetcher,
  })

  if (parsed.command === 'search') {
    assertOnlyOptions(parsed.options, ['query', 'limit', 'sort', 'cursor'])
    const query = option(parsed.options, 'query')
    const limit = integerOption(parsed.options, 'limit')
    const sort = searchSort(parsed.options.get('sort') ?? 'Latest')
    const cursor = optionalOpaque(parsed.options, 'cursor')
    const result = await client.searchTweets({ query, limit, sort, cursor })
    return envelope({ command: 'search', limit, sort }, result)
  }

  if (parsed.command === 'user-tweets') {
    assertOnlyOptions(parsed.options, ['user', 'limit', 'cursor'])
    const user = userIdentifier(option(parsed.options, 'user'))
    const limit = integerOption(parsed.options, 'limit')
    const cursor = optionalOpaque(parsed.options, 'cursor')
    const result = await client.readUserTweets({ user, limit, cursor })
    return envelope({ command: 'user-tweets', user, limit }, result)
  }

  if (parsed.command === 'bookmark-folders') {
    assertOnlyOptions(parsed.options, ['confirmed-account'])
    confirmedAccount(parsed.options)
    const result = await client.readBookmarkFolders()
    return envelope({ command: 'bookmark-folders' }, result)
  }

  if (parsed.command === 'bookmarks') {
    assertOnlyOptions(parsed.options, [
      'confirmed-account',
      'folder-id',
      'cursor',
    ])
    confirmedAccount(parsed.options)
    const folderId = optionalOpaque(parsed.options, 'folder-id')
    const cursor = optionalOpaque(parsed.options, 'cursor')
    const result = await client.readBookmarks({ folderId, cursor })
    return envelope({ command: 'bookmarks' }, result)
  }

  throw new Error(`Unknown command: ${parsed.command}. Run with --help.`)
}

function parseArguments(argv: string[]): ParsedArguments {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { command: 'help', options: new Map() }
  }

  const command = argv[0]
  const options = new Map<string, string>()
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag?.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error(`Expected --option value after ${flag ?? command}.`)
    }
    const name = flag.slice(2)
    if (options.has(name)) throw new Error(`Duplicate option: --${name}.`)
    options.set(name, value)
  }
  return { command, options }
}

function assertOnlyOptions(options: Map<string, string>, allowed: string[]): void {
  const allowedNames = new Set(allowed)
  for (const name of options.keys()) {
    if (!allowedNames.has(name)) throw new Error(`Unknown option: --${name}.`)
  }
}

function option(options: Map<string, string>, name: string): string {
  return requiredText(options.get(name) ?? '', `--${name}`)
}

function integerOption(options: Map<string, string>, name: string): number {
  const value = option(options, name)
  if (!/^\d+$/.test(value)) throw new Error(`--${name} must be an integer.`)
  return boundedLimit(Number(value))
}

function optionalOpaque(
  options: Map<string, string>,
  name: string,
): string | undefined {
  const value = options.get(name)
  if (value === undefined) return undefined
  return opaqueValue(value, `--${name}`)
}

function confirmedAccount(options: Map<string, string>): string {
  const account = options.get('confirmed-account')
  if (!account) {
    throw new Error(
      'Private read not confirmed. Confirm the active connected X account first.',
    )
  }
  return username(account)
}

function searchSort(value: string): 'Latest' | 'Top' {
  if (value === 'Latest' || value === 'Top') return value
  throw new Error('--sort must be Latest or Top.')
}

function boundedLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > INTERACTIVE_LIMIT_MAX) {
    throw new Error(`limit must be an integer from 1 to ${INTERACTIVE_LIMIT_MAX}.`)
  }
  return value
}

function userIdentifier(value: string): string {
  const normalized = value.startsWith('@') ? value.slice(1) : value
  if (USER_ID.test(normalized) || USERNAME.test(normalized)) return normalized
  throw new Error('user must be a numeric ID or a valid X username.')
}

function username(value: string): string {
  const normalized = value.startsWith('@') ? value.slice(1) : value
  if (USERNAME.test(normalized)) return normalized
  throw new Error('confirmed account must be a valid X username.')
}

function requiredText(value: string, name: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${name} is required.`)
  return trimmed
}

function boundedQuery(value: string): string {
  const query = requiredText(value, 'query')
  if (query.length > MAX_QUERY_CHARACTERS || CONTROL_CHARACTER.test(query)) {
    throw new Error(
      `query must contain at most ${MAX_QUERY_CHARACTERS} characters.`,
    )
  }
  return query
}

function opaqueValue(value: string, name: string): string {
  if (!value || value.length > 2048 || CONTROL_CHARACTER.test(value)) {
    throw new Error(`${name} is invalid.`)
  }
  return value
}

function addOpaque(
  params: URLSearchParams,
  name: string,
  value: string | undefined,
): void {
  if (value !== undefined) params.set(name, opaqueValue(value, name))
}

function normalizeOrigin(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1') {
    throw new Error('Xquik API origin must use HTTPS.')
  }
  return url.origin
}

function parseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function errorMessage(value: unknown, apiKey: string): string {
  if (!isRecord(value)) return 'Request failed.'
  if (typeof value.message === 'string' && value.message.trim()) {
    return sanitizeMessage(value.message, apiKey)
  }
  if (typeof value.error === 'string' && value.error.trim()) {
    return sanitizeMessage(value.error, apiKey)
  }
  if (isRecord(value.error) && typeof value.error.message === 'string') {
    return sanitizeMessage(value.error.message, apiKey)
  }
  return 'Request failed.'
}

function sanitizeMessage(value: string, apiKey: string): string {
  const clean = value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').trim()
  const redacted =
    apiKey.length >= 8 ? clean.split(apiKey).join('[redacted]') : clean
  return redacted.slice(0, 300) || 'Request failed.'
}

async function readResponseText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error('Xquik response exceeded the safe size limit.')
  }
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) return text + decoder.decode()
    bytesRead += chunk.value.byteLength
    if (bytesRead > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined)
      throw new Error('Xquik response exceeded the safe size limit.')
    }
    text += decoder.decode(chunk.value, { stream: true })
  }
}

function validateTweetPage(value: unknown): TweetPage {
  if (!isRecord(value) || !Array.isArray(value.tweets)) {
    throw new Error('Xquik returned an invalid Tweet page.')
  }
  if (typeof value.has_next_page !== 'boolean') {
    throw new Error('Xquik returned invalid pagination state.')
  }
  if (typeof value.next_cursor !== 'string') {
    throw new Error('Xquik returned an invalid pagination cursor.')
  }
  if (
    value.filtered_count !== undefined &&
    (!Number.isInteger(value.filtered_count) || Number(value.filtered_count) < 0)
  ) {
    throw new Error('Xquik returned an invalid filtered count.')
  }
  return {
    tweets: value.tweets,
    has_next_page: value.has_next_page,
    next_cursor: value.next_cursor,
    ...(value.filtered_count === undefined
      ? {}
      : { filtered_count: Number(value.filtered_count) }),
  }
}

function validateBookmarkFolderPage(value: unknown): BookmarkFolderPage {
  if (!isRecord(value) || !Array.isArray(value.folders)) {
    throw new Error('Xquik returned an invalid bookmark folder page.')
  }
  if (typeof value.has_next_page !== 'boolean') {
    throw new Error('Xquik returned invalid pagination state.')
  }
  if (typeof value.next_cursor !== 'string') {
    throw new Error('Xquik returned an invalid pagination cursor.')
  }
  return {
    folders: value.folders,
    has_next_page: value.has_next_page,
    next_cursor: value.next_cursor,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function envelope<T extends TweetPage | BookmarkFolderPage>(
  request: Record<string, string | number>,
  result: T,
): OutputEnvelope<T> {
  return {
    source: 'xquik',
    content_trust: 'untrusted',
    request,
    result,
  }
}

const HELP = `Xquik bounded X data client

Usage:
  bun Tools/Xquik.ts search --query <query> --limit <1-100> [--sort Latest|Top] [--cursor <cursor>]
  bun Tools/Xquik.ts user-tweets --user <username-or-id> --limit <1-100> [--cursor <cursor>]
  bun Tools/Xquik.ts bookmark-folders --confirmed-account <username>
  bun Tools/Xquik.ts bookmarks --confirmed-account <username> [--folder-id <id>] [--cursor <cursor>]

Environment:
  XQUIK_API_KEY  Required. Read from the environment and never accepted as an argument.

Bookmark commands are private reads. Confirm the active connected X account,
purpose, recipients, destination, retention, and deletion date before running.
`

if (import.meta.main) {
  execute(process.argv.slice(2))
    .then((output) => {
      if ('help' in output) process.stdout.write(`${output.help}\n`)
      else process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error.'
      process.stderr.write(`Xquik: ${message}\n`)
      process.exitCode = 1
    })
}
