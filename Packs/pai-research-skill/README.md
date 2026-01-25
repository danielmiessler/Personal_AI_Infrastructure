---
name: PAI Research Skill
pack-id: danielmiessler-pai-research-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Comprehensive research, analysis, and content extraction system with multi-agent research modes, deep content analysis, intelligent retrieval, and 242+ Fabric patterns.
type: skill
purpose-type: [research, analysis, extraction, web-scraping, content-processing]
platform: claude-code
dependencies: [pai-core-install]
keywords: [research, analysis, extraction, fabric, perplexity, web-scraping, content, youtube, alpha, wisdom, multi-agent]
---

<p align="center">
  <img src="../icons/pai-research-skill.png" alt="PAI Research Skill" width="256">
</p>

# PAI Research Skill

> Comprehensive research, analysis, and content extraction system with three research modes, deep content analysis, intelligent retrieval, and 242+ Fabric patterns.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What This Pack Provides

- **Three Research Modes** - Quick (1 agent), Standard (3 agents), Extensive (12 agents)
- **Deep Content Analysis** - Extract Alpha workflow for high-value insight extraction
- **Intelligent Retrieval** - Three-layer scraping with anti-bot handling
- **Fabric Integration** - 242+ specialized patterns for content processing
- **URL Verification** - Mandatory protocol to prevent hallucinated links
- **Multi-Source Support** - YouTube, web articles, PDFs, and more

## Key Differentiator

**Research vs OSINT:**
- **Research** is for information gathering, analysis, and synthesis
- **OSINT** is for due diligence, background checks, and people finding
- Research produces synthesized insights from multiple sources
- OSINT produces comprehensive profiles and verification

## Architecture

```
Research Skill
├── SKILL.md                     # Main entry point and routing
├── QuickReference.md            # Mode comparison and examples
├── UrlVerificationProtocol.md   # Mandatory URL verification
└── Workflows/
    ├── QuickResearch.md         # 1 agent, fast lookup
    ├── StandardResearch.md      # 3 agents (default)
    ├── ExtensiveResearch.md     # 12 agents, comprehensive
    ├── ExtractAlpha.md          # Deep insight extraction
    ├── Retrieve.md              # Multi-layer content retrieval
    ├── Fabric.md                # 242+ pattern selection
    ├── ClaudeResearch.md        # Claude WebSearch only
    ├── YoutubeExtraction.md     # YouTube content via fabric -y
    ├── WebScraping.md           # Web scraping workflows
    ├── InterviewResearch.md     # Tyler Cowen-style prep
    ├── AnalyzeAiTrends.md       # AI industry trend analysis
    ├── Enhance.md               # Content enhancement
    └── ExtractKnowledge.md      # Multi-source knowledge extraction
```

## Research Modes

| Mode | Trigger | Agents | Speed |
|------|---------|--------|-------|
| **Quick** | "quick research" | 1 Claude | ~10-15s |
| **Standard** | "do research" (default) | 3 (Claude + Gemini) | ~15-30s |
| **Extensive** | "extensive research" | 9 (3 types x 3 each) | ~60-90s |

## Workflows

| Workflow | Purpose | Use Case |
|----------|---------|----------|
| **QuickResearch** | Fast single-query lookup | Simple questions, time-sensitive |
| **StandardResearch** | Multi-perspective research | Default for most research requests |
| **ExtensiveResearch** | Comprehensive deep-dive | Major decisions, comprehensive coverage |
| **ExtractAlpha** | High-alpha insight extraction | Content analysis, finding novel insights |
| **Retrieve** | Difficult content retrieval | CAPTCHA bypass, bot detection |
| **Fabric** | Pattern-based processing | 242+ specialized transformations |
| **ClaudeResearch** | Free Claude WebSearch | No API keys needed |
| **YoutubeExtraction** | YouTube content extraction | Video transcripts, summaries |
| **InterviewResearch** | Interview preparation | Tyler Cowen-style questions |

