/**
 * Twitter/X Scraper
 *
 * Xquik Actor:
 * - xquik/x-tweet-scraper
 *
 * Extract Twitter/X profiles, tweets, and search results.
 */

import { Apify } from '../../index'
import type {
  UserProfile,
  Post,
  PaginationOptions,
  ActorRunOptions
} from '../../types'
import { runXquikTweetScraper } from './xquik'
import type { XquikTweetDatasetRow } from './xquik'

/* ============================================================================
 * TYPES
 * ========================================================================= */

interface XquikTweetAuthor extends Record<string, unknown> {
  username?: string
  name?: string
  verified?: boolean
}

interface XquikTweetMedia extends Record<string, unknown> {
  type?: string
  url?: string
}

interface XquikTweetEntities extends Record<string, unknown> {
  hashtags?: unknown
  user_mentions?: unknown
}

interface XquikNormalizedTweetFields extends XquikTweetDatasetRow {
  id?: string
  tweetId?: string
  url?: string
  text?: string
  fullText?: string
  authorUsername?: string
  authorName?: string
  username?: string
  displayName?: string
  author?: XquikTweetAuthor
  createdAt?: string
  timestamp?: string
  likesCount?: number
  likeCount?: number
  likes?: number
  retweetsCount?: number
  retweetCount?: number
  retweets?: number
  repliesCount?: number
  replyCount?: number
  replies?: number
  viewsCount?: number
  viewCount?: number
  views?: number
  authorVerified?: boolean
  hashtags?: unknown
  mentions?: unknown
  entities?: XquikTweetEntities
  imageUrls?: string[]
  media?: XquikTweetMedia[]
  videoUrl?: string
  videoUrls?: string[]
  isRetweet?: unknown
  retweetedTweet?: unknown
  retweeted_status?: unknown
  isReply?: unknown
  isReplyTo?: unknown
  quotedTweet?: XquikTweetDatasetRow
}

type XquikNormalizedTweetRow = XquikNormalizedTweetFields

export interface TwitterProfileInput {
  /** Twitter username (without @) */
  username: string
  /** Include tweets in profile response */
  includeTweets?: boolean
  /** Maximum number of tweets to fetch */
  maxTweets?: number
}

export interface TwitterProfile extends UserProfile {
  username: string
  displayName: string
  bio?: string
  location?: string
  website?: string
  profileImageUrl?: string
  bannerImageUrl?: string
  followersCount?: number
  followingCount?: number
  tweetsCount?: number
  verified?: boolean
  createdAt?: string
  latestTweets?: TwitterTweet[]
}

export interface TwitterTweetsInput extends PaginationOptions {
  /** Twitter username (without @) */
  username: string
  /** Maximum number of tweets to scrape */
  maxTweets?: number
  /** Include replies */
  includeReplies?: boolean
  /** Include retweets */
  includeRetweets?: boolean
}

export interface TwitterSearchInput extends PaginationOptions {
  /** Search query */
  query: string
  /** Maximum number of tweets to return */
  maxTweets?: number
  /** Search type: "Latest", "Top", "People", "Photos", "Videos" */
  searchType?: string
}

export interface TwitterTweet extends Post {
  id: string
  url: string
  text: string
  authorUsername: string
  authorDisplayName: string
  timestamp: string
  likesCount: number
  retweetsCount: number
  repliesCount: number
  viewsCount?: number
  authorVerified?: boolean
  hashtags?: string[]
  mentions?: string[]
  imageUrls?: string[]
  videoUrl?: string
  isRetweet?: boolean
  isReply?: boolean
  quotedTweet?: TwitterTweet
}

/* ============================================================================
 * FUNCTIONS
 * ========================================================================= */

