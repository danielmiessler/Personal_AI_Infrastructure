# Retrieve Workflow

Intelligent multi-layer content retrieval system for DIFFICULT content retrieval. Uses built-in tools (WebFetch, WebSearch), BrightData MCP (CAPTCHA handling, advanced scraping), and Apify MCP (RAG browser, Actor ecosystem).

**USE ONLY WHEN** user indicates difficulty: 'can't get this', 'having trouble', 'site is blocking', 'protected site', 'keeps giving CAPTCHA', 'won't let me scrape'.

**DO NOT** use for simple 'read this page' or 'get content from' without indication of difficulty.

## When to Use This Skill

**DO USE this skill when user indicates difficulty:**
- "I can't get this content"
- "Having trouble retrieving this"
- "Site is blocking me"
- "Protected site" / "CloudFlare protected"
- "Keeps giving me CAPTCHA"
- "Won't let me scrape this"
- "Bot detection blocking me"
- "Rate limited when trying to get this"

**DO NOT use this skill for simple requests:**
- "Read this page" -> Use WebFetch directly
- "Get content from [URL]" -> Use WebFetch directly
- "Fetch this article" -> Use WebFetch directly

## Intelligent Retrieval Strategy

The Retrieve skill uses a **3-layer fallback strategy**:

```
Layer 1: Built-in Tools (Fast, Simple)
  | (If blocked, rate-limited, or fails)
Layer 2: BrightData MCP (CAPTCHA handling, advanced scraping)
  | (If specialized scraping needed)
Layer 3: Apify MCP (RAG browser, Actor ecosystem)
```

### Decision Tree

**Start with Layer 1 (Built-in) if:**
- Simple public webpage
- No known bot detection
- Standard HTML content

**Use Layer 2 (BrightData) if:**
- Layer 1 blocked or failed
- Known bot detection (CloudFlare, etc.)
- CAPTCHA protection
- Rate limiting encountered

**Use Layer 3 (Apify) if:**
- Need specialized extraction (social media, e-commerce)
- Complex JavaScript rendering required
- Layer 1 and 2 both failed

## Layer 1: Built-in Tools

### WebFetch Tool

**Best for:** Simple HTML pages, public content, one-off fetches

```typescript
WebFetch({
  url: "https://example.com/page",
  prompt: "Extract the main article content and author name"
})
```

## Layer 2: BrightData MCP

### scrape_as_markdown Tool

**Best for:** Sites with bot protection, CAPTCHA, JavaScript rendering

```typescript
mcp__Brightdata__scrape_as_markdown({
  url: "https://protected-site.com/article"
})
```

**Key Features:**
- Bypasses CloudFlare, bot detection, CAPTCHAs
- Returns clean markdown
- Handles JavaScript-heavy sites

## Layer 3: Apify MCP

### RAG Web Browser Actor

**Best for:** Content optimized for RAG/LLM consumption

```typescript
mcp__Apify__apify-slash-rag-web-browser({
  query: "https://react.dev/blog/2024/12/05/react-19",
  maxResults: 1,
  outputFormats: ["markdown"]
})
```

## Layer Comparison Matrix

| Feature | Layer 1 (Built-in) | Layer 2 (BrightData) | Layer 3 (Apify) |
|---------|-------------------|----------------------|-----------------|
| **Speed** | Fast (< 5s) | Medium (10-30s) | Slower (30-60s) |
| **Bot Detection Bypass** | No | Yes | Yes |
| **CAPTCHA Handling** | No | Yes | Yes |
| **JavaScript Rendering** | Limited | Full | Full |
| **Cost** | Free | Paid | Paid |
| **Best For** | Simple pages | Protected sites | Specialized scraping |

## Error Handling & Escalation

**Layer 1 Errors -> Escalate to Layer 2:**
- HTTP 403 (Forbidden)
- HTTP 429 (Rate Limited)
- Empty content returned
- CAPTCHA challenge detected

**Layer 2 Errors -> Escalate to Layer 3:**
- Scraping failed after retries
- Site requires specialized logic
- Need social media specific extraction

**Layer 3 Errors -> Report to User:**
- All layers exhausted
- Site technically impossible to scrape
- Requires manual intervention or login

## Quick Reference

**Start with Layer 1 (Built-in):**
- Simple public webpages
- Quick one-off fetches

**Use Layer 2 (BrightData):**
- Bot detection blocking Layer 1
- CAPTCHA protection
- Rate limiting encountered

**Use Layer 3 (Apify):**
- Specialized site scraping (social media, e-commerce)
- Layer 1 and 2 both failed
- Need RAG-optimized markdown

**Remember:**
- Always try simplest approach first (Layer 1)
- Escalate only when previous layer fails
- Document which layers were used and why
