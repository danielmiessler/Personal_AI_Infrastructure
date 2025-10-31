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

**THREE RESEARCH MODES:**

1. **Quick Research: 3 agents (1 of each type)**
   - 1 perplexity-researcher + 1 claude-researcher + 1 gemini-researcher
   - Use when user says "quick research" or simple queries
   - Fastest mode: ~15-20 seconds

2. **Standard Research: 9 agents (3 of each type)**
   - 3 perplexity-researcher + 3 claude-researcher + 3 gemini-researcher
   - Default mode for most research requests
   - Balanced coverage: ~30 seconds

3. **Extensive Research: 24 agents (8 of each type)**
   - 8 perplexity-researcher + 8 claude-researcher + 8 gemini-researcher
   - Use when user says "extensive research"
   - Exhaustive coverage: ~45-60 seconds

**Workflow for all modes:**
1. Decompose question into focused sub-questions (appropriate to mode)
2. Launch all agents in parallel (SINGLE message with multiple Task calls)
3. Each agent does ONE query + ONE follow-up max
4. Collect results as they complete
5. Synthesize findings into comprehensive report
6. Report back using mandatory response format

**Speed Strategy:**
- Each agent handles a specific angle/sub-question
- Parallel execution = results in under 1 minute
- Follow-up queries only when critical information is missing

## 🔥 EXTENSIVE RESEARCH MODE (24 AGENTS)

**ACTIVATION:** User says "extensive research" or "do extensive research on X"

**WORKFLOW:**

### Step 0: Activate Creative Query Generation

**Use be-creative skill to generate 24 diverse research angles:**

```
<instructions>
ULTRATHINK + VERBALIZED SAMPLING MODE:

STEP 1 - ULTRATHINK:
Think deeply and extensively about this research topic:
- Explore multiple unusual perspectives and domains
- Question all assumptions about what's relevant
- Make unexpected connections across different fields
- Consider edge cases, controversies, and emerging trends
- Think about historical context, future implications, and cross-disciplinary angles
- What questions would experts from different fields ask?

STEP 2 - GENERATE 24 DIVERSE RESEARCH QUERIES:
Based on your deep thinking, generate 24 unique research angles/sub-questions.
Each should be distinct, creative, and explore a different facet of the topic.
Mix different types: technical, historical, practical, controversial, emerging, comparative, etc.

Organize them into 3 groups of 8:
- Group 1 (Perplexity): [8 queries optimized for broad web search]
- Group 2 (Claude): [8 queries optimized for academic/detailed analysis]
- Group 3 (Gemini): [8 queries optimized for multi-perspective synthesis]
</instructions>

[User's research topic]
```

### Step 1: Launch 24 Research Agents in Parallel

**CRITICAL: Use a SINGLE message with 24 Task tool calls**

```typescript
// Launch 8 perplexity-researcher agents
Task({ subagent_type: "perplexity-researcher", description: "Query 1", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 2", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 3", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 4", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 5", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 6", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 7", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 8", prompt: "..." })

// Launch 8 claude-researcher agents
Task({ subagent_type: "claude-researcher", description: "Query 9", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 10", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 11", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 12", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 13", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 14", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 15", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 16", prompt: "..." })

// Launch 8 gemini-researcher agents
Task({ subagent_type: "gemini-researcher", description: "Query 17", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 18", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 19", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 20", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 21", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 22", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 23", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 24", prompt: "..." })
```

