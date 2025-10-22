---
description: Comprehensive multi-source research - Kai loads and invokes researcher commands
globs: ""
alwaysApply: false
---

# 🔬 COMPREHENSIVE RESEARCH WORKFLOW FOR KAI

**YOU (Kai) are reading this because a research request was detected by the load-context hook.**

This command provides instructions for YOU to orchestrate comprehensive multi-source research by directly invoking researcher commands (NOT spawning new Claude Code sessions).

## 🎯 YOUR MISSION

When a user asks for research, YOU must deliver **FAST RESULTS** through massive parallelization:

1. **Launch up to 10 research agents in parallel** - Spawn multiple instances of each researcher (perplexity-researcher, claude-researcher, gemini-researcher) with different query angles
2. **Each agent does ONE query + ONE follow-up** - Quick, focused research cycles
3. **Collect** results as they complete (typically within 15-30 seconds)
4. **Synthesize** findings into a comprehensive report
5. **Report** back using the mandatory response format

**Speed Strategy:**
- Launch 10 agents simultaneously to cover the entire search space
- Each agent handles a specific angle/sub-question
- Parallel execution = results in under 1 minute
- Follow-up queries only when critical information is missing

## 📋 STEP-BY-STEP WORKFLOW

### Step 1: Decompose Question & Launch Agent Army (10 parallel agents)

**SPEED IS THE PRIORITY - Launch up to 10 research agents simultaneously**

**Step 1a: Break Down the Research Question**

First, decompose the user's question into 3-10 specific sub-questions that cover:
- Different angles of the topic
- Specific aspects to investigate
- Related areas that provide context
- Potential edge cases or controversies

**Step 1b: Launch Research Agents in Parallel (up to 10 agents)**

Use the **Task tool** to spawn multiple specialized research agents simultaneously:

```typescript
// Launch 3-10 agents in PARALLEL - each with ONE specific sub-question
// Use a SINGLE message with multiple Task tool calls

Task({
  subagent_type: "perplexity-researcher",
  description: "Research sub-question 1",
  prompt: "Research this specific angle: [sub-question 1]. Do ONE focused search query and ONE follow-up if needed. Return findings quickly."
})

Task({
  subagent_type: "claude-researcher",
  description: "Research sub-question 2",
  prompt: "Research this specific angle: [sub-question 2]. Do ONE focused search query and ONE follow-up if needed. Return findings quickly."
})

Task({
  subagent_type: "gemini-researcher",
  description: "Research sub-question 3",
  prompt: "Research this specific angle: [sub-question 3]. Do ONE focused search query and ONE follow-up if needed. Return findings quickly."
})

// Continue launching up to 10 agents total
// Mix perplexity-researcher, claude-researcher, gemini-researcher
// Each gets ONE focused sub-question
```

**Available Research Agents:**
- **perplexity-researcher**: Fast Perplexity API searches
- **claude-researcher**: Claude WebSearch with intelligent query decomposition
- **gemini-researcher**: Google Gemini multi-perspective research

**CRITICAL RULES FOR SPEED:**
1. ✅ **Launch ALL agents in ONE message** (parallel execution)
2. ✅ **Each agent gets ONE specific sub-question** (focused research)
3. ✅ **Maximum 10 agents** (covers entire search space)
4. ✅ **Each agent does 1 query + 1 follow-up max** (quick cycles)
5. ✅ **Results return in 15-30 seconds** (parallel processing)
6. ❌ **DON'T launch sequentially** (kills speed benefit)
7. ❌ **DON'T give broad questions** (forces multiple iterations)

### Step 2: Collect Results (15-30 seconds)

**Wait for agents to complete** - they typically return results within 15-30 seconds due to parallel execution.

Each agent returns:
- Focused findings from their specific sub-question
- Source citations
- Confidence indicators
- Quick insights

### Step 3: Synthesize Results

Create a comprehensive report that:

**A. Identifies Confidence Levels:**
- **HIGH CONFIDENCE**: Findings corroborated by multiple sources
- **MEDIUM CONFIDENCE**: Found by one source, seems reliable
- **LOW CONFIDENCE**: Single source, needs verification

**B. Structures Information:**
```markdown
## Key Findings

### [Topic Area 1]
**High Confidence:**
- Finding X (Sources: perplexity-research, claude-research)
- Finding Y (Sources: perplexity-research, claude-research)

**Medium Confidence:**
- Finding Z (Source: claude-research)

### [Topic Area 2]
...

## Source Attribution
- **Perplexity-Research**: [summary of unique contributions]
- **Claude-Research**: [summary of unique contributions]

## Conflicting Information
- [Note any disagreements between sources]
```

**C. Calculate Research Metrics:**
- **Total Queries**: Count all queries across all research commands
- **Services Used**: List unique services (Perplexity API, Claude WebSearch, etc.)
- **Total Output**: Estimated character/word count of all research
- **Confidence Level**: Overall confidence percentage
- **Result**: 1-2 sentence answer to the research question

### Step 4: Return Results Using MANDATORY Format

📅 [current date from `date` command]
**📋 SUMMARY:** Research coordination and key findings overview
**🔍 ANALYSIS:** Synthesis of multi-source research results
**⚡ ACTIONS:** Which research commands executed, research strategies used
**✅ RESULTS:** Complete synthesized findings with source attribution
**📊 STATUS:** Research coverage, confidence levels, data quality
**➡️ NEXT:** Recommended follow-up research or verification needed
**🎯 COMPLETED:** Completed multi-source [topic] research
**🗣️ CUSTOM COMPLETED:** [Optional: Voice-optimized under 8 words]