/**
 * Scrape Twitter/X profile data
 *
 * @param input - Profile scraping options
 * @param options - Actor run options
 * @returns Twitter profile data
 *
 * @example
 * ```typescript
 * // Scrape profile with latest tweets
 * const profile = await scrapeTwitterProfile({
 *   username: 'exampleuser',
 *   includeTweets: true,
 *   maxTweets: 20
 * })
 *
 * console.log(`${profile.displayName} (@${profile.username})`)
 * console.log(`Followers: ${profile.followersCount}`)
 * console.log(`Latest tweets: ${profile.latestTweets?.length}`)
 * ```
 */
export async function scrapeTwitterProfile(
  input: TwitterProfileInput,
  options?: ActorRunOptions
): Promise<TwitterProfile> {
  const apify = new Apify()

  const run = await apify.callActor('apidojo/twitter-scraper-lite', {
    mode: 'profile',
    username: input.username,
    maxTweets: input.includeTweets ? (input.maxTweets || 20) : 0
  }, options)

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`Twitter profile scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({ limit: 100 })

  if (items.length === 0) {
    throw new Error(`Profile not found: @${input.username}`)
  }

  // First item is profile, rest are tweets
  const profileData = items[0]
  const tweets = items.slice(1)

  return {
    username: profileData.username || input.username,
    displayName: profileData.name || profileData.displayName,
    bio: profileData.description || profileData.bio,
    location: profileData.location,
    website: profileData.url || profileData.website,
    profileImageUrl: profileData.profileImageUrl,
    bannerImageUrl: profileData.bannerImageUrl,
    followersCount: profileData.followersCount || profileData.followers,
    followingCount: profileData.followingCount || profileData.following,
    tweetsCount: profileData.tweetsCount || profileData.tweets,
    verified: profileData.verified || profileData.isVerified,
    createdAt: profileData.createdAt,
    latestTweets: tweets.map(mapToTwitterTweet)
  }
}

/**
 * Scrape tweets from a Twitter/X user
 *
 * @param input - Tweets scraping options
 * @param options - Actor run options
 * @returns Array of tweets
 *
 * @example
 * ```typescript
 * // Get latest tweets
 * const tweets = await scrapeTwitterTweets({
 *   username: 'exampleuser',
 *   maxTweets: 100,
 *   includeReplies: false
 * })
 *
 * // Filter in code - only high engagement
 * const viral = tweets.filter(t =>
 *   t.likesCount > 100 || t.retweetsCount > 50
 * )
 * ```
 */
export async function scrapeTwitterTweets(
  input: TwitterTweetsInput,
  options?: ActorRunOptions
): Promise<TwitterTweet[]> {
  const requested = input.maxTweets ?? input.maxResults ?? 100
  const offset = input.offset ?? 0
  const target = input.includeReplies === false
    ? {
        mode: 'profileTweets' as const,
        twitterHandles: [input.username]
      }
    : {
        startUrls: [`https://x.com/${input.username}/with_replies`],
        respectProfileSubpages: true
      }
  const items = await runXquikTweetScraper({
    ...target,
    maxItems: requested + offset,
    outputVariant: 'rich',
    outputPreset: 'flat',
    fieldStyle: 'camelCase'
  }, options)

  return items
    .filter(isTweetDatasetRow)
    .map(mapToTwitterTweet)
    .filter(tweet => input.includeRetweets !== false || !tweet.isRetweet)
    .slice(offset, offset + requested)
}

/**
 * Search Twitter/X for tweets
 *
 * @param input - Search parameters
 * @param options - Actor run options
 * @returns Array of tweets matching search
 *
 * @example
 * ```typescript
 * // Search for AI security tweets
 * const tweets = await searchTwitter({
 *   query: 'AI security',
 *   maxTweets: 50,
 *   searchType: 'Latest'
 * })
 *
 * // Filter in code - only from verified users
 * const verifiedTweets = tweets.filter(t =>
 *   t.authorVerified === true
 * )
 * ```
 */
