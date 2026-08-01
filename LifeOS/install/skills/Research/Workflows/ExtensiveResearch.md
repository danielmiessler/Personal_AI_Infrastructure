# Extensive Research Workflow

**Mode:** 7 explorers + 2 verifiers (9 total agents) | **Timeout:** 120 seconds

## Architecture: Explorer-Verifier Pattern

Inspired by Nomad (arXiv:2603.29353). Instead of 9 undifferentiated explorers, we use **7 explorers** for breadth and **2 verifiers** for trustworthiness — same total agent count, dramatically better output quality.

```
All 9 agents launch simultaneously in one message.
Verifier prompts are topic-level (not claim-level) so they work without explorer results.
Synthesis cross-references explorer findings against verifier findings with confidence tags.
```

## CRITICAL: URL Verification

Agents now self-verify URLs before returning (see agent Self-Verification sections). The post-hoc URL verification step is replaced by parallel batch verification during synthesis.

## When to Use

- User says "extensive research" or "do extensive research"
- Deep-dive analysis needed
- Comprehensive multi-domain coverage required

## Workflow

### Step 0a: Source Routing Check (MANDATORY)

**READ:** `../SourceRoutingProtocol.md` if not already loaded.

Scan the user's request for sentiment signals: "fans thought", "ratings of", "best | worst | favorite", "reactions to", "consensus on", event + recent date.

- **Signal fires → sentiment-mode routing.** Walk the API-first cascade in `../SourceRoutingProtocol.md`. Reallocate ≥2 of the 9 agent slots in Step 1 to community-API agents:
  - **Slot A (Reddit, mandatory, Tier-1 API):** general-purpose subagent calls Reddit JSON API directly via Bash + `curl -A "LifeOS-Research/1.0"` against 2-4 relevant subreddits. Tier-2 (Apify reddit-scraper) only if JSON rate-limits or 403s. Brief: enumerate subs likely to host the conversation, pull `top.json?t=week`, identify megathreads + dedicated single-subject threads, extract verbatim fan quotes with thread URLs and upvote scores. Persist raw JSON to `MEMORY/RESEARCH/{date}_{slug}/` for reuse.
  - **Slot B (X / Twitter, Tier-1 API):** call X API v2 recent-search directly via `curl -H "Authorization: Bearer $X_BEARER_TOKEN" "https://api.twitter.com/2/tweets/search/recent?query=<event>&max_results=50"` — credentials already in env (`TWITTER_API_KEY`, `X_BEARER_TOKEN`). LifeOS users with a private X-wrapper skill can invoke that wrapper instead. Tier-2 (Apify tweet-scraper) only if the API returns no usable results. Captures first-6-hour reaction cluster.
  - **Slot C (YouTube, optional, Tier-1 conditional):** if `YOUTUBE_API_KEY` set, use Data API v3 `search.list` + `commentThreads.list` for top reactor videos. Otherwise Tier-2: general-purpose subagent runs `fabric -y` on top 3 reactor videos AND pulls comments via Apify `streamers/youtube-scraper` if budget allows.
  - The remaining 5-6 slots stay as explorer/verifier web-search agents per Step 1 — these now do *context scaffolding* (lineup, dates, schedule), not sentiment.
- **No signal → Step 0b + Step 1 unchanged.** Nine web-search agents as documented below.

### Step 0b: Generate Creative Research Angles (deep thinking)

Think deeply about the research topic:
- Explore multiple unusual perspectives and domains
- Question assumptions about what's relevant
- Make unexpected connections across fields
- Consider edge cases, controversies, emerging trends

Generate **7 unique explorer angles** + **2 verification angles** (9 total).
- Explorer angles: diverse research directions
- Verification angles: "verify the most important claims about [topic]" and "find contradictory evidence about [topic]"

### Step 1: Launch All 9 Agents in Parallel

**Sentiment-mode variant (Step 0a signal fired):** Replace 2-3 of the explorer slots below with Slot A (Reddit JSON), Slot B (YouTube), and optionally Slot C (X) per Step 0a. Keep both verifiers — they still catch hallucinated URLs across the scraper agents.

**SINGLE message launching all 9 agents:**

