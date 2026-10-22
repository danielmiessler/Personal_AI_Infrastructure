/**
 * Optional LinkedIn posts path for scrapeLinkedInPosts.
 * The default actor stays supreme_coder/linkedin-post.
 * Set LIFEOS_LINKEDIN_POSTS_ACTOR=johnvc/linkedin-posts-api to opt in.
 */

export const DEFAULT_LINKEDIN_POSTS_ACTOR = 'supreme_coder/linkedin-post'
export const OPTIONAL_LINKEDIN_POSTS_ACTOR = 'johnvc/linkedin-posts-api'
export const LINKEDIN_POSTS_ACTOR_ENV = 'LIFEOS_LINKEDIN_POSTS_ACTOR'

const POSTS_CAP = 200

export interface LinkedInPostsRequest {
  profileUrl: string
  maxResults?: number
}

export interface LinkedInPostRow {
  id: string
  url: string
  text: string
  authorName?: string
  authorUrl?: string
  authorHeadline?: string
  likesCount: number
  commentsCount: number
  sharesCount?: number
  viewsCount?: number
  timestamp: string
  imageUrls?: unknown
  videoUrl?: string
  caption: string
}

export function resolveLinkedInPostsActor(envValue: string | undefined | null): string {
  if (envValue === OPTIONAL_LINKEDIN_POSTS_ACTOR) return OPTIONAL_LINKEDIN_POSTS_ACTOR
  return DEFAULT_LINKEDIN_POSTS_ACTOR
}

export function linkedInPostsActorInput(
  actorId: string,
  input: LinkedInPostsRequest
): Record<string, unknown> {
  const limit = input.maxResults || 50
  if (actorId === OPTIONAL_LINKEDIN_POSTS_ACTOR) {
    return {
      profileUrls: [input.profileUrl],
      maxPostsPerProfile: Math.min(POSTS_CAP, Math.max(1, limit))
    }
  }
  return {
    urls: [input.profileUrl],
    limitPerSource: limit,
    deepScrape: false
  }
}

function defaultPost(post: any): LinkedInPostRow {
  return {
    id: post.id || post.postId,
    url: post.url || post.postUrl,
    text: post.text || post.content,
    authorName: post.authorName,
    authorUrl: post.authorUrl,
    authorHeadline: post.authorHeadline,
    likesCount: post.likesCount || post.likes || 0,
    commentsCount: post.commentsCount || post.comments || 0,
    sharesCount: post.sharesCount || post.shares,
    viewsCount: post.viewsCount,
    timestamp: post.timestamp || post.postedAt,
    imageUrls: post.images,
    videoUrl: post.videoUrl,
    caption: post.text
  }
}

function videoUrlFrom(post: any): string | undefined {
  if (typeof post.videoUrl === 'string' && post.videoUrl) return post.videoUrl
  if (!Array.isArray(post.videos)) return undefined
  const first = post.videos.find((item: unknown) => typeof item === 'string' && item)
  return typeof first === 'string' ? first : undefined
}

function optionalPost(post: any): LinkedInPostRow | null {
  if (!post || post.result_type !== 'post') return null
  return {
    id: post.postId || '',
    url: post.postUrl || '',
    text: post.text || '',
    authorName: post.authorName,
    authorUrl: post.authorUrl,
    authorHeadline: post.authorHeadline,
    likesCount: post.numLikes || 0,
    commentsCount: post.numComments || 0,
    sharesCount: post.numShares,
    viewsCount: post.viewsCount,
    timestamp: post.datePosted || '',
    imageUrls: Array.isArray(post.images) ? post.images : undefined,
    videoUrl: videoUrlFrom(post),
    caption: post.text || ''
  }
}

export function linkedInPostsFromItems(actorId: string, items: unknown[]): LinkedInPostRow[] {
  if (actorId === OPTIONAL_LINKEDIN_POSTS_ACTOR) {
    return (items || [])
      .map((item) => optionalPost(item))
      .filter((row): row is LinkedInPostRow => row !== null)
  }
  return (items || []).map((post) => defaultPost(post))
}