**📈 RESEARCH METRICS:**
- **Total Queries:** [X] (Primary: [Y], Secondary: [Z])
- **Services Used:** [N] (List: [service1, service2])
- **Total Output:** [~X words/characters]
- **Confidence Level:** [High/Medium/Low] ([percentage]%)
- **Result:** [Brief summary answer]

## 🚨 CRITICAL RULES FOR KAI

1. **LAUNCH UP TO 10 AGENTS IN PARALLEL** - Use a SINGLE message with multiple Task tool calls
2. **DECOMPOSE the question first** - Create 3-10 focused sub-questions
3. **ONE QUERY + ONE FOLLOW-UP per agent** - Quick, focused research cycles
4. **MIX agent types** - Use perplexity-researcher, claude-researcher, gemini-researcher
5. **WAIT for ALL agents to complete** (15-30 seconds) before synthesizing
6. **SYNTHESIZE results** - Don't just concatenate outputs
7. **USE the mandatory response format** - This triggers voice notifications
8. **CALCULATE accurate metrics** - Count queries, agents, output size
9. **ATTRIBUTE sources** - Show which agent/method found each insight
10. **MARK confidence levels** - Based on multi-source agreement

**SPEED CHECKLIST:**
- ✅ Launched agents in ONE message? (parallel execution)
- ✅ Each agent has ONE focused sub-question?
- ✅ Using up to 10 agents for broad coverage?
- ✅ Agents instructed to do 1 query + 1 follow-up max?
- ✅ Expected results in under 1 minute?

## 🚧 HANDLING BLOCKED OR FAILED CRAWLS

If research commands report being blocked, encountering CAPTCHAs, or facing bot detection, note this in your synthesis and recommend using:
- `mcp__Brightdata__scrape_as_markdown` - Scrape single URLs that bypass bot detection
- `mcp__Brightdata__scrape_batch` - Scrape multiple URLs (up to 10)
- `mcp__Brightdata__search_engine` - Search Google, Bing, or Yandex with CAPTCHA bypass
- `mcp__Brightdata__search_engine_batch` - Multiple search queries simultaneously

## 💡 EXAMPLE EXECUTION

**User asks:** "Research the latest developments in quantum computing"

**Your workflow:**
1. ✅ Recognize research intent (hook loaded this command)
2. ✅ **Decompose into focused sub-questions:**
   - What are the major quantum computing breakthroughs in 2025?
   - Which companies are leading quantum computing development?
   - What are the current limitations and challenges?
   - What practical applications are emerging?
   - What's the state of quantum error correction?
   - How close are we to quantum advantage?
   - What are the latest quantum algorithms?
   - What's happening in quantum cryptography?

3. ✅ **Launch 8 agents in PARALLEL (ONE message with 8 Task calls):**
   ```
   Task(perplexity-researcher, "2025 quantum breakthroughs")
   Task(claude-researcher, "Leading quantum companies")
   Task(gemini-researcher, "Quantum limitations 2025")
   Task(perplexity-researcher, "Practical quantum applications")
   Task(claude-researcher, "Quantum error correction state")
   Task(gemini-researcher, "Quantum advantage timeline")
   Task(perplexity-researcher, "Latest quantum algorithms")
   Task(claude-researcher, "Quantum cryptography developments")
   ```

4. ✅ **Wait for ALL agents to complete** (15-30 seconds)
5. ✅ **Synthesize their findings:**
   - Common themes → High confidence
   - Unique insights → Medium confidence
   - Disagreements → Note and flag
6. ✅ **Calculate metrics** (8 agents, ~16 queries, 3 services, output size, confidence %)
7. ✅ **Return comprehensive report** with mandatory format
8. ✅ **Voice notification** automatically triggered by your 🎯 COMPLETED line

**Result:** User gets comprehensive quantum computing research from 8 parallel agents in under 1 minute, with multi-source validation, source attribution, and confidence levels.

## 🎤 VOICE NOTIFICATIONS

Voice notifications are AUTOMATIC when you use the mandatory response format. The stop-hook will:
- Extract your 🎯 COMPLETED line
- Send it to the voice server with Jamie (Premium) voice at 228 wpm
- Announce "Completed multi-source [topic] research"

**YOU DO NOT NEED TO MANUALLY SEND VOICE NOTIFICATIONS** - just use the format.

## 🔄 BENEFITS OF THIS ARCHITECTURE

**Why parallel agent execution delivers speed:**
1. ✅ **10 agents working simultaneously** - Not sequential, truly parallel
2. ✅ **Results in under 1 minute** - Each agent does 1-2 quick searches
3. ✅ **Complete coverage** - Multiple perspectives from different services
4. ✅ **Focused research** - Each agent has ONE specific sub-question
5. ✅ **No iteration delays** - All agents launch at once in ONE message
6. ✅ **Multi-source validation** - High confidence from cross-agent agreement

**Speed Comparison:**
- ❌ **Old way:** Sequential searches → 5-10 minutes
- ✅ **New way:** 10 parallel agents → Under 1 minute

**This is the correct architecture. Use it for FAST research.**