export async function searchTwitter(
  input: TwitterSearchInput,
  options?: ActorRunOptions
): Promise<TwitterTweet[]> {
  const requested = input.maxTweets ?? input.maxResults ?? 100
  const offset = input.offset ?? 0
  const items = await runXquikTweetScraper({
    mode: 'search',
    searchTerms: [input.query],
    maxItems: requested + offset,
    queryType: normalizeSearchType(input.searchType),
    outputVariant: 'rich',
    outputPreset: 'flat',
    fieldStyle: 'camelCase'
  }, options)

  return items
    .filter(isTweetDatasetRow)
    .map(mapToTwitterTweet)
    .slice(offset, offset + requested)
}

/* ============================================================================
 * HELPERS
 * ========================================================================= */

function normalizeSearchType(
  searchType: string | undefined
): 'Latest' | 'Top' | 'Latest + Top' {
  if (searchType === 'Top' || searchType === 'Latest + Top') {
    return searchType
  }
  return 'Latest'
}

function isTweetDatasetRow(
  row: XquikTweetDatasetRow
): row is XquikNormalizedTweetRow {
  return (
    row.resultType !== 'diagnostic' &&
    (typeof row.id === 'string' || typeof row.tweetId === 'string')
  )
}

function mapToTwitterTweet(tweet: XquikNormalizedTweetRow): TwitterTweet {
  const id = getTweetId(tweet)
  const author = tweet.author || {}
  const entities = tweet.entities || {}
  const media = Array.isArray(tweet.media) ? tweet.media : []

  return {
    id,
    url: tweet.url ||
      `https://x.com/${tweet.authorUsername || author.username}/status/${id}`,
    text: tweet.text || tweet.fullText || '',
    authorUsername: tweet.authorUsername || author.username ||
      tweet.username || '',
    authorDisplayName: tweet.authorName || author.name ||
      tweet.displayName || '',
    timestamp: tweet.createdAt || tweet.timestamp || '',
    likesCount: tweet.likesCount ?? tweet.likeCount ?? tweet.likes ?? 0,
    retweetsCount: tweet.retweetsCount ?? tweet.retweetCount ?? tweet.retweets ?? 0,
    repliesCount: tweet.repliesCount ?? tweet.replyCount ?? tweet.replies ?? 0,
    viewsCount: tweet.viewsCount ?? tweet.viewCount ?? tweet.views,
    commentsCount: tweet.repliesCount ?? tweet.replyCount ?? tweet.replies ?? 0,
    authorVerified: tweet.authorVerified ?? author.verified,
    hashtags: normalizeEntityNames(tweet.hashtags || entities.hashtags),
    mentions: normalizeEntityNames(tweet.mentions || entities.user_mentions),
    imageUrls: tweet.imageUrls || media
      .filter(
        (item): item is XquikTweetMedia & { url: string } =>
          item.type === 'photo' && typeof item.url === 'string'
      )
      .map(item => item.url),
    videoUrl: tweet.videoUrl || tweet.videoUrls?.[0] ||
      media.find(item => item.type === 'video')?.url,
    isRetweet: Boolean(
      tweet.isRetweet || tweet.retweetedTweet || tweet.retweeted_status
    ),
    isReply: Boolean(tweet.isReply || tweet.isReplyTo),
    quotedTweet: tweet.quotedTweet && isTweetDatasetRow(tweet.quotedTweet)
      ? mapToTwitterTweet(tweet.quotedTweet)
      : undefined,
    caption: tweet.text || tweet.fullText || ''
  }
}

function getTweetId(tweet: XquikNormalizedTweetRow): string {
  if (typeof tweet.id === 'string') return tweet.id
  if (typeof tweet.tweetId === 'string') return tweet.tweetId
  throw new Error('Tweet ID missing. Inspect the Actor output schema.')
}

function normalizeEntityNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'text' in item) {
        return String(item.text)
      }
      if (item && typeof item === 'object' && 'screen_name' in item) {
        return String(item.screen_name)
      }
      return undefined
    })
    .filter((item): item is string => item !== undefined)
}
