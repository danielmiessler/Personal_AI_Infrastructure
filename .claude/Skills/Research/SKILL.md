---
name: Research
description: Comprehensive research, analysis, and content extraction system. Multi-source parallel research using available researcher agents. Deep content analysis with extended thinking. Intelligent retrieval for difficult sites. Fabric pattern selection for 242+ specialized prompts. USE WHEN user says 'do research', 'extract wisdom', 'analyze content', 'find information about', or requests web/content research.
---

# Research Skill

## API Keys Required

**This skill works best with these optional API keys configured in `~/.env`:**

| Feature | API Key | Get It From |
|---------|---------|-------------|
| Perplexity Research | `PERPLEXITY_API_KEY` | https://perplexity.ai/settings/api |
| Gemini Research | `GOOGLE_API_KEY` | https://aistudio.google.com/app/apikey |
| BrightData Scraping | `BRIGHTDATA_API_KEY` | https://brightdata.com |

**Works without API keys:**
- Claude-based research (uses built-in WebSearch)
- Basic web fetching (uses built-in WebFetch)
- Fabric patterns (if Fabric CLI installed)

---

## Workflow Routing

### Multi-Source Research Workflows

**When user requests comprehensive parallel research:**
Examples: "do research on X", "research this topic", "find information about Y", "investigate this subject"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/Conduct.md`
→ **EXECUTE:** Parallel multi-agent research using available researcher agents

**When user requests Claude-based research (FREE - no API keys):**
Examples: "use claude for research", "claude research on X", "use websearch to research Y"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/ClaudeResearch.md`
→ **EXECUTE:** Intelligent query decomposition with Claude's WebSearch

**When user requests Perplexity research (requires PERPLEXITY_API_KEY):**
Examples: "use perplexity to research X", "perplexity research on Y"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/PerplexityResearch.md`
→ **EXECUTE:** Fast web search with query decomposition via Perplexity API

**When user requests interview preparation:**
Examples: "prepare interview questions for X", "interview research on Y"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/InterviewResearch.md`
→ **EXECUTE:** Interview prep with diverse question generation

### Content Retrieval Workflows

**When user indicates difficulty accessing content:**
Examples: "can't get this content", "site is blocking me", "CAPTCHA blocking"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/Retrieve.md`
→ **EXECUTE:** Escalation through layers (WebFetch → BrightData → Apify)

**When user provides YouTube URL:**
Examples: "get this youtube video", "extract from youtube URL"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/YoutubeExtraction.md`
→ **EXECUTE:** YouTube content extraction using fabric -y

**When user requests web scraping:**
Examples: "scrape this site", "extract data from this website"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/WebScraping.md`
→ **EXECUTE:** Web scraping techniques and tools

### Fabric Pattern Processing

**When user requests Fabric pattern usage:**
Examples: "use fabric to X", "create threat model", "summarize with fabric"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/Fabric.md`
→ **EXECUTE:** Auto-select best pattern from 242+ Fabric patterns

### Content Enhancement Workflows

