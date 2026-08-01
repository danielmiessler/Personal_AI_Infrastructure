---
version: 1.3.2
---

# Feed — the LifeOS External Sense

> **Private infrastructure — not included in the public LifeOS release.** This document describes a feed pipeline the maintainer runs privately on Arbol (also private). No Feed implementation ships with the OSS release; it's reference documentation for how the architecture works, and a blueprint if you want to build your own.

> The Feed is the LifeOS's **external sense** in thesis terms (`LifeOs/LifeOsThesis.md`) — Conduit is the internal one, and both feed Synapse (`Synapse/SynapseSystem.md`), the input router. The Feed keeps the OS's current-state picture fed with the outside world, and it routes by what *your* ideal state cares about — a TELOS-relevant signal alerts immediately, noise archives silently. Its rate/route stages are conceptually Synapse's work running in the Feed's plumbing.

**Why "Feed."** In the sensory stack Feed is the outward-facing eye: Conduit senses *you*, Feed senses *the world* — sources you choose, watched continuously, evaluated against your TELOS, and passed to Synapse for grading and routing into Cortex. The name is plain because the job is plain: it keeps the OS fed.

**Turning information streams into routed intelligence.**

The Feed System is the sensor layer of the LIFEOS/ARBOL architecture. It monitors content sources, processes everything through an AI intelligence pipeline, and routes actionable items to the right destinations at the right priority.

This is not an RSS reader. It's an intelligence routing engine.

---

## The Vision

Raw information is noise. Intelligence is information that has been evaluated, prioritized, and delivered to the right place at the right time.

The Feed System implements this transformation:

```
NOISE (thousands of items/day from hundreds of sources)
    │
    ▼
INTELLIGENCE (rated, labeled, priority-routed to specific destinations)
```

**The key insight:** Different content deserves different treatment. A trusted security researcher posting about a national security issue with high urgency should trigger Discord + email immediately. A mediocre blog post about a topic you've seen before should archive silently. The Feed System makes these routing decisions automatically using multi-dimensional ratings and configurable rules.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FEED SYSTEM                                     │
│                                                                         │
│  SOURCES           PROCESSING              ROUTING         DESTINATIONS │
│  ────────          ──────────              ───────         ──────────── │
│                                                                         │
│  People       ┌─► INGEST ──────────┐                                   │
│  Channels     │   (fetch, parse,    │                                   │
│  Feeds        │    normalize)       │   ┌─► ROUTE ──┬─► (removed)      │
│  Publications │                     │   │  (rules,  │                   │
│               │   SUMMARIZE ────────┤   │   AND     ├─► Discord        │
│  RSS          │   (Haiku: short +   │   │   logic,  │                   │
│  YouTube      │    medium)          │   │   priority)├─► Email         │
│  Twitter/X    │                     │   │           │                   │
│  Bluesky      │   RATE ─────────────┘   │           ├─► Blog Draft     │
│  LinkedIn     │   (5 dimensions +       │           │                   │
│  Mastodon     │    20 labels)    ───────┘           ├─► Social Post    │
│  Blogs        │                                     │                   │
│  Newsletters  │                                     ├─► Daily Digest   │
│  Podcasts     │                                     │                   │
│               │                                     └─► Archive        │
│               │                                                         │
│  Each source has:                                                       │
│  • credibility/priority                                                 │
│  • poll interval                                                        │
│  • compute type (cloud/local)                                           │
│  • tags + expertise                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Intelligence Pipeline

Every piece of content flows through four stages:

### Stage 1: Ingest

Fetch content from the source, parse it, normalize to a standard format.

| Source Type | Method | Compute |
|-------------|--------|---------|
| RSS/Atom feeds | HTTP fetch + XML parse | Cloud (Workers) |
| YouTube | yt-dlp transcript extraction | Local (LifeOS daemon) |
| Twitter/X | API or scraping | Cloud |
| Podcasts | Download + Whisper transcription | Local |
| Blogs | HTTP fetch + HTML extraction | Cloud |

**Output:** Normalized item with `title`, `content`, `url`, `source_id`, `source_type`.

**Content resolution order** (fallback chain when extracting article text):
1. Article extractor — full HTML extraction from the article URL
2. `content_encoded` — RSS `<content:encoded>` field (Substack, WordPress, many blogs provide full text here)
3. `description` — RSS `<description>` field (summary/snippet only)

