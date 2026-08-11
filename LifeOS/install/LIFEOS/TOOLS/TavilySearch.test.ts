import { expect, test } from 'bun:test'
import {
  getTavilyApiKey,
  normalizeTavilyResponse,
  searchTavily,
} from './TavilySearch'

test('searchTavily sends the documented request and normalizes sources', async () => {
  let request: { url: string; init?: RequestInit } | undefined
  const response = new Response(JSON.stringify({
    answer: 'A concise answer',
    results: [{
      title: 'Example source',
      url: 'https://example.com/source',
      content: 'A source snippet',
      score: 0.92,
      published_date: '2025-01-01',
    }],
  }), { status: 200 })

  const result = await searchTavily('life operating systems', {
    searchDepth: 'advanced',
    topic: 'news',
    maxResults: 30,
    includeAnswer: true,
  }, {
    apiKey: 'test-key',
    fetch: async (url, init) => {
      request = { url, init }
      return response
    },
  })

  expect(request?.url).toBe('https://api.tavily.com/search')
  expect(request?.init?.method).toBe('POST')
  expect(request?.init?.headers).toEqual({ 'Content-Type': 'application/json' })
  expect(JSON.parse(request?.init?.body as string)).toEqual({
    api_key: 'test-key',
    query: 'life operating systems',
    search_depth: 'advanced',
    topic: 'news',
    max_results: 20,
    include_answer: true,
    include_raw_content: false,
    include_images: false,
  })
  expect(result).toEqual({
    query: 'life operating systems',
    answer: 'A concise answer',
    results: [{
      title: 'Example source',
      url: 'https://example.com/source',
      content: 'A source snippet',
      score: 0.92,
      publishedDate: '2025-01-01',
    }],
  })
})

test('searchTavily rejects missing credentials without making a request', async () => {
  let called = false
  await expect(searchTavily('query', {}, {
    apiKey: '',
    fetch: async () => {
      called = true
      return new Response('{}')
    },
  })).rejects.toThrow('TAVILY_API_KEY is not set')
  expect(called).toBe(false)
  expect(getTavilyApiKey({ TAVILY_API_KEY: '  configured-key  ' })).toBe('configured-key')
})

test('searchTavily redacts credentials from provider errors', async () => {
  await expect(searchTavily('query', {}, {
    apiKey: 'secret-key',
    fetch: async () => new Response(JSON.stringify({ error: 'invalid secret-key' }), { status: 401 }),
  })).rejects.toThrow('invalid [redacted]')
})

test('searchTavily reports malformed successful responses', async () => {
  await expect(searchTavily('query', {}, {
    apiKey: 'test-key',
    fetch: async () => new Response(JSON.stringify({ answer: 'no sources' }), { status: 200 }),
  })).rejects.toThrow('Tavily returned an invalid response')
})

test('searchTavily reports network failures without exposing credentials', async () => {
  await expect(searchTavily('query', {}, {
    apiKey: 'secret-key',
    fetch: async () => {
      throw new Error('network failed for secret-key')
    },
  })).rejects.toThrow('network failed for [redacted]')
})

test('normalizeTavilyResponse drops results without URLs and keeps attribution fields', () => {
  expect(normalizeTavilyResponse({
    results: [
      { title: 'No URL', content: 'ignored' },
      { title: 'Valid', url: 'https://example.com', content: 'snippet' },
    ],
  }, 'query')).toEqual({
    query: 'query',
    results: [{
      title: 'Valid',
      url: 'https://example.com',
      content: 'snippet',
    }],
  })
})