**When user requests content enhancement:**
Examples: "enhance this content", "improve this draft"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/Enhance.md`
→ **EXECUTE:** Content improvement and refinement

**When user requests knowledge extraction:**
Examples: "extract knowledge from X", "get insights from this"
→ **READ:** `${PAI_DIR}/Skills/Research/Workflows/ExtractKnowledge.md`
→ **EXECUTE:** Knowledge extraction and synthesis

---

## Multi-Source Research

### Three Research Modes

**QUICK RESEARCH MODE:**
- User says "quick research" → Launch 1 agent per researcher type
- **Timeout: 2 minutes**
- Best for: Simple queries, straightforward questions

**STANDARD RESEARCH MODE (Default):**
- Default for most research requests → Launch 3 agents per researcher type
- **Timeout: 3 minutes**
- Best for: Most research needs, comprehensive coverage

**EXTENSIVE RESEARCH MODE:**
- User says "extensive research" → Launch 8 agents per researcher type
- **Timeout: 10 minutes**
- Best for: Deep-dive research, comprehensive reports

### Available Research Agents

Check `${PAI_DIR}/Agents/` for agents with "researcher" in their name:
- `claude-researcher` - Uses Claude's WebSearch (FREE, no API key needed)
- `perplexity-researcher` - Uses Perplexity API (requires PERPLEXITY_API_KEY)
- `gemini-researcher` - Uses Gemini API (requires GOOGLE_API_KEY)

### Speed Benefits

- ❌ **Old approach**: Sequential searches → 5-10 minutes
- ✅ **Quick mode**: 1 agent per type → **2 minute timeout**
- ✅ **Standard mode**: 3 agents per type → **3 minute timeout**
- ✅ **Extensive mode**: 8 agents per type → **10 minute timeout**

---

## Intelligent Content Retrieval

### Three-Layer Escalation System

**Layer 1: Built-in Tools (Try First - FREE)**
- WebFetch - Standard web content fetching
- WebSearch - Search engine queries
- When to use: Default for all content retrieval

**Layer 2: BrightData MCP (requires BRIGHTDATA_API_KEY)**
- CAPTCHA solving via Scraping Browser
- Advanced JavaScript rendering
- When to use: Bot detection blocking, CAPTCHA protection

**Layer 3: Apify MCP (requires Apify account)**
- Specialized site scrapers (Instagram, LinkedIn, etc.)
- Complex extraction logic
- When to use: Layers 1 and 2 both failed

**Critical Rules:**
- Always try simplest approach first (Layer 1)
- Escalate only when previous layer fails
- Document which layers were used and why

---

## Fabric Pattern Selection

### Categories (242+ Patterns)

**Threat Modeling & Security:**
- `create_threat_model`, `create_stride_threat_model`
- `analyze_threat_report`, `analyze_incident`

**Summarization:**
- `summarize`, `create_5_sentence_summary`
- `summarize_meeting`, `summarize_paper`, `youtube_summary`

**Wisdom Extraction:**
- `extract_wisdom`, `extract_article_wisdom`
- `extract_insights`, `extract_main_idea`

**Analysis:**
- `analyze_claims`, `analyze_code`, `analyze_debate`
- `analyze_logs`, `analyze_paper`

**Content Creation:**
- `create_prd`, `create_design_document`
- `create_mermaid_visualization`, `create_user_story`

**Improvement:**
- `improve_writing`, `improve_prompt`, `review_code`

### Usage

```bash
# Auto-select pattern based on intent
fabric [input] -p [selected_pattern]

# From URL
fabric -u "URL" -p [pattern]

# From YouTube
fabric -y "YOUTUBE_URL" -p [pattern]
```

---

## File Organization

### Working Directory (Scratchpad)
```
${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_research-[topic]/
├── raw-outputs/
├── synthesis-notes.md
└── draft-report.md
```

### Permanent Storage (History)
```
${PAI_DIR}/History/research/YYYY-MM/YYYY-MM-DD_[topic]/
├── README.md
├── research-report.md
└── metadata.json
```

---

## Key Principles

1. **Parallel execution** - Launch multiple agents simultaneously
2. **Hard timeouts** - Don't wait indefinitely, proceed with partial results
3. **Simplest first** - Always try free tools before paid services
4. **Auto-routing** - Skill analyzes intent and activates appropriate workflow

---

## Workflow Files

| Workflow | File | API Keys Needed |
|----------|------|-----------------|
| Multi-Source Research | `workflows/Conduct.md` | Varies by agent |
| Claude Research | `workflows/ClaudeResearch.md` | None (FREE) |
| Perplexity Research | `workflows/PerplexityResearch.md` | PERPLEXITY_API_KEY |
| Interview Prep | `workflows/InterviewResearch.md` | None |
| Content Retrieval | `workflows/Retrieve.md` | Optional: BRIGHTDATA_API_KEY |
| YouTube Extraction | `workflows/YoutubeExtraction.md` | None (uses Fabric) |
| Web Scraping | `workflows/WebScraping.md` | Optional: BRIGHTDATA_API_KEY |
| Fabric Patterns | `workflows/Fabric.md` | None |
| Content Enhancement | `workflows/Enhance.md` | None |
| Knowledge Extraction | `workflows/ExtractKnowledge.md` | None |