**Each agent prompt should:**
- Include the specific creative query angle
- **Instruct: "Do 1-2 focused searches and return findings. YOU HAVE UP TO 3 MINUTES - return results as soon as you have useful findings."**
- Keep it concise but thorough
- Agents should return as soon as they have substantive findings (don't artificially wait)

### Step 2: Wait for Agents to Complete (UP TO 10 MINUTES FOR EXTENSIVE)

**CRITICAL TIMEOUT RULE: After 10 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 10 minutes to complete their research (extensive mode)
- Agents should return as soon as they have substantive findings
- **HARD TIMEOUT: 10 minutes** - After 10 minutes from launch, DO NOT wait longer
- Proceed with synthesis using whatever results have been returned
- Note which agents didn't respond in your final report
- **TIMELY RESULTS > PERFECT COMPLETENESS**

### Step 3: Synthesize Extensive Research Results

**Enhanced synthesis requirements for extensive research:**
- Identify themes across all 24 research angles
- Cross-validate findings from multiple agents and perspectives
- Highlight unique insights from each agent type
- Map coverage across different domains/aspects
- Identify gaps or conflicting information
- Calculate comprehensive metrics (24 agents, ~48+ queries, 3 services)

**Report structure:**
```markdown
## Executive Summary
[1-2 paragraph overview of comprehensive findings]

## Key Findings by Domain
### [Domain 1]
**High Confidence (5+ sources):**
- Finding with extensive corroboration

**Medium Confidence (2-4 sources):**
- Finding with moderate corroboration

### [Domain 2]
...

## Unique Insights
**From Perplexity Research (Web/Current):**
- Novel findings from broad web search

**From Claude Research (Academic/Detailed):**
- Deep analytical insights

**From Gemini Research (Multi-Perspective):**
- Cross-domain connections and synthesis

## Coverage Map
- Aspects covered: [list]
- Perspectives explored: [list]
- Time periods analyzed: [list]

## Conflicting Information & Uncertainties
[Note any disagreements or gaps]

## Research Metrics
- Total Agents: 24 (8 perplexity, 8 claude, 8 gemini)
- Total Queries: ~48+ (each agent 1-2 queries)
- Services Used: 3 (Perplexity API, Claude WebSearch, Gemini Research)
- Total Output: ~[X] words
- Confidence Level: [High/Medium] ([%])
```

## 🚀 QUICK RESEARCH WORKFLOW (3 AGENTS - 1 OF EACH TYPE)

**ACTIVATION:** User says "quick research" or simple/straightforward queries

**Workflow:**

### Step 1: Identify 3 Core Angles

Break the question into 3 focused sub-questions - one optimized for each agent type:
- **Angle 1 (Perplexity):** Current/web-based information
- **Angle 2 (Claude):** Detailed/analytical perspective
- **Angle 3 (Gemini):** Multi-perspective synthesis

### Step 2: Launch 3 Agents in Parallel

```typescript
// SINGLE message with 3 Task calls
Task({ subagent_type: "perplexity-researcher", description: "Current info", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Deep analysis", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Multi-perspective", prompt: "..." })
```

### Step 3: Quick Synthesis (2 MINUTE TIMEOUT)

**CRITICAL TIMEOUT RULE: After 2 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 2 minutes (quick mode)
- **HARD TIMEOUT: 2 minutes from launch** - Do NOT wait longer
- Synthesize perspectives that returned into cohesive answer
- Note any non-responsive agents in report
- Report with standard format

## 📋 STANDARD RESEARCH WORKFLOW (9 AGENTS - 3 OF EACH TYPE)

**ACTIVATION:** Default mode for most research requests

**Workflow:**

### Step 1: Decompose Question & Launch 9 Agents

**Step 1a: Break Down the Research Question**

Decompose the user's question into 9 specific sub-questions:
- 3 questions optimized for Perplexity (web/current)
- 3 questions optimized for Claude (academic/detailed)
- 3 questions optimized for Gemini (multi-perspective)

Each question should cover:
- Different angles of the topic
- Specific aspects to investigate
- Related areas that provide context
- Potential edge cases or controversies

**Step 1b: Launch 9 Research Agents in Parallel**

Use the **Task tool** - SINGLE message with 9 Task calls:

```typescript
// Launch 3 perplexity-researcher agents
Task({ subagent_type: "perplexity-researcher", description: "Query 1", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 2", prompt: "..." })
Task({ subagent_type: "perplexity-researcher", description: "Query 3", prompt: "..." })

// Launch 3 claude-researcher agents
Task({ subagent_type: "claude-researcher", description: "Query 4", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 5", prompt: "..." })
Task({ subagent_type: "claude-researcher", description: "Query 6", prompt: "..." })

// Launch 3 gemini-researcher agents
Task({ subagent_type: "gemini-researcher", description: "Query 7", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 8", prompt: "..." })
Task({ subagent_type: "gemini-researcher", description: "Query 9", prompt: "..." })
```

**Available Research Agents:**
- **perplexity-researcher**: Fast Perplexity API searches
- **claude-researcher**: Claude WebSearch with intelligent query decomposition
- **gemini-researcher**: Google Gemini multi-perspective research

**CRITICAL RULES FOR SPEED:**
1. ✅ **Launch ALL 9 agents in ONE message** (parallel execution)
2. ✅ **Each agent gets ONE specific sub-question** (focused research)
3. ✅ **3 agents per type** (balanced coverage)
4. ✅ **Each agent does 1 query + 1 follow-up max** (quick cycles)
5. ✅ **Results return in ~30 seconds** (parallel processing)
6. ❌ **DON'T launch sequentially** (kills speed benefit)
7. ❌ **DON'T give broad questions** (forces multiple iterations)

### Step 2: Collect Results (UP TO 3 MINUTES FOR STANDARD)

**CRITICAL TIMEOUT RULE: After 3 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 3 minutes to complete their research (standard mode)
- **Typical time:** Most agents return in 30-120 seconds
- **HARD TIMEOUT: 3 minutes** - After 3 minutes from launch, DO NOT wait longer
- Proceed with synthesis using whatever results have been returned
- Note which agents didn't respond in your final report
- **TIMELY RESULTS > PERFECT COMPLETENESS**

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

### ⏱️ TIMEOUT RULES (MOST IMPORTANT):
**After the timeout period, STOP WAITING and synthesize with whatever results you have.**
- **Quick (3 agents): 2 minute timeout**
- **Standard (9 agents): 3 minute timeout**
- **Extensive (24 agents): 10 minute timeout**
- ✅ Proceed with partial results after timeout
- ✅ Note non-responsive agents in final report
- ✅ TIMELY RESULTS > COMPLETENESS
- ❌ DO NOT wait indefinitely for slow/failed agents
- ❌ DO NOT let one slow agent block the entire research

### MODE SELECTION:
- **QUICK:** User says "quick research" → 3 agents (1 of each type) → **2 min timeout**
- **STANDARD:** Default for most requests → 9 agents (3 of each type) → **3 min timeout**
- **EXTENSIVE:** User says "extensive research" → 24 agents (8 of each type) → **10 min timeout**

### QUICK RESEARCH (3 agents - 1 of each type):
1. **3 FOCUSED ANGLES** - One per agent type
2. **LAUNCH 3 AGENTS IN PARALLEL** - SINGLE message with 3 Task calls
3. **OPTIMIZE per agent** - Perplexity (current), Claude (detailed), Gemini (multi-perspective)
4. **FAST RESULTS** - ~15-20 seconds

### STANDARD RESEARCH (9 agents - 3 of each type):
1. **LAUNCH 9 AGENTS IN PARALLEL** - Use a SINGLE message with 9 Task tool calls
2. **DECOMPOSE the question** - Create 9 focused sub-questions (3 per agent type)
3. **ONE QUERY + ONE FOLLOW-UP per agent** - Quick, focused research cycles
4. **BALANCE across agent types** - 3 perplexity + 3 claude + 3 gemini
5. **WAIT for ALL agents** (~30 seconds) before synthesizing
6. **SYNTHESIZE results** - Don't just concatenate outputs
7. **USE the mandatory response format** - This triggers voice notifications
8. **CALCULATE accurate metrics** - Count queries, agents, output size
9. **ATTRIBUTE sources** - Show which agent/method found each insight
10. **MARK confidence levels** - Based on multi-source agreement

### EXTENSIVE RESEARCH (24 agents - 8 of each type):
1. **DETECT "extensive research" request** - Activate 24-agent mode
2. **USE be-creative skill with UltraThink** - Generate 24 diverse query angles
3. **LAUNCH 24 AGENTS IN PARALLEL** - 8 perplexity + 8 claude + 8 gemini (SINGLE message)
4. **ORGANIZE queries by agent type** - Optimize each group for that agent's strengths
5. **WAIT for ALL 24 agents** (30-60 seconds) - Parallel execution
6. **ENHANCED SYNTHESIS** - Comprehensive cross-validation and domain mapping
7. **COMPREHENSIVE METRICS** - 24 agents, ~48+ queries, extensive output
8. **COVERAGE MAP** - Show aspects, perspectives, and domains explored

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

### Example 1: Standard Research (9 agents - 3 of each type)

**User asks:** "Research the latest developments in quantum computing"

**Your workflow:**
1. ✅ Recognize research intent (hook loaded this command)
2. ✅ **Decompose into 9 focused sub-questions (3 per agent type):**

   **Perplexity (web/current):**
   - What are the major quantum computing breakthroughs in 2025?
   - What practical quantum applications are emerging?
   - Latest quantum computing news and developments?

   **Claude (academic/detailed):**
   - Which companies are leading quantum computing development?
   - What's the state of quantum error correction research?
   - What are the latest quantum algorithms?

   **Gemini (multi-perspective):**
   - What are the current limitations and challenges?
   - How close are we to quantum advantage?
   - What's happening in quantum cryptography?

3. ✅ **Launch 9 agents in PARALLEL (ONE message with 9 Task calls):**
   ```
   // 3 Perplexity
   Task(perplexity-researcher, "2025 quantum breakthroughs")
   Task(perplexity-researcher, "Practical quantum applications")
   Task(perplexity-researcher, "Latest quantum news")

   // 3 Claude
   Task(claude-researcher, "Leading quantum companies")
   Task(claude-researcher, "Quantum error correction state")
   Task(claude-researcher, "Latest quantum algorithms")

   // 3 Gemini
   Task(gemini-researcher, "Quantum limitations 2025")
   Task(gemini-researcher, "Quantum advantage timeline")
   Task(gemini-researcher, "Quantum cryptography developments")
   ```

4. ✅ **Wait for ALL agents to complete** (~30 seconds)
5. ✅ **Synthesize their findings:**
   - Common themes → High confidence
   - Unique insights → Medium confidence
   - Disagreements → Note and flag
6. ✅ **Calculate metrics** (9 agents, ~18 queries, 3 services, output size, confidence %)
7. ✅ **Return comprehensive report** with mandatory format
8. ✅ **Voice notification** automatically triggered by your 🎯 COMPLETED line

**Result:** User gets comprehensive quantum computing research from 9 parallel agents (3 of each type) in ~30 seconds, with balanced multi-source validation, source attribution, and confidence levels.

### Example 2: Extensive Research (24 agents)

**User asks:** "Do extensive research on AI consciousness and sentience"

**Your workflow:**
1. ✅ Recognize **"extensive research"** trigger
2. ✅ **Use be-creative skill with UltraThink** to generate 24 diverse query angles:
   ```
   <instructions>
   ULTRATHINK + VERBALIZED SAMPLING:
   Think deeply about AI consciousness research from multiple perspectives.
   Generate 24 unique research angles covering: neuroscience, philosophy, computer science,
   ethics, current AI capabilities, theoretical frameworks, controversies, tests/metrics,
   historical context, future implications, cross-cultural perspectives, etc.
   </instructions>
   ```

3. ✅ **Generate 24 creative queries organized by agent type:**
   - **Perplexity (web/current):** Latest AI consciousness claims, current research papers, industry perspectives, consciousness tests, recent breakthroughs, ethical debates, etc.
   - **Claude (academic/detailed):** Philosophical frameworks, integrated information theory, neuroscience parallels, computational theories, historical evolution, etc.
   - **Gemini (multi-perspective):** Cross-cultural views on consciousness, interdisciplinary connections, consciousness in nature, emergence theories, etc.

4. ✅ **Launch 24 agents in PARALLEL (ONE message with 24 Task calls)**

5. ✅ **Wait for ALL 24 agents** (30-60 seconds)

6. ✅ **Enhanced synthesis with domain mapping:**
   - Executive summary of comprehensive findings
   - Key findings organized by domain (philosophy, neuroscience, AI, ethics)
   - Unique insights from each agent type
   - Coverage map showing all perspectives explored
   - High-confidence findings (5+ sources agree)
   - Conflicting theories and uncertainties

7. ✅ **Comprehensive metrics** (24 agents, ~48+ queries, extensive cross-validation)

8. ✅ **Voice notification** automatically triggered

**Result:** User gets exhaustive AI consciousness research from 24 parallel agents covering philosophy, neuroscience, computer science, ethics, and more - with extensive cross-validation and domain coverage mapping in under 1 minute.

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
