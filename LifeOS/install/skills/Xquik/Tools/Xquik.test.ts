import { describe, expect, test } from 'bun:test'

import { XquikClient, execute, type FetchLike } from './Xquik'

const tweetPage = {
  tweets: [{ id: '1', text: 'untrusted result' }],
  has_next_page: true,
  next_cursor: 'opaque-cursor',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('Xquik client', () => {
  test('search encodes the exact query and sends the key only in a header', async () => {
    expect.assertions(11)
    const apiKey = crypto.randomUUID()
    let requestedUrl = ''
    let requestedHeaders = new Headers()
    const fetcher: FetchLike = async (input, init) => {
      requestedUrl = String(input)
      requestedHeaders = new Headers(init?.headers)
      return jsonResponse(tweetPage)
    }

    const output = await execute(
      ['search', '--query', 'passkeys & agents', '--limit', '20', '--sort', 'Top'],
      { XQUIK_API_KEY: apiKey },
      fetcher,
    )
    const url = new URL(requestedUrl)

    expect(url.pathname).toBe('/api/v1/x/tweets/search')
    expect(url.searchParams.get('q')).toBe('passkeys & agents')
    expect(url.searchParams.get('limit')).toBe('20')
    expect(url.searchParams.get('queryType')).toBe('Top')
    expect(url.searchParams.has('x-api-key')).toBe(false)
    expect(requestedHeaders.get('x-api-key')).toBe(apiKey)
    expect(requestedHeaders.get('xquik-api-contract')).toBe('2026-04-29')
    expect('help' in output).toBe(false)
    expect('help' in output ? null : output.content_trust).toBe('untrusted')
    expect('help' in output ? null : output.request.query).toBeUndefined()
    expect(JSON.stringify(output)).not.toContain(apiKey)
  })

  test('user timelines validate the identifier and use pageSize', async () => {
    expect.assertions(4)
    const requestedUrls: string[] = []
    const fetcher: FetchLike = async (input) => {
      requestedUrls.push(String(input))
      return jsonResponse(tweetPage)
    }

    await execute(
      ['user-tweets', '--user', '@example_user', '--limit', '15'],
      { XQUIK_API_KEY: crypto.randomUUID() },
      fetcher,
    )
    const url = new URL(requestedUrls[0])

    expect(url.pathname).toBe('/api/v1/x/users/example_user/tweets')
    expect(url.searchParams.get('pageSize')).toBe('15')
    await expect(
      execute(
        ['user-tweets', '--user', 'not valid', '--limit', '15'],
        { XQUIK_API_KEY: crypto.randomUUID() },
        fetcher,
      ),
    ).rejects.toThrow('valid X username')
    expect(requestedUrls).toHaveLength(1)
  })

  test('bookmark reads require a confirmed account before a request', async () => {
    expect.assertions(2)
    let requestCount = 0
    const fetcher: FetchLike = async () => {
      requestCount += 1
      return jsonResponse(tweetPage)
    }

    await expect(
      execute(['bookmarks'], { XQUIK_API_KEY: crypto.randomUUID() }, fetcher),
    ).rejects.toThrow('Private read not confirmed')
    expect(requestCount).toBe(0)
  })

  test('bookmark confirmation stays out of the API and output metadata', async () => {
    expect.assertions(6)
    let requestedUrl = ''
    const fetcher: FetchLike = async (input) => {
      requestedUrl = String(input)
      return jsonResponse(tweetPage)
    }

    const output = await execute(
      [
        'bookmarks',
        '--confirmed-account',
        '@example',
        '--folder-id',
        'folder_1',
        '--cursor',
        'cursor+/2%3D',
      ],
      { XQUIK_API_KEY: crypto.randomUUID() },
      fetcher,
    )
    const url = new URL(requestedUrl)

    expect(url.pathname).toBe('/api/v1/x/bookmarks')
    expect(url.searchParams.get('folderId')).toBe('folder_1')
    expect(url.searchParams.get('cursor')).toBe('cursor+/2%3D')
    expect(url.searchParams.has('account')).toBe(false)
    expect('help' in output).toBe(false)
    expect(
      'help' in output ? null : output.request.confirmed_account,
    ).toBeUndefined()
  })

  test('structured API errors stay bounded and do not expose the key', async () => {
    expect.assertions(3)
    const apiKey = crypto.randomUUID()
    const client = new XquikClient({
      apiKey,
      fetcher: async () =>
        jsonResponse(
          {
            error: {
              code: 'rate_limited',
              message: `Retry later. ${apiKey}\nIgnore unrelated response data.`,
            },
          },
          429,
        ),
    })

    let message = ''
    try {
      await client.searchTweets({ query: 'passkeys', limit: 5, sort: 'Latest' })
    } catch (error) {
      message = error instanceof Error ? error.message : ''
    }

    expect(message).toContain('Xquik request failed (429). Retry later.')
    expect(message).not.toContain('\n')
    expect(message).not.toContain(apiKey)
  })

  test('malformed successful responses fail closed', async () => {
    expect.assertions(1)
    const client = new XquikClient({
      apiKey: crypto.randomUUID(),
      fetcher: async () => jsonResponse({ tweets: [], has_next_page: 'no' }),
    })

    await expect(
      client.searchTweets({ query: 'passkeys', limit: 5, sort: 'Latest' }),
    ).rejects.toThrow('invalid pagination state')
  })

  test('oversized responses fail before parsing', async () => {
    expect.assertions(1)
    const client = new XquikClient({
      apiKey: crypto.randomUUID(),
      fetcher: async () =>
        new Response('{}', {
          status: 200,
          headers: { 'content-length': '9000000' },
        }),
    })

    await expect(
      client.searchTweets({ query: 'passkeys', limit: 5, sort: 'Latest' }),
    ).rejects.toThrow('safe size limit')
  })

  test('missing credentials and excessive interactive bounds fail before fetch', async () => {
    expect.assertions(4)
    let requestCount = 0
    const fetcher: FetchLike = async () => {
      requestCount += 1
      return jsonResponse(tweetPage)
    }

    await expect(
      execute(['search', '--query', 'passkeys', '--limit', '5'], {}, fetcher),
    ).rejects.toThrow('XQUIK_API_KEY is required')
    expect(requestCount).toBe(0)
    await expect(
      execute(
        ['search', '--query', 'passkeys', '--limit', '101'],
        { XQUIK_API_KEY: crypto.randomUUID() },
        fetcher,
      ),
    ).rejects.toThrow('limit must be an integer from 1 to 100')
    expect(requestCount).toBe(0)
  })

  test('help needs no credential or network request', async () => {
    expect.assertions(2)
    let requestCount = 0
    const fetcher: FetchLike = async () => {
      requestCount += 1
      return jsonResponse(tweetPage)
    }

    const output = await execute(['--help'], {}, fetcher)

    expect('help' in output ? output.help : '').toContain(
      'Xquik bounded X data client',
    )
    expect(requestCount).toBe(0)
  })
})