Bare URLs are **never** included in content sent to AI. Items with less than 200 characters of total content are skipped entirely to avoid wasting LLM calls on insufficient input.

### Stage 2: Summarize

AI generates two summary levels:

| Summary | Purpose |
|---------|---------|
| `summary_short` | One sentence. For notifications and digests. |
| `summary_medium` | One paragraph. For email and dashboard display. |

**Model:** A fast tier model (e.g. Claude Haiku). Information-dense, preserves facts/claims/conclusions.

### Stage 3: Rate

> **Status (2026-06-11):** in the live deployment, `quality_score` (1-100) is the only rating written — the S/A/B/C/D tier, importance, novelty, and urgency dimensions below are PLANNED/legacy design (the `tier` column is NULL on all items in prod). The same applies to the routing-rules engine in the Routing section: the table exists with zero rows; no rules fire.

Multi-dimensional AI evaluation:

| Dimension | Scale | Purpose |
|-----------|-------|---------|
| **Tier** | S / A / B / C / D | Overall quality bracket |
| **Quality Score** | 1-100 | Granular quality within tier |
| **Importance** | 1-10 | How significant is this content? |
| **Novelty** | 1-10 | How new/unique is this information? |
| **Urgency** | 1-10 | How time-sensitive is this? |

Plus a fixed-taxonomy label set. An example 20-label taxonomy:

```
Security, AI, Technology, Business, Geopolitics, Science,
Culture, Health, Privacy, OSINT, Military, Innovation,
Leadership, Philosophy, Tutorial, Podcast, Newsletter,
Research, Policy, Breaking
```

The taxonomy is intentionally fixed and small so labels stay comparable across items and over time. Customize it for your own domain.

**Tier definitions:**

| Tier | Meaning |
|------|---------|
| **S** | Groundbreaking. Must act on immediately. |
| **A** | Excellent. Must-read. High insight density. |
| **B** | Good. Worth reading. |
| **C** | Average. Skim-worthy. |
| **D** | Low value. Skip. |

### Stage 4: Route

Pure logic engine (no LLM) that evaluates rules against rated items.

**Rule format:**
```json
{
  "name": "Critical security alerts",
  "conditions": {
    "tier": ["S", "A"],
    "urgency": { "gte": 8 },
    "labels": { "includes": ["Security"] }
  },
  "actions": ["notify"],
  "priority": "immediate"
}
```

**Condition logic:** All conditions use AND. An item must match ALL conditions in a rule to trigger its actions.

**Numeric conditions:** `gte` (>=), `lte` (<=), `eq` (==)
**Label conditions:** `includes` (item has at least one matching label)
**Tier conditions:** Array of acceptable tiers

---

## Routing Rules

Rules are the core of the intelligence routing. They encode what matters and how to respond.

### Example Rules (Templates)

These are illustrative starting points — edit, replace, or remove them to fit your own routing needs.

| Rule | Conditions | Action | Priority |
|------|-----------|--------|----------|
| Critical security | tier S/A + urgency >= 8 + Security label | notify (Discord, email) — Telegram removed 2026-07-15 | immediate |
| High-quality AI content | tier S/A + AI label + quality >= 80 | blog-draft + social-post | daily |
| Breaking news | Breaking label + urgency >= 9 | notify (Discord, email) — Telegram removed 2026-07-15 | immediate |
| Weekly digest material | tier B+ + importance >= 6 | digest | weekly |
| Everything else | (default) | archive | archive |

### Priority Levels

| Priority | Meaning | Delivery |
|----------|---------|----------|
| **immediate** | Act now | Push notification: Discord, email (Telegram removed 2026-07-15) |
| **daily** | Review today | Included in daily digest/queue |
| **weekly** | Review this week | Included in weekly compilation |
| **archive** | Store for reference | No active delivery |

### Destinations

| Destination | Action | Implementation |
|-------------|--------|----------------|
| `notify` | Push alert to messaging platforms | Discord, Email via respective APIs (Telegram removed 2026-07-15) |
| `blog-draft` | Create draft post on the user's blog platform | Blog publishing skill integration |
| `social-post` | Generate and queue social media post | Social posting skill (e.g. tweet/LinkedIn writers) |
| `digest` | Accumulate for periodic compilation | Daily/weekly digest builder |
| `archive` | Store without action | D1 + R2 storage only |

---

## Relationship to Arbol