## Extract Alpha Philosophy

Based on Claude Shannon's information theory: **real information is what's different, not what's the same.**

**HIGH-ALPHA:** Surprising, counterintuitive, connects domains unexpectedly
**LOW-ALPHA:** Common knowledge, obvious implications, generic advice

Output: 24-30 insights, Paul Graham style, 8-12 word bullets

## Three-Layer Retrieval

1. **Layer 1:** WebFetch/WebSearch (try first - fast, free)
2. **Layer 2:** BrightData MCP (CAPTCHA, bot detection)
3. **Layer 3:** Apify MCP (specialized scrapers, social media)

Only escalate when previous layer fails.

## URL Verification Protocol

**CRITICAL:** Every URL must be verified before delivery.

Research agents hallucinate URLs. A single broken link is a catastrophic failure.

```bash
# Step 1: Check HTTP status
curl -s -o /dev/null -w "%{http_code}" -L "URL"

# Step 2: Verify content matches citation
WebFetch(url, "Confirm article exists and summarize")

# Step 3: Only include if BOTH checks pass
```

## Usage Examples

```
"Quick research on Texas hot sauce brands"
-> QuickResearch -> 1 agent, fast answer

"Do research on AI agent frameworks"
-> StandardResearch -> 3 agents, synthesized findings

"Extensive research on quantum computing trends"
-> ExtensiveResearch -> 12 agents, comprehensive report

"Extract alpha from this video" [URL]
-> ExtractAlpha -> 24-30 high-alpha insights

"Can't get this content" [protected URL]
-> Retrieve -> Multi-layer scraping with anti-bot
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill | src/skills/Research/SKILL.md | Entry point and workflow routing |
| Quick Reference | src/skills/Research/QuickReference.md | Mode comparison guide |
| URL Protocol | src/skills/Research/UrlVerificationProtocol.md | Mandatory verification |
| Quick Research | src/skills/Research/Workflows/QuickResearch.md | Fast single-agent |
| Standard Research | src/skills/Research/Workflows/StandardResearch.md | Default 3-agent |
| Extensive Research | src/skills/Research/Workflows/ExtensiveResearch.md | 12-agent deep dive |
| Extract Alpha | src/skills/Research/Workflows/ExtractAlpha.md | Deep insight extraction |
| Retrieve | src/skills/Research/Workflows/Retrieve.md | Multi-layer scraping |
| Fabric | src/skills/Research/Workflows/Fabric.md | 242+ pattern selection |
| Claude Research | src/skills/Research/Workflows/ClaudeResearch.md | Free WebSearch |
| YouTube | src/skills/Research/Workflows/YoutubeExtraction.md | Video extraction |
| Web Scraping | src/skills/Research/Workflows/WebScraping.md | Scraping workflows |
| Interview | src/skills/Research/Workflows/InterviewResearch.md | Interview prep |
| AI Trends | src/skills/Research/Workflows/AnalyzeAiTrends.md | Trend analysis |
| Enhance | src/skills/Research/Workflows/Enhance.md | Content enhancement |
| Extract Knowledge | src/skills/Research/Workflows/ExtractKnowledge.md | Knowledge extraction |

## Integration

**Works well with:**
- **OSINT** - For company/people background checks (different skill)
- **Blogging** - Research for blog posts
- **Newsletter** - Research for newsletters
- **BeCreative** - Deep thinking for Extract Alpha

**Uses:**
- **BrightData MCP** - CAPTCHA solving, advanced scraping
- **Apify MCP** - RAG browser, specialized site scrapers

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system
- **License:** MIT

## Changelog

### 2.3.0 - 2026-01-14
- Initial public release
- Three research modes (Quick, Standard, Extensive)
- Extract Alpha deep insight extraction
- Three-layer intelligent retrieval
- 13 complete workflows
- URL verification protocol
- Fabric integration (242+ patterns)
