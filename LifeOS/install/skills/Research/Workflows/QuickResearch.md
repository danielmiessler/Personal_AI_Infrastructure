# Quick Research Workflow

**Mode:** Single Perplexity researcher, 1 query | **Timeout:** 30 seconds

## When to Use

- User says "quick research" or "minor research"
- Simple, straightforward queries
- Time-sensitive requests
- Just need a fast answer

## Workflow

### Step 0: Source Routing Check (MANDATORY)

**READ:** `../SourceRoutingProtocol.md` if not already loaded.

Scan the user's request for sentiment signals: "fans thought", "ratings of", "best | worst | favorite", "reactions to", "what people are saying", "consensus on", event + recent date.

- **Signal fires → sentiment-mode.** Skip Step 1 (Perplexity). Instead, single-call to Reddit JSON API at the most relevant subreddit + sort: `curl -A "LifeOS-Research/1.0" -s "https://www.reddit.com/r/{sub}/top.json?t=week&limit=25"` (or site-wide search if sub is unknown). Parse top 10 posts, pull comments on the highest-signal thread, return verbatim fan quotes with thread URLs and scores. Use Apify Reddit actor as fallback only if JSON fails.
- **No signal → Step 1 (Perplexity).** Standard quick lookup.

### Step 1: Launch Single Perplexity Agent

**ONE Task call - Perplexity researcher with a single focused query:**

```typescript
Agent({
  subagent_type: "PerplexityResearcher",
  description: "[topic] quick lookup",
  prompt: "Do ONE web search for: [query]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return the key findings immediately. Keep it brief and factual."
})
```

**Prompt requirements:**
- Single, well-crafted query
- Instruct to return immediately after first search
- No multi-query exploration

**Why Perplexity:** Fastest live-web retrieval with built-in citations; best single-agent default for "just tell me what's current."

### Step 2: Return Results

Report findings using standard format:

```markdown
📋 SUMMARY: Quick research on [topic]
🔍 ANALYSIS: [Key findings from Perplexity]
⚡ ACTIONS: 1 Perplexity query
✅ RESULTS: [Answer]
📊 STATUS: Quick mode - 1 agent, 1 query
📁 CAPTURE: [Key facts]
➡️ NEXT: [Suggest standard research if more depth needed]
📖 STORY EXPLANATION: [3-5 numbered points - keep brief]
🎯 COMPLETED: Quick answer on [topic]
```

## Speed Target

~10-15 seconds for results