```typescript
// === EXPLORERS (7 agents) ===

// Claude - 2 threads (academic depth, strategic analysis)
Agent({ subagent_type: "ClaudeResearcher", description: "[topic] angle 1", prompt: "Search for: [angle 1]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })
Agent({ subagent_type: "ClaudeResearcher", description: "[topic] angle 2", prompt: "Search for: [angle 2]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })

// Gemini - 3 threads (multi-perspective, cross-domain)
Agent({ subagent_type: "GeminiResearcher", description: "[topic] angle 3", prompt: "Search for: [angle 3]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })
Agent({ subagent_type: "GeminiResearcher", description: "[topic] angle 4", prompt: "Search for: [angle 4]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })
Agent({ subagent_type: "GeminiResearcher", description: "[topic] angle 5", prompt: "Search for: [angle 5]. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })

// Contrarian - 2 threads (counter-consensus, fact-based)
Agent({ subagent_type: "ClaudeResearcher", description: "[topic] angle 6", prompt: "Search for: [angle 6 — contrarian/counter-consensus framing]. Prefer durable facts over trending narrative. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })
Agent({ subagent_type: "GeminiResearcher", description: "[topic] angle 7", prompt: "Search for: [angle 7 — contrarian/counter-consensus framing]. Prefer durable facts over trending narrative. Tag each finding with confidence: [HIGH], [MED], or [LOW]. Return findings." })

// === VERIFIERS (2 agents) ===
// These independently check the most important claims about the topic.
// They have NO access to explorer reasoning — only the topic and their own research.

Agent({ subagent_type: "PerplexityResearcher", description: "verify [topic] claims", prompt: "Independently verify the most commonly cited facts, statistics, and claims about [topic]. For each claim you find, check if it's supported by primary sources. Tag each as [HIGH] (confirmed), [MED] (plausible), or [LOW] (unconfirmed). Focus on quantitative claims and dates — these are most likely to be wrong." })
Agent({ subagent_type: "ClaudeResearcher", description: "find contradictions about [topic]", prompt: "Search for contradictory evidence, debunked claims, and common misconceptions about [topic]. What do people get wrong? What's the contrarian view with evidence? Tag each finding with confidence: [HIGH], [MED], or [LOW]." })
```

**Each agent:**
- Gets ONE focused angle
- Self-verifies URLs before returning (per agent Self-Verification protocol)
- Tags findings with confidence levels
- Returns as soon as it has findings

### Step 2: Collect Results (120 SECOND TIMEOUT)

- All 9 agents run in parallel
- Most return within 30-60 seconds
- **HARD TIMEOUT: 120 seconds** — proceed with whatever has returned
- Note non-responsive agents

### Step 3: Verified Synthesis

**This is where the explorer-verifier pattern pays off.** Cross-reference explorer findings against verifier results:

1. **Match claims:** For each explorer finding, check if verifiers confirmed, contradicted, or didn't cover it
2. **Upgrade/downgrade confidence:** Explorer claim `[MED]` + verifier confirmed → `[HIGH]`. Explorer claim `[HIGH]` + verifier contradicted → `[CONFLICT]`
3. **Detect conflicts:** When explorers disagree with each other OR with verifiers, flag both sides
4. **Parallel URL batch check:** For any remaining unverified URLs, run batch curl:
   ```bash
   # Parallel URL verification (all at once, not sequential)
   for url in "${urls[@]}"; do curl -s -o /dev/null -w "%{http_code} $url\n" -L "$url" & done; wait
   ```

**Synthesis structure:**
```markdown
## Executive Summary
[2-3 sentence overview]

## Verified Findings
### [Theme 1]
- [HIGH] Finding (confirmed by: explorer + verifier)
- [MED] Finding (single source, not independently verified)

### [Theme 2]
- [HIGH] Finding (multiple explorers agree)
- [CONFLICT] Finding A vs Finding B (see Conflicts section)

## Unique Insights by Source
- **Claude**: [analytical depth + contrarian perspectives]
- **Gemini**: [cross-domain connections]
- **Verifiers**: [what was confirmed/refuted]

## Conflicts & Low-Confidence Items
⚠️ CONFLICT on [topic]:
  Explorer (ClaudeResearcher): [claim] — [source]
  Verifier (PerplexityResearcher): [contradicting claim] — [source]
  Status: Unresolved

📉 LOW CONFIDENCE:
- [claim] — could not independently verify
```

### Step 4: Return Results

```markdown
📋 SUMMARY: Extensive research on [topic]
🔍 ANALYSIS: [Comprehensive verified findings by theme]
⚡ ACTIONS: 7 explorers + 2 verifiers = 9 parallel agents
✅ RESULTS: [Full synthesized report with confidence tags]
📊 STATUS: Extensive mode - explorer-verifier pattern
📁 CAPTURE: [Key verified discoveries]
➡️ NEXT: [Follow-up recommendations, especially for CONFLICT items]
📖 STORY EXPLANATION: [8 numbered points]
🎯 COMPLETED: Extensive research on [topic] complete

📈 RESEARCH METRICS:
- Total Agents: 9 (7 explorers + 2 verifiers)
- Explorer Types: Claude(3), Gemini(4)
- Verifier Types: Perplexity(1), Claude(1)
- Findings: N HIGH | N MED | N LOW | N CONFLICT
- URLs verified: N/N
```

## Speed Target

~60-90 seconds for results (parallel execution, same as before)
Verification adds 0 seconds — verifiers run in parallel with explorers.

## Graceful Degradation

- If verifier agents time out → all findings stay at explorer-assigned confidence (no downgrade)
- If only 1 explorer returns → skip cross-check, use self-verification only
- If URL batch check fails → fall back to sequential curl
