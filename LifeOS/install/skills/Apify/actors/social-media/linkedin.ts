/**
 * LinkedIn Scraper
 *
 * Top Actors:
 * - dev_fusion/Linkedin-Profile-Scraper (26,635 users, 4.10 rating, $10/1k results)
 * - curious_coder/linkedin-jobs-scraper (9,430 users, 4.98 rating, $1/1k results)
 * - supreme_coder/linkedin-post (3,663 users, 4.16 rating, $0.001/post)
 *
 * Extract LinkedIn profiles, jobs, posts, company data without cookies.
 */

import { Apify } from '../../index'
import type {
  UserProfile,
  Post,
  PaginationOptions,
  ActorRunOptions,
  Location,
  ContactInfo
} from '../../types'

/* ============================================================================
 * TYPES
 * ========================================================================= */

export interface LinkedInProfileInput {
  /** LinkedIn profile URL */
  profileUrl: string
  /** Include email extraction (requires website visit) */
  includeEmail?: boolean
}

export interface LinkedInProfile extends UserProfile {
  fullName: string
  headline?: string
  location?: string
  about?: string
  profileUrl: string
  company?: string
  position?: string
  email?: string
  phone?: string
  website?: string
  connectionsCount?: number
  skills?: string[]
  experience?: LinkedInExperience[]
  education?: LinkedInEducation[]
  languages?: string[]
}

export interface LinkedInExperience {
  title: string
  company: string
  location?: string
  startDate?: string
  endDate?: string
  description?: string
  duration?: string
}

export interface LinkedInEducation {
  school: string
  degree?: string
  field?: string
  startYear?: number
  endYear?: number
}

export interface LinkedInJobsInput extends PaginationOptions {
  /** Job search keywords */
  keywords: string
  /** Location (e.g., "San Francisco, CA") */
  location?: string
  /** Maximum number of jobs to scrape */
  maxResults?: number
  /** Date posted filter ("past-24h", "past-week", "past-month", "any") */
  datePosted?: string
  /** Experience level filter */
  experienceLevel?: string[]
  /** Remote filter */
  remote?: boolean
}

export interface LinkedInJob {
  id: string
  title: string
  company: string
  companyUrl?: string
  companyLogo?: string
  location: string
  description: string
  postedDate: string
  applicants?: string
  jobUrl: string
  seniority?: string
  employmentType?: string
  jobFunctions?: string[]
  industries?: string[]
  salary?: string
}

export interface LinkedInPostsInput extends PaginationOptions {
  /** LinkedIn profile or company URL */
  profileUrl: string
  /** Maximum number of posts to scrape */
  maxResults?: number
}

export interface LinkedInEngagersInput {
  /** Full post URL (reactions) — e.g. https://www.linkedin.com/posts/<slug>_...-activity-<id>-<hash> */
  postUrl: string
  /** Cap on billed results. Every engager is a billed row — always set this. */
  maxResults?: number
}

export interface LinkedInEngager {
  name: string
  /** Job title / headline — the field that makes seniority classification possible */
  headline: string
  profileUrl: string
  source: 'reaction' | 'comment'
}

export interface LinkedInPost extends Post {
  id: string
  url: string
  text: string
  authorName?: string
  authorUrl?: string
  authorHeadline?: string
  likesCount: number
  commentsCount: number
  sharesCount?: number
  timestamp: string
  imageUrls?: string[]
  videoUrl?: string
}

/* ============================================================================
 * FUNCTIONS
 * ========================================================================= */

/**
 * Scrape LinkedIn profile data including email
 *
 * @param input - Profile scraping options
 * @param options - Actor run options
 * @returns LinkedIn profile data
 *
 * @example
 * ```typescript
 * // Scrape profile with email
 * const profile = await scrapeLinkedInProfile({
 *   profileUrl: 'https://www.linkedin.com/in/exampleuser',
 *   includeEmail: true
 * })
 *
 * console.log(`${profile.fullName} - ${profile.headline}`)
 * console.log(`Email: ${profile.email}`)
 * ```
 */
export async function scrapeLinkedInProfile(
  input: LinkedInProfileInput,
  options?: ActorRunOptions
): Promise<LinkedInProfile> {
  const apify = new Apify()

  const run = await apify.callActor('dev_fusion/Linkedin-Profile-Scraper', {
    urls: [input.profileUrl],
    includeEmail: input.includeEmail || false
  }, options)

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`LinkedIn profile scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({ limit: 1 })

  if (items.length === 0) {
    throw new Error(`Profile not found: ${input.profileUrl}`)
  }

  const profile = items[0]

  return {
    fullName: profile.fullName || profile.name,
    headline: profile.headline,
    bio: profile.about,
    about: profile.about,
    location: profile.location,
    profileUrl: input.profileUrl,
    company: profile.company,
    position: profile.position || profile.headline,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    connectionsCount: profile.connections,
    followersCount: profile.followers,
    skills: profile.skills,
    experience: profile.experience,
    education: profile.education,
    languages: profile.languages
  }
}

/**
 * Search LinkedIn jobs
 *
 * @param input - Job search parameters
 * @param options - Actor run options
 * @returns Array of LinkedIn jobs
 *
 * @example
 * ```typescript
 * // Search for remote AI jobs
 * const jobs = await searchLinkedInJobs({
 *   keywords: 'artificial intelligence engineer',
 *   location: 'United States',
 *   remote: true,
 *   maxResults: 100
 * })
 *
 * // Filter in code - only senior roles with high applicants
 * const competitiveRoles = jobs.filter(j =>
 *   j.seniority?.includes('Senior') &&
 *   parseInt(j.applicants || '0') > 100
 * )
 * ```
 */
export async function searchLinkedInJobs(
  input: LinkedInJobsInput,
  options?: ActorRunOptions
): Promise<LinkedInJob[]> {
  const apify = new Apify()

  const run = await apify.callActor('curious_coder/linkedin-jobs-scraper', {
    keyword: input.keywords,
    location: input.location,
    maxItems: input.maxResults || 50,
    datePosted: input.datePosted,
    experienceLevel: input.experienceLevel,
    remote: input.remote
  }, options)

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`LinkedIn jobs scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({
    limit: input.maxResults || 1000,
    offset: input.offset || 0
  })

  return items.map((job: any) => ({
    id: job.jobId || job.id,
    title: job.title,
    company: job.company,
    companyUrl: job.companyUrl,
    companyLogo: job.companyLogo,
    location: job.location,
    description: job.description,
    postedDate: job.postedDate || job.postedAt,
    applicants: job.applicants,
    jobUrl: job.jobUrl || job.url,
    seniority: job.seniority,
    employmentType: job.employmentType,
    jobFunctions: job.jobFunctions,
    industries: job.industries,
    salary: job.salary,
    url: job.jobUrl || job.url
  }))
}

