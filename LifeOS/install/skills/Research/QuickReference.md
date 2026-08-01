# Research Quick Reference

## Four Research Modes

| Trigger | Mode | Config | Speed |
|---------|------|--------|-------|
| "quick research", "minor research" | Quick | 1 Perplexity agent | ~10-15s |
| "do research", "research this" | Standard | 3 agents (Claude + Gemini + Perplexity) + cross-check | ~30-60s |
| "extensive research" | Extensive | 7 explorers + 2 verifiers (9 agents) | ~60-90s |
| "deep investigation", "investigate [topic]" | Deep | Progressive iteration + verification | ~3-60min |

## Verification Architecture

| Mode | Verification | Cost |
|------|-------------|------|
| Quick | Agent self-verification only | 0s added |
| Standard | Self-verification + cross-check synthesis | ~2-3s |
| Extensive | Self-verification + 2 dedicated verifier agents | 0s (parallel) |
| Deep | Self-verification + Step 4.5 spot-check (loop mode) | ~10-15s/iteration |

**Confidence tags:** `[HIGH]` `[MED]` `[LOW]` `[CONFLICT]`

See `Workflows/Verify.md` for full verification protocol.

## Extract Alpha Philosophy

Based on Shannon's information theory: **real information is what's different.**

**HIGH-ALPHA:** Surprising, counterintuitive, connects domains unexpectedly
**LOW-ALPHA:** Common knowledge, obvious implications, generic advice

Output: 24-30 insights, Paul Graham style, 8-12 word bullets

## Three-Layer Retrieval

1. **Layer 1:** WebFetch/WebSearch (try first)
2. **Layer 2:** BrightData MCP (CAPTCHA, bot detection)
3. **Layer 3:** Apify MCP (specialized scrapers)

Only escalate when previous layer fails.

## Examples

**Example 1: Quick research on a topic**
```
User: "quick research on Texas hot sauce brands"
-> Spawns 1 Perplexity agent with single query
-> Returns confidence-tagged findings
-> Completes in ~10-15 seconds
```

**Example 2: Standard research (default)**
```
User: "do research on AI agent frameworks"
-> Spawns 3 agents in parallel (Claude + Gemini + Perplexity)
-> Cross-checks findings, tags confidence, flags conflicts
-> Returns synthesized findings with [HIGH]/[MED]/[LOW] tags (~30-60s)
```

**Example 3: Extensive research**
```
User: "extensive research on the MCP ecosystem"
-> Spawns 7 explorers + 2 verifiers (9 agents, all parallel)
-> Verifiers independently check claims about the topic
-> Synthesis cross-references explorer vs verifier findings
-> Returns verified report with confidence tags (~60-90s)
```

**Example 4: Extract alpha from content**
```
User: "extract alpha from this YouTube video" [URL]
-> Extracts transcript via fabric -y
-> Runs deep thinking deep analysis
-> Returns 24-30 high-alpha insights in Paul Graham style bullets
```
