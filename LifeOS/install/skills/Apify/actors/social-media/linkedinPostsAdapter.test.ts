import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_LINKEDIN_POSTS_ACTOR,
  OPTIONAL_LINKEDIN_POSTS_ACTOR,
  linkedInPostsActorInput,
  linkedInPostsFromItems,
  resolveLinkedInPostsActor
} from './linkedinPostsAdapter.ts'

const profileUrl = 'https://www.linkedin.com/in/example'

describe('linkedin posts adapter', () => {
  it('keeps the current actor unless the env value is the optional actor', () => {
    assert.equal(resolveLinkedInPostsActor(undefined), DEFAULT_LINKEDIN_POSTS_ACTOR)
    assert.equal(resolveLinkedInPostsActor(''), DEFAULT_LINKEDIN_POSTS_ACTOR)
    assert.equal(resolveLinkedInPostsActor('other/actor'), DEFAULT_LINKEDIN_POSTS_ACTOR)
    assert.equal(resolveLinkedInPostsActor(OPTIONAL_LINKEDIN_POSTS_ACTOR), OPTIONAL_LINKEDIN_POSTS_ACTOR)
  })

  it('sends the current input shape by default', () => {
    assert.deepEqual(linkedInPostsActorInput(DEFAULT_LINKEDIN_POSTS_ACTOR, { profileUrl, maxResults: 50 }), {
      urls: [profileUrl],
      limitPerSource: 50,
      deepScrape: false
    })
  })

  it('sends profileUrls and a capped per-profile maximum when opted in', () => {
    assert.deepEqual(linkedInPostsActorInput(OPTIONAL_LINKEDIN_POSTS_ACTOR, { profileUrl, maxResults: 50 }), {
      profileUrls: [profileUrl],
      maxPostsPerProfile: 50
    })
    assert.equal(
      linkedInPostsActorInput(OPTIONAL_LINKEDIN_POSTS_ACTOR, { profileUrl, maxResults: 500 }).maxPostsPerProfile,
      200
    )
  })

  it('maps the current actor fields the same way', () => {
    const rows = linkedInPostsFromItems(DEFAULT_LINKEDIN_POSTS_ACTOR, [{
      id: 'old-id',
      url: 'https://www.linkedin.com/posts/example',
      text: 'hello',
      likesCount: 3,
      comments: 1,
      timestamp: '2026-01-01T00:00:00.000Z'
    }])
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, 'old-id')
    assert.equal(rows[0].url, 'https://www.linkedin.com/posts/example')
    assert.equal(rows[0].text, 'hello')
    assert.equal(rows[0].likesCount, 3)
    assert.equal(rows[0].commentsCount, 1)
    assert.equal(rows[0].timestamp, '2026-01-01T00:00:00.000Z')
    assert.equal(rows[0].caption, 'hello')
  })

  it('maps an optional post row onto the wrapper fields and drops error rows', () => {
    const rows = linkedInPostsFromItems(OPTIONAL_LINKEDIN_POSTS_ACTOR, [
      {
        result_type: 'post',
        postId: '',
        postUrl: '',
        text: '',
        authorName: '',
        authorHeadline: '',
        authorUrl: '',
        datePosted: '',
        numLikes: 0,
        numComments: 0,
        numShares: 0,
        images: [],
        videos: []
      },
      {
        result_type: 'error',
        error_type: 'CollectionError',
        error_message: 'none'
      }
    ])
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0], {
      id: '',
      url: '',
      text: '',
      authorName: '',
      authorUrl: '',
      authorHeadline: '',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: undefined,
      timestamp: '',
      imageUrls: [],
      videoUrl: undefined,
      caption: ''
    })
  })
})