/**
 * Scrape the members who REACTED to a LinkedIn post, with their headlines.
 *
 * Headlines are the useful part: they carry job title, which is what makes
 * audience composition (seniority / function breakdowns) possible. This is
 * public post-level data — it is NOT the follower-demographics breakdown from
 * creator analytics, which is session-only and unreachable by any actor.
 *
 * @example
 * ```typescript
 * const reactors = await scrapeLinkedInPostReactions({
 *   postUrl: 'https://www.linkedin.com/posts/someuser_slug-activity-123-abc',
 *   maxResults: 500
 * })
 * const execs = reactors.filter(r => /\b(c[efti]o|chief|founder)\b/i.test(r.headline))
 * ```
 */
export async function scrapeLinkedInPostReactions(
  input: LinkedInEngagersInput,
  options?: ActorRunOptions
): Promise<LinkedInEngager[]> {
  const apify = new Apify()

  // COST GOTCHA: billed per engager. An uncapped run on a high-engagement post
  // returns thousands of rows — always pass maxResults.
  const run = await apify.callActor('harvestapi/linkedin-post-reactions', {
    posts: [input.postUrl],
    maxItems: input.maxResults || 500
  }, options)

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`LinkedIn post reactions scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({ limit: input.maxResults || 500 })

  return items
    .map((r: any) => ({
      name: r.actor?.name ?? r.name ?? '',
      headline: r.actor?.position ?? r.actor?.headline ?? r.headline ?? r.position ?? '',
      profileUrl: r.actor?.linkedinUrl ?? r.actor?.profile_url ?? r.profileUrl ?? '',
      source: 'reaction' as const
    }))
    .filter((e) => e.headline)
}

/**
 * Scrape commenters on a LinkedIn post, with their headlines.
 *
 * Takes the numeric ACTIVITY ID, not a URL — passing a post_url returns
 * "Field input.postIds is required".
 *
 * The ID is 19 digits and starts with 7; its top 42 bits are a millisecond
 * timestamp, so a REAL id in a doc example silently publishes when that post
 * was made. This example previously carried a genuine activity id that decoded
 * to a post three days before the 7.24.x cut. Keep the placeholder an obviously
 * round synthetic number, never a copied-in real one.
 *
 * @example
 * ```typescript
 * const commenters = await scrapeLinkedInPostCommenters({ postId: '7000000000000000000' })
 * ```
 */
export async function scrapeLinkedInPostCommenters(
  input: { postId: string },
  options?: ActorRunOptions
): Promise<LinkedInEngager[]> {
  const apify = new Apify()

  const run = await apify.callActor(
    'apimaestro/linkedin-post-comments-replies-engagements-scraper-no-cookies',
    { postIds: [input.postId] },
    options
  )

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`LinkedIn post comments scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({ limit: 1000 })

  return items
    .filter((c: any) => c.author?.headline)
    .map((c: any) => ({
      name: c.author.name ?? '',
      headline: c.author.headline,
      profileUrl: c.author.profile_url ?? '',
      source: 'comment' as const
    }))
}

/**
 * Scrape LinkedIn posts from a profile or company
 *
 * @param input - Posts scraping options
 * @param options - Actor run options
 * @returns Array of LinkedIn posts
 *
 * @example
 * ```typescript
 * // Scrape latest posts
 * const posts = await scrapeLinkedInPosts({
 *   profileUrl: 'https://www.linkedin.com/in/exampleuser',
 *   maxResults: 50
 * })
 *
 * // Filter in code - only high-engagement posts
 * const viral = posts.filter(p =>
 *   p.likesCount > 100 || p.commentsCount > 20
 * )
 * ```
 */
export async function scrapeLinkedInPosts(
  input: LinkedInPostsInput,
  options?: ActorRunOptions
): Promise<LinkedInPost[]> {
  const apify = new Apify()

  // COST GOTCHA (2026-07-21): this actor bills per scraped post and its real
  // input cap is `limitPerSource` — `maxPosts` is ignored and an uncapped run
  // scraped 784 posts ($1.58). Always pass limitPerSource.
  const run = await apify.callActor('supreme_coder/linkedin-post', {
    urls: [input.profileUrl],
    limitPerSource: input.maxResults || 50,
    deepScrape: false
  }, options)

  await apify.waitForRun(run.id)

  const finalRun = await apify.getRun(run.id)
  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`LinkedIn posts scraping failed: ${finalRun.status}`)
  }

  const dataset = apify.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({
    limit: input.maxResults || 1000,
    offset: input.offset || 0
  })

  return items.map((post: any) => ({
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
  }))
}
