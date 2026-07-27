import { describe, expect, test } from 'bun:test'
import type { ActorRunOptions } from '../../types'
import {
  runXquikFollowerScraper,
  runXquikTweetScraper,
  XQUIK_FOLLOWER_ACTOR,
  XQUIK_TWEET_ACTOR,
  type XquikActorClient
} from './xquik'

interface CapturedCall {
  actorId?: string
  input?: Record<string, unknown>
  options?: ActorRunOptions
  datasetId?: string
  limit?: number
}

function createClient(
  captured: CapturedCall,
  rows: unknown[],
  status = 'SUCCEEDED'
): XquikActorClient {
  return {
    async callActor(actorId, input, options) {
      captured.actorId = actorId
      captured.input = input
      captured.options = options
      return {
        id: 'run-1',
        status,
        defaultDatasetId: 'dataset-1'
      }
    },
    getDataset(datasetId) {
      captured.datasetId = datasetId
      return {
        async listItems({ limit }) {
          captured.limit = limit
          return rows
        }
      }
    }
  }
}

describe('Xquik Actor wrappers', () => {
  test('runs the Tweet Actor with native input and charge limits', async () => {
    expect.assertions(6)
    const captured: CapturedCall = {}
    const input = {
      searchTerms: ['from:OpenAI API'],
      maxItems: 25,
      outputVariant: 'rich' as const
    }
    const options = { maxTotalChargeUsd: 0.5 }

    const rows = await runXquikTweetScraper(
      input,
      options,
      createClient(captured, [{ id: 'tweet-1' }])
    )

    expect(captured.actorId).toBe(XQUIK_TWEET_ACTOR)
    expect(captured.input).toBe(input)
    expect(captured.options).toBe(options)
    expect(captured.datasetId).toBe('dataset-1')
    expect(captured.limit).toBe(25)
    expect(rows).toEqual([{ id: 'tweet-1' }])
  })

  test('runs the Follower Actor with a safe default dataset limit', async () => {
    expect.assertions(3)
    const captured: CapturedCall = {}

    const rows = await runXquikFollowerScraper(
      {
        twitterHandles: ['OpenAI'],
        relation: 'followers'
      },
      undefined,
      createClient(captured, [{ username: 'example' }])
    )

    expect(captured.actorId).toBe(XQUIK_FOLLOWER_ACTOR)
    expect(captured.limit).toBe(1000)
    expect(rows).toEqual([{ username: 'example' }])
  })

  test('rejects unsupported target URLs before starting a run', async () => {
    expect.assertions(2)
    const captured: CapturedCall = {}

    await expect(
      runXquikFollowerScraper(
        { targets: ['https://example.com/profile'] },
        undefined,
        createClient(captured, [])
      )
    ).rejects.toThrow(
      'Unsupported X URL. Use an x.com or twitter.com HTTP(S) URL.'
    )
    expect(captured.actorId).toBeUndefined()
  })

  test('surfaces unsuccessful Actor runs without reading the dataset', async () => {
    expect.assertions(2)
    const captured: CapturedCall = {}

    await expect(
      runXquikTweetScraper(
        { tweetIds: ['123'] },
        undefined,
        createClient(captured, [], 'FAILED')
      )
    ).rejects.toThrow(
      'Xquik Actor did not succeed: FAILED. Inspect Apify run run-1.'
    )
    expect(captured.datasetId).toBeUndefined()
  })
})
