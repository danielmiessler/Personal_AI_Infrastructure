# Source Routing Protocol

**Read this before spawning agents.** The right source has the answer; the right agent only fetches it. Mismatched source-to-question is the #1 cause of research failures in this skill.

## The Core Rule

**Web search answers "what was published about X." Community APIs answer "what people said about X."** Press articles invent consensus, fabricate timestamps, and miss the loudest fan reactions. If the question is about sentiment, ratings, reactions, opinions, or what real people thought — you do not want web search alone. You want the platforms where those people actually posted, queried via the most-direct path available.

## Cascade Priority (NEVER INVERT)

For every platform you reach, walk the cascade in order. Move down only when the upper tier is unavailable or fails:

**Tier 1 — Official API.** Highest signal, stable schema, terms-of-service compliant, often free at research volume. Always check first.

**Tier 2 — Scraper (Apify / BrightData).** Use only when no API key is configured, when API rate-limits exhaust, when the platform offers no public API (TikTok), or when API doesn't expose the data shape needed (e.g., full comment threads on some platforms).

**Tier 3 — Web search (Perplexity / Claude / Gemini).** Last resort for sentiment. Useful only to scaffold context — dates, lineup, version numbers — never to answer "what did fans think." Web search reads press coverage; press coverage is not the community.

**The inversion is the failure mode.** Reaching for Apify before checking for an official API key, or reaching for Perplexity before either, wastes budget and degrades signal.

## Per-Platform Cascade

| Platform | Tier 1 (API) | Tier 2 (Scraper) | Tier 3 (Web search) |
|----------|--------------|------------------|---------------------|
| **Reddit** | JSON API (free, unauth, public — append `.json` to any URL) | Apify `trudax/reddit-scraper-lite` or `apify/reddit-scraper` | `site:reddit.com` via WebSearch |
| **X / Twitter** | X API v2 recent-search (via `TWITTER_API_KEY` + `X_BEARER_TOKEN` env vars; LifeOS users with a private X-wrapper skill can invoke it here) | Apify `apidojo/tweet-scraper` | `site:x.com` via WebSearch |
| **YouTube** | YouTube Data API v3 (`commentThreads.list`, `search.list`) — requires `YOUTUBE_API_KEY` env var | `fabric -y URL` for transcripts; Apify `streamers/youtube-scraper` for comments | `site:youtube.com` |
| **TikTok** | (no public API) | Apify `clockworks/tiktok-scraper` | `site:tiktok.com` |
| **Bluesky** | AT Protocol public API (`api.bsky.app/xrpc/app.bsky.feed.searchPosts`) — no auth required for reads | Apify Bluesky scrapers | `site:bsky.app` |
| **Discord** | Discord API (requires bot token + server membership) | (no general scraper) | n/a |

## Technical Signal Detection (run at Step 0, alongside the sentiment check)

The question is a **technical question** if it is about code, APIs, frameworks, libraries, runtimes, protocols, tooling, versions, migration paths, or "how does <system> actually work under the hood."

If it fires → **add a `CodexResearcher` (Remy) slot.** He runs OpenAI's flagship model through `codex exec` with live web search, so he is the only researcher whose findings come from outside the Anthropic distribution that the DA and ClaudeResearcher share. On technical questions that difference is the point: a wrong API contract or a hallucinated flag is exactly the failure mode two Claude-family passes agree on. He is TypeScript-first by construction, which matches the house stack.

```typescript
Agent({
  subagent_type: "CodexResearcher",
  description: "[topic] technical",
  prompt: "Do ONE technical search for: [query]. Prefer primary sources — official docs, source, changelogs, RFCs. Tag each finding [HIGH]/[MED]/[LOW]. Return findings immediately."
})
```

Wired 2026-07-27: an audit found this agent had **zero** dispatch call sites while its own file claimed the Research workflows called it. Non-technical questions do not spawn him — he is not a fourth generalist.

## Sentiment Signal Detection (run at Step 0 of every workflow)

The question is a **community-sentiment question** if it contains any of:

- "what did fans / people / the community / users / viewers / listeners / players / attendees think (of|about)"
- "ratings of" / "rated" / "fan ratings" / "user ratings"
- "best / worst / favorite / most disappointing / standout (sets|episodes|moments|games|features|takes)"
- "reactions to" / "reaction to" / "reaction videos"
- "what people are saying about"
- "is X any good" / "is X worth it" — purchase / consumption decision driven by social proof
- "consensus on" / "popular opinion of"
- Event name + ("last night" | "last weekend" | "yesterday" | recent date) — recent-event recap with implied "how was it"