The Feed System runs on the **Arbol** Cloudflare Workers platform. Feed actions are deployed as Arbol Workers following the same patterns as the rest of Arbol infrastructure (Actions, Pipelines, Flows).

A typical mapping looks like:

| Component | Form |
|-----------|------|
| Ingest | Action Worker (`A_FEED_INGEST`) |
| Summarize | Action Worker (`A_FEED_SUMMARIZE`) |
| Rate | Action Worker (`A_FEED_RATE`) |
| Route | Action Worker (`A_FEED_ROUTE`) |
| Feed API | Long-running Worker (HTTP service) |
| Feed Poller | Flow with cron trigger (e.g. `*/5`) |
| Feed Processor | Flow with queue consumer |
| Feed Dispatcher | Flow with queue consumer |

**Poller circuit breaker.** A robust poller treats "HTTP 200 but zero parsed items" as a soft failure — increment `error_count` rather than reset it. This catches silent dead-weight feeds (parked domains, broken XML) that would otherwise look healthy.

**Tier fallback chain for fetching.** When a source 403s or rate-limits, fall back through tiers: direct fetch → reader-proxy service → self-hosted proxy. Each tier costs more but recovers more sources.

### How Feed Powers Arbol Workflows

The Feed System is the **source layer** for the Arbol platform. It generates the content that downstream actions, pipelines, and flows operate on:

```
Feed System (sources + intelligence)
    │
    ├─► F_HN_LABEL_EMAIL (HN → rate → email)
    │
    ├─► F_YOUTUBE_DIGEST (YouTube → transcribe → rate → digest)
    │
    ├─► F_SECURITY_ALERTS (Security feeds → rate → notify if urgent)
    │
    └─► F_SOCIAL_CONTENT (High-rated items → generate posts → queue)
```

Every flow in Arbol that processes external content starts with the Feed System. The intelligence pipeline (ingest → summarize → rate → route) is the common backbone. Flows just connect specific sources to specific pipelines on specific schedules.

---

## Infrastructure

### Cloud (Cloudflare)

| Service | Purpose |
|---------|---------|
| **D1** | Metadata database: sources, items, ratings, routing rules |
| **R2** | Content storage: full text, transcripts, media |
| **Queues** | Async processing: decouple ingest from processing |
| **Workers** | Compute: all actions, pipelines, flows, API |
| **Cron Triggers** | Scheduling: poll sources on configurable intervals |

### Local (LifeOS Daemon)

Some content types require tools unavailable in Workers:

| Tool | Purpose | Source Types |
|------|---------|-------------|
| `yt-dlp` | YouTube transcript/video download | YouTube |
| `whisper` | Audio transcription | Podcasts |
| `ffmpeg` | Media processing | Video, Audio |

The `compute_type` field on each source routes items to the correct processing environment:
- `cloud` → Cloudflare Queue → Workers consumer
- `local` → Cloudflare Queue → LifeOS daemon consumer

### Data Model

**Core tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `feed_sources` | Source definitions | name, category, platform URLs, tags, priority, compute_type, poll_interval, reputation columns (`rolling_item_count`, `rolling_avg_quality`, `rolling_a_rate`, `rolling_updated_at`) |
| `feed_items` | Processed content | source_id, title, content, tier, quality_score, importance, novelty, urgency, labels, priority, status |
| `feed_routing_rules` | Rule definitions | name, conditions (JSON), actions (JSON), priority, active |
| `feed_processing_log` | Execution tracking | item_id, action, duration, tokens, cost |

**Item lifecycle:** `ingested` → `processing` → `processed` → `dispatched`

**Optional cluster tables** (for grouping related items into stories): `story_clusters` (lead_item_id FK to feed_items, item_count, source_diversity, momentum) + `cluster_items` (cluster_id, item_id, is_lead). Deleting a feed item that leads a cluster requires either promoting a new lead or deleting orphan clusters first — the FK should be enforced.

### Cost Model (Order of Magnitude)

The Feed System is intentionally cheap to run. Order-of-magnitude shape for a single-user deployment polling a few hundred sources:

| Component | Relative cost |
|-----------|---------------|
| Cloudflare Workers/D1/R2 | Low — usually within free / cheap tier |
| Summarize (small/fast model) | Low |
| Rate (small/fast model) | Low–medium, scales with item volume |
| Periodic deep analysis (frontier model) | Medium |
| Social/API access | Varies by platform |

