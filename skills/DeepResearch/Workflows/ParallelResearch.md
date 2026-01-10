# ParallelResearch Workflow

> **Trigger:** Deep research OR research from multiple angles
> **Input:** Research topic with optional constraints
> **Output:** Synthesized research report with recommendations

**Launches 2 parallel research agents with different lenses, then synthesizes findings.**

## The Workflow

### Step 1: Parse Research Topic

Extract from user request:
- **Topic**: What to research
- **Constraints**: Any scope limits, focus areas, or exclusions

### Step 2: Launch Parallel Research Agents

**CRITICAL: Launch BOTH agents in a SINGLE message for parallel execution.**

```
Task({
  description: "[researcher-breadth] Survey: <topic>",
  prompt: <BREADTH_PROMPT>,
  subagent_type: "researcher-breadth",
  model: "sonnet"
})
Task({
  description: "[researcher-depth] Deep dive: <topic>",
  prompt: <DEPTH_PROMPT>,
  subagent_type: "researcher-depth",
  model: "sonnet"
})
```

---

## Agent Prompts

### BREADTH_PROMPT

```
## Research Task: {{TOPIC}}

## Your Lens: BREADTH
Your job is to SURVEY THE LANDSCAPE. Prioritize coverage over depth.

## Your Mission
1. Find ALL relevant approaches, tools, implementations, or perspectives
2. List options without deep analysis - breadth over depth
3. Categorize findings (by type, popularity, maturity, etc.)
4. Note which areas seem most promising for deep dives

## Output Structure
### Landscape Overview
- Category 1: [list of options]
- Category 2: [list of options]

### Most Promising Areas
1. [Area] - why it's interesting

### Sources Consulted
- [Source 1]

## Completion
End your response with exactly:
🎯 COMPLETED: [AGENT:researcher-breadth] <one-line summary>
```

### DEPTH_PROMPT

```
## Research Task: {{TOPIC}}

## Your Lens: DEPTH
Your job is to GO DEEP on the most important areas.

## Your Mission
1. Identify the 2-3 MOST relevant/promising approaches
2. Analyze each in detail: How it works, Tradeoffs, Real examples, Pitfalls
3. Compare and contrast the approaches

## Output Structure
### Deep Dive 1: [Approach Name]
**How it works:** ...
**Pros:** ...
**Cons:** ...

### Comparison Matrix
| Aspect | Approach 1 | Approach 2 |

### Key Insights
- Insight 1

## Completion
End your response with exactly:
🎯 COMPLETED: [AGENT:researcher-depth] <one-line summary>
```

---

### Step 3: Synthesize Results

After BOTH agents complete, launch the synthesizer:

```
Task({
  description: "Synthesize research on: <topic>",
  prompt: <SYNTHESIZER_PROMPT>,
  subagent_type: "researcher-synth",
  model: "sonnet"
})
```

### SYNTHESIZER_PROMPT

```
## Task: Synthesize Research Findings

## Breadth Agent Findings
{{BREADTH_OUTPUT}}

## Depth Agent Findings
{{DEPTH_OUTPUT}}

## Output Structure
### Executive Summary
3-5 bullet points summarizing key takeaways.

### Landscape Overview
(From breadth agent)

### Deep Dives
(From depth agent)

### Recommendations
1. [Recommendation with reasoning]

### Open Questions
- What remains unclear?

## Completion
End with:
🎯 COMPLETED: [AGENT:researcher-synth] Research synthesis complete
```

---

## Model Selection

| Agent | Model |
|-------|-------|
| Breadth | sonnet |
| Depth | sonnet |
| Synthesizer | sonnet |

## Completion

Research is complete when:
1. Both breadth and depth agents have returned
2. Synthesizer has merged findings into unified report
3. Recommendations provided to user

Output is captured to `history/research/` via existing hooks.

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