If any signal fires → **sentiment-mode routing.** Otherwise → standard routing.

## Sentiment-Mode Routing — Platform Priority

Spend agent slots across platforms in this order, walking the Tier-1 → Tier-3 cascade *inside each platform*:

1. **Reddit (always first).** Where most English-language fandoms post raw reactions. Tier-1 path is the free JSON API.
2. **X / Twitter.** Fastest reaction window (first 6 hours post-event). Tier-1 path is X API v2 recent-search via `curl` against `https://api.twitter.com/2/tweets/search/recent` with `Authorization: Bearer $X_BEARER_TOKEN`. LifeOS users who maintain a private X-wrapper skill can invoke that wrapper instead.
3. **YouTube** — reactor channels and comment sections, especially for events / launches. Tier-1 path is YouTube Data API v3 *if `YOUTUBE_API_KEY` is set*; otherwise `fabric -y` for transcripts + Apify for comments.
4. **TikTok** — viral-moment signal (which clips got reshared most). No public API → Apify is the primary path here.
5. **Platform-native communities** — Discord, Steam reviews, subject-specific forums. Hit when relevant.
6. **Web search (last, context only)** — dates, lineup, version numbers. Never for sentiment.

The order is hierarchy *and* fallback. Inside each platform, walk Tier 1 → 2 → 3 before moving to the next platform.

## Reddit — Tier 1: JSON API (default path)

Reddit's JSON API is free, unauthenticated, public, and stable. It is the official Tier-1 path even though "API" colloquially implies OAuth — Reddit explicitly publishes the `.json` suffix for unauth reads at research volume.

**Endpoints:**
- Subreddit Top this week: `https://www.reddit.com/r/{sub}/top.json?t=week&limit=50`
- Subreddit Top this month: `https://www.reddit.com/r/{sub}/top.json?t=month&limit=50`
- Subreddit search: `https://www.reddit.com/r/{sub}/search.json?q={query}&restrict_sr=1&sort=top&t=month`
- Site-wide search: `https://www.reddit.com/search.json?q={query}&sort=top&t=month`
- Thread + comments: `https://www.reddit.com/r/{sub}/comments/{id}.json`

**Headers:** Set `User-Agent: LifeOS-Research/1.0` (Reddit rate-limits the default). Use `curl -A "LifeOS-Research/1.0" -s` or pass via WebFetch / Bash subagent.

**Subreddit discovery:** if you don't know which sub has the conversation, run a site-wide search first and read the `subreddit` field on returned posts. Common subs cluster by domain — `r/{topic}`, `r/{topic}news`, `r/{topic}circlejerk` for contrarian signal.

**What to pull:**
- Megathreads first (high comment count, broad sample).
- Top posts by upvote count (the upvote is the rating).
- Top comments in each thread (sort by score, not chronological).
- Look for dedicated single-subject threads ("ARTIST_NAME was incredible" → 21 score is a meaningful signal).

**Quoting rule:** Quote verbatim from comments with attribution to the thread URL. Fan quotes are the evidence; paraphrasing them launders the signal.

## Reddit — Tier 2: Apify Scraper (fallback only)

Use this **only** when JSON API rate-limits, returns 403, or you need authenticated reads (private subs, NSFW with auth wall):

```typescript
mcp__Apify__search-actors({ search: "reddit scraper", limit: 5 })
// Typical hit: trudax/reddit-scraper-lite or apify/reddit-scraper
mcp__Apify__call-actor({
  actor: "trudax/reddit-scraper-lite",
  step: "call",
  input: { startUrls: ["https://www.reddit.com/r/{sub}/top/?t=week"], maxItems: 50 }
})
mcp__Apify__get-actor-output({ datasetId: "{from previous response}" })
```

## YouTube

**Tier 1 — Data API v3 (if `YOUTUBE_API_KEY` set).** Use `commentThreads.list` for comment extraction at scale, `search.list` to find reactor videos. Highest signal, structured, free up to quota.

```bash
# Check key
test -n "$YOUTUBE_API_KEY" && echo "Tier 1 available" || echo "Skip to Tier 2"
# Search for reactor videos
curl -s "https://www.googleapis.com/youtube/v3/search?part=snippet&q={event}+reaction&maxResults=10&type=video&order=viewCount&key=$YOUTUBE_API_KEY"
# Pull comments
curl -s "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={id}&maxResults=100&order=relevance&key=$YOUTUBE_API_KEY"
```

**Tier 2 — Scraper fallback.**
- **Transcripts:** `fabric -y https://www.youtube.com/watch?v={id}` pulls captions to stdin. Use this even when YOUTUBE_API_KEY is set — the Data API doesn't expose transcripts.
- **Comments:** Apify `streamers/youtube-scraper` when API key absent or quota exhausted.