Actual numbers depend heavily on source count, poll frequency, model choice, and whether transcripts are involved. Track `feed_processing_log.cost` to measure your own deployment.

---

## Source Management

Sources represent the information streams being monitored. Each source has:

| Field | Purpose |
|-------|---------|
| **name** | Source identity (person, publication, channel) |
| **category** | `person`, `publication`, `channel`, `feed` |
| **priority** | `critical`, `high`, `normal`, `low` — affects routing weight |
| **expertise** | Free text describing the source's domain knowledge |
| **tags** | Topic tags for categorization |
| **Platform URLs** | RSS, YouTube, Twitter, Bluesky, LinkedIn, Mastodon, blog, newsletter, website |
| **poll_interval_minutes** | How often to check (default: 60) |
| **compute_type** | `cloud` or `local` — determines processing environment |

Sources are managed through the Feed API and visible in the admin dashboard at `admin.example.com/feed`.

### Example Source Entries (Templates)

These are placeholder shapes — replace with sources relevant to your interests.

```yaml
- name: Example Security Researcher
  category: person
  priority: high
  expertise: Cloud security, application security, vulnerability research
  tags: [Security, AI]
  rss_url: https://example.com/researcher.xml
  twitter_url: https://x.com/example_handle
  poll_interval_minutes: 60
  compute_type: cloud

- name: Example Tech Publication
  category: publication
  priority: normal
  expertise: AI industry news, model releases
  tags: [AI, Technology]
  rss_url: https://example.com/feed.xml
  poll_interval_minutes: 30
  compute_type: cloud

- name: Example YouTube Channel
  category: channel
  priority: normal
  expertise: Technical tutorials
  tags: [Tutorial, Technology]
  youtube_channel_id: UCxxxxxxxxxxxxxxxxxxxxxx
  rss_url: https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxxxxxxxxxxxxxxxx
  poll_interval_minutes: 120
  compute_type: local
```

---

## Source Reputation System

A self-tuning quality layer. Every active source carries rolling 7-day metrics on `feed_sources`:

| Column | Meaning |
|--------|---------|
| `rolling_item_count` | Items ingested in the last 7 days |
| `rolling_avg_quality` | Mean `quality_score` across those items |
| `rolling_a_rate` | Fraction of items with `quality_score >= 70` (A-tier) |
| `rolling_updated_at` | Timestamp of last metric refresh |

**Refresh query** (safe to run daily, idempotent — example for SQLite/D1):

```sql
UPDATE feed_sources SET
  rolling_item_count = (
    SELECT COUNT(*) FROM feed_items fi
    WHERE fi.source_id = feed_sources.id
      AND fi.ingested_at > datetime('now','-7 days')
  ),
  rolling_avg_quality = (
    SELECT ROUND(AVG(fi.quality_score),1) FROM feed_items fi
    WHERE fi.source_id = feed_sources.id
      AND fi.quality_score IS NOT NULL
      AND fi.ingested_at > datetime('now','-7 days')
  ),
  rolling_a_rate = (
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(SUM(CASE WHEN fi.quality_score >= 70 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3)
           END
    FROM feed_items fi
    WHERE fi.source_id = feed_sources.id
      AND fi.quality_score IS NOT NULL
      AND fi.ingested_at > datetime('now','-7 days')
  ),
  rolling_updated_at = datetime('now')
WHERE active = 1;
```

**Auto-demotion query** (example weekly cron — deactivates chronic underperformers; tune the thresholds to your taste):

```sql
UPDATE feed_sources SET
  active = 0,
  last_error = COALESCE(last_error,'') || ' | auto-demoted: chronic low quality'
WHERE active = 1
  AND rolling_item_count >= 50
  AND rolling_avg_quality < 35
  AND rolling_a_rate = 0;
```

Operational intent: the reputation layer lets downstream consumers (labeling pipeline, dashboards, surface UIs) treat sources by proven quality rather than by metadata alone. Combined with the circuit breaker on the poller, the system is self-cleaning: new sources earn their reputation by producing items; chronic low-quality producers get auto-demoted; chronic silent failures trip the circuit breaker.

---

## YouTube Ingestion Routing

YouTube sources can be polled via two different mechanisms — RSS Atom feeds (free, no quota) or the YouTube Data API (counts against a daily quota). Many deployments use both, splitting sources by whether `rss_url` is populated:

