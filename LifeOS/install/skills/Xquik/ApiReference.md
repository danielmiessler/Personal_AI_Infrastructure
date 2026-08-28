# Xquik API reference

The tool uses the published Xquik REST contract at `https://xquik.com/api/v1`.
Authentication uses `XQUIK_API_KEY` through the `x-api-key` header.

## Routes

| Command | Method and route | Bound |
| --- | --- | --- |
| `search` | `GET /x/tweets/search` | `limit`, 1 to 100 |
| `user-tweets` | `GET /x/users/{id}/tweets` | `pageSize`, 1 to 100 |
| `bookmark-folders` | `GET /x/bookmarks/folders` | One API page |
| `bookmarks` | `GET /x/bookmarks` | One API page |

The CLI deliberately caps visible-post reads below the API maximum. This keeps
interactive LifeOS work bounded. Use an estimated extraction workflow outside
this Skill for larger datasets.

## Common response

Tweet routes return this shape:

```typescript
interface TweetPage {
  tweets: unknown[]
  has_next_page: boolean
  next_cursor: string
  filtered_count?: number
}
```

The CLI validates the envelope. Tweet objects remain untrusted API data.

## Search

`q` holds the exact caller query. `queryType` is `Latest` or `Top`. `limit`
sets the maximum returned posts. Supply an existing `cursor` unchanged.

## User timelines

The path identifier can be a username or numeric user ID. Usernames accept
letters, numerals, and underscores. `pageSize` sets the page bound.

## Bookmarks

Bookmarks and folder names belong to the active connected X account. The route
has no account parameter. Confirm that exact dashboard-selected account before
calling it. `folderId` and `cursor` remain opaque.

## Errors

The client requests the structured `2026-04-29` error contract. It returns the
HTTP status and safe message without printing the API key or full response body.

Retry only bounded read failures. Preserve a supplied cursor. Stop on an
authentication, billing, confirmation, or account-state error.