**Tier 3 — Web search.** `site:youtube.com {event} reaction` via WebSearch for discovery only.

## X / Twitter

**Tier 1 — X API v2 recent-search (default path).** Credentials live in env: `TWITTER_API_KEY`, `X_BEARER_TOKEN`, `TWITTER_CLIENT_ID/SECRET`. Call the recent-search endpoint directly via `curl` (or wrap it in a private skill — many LifeOS users keep a private `_X` skill that wraps this call; check your local skills before reinventing).

```bash
curl -s -H "Authorization: Bearer $X_BEARER_TOKEN" \
  "https://api.twitter.com/2/tweets/search/recent?query=$(echo {event} | jq -sRr @uri)&max_results=50&tweet.fields=public_metrics,created_at"
```

Reactions in the first 6 hours after an event are the highest-signal cluster.

**Tier 2 — Apify `apidojo/tweet-scraper`** when X API rate-limits exhaust (free-tier read quota is small) or when you need pre-2023 historical sweep that the recent-search endpoint cannot reach.

**Tier 3 — `site:x.com` web search.** Discovery-only fallback.

## TikTok

Apify `clockworks/tiktok-scraper` for hashtag pulls. Useful when the event spawned a viral clip moment that didn't trend on Reddit.

## Output Format When Sentiment-Routed

When the workflow returns, organize fan signal by **tier of agreement**, not by source:

```markdown
## Tier S — Multiple fans called this their #1
| # | Subject | Evidence |
|---|---------|----------|
| 1 | [name] | [verbatim quote] — [thread URL, score] / [verbatim quote] — [thread URL, score] |

## Tier A — Repeated standouts
...

## Tier C — Disappointments (the inverse signal — equally valuable)
...

## Sources
- Reddit threads pulled (count) — list URLs + scores
- YouTube videos transcribed (count)
- X posts referenced (count)
```

**Always include the inverse signal.** What fans hated is as informative as what they loved, sometimes more.

## Anti-Patterns (do not do these)

- **Cascade inversion.** Reaching for Apify before checking the official API path, or reaching for Perplexity before either. Always API → scraper → search. A documented failure of this skill (a festival-sentiment question, 2026-05) was exactly the inverted cascade — Perplexity ran first, Reddit JSON was never called, Apify wasn't even considered. The corrected second pass pulled Reddit JSON directly; that should have been the first call.
- **Reaching for Apify on X before trying the direct API.** X API v2 credentials are in env (`X_BEARER_TOKEN`). Direct `curl` against `api.twitter.com/2/tweets/search/recent` is Tier 1. Apify tweet-scraper is Tier 2, fallback only.
- **Reaching for Apify on YouTube without checking `YOUTUBE_API_KEY`.** If the key is set, `commentThreads.list` is the Tier-1 path. Apify is Tier 2.
- **Recap-journalism-only on a sentiment question.** Press articles invent timestamps ("Charlotte de Witte closed at 04:14"), fabricate surprise guests ("Garrix × Armin B2B"), and parrot promoter copy. They are wrong about consensus. If a recap-article claim has zero corroboration in the community corpus, drop it.
- **Spawning Perplexity for "what fans thought of X"** when Reddit JSON would have returned the answer in a single curl. Reddit's structure (upvotes, top comments, single-subject threads) is purpose-built for this exact question.
- **Pulling only one sub** when the event has a community footprint across several. EDC has r/electricdaisycarnival, r/EDM, r/aves. Game launches have r/{game}, r/games, r/patientgamers. Always check 2-3 subs.
- **Reporting upvote counts without quoting the comments.** The number means nothing without the text it endorses.
- **Filtering out negative reactions to "balance the review."** Report the actual signal. Tier C exists precisely because it's the truest part.

## Quick Reference

| Question shape | First call (always Tier 1) |
|----------------|-----------------------------|
| "what did fans think of X" | Reddit JSON: `r/{topic}/top.json?t=week` |
| "best sets at {festival}" | Reddit JSON site-wide search: `q={festival}&sort=top` |
| "is {product} any good" | Reddit JSON: `r/{product}/top.json?t=month` |
| "reactions to {event}" | YouTube Data API v3 search.list (if key) OR `fabric -y` on top reactor videos, plus Reddit JSON |
| "what's the consensus on X" | Reddit JSON + X API v2 recent-search (`curl` against `api.twitter.com/2/tweets/search/recent` with `X_BEARER_TOKEN`) |
| "what are people saying right now" | X API v2 recent-search (real-time signal) + Reddit JSON |
