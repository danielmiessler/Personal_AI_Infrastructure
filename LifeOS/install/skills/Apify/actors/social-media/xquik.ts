/**
 * Xquik Apify Actor wrappers
 *
 * Actors:
 * - xquik/x-tweet-scraper
 * - xquik/x-follower-scraper
 */

import { Apify } from '../../index'
import type { ActorRunOptions } from '../../types'

export const XQUIK_TWEET_ACTOR = 'xquik/x-tweet-scraper'
export const XQUIK_FOLLOWER_ACTOR = 'xquik/x-follower-scraper'

export type XquikTweetMode =
  | 'legacy'
  | 'tweet'
  | 'tweets'
  | 'search'
  | 'profileTweets'
  | 'profileReplies'
  | 'profileMedia'
  | 'profileLikes'
  | 'listTweets'
  | 'article'
  | 'replies'
  | 'quotes'
  | 'thread'
  | 'retweeters'
  | 'favoriters'

export type XquikFollowerRelation =
  | 'followers'
  | 'following'
  | 'verified_followers'
  | 'list_members'
  | 'list_followers'
  | 'community_members'

export interface XquikTweetScraperInput {
  startUrls?: Array<string | { url: string }>
  twitterHandles?: string[]
  listIds?: string[]
  tweetIds?: string[]
  searchTerms?: string[]
  mode?: XquikTweetMode
  articleTweetIds?: string[]
  replyTweetIds?: string[]
  quoteTweetIds?: string[]
  threadTweetIds?: string[]
  retweeterTweetIds?: string[]
  favoriterTweetIds?: string[]
  maxItems?: number
  maxItemsPerTarget?: number
  queryType?: 'Latest' | 'Top' | 'Latest + Top'
  outputVariant?: 'legacy' | 'rich' | 'raw'
  outputPreset?: 'nested' | 'flat'
  fieldStyle?: 'legacy' | 'camelCase' | 'snake_case'
  includeSearchTerms?: boolean
  includeRaw?: boolean
  includeArticles?: boolean
  includeOriginalTweet?: boolean
  includeUnavailableFields?: boolean
  respectProfileSubpages?: boolean
  [key: string]: unknown
}

export interface XquikFollowerScraperInput {
  startUrls?: Array<string | { url: string }>
  targets?: Array<string | { url: string }>
  twitterHandles?: string[]
  userIds?: string[]
  twitterUserIds?: string[]
  listIds?: string[]
  communityIds?: string[]
  relation?: XquikFollowerRelation
  relations?: XquikFollowerRelation[]
  maxItems?: number
  maxItemsPerTarget?: number
  outputMode?: 'compact' | 'full' | 'raw'
  includeRaw?: boolean
  includeUnavailableFields?: boolean
  includeUnavailableUsers?: boolean
  includeTargetMetadata?: boolean
  dedupeAcrossTargets?: boolean
  dedupeMode?: 'none' | 'first' | 'merge'
  overlapMode?: boolean
  minFollowers?: number
  maxFollowers?: number
  minFollowing?: number
  maxFollowing?: number
  minStatuses?: number
  maxStatuses?: number
  minAccountAgeDays?: number
  verifiedOnly?: boolean
  verifiedType?: 'blue' | 'business' | 'government' | 'none'
  usernameContains?: string
  bioContains?: string
  locationContains?: string
  hasWebsite?: boolean
  hasLocation?: boolean
  [key: string]: unknown
}

export type XquikTweetDatasetRow = Record<string, unknown>
export type XquikFollowerDatasetRow = Record<string, unknown>

interface XquikActorRun {
  id: string
  status: string
  defaultDatasetId: string
}

interface XquikDataset {
  listItems(options: { limit: number }): Promise<unknown[]>
}

export interface XquikActorClient {
  callActor(
    actorId: string,
    input: Record<string, unknown>,
    options?: ActorRunOptions
  ): Promise<XquikActorRun>
  getDataset(datasetId: string): XquikDataset
}

/**
 * Run Xquik's X Tweet Scraper with its native input schema.
 *
 * Use this direct wrapper for tweet URLs and IDs, searches, timelines, lists,
 * articles, replies, quotes, threads, retweeters, and best-effort favoriters.
 */
export async function runXquikTweetScraper(
  input: XquikTweetScraperInput,
  options?: ActorRunOptions,
  client: XquikActorClient = new Apify()
): Promise<XquikTweetDatasetRow[]> {
  validateXStartUrls(input.startUrls)
  return runXquikActor<XquikTweetDatasetRow>(
    client,
    XQUIK_TWEET_ACTOR,
    input,
    input.maxItems,
    options
  )
}

/**
 * Run Xquik's X Follower Scraper with its native input schema.
 *
 * Supports followers, following, verified followers, list members, list
 * followers, community members, target metadata, filters, and overlap modes.
 */
export async function runXquikFollowerScraper(
  input: XquikFollowerScraperInput,
  options?: ActorRunOptions,
  client: XquikActorClient = new Apify()
): Promise<XquikFollowerDatasetRow[]> {
  validateXStartUrls(input.startUrls)
  validateXStartUrls(input.targets)
  return runXquikActor<XquikFollowerDatasetRow>(
    client,
    XQUIK_FOLLOWER_ACTOR,
    input,
    input.maxItems,
    options
  )
}

async function runXquikActor<T extends Record<string, unknown>>(
  client: XquikActorClient,
  actorId: string,
  input: Record<string, unknown>,
  maxItems: number | undefined,
  options: ActorRunOptions | undefined
): Promise<T[]> {
  const run = await client.callActor(actorId, input, options)

  if (run.status !== 'SUCCEEDED') {
    throw new Error(
      `Xquik Actor did not succeed: ${run.status}. Inspect Apify run ${run.id}.`
    )
  }

  const dataset = client.getDataset(run.defaultDatasetId)
  const items = await dataset.listItems({
    limit: maxItems ?? 1000
  })

  return items as T[]
}

function validateXStartUrls(
  startUrls: Array<string | { url: string }> | undefined
): void {
  for (const request of startUrls ?? []) {
    const value = typeof request === 'string' ? request : request.url
    if (!URL.canParse(value)) {
      throw new Error(
        'Invalid X URL. Use an x.com or twitter.com HTTP(S) URL.'
      )
    }
    const url = new URL(value)
    const validProtocol = url.protocol === 'http:' || url.protocol === 'https:'
    const validHost =
      url.hostname === 'x.com' ||
      url.hostname.endsWith('.x.com') ||
      url.hostname === 'twitter.com' ||
      url.hostname.endsWith('.twitter.com')

    if (!validProtocol || !validHost || url.username || url.password) {
      throw new Error(
        'Unsupported X URL. Use an x.com or twitter.com HTTP(S) URL.'
      )
    }
  }
}