| `rss_url` state | Mechanism | Notes |
|---|---|---|
| `rss_url IS NOT NULL` | RSS Atom feed via `https://www.youtube.com/feeds/videos.xml?channel_id=UC...` | No API quota cost. Preferred default. |
| `rss_url IS NULL` | YouTube Data API v3 | Counts against your 10K daily quota. Reserve for sources that need richer metadata. |

When the same channel could be polled by both an RSS poller and an API poller, filter out sources where `rss_url` is set on the API side to avoid double-burning quota.

**Migration recipe** (move a YouTube source from the API path to the RSS path — example for SQLite/D1):

```sql
UPDATE feed_sources
SET rss_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=' || youtube_channel_id,
    error_count = 0,
    last_error = NULL
WHERE active = 1
  AND source_type IN ('youtube','youtube_channel')
  AND youtube_channel_id IS NOT NULL
  AND youtube_channel_id LIKE 'UC%'
  AND LENGTH(youtube_channel_id) = 24;
```

YouTube's RSS Atom endpoint returns HTTP 200 from Cloudflare Workers IPs, so this migration is safe in a Workers-hosted poller.

---

## The Bigger Picture

The Feed System transforms LifeOS from a reactive assistant into a proactive intelligence network. Instead of waiting for questions, it:

1. **Monitors** — continuously polls sources across platforms
2. **Evaluates** — AI rates everything on 5 dimensions with a fixed label taxonomy
3. **Routes** — configurable rules determine what deserves attention
4. **Delivers** — right content reaches the right destination at the right priority
5. **Powers** — downstream Arbol workflows (social posts, blog drafts, digests) consume feed intelligence

The goal: never miss important content, never be overwhelmed by noise.

### Knowledge Archive Integration

High-value feed items can be harvested into the LifeOS Knowledge Archive (`MEMORY/KNOWLEDGE/`, four entity types: People, Companies, Ideas, Research) by the KnowledgeHarvester or captured directly by the Algorithm LEARN phase. This closes the loop: the Feed System surfaces intelligence, and the Knowledge Archive preserves it for long-term recall across sessions.

---

## Examples

### One item through the pipeline

The whole system in miniature: **a trusted security researcher you follow posts about a vulnerability that's being actively exploited right now.** Watch that single item travel the four stages.

1. **Ingest** — the poller sees the new post, fetches it, and normalizes it to `{title, content, url, source_id}`.
2. **Summarize** — a fast model writes a one-sentence version (for the alert) and a one-paragraph version (for the dashboard).
3. **Rate** — the AI scores it: high quality, `Security` label, high urgency.
4. **Route** — the pure-logic engine matches it against the rules. It hits "critical security" (high quality + urgent + Security), so the action is *notify* at *immediate* priority.

Minutes after the post went up, the operator hears about it over Discord and email — without having watched a single feed. The item earned that alert by what it *is*, not by who happened to be looking.

### The same pipeline, the opposite outcome

Now run a low-value item through the identical machinery: **a rehash blog post covering news you saw a week ago.**

Ingest, summarize, rate — same three stages, no shortcut. But it scores low, carries no urgent label, and matches only the default "everything else" rule, whose action is *archive*. It lands in storage silently. No notification, no digest slot, nothing asked of the operator's attention.

Same pipeline, same effort spent evaluating both — and the routing rules, not a human triaging an inbox, decide that one deserves an interruption and the other deserves silence. That is the difference between an RSS reader (shows you everything) and an intelligence router (shows you what matters).

```mermaid
flowchart TD
    S[Source posts an item] --> I[Ingest: fetch, parse, normalize]
    I --> M[Summarize: one line + one paragraph]
    M --> R[Rate: quality, labels, urgency]
    R --> D{Match a routing rule?}
    D -->|high quality + urgent + Security| N[Immediate: Discord + email]
    D -->|good, not time-sensitive| G[Daily digest]
    D -->|low value, no match| A[Archive silently]
```

The branch is the whole design. Everything upstream of it is the same for every item — the intelligence is in scoring each piece honestly, then letting deterministic rules turn those scores into the right destination at the right priority.

---

## See Also

- The feed skill's SKILL.md — Operational reference: API endpoints, workflows, schema
- `ArbolSystem.md` — Arbol cloud execution: actions, pipelines, flows
- `LIFEOS/USER/CUSTOMIZATIONS/ARBOL/` — Cloudflare Workers implementation (per-user customization area)
- `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md` — Master LifeOS architecture reference
