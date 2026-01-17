# Claude Web Research Workflow

Intelligent multi-query WebSearch using Claude's built-in tool. Decomposes research questions into 4-8 targeted sub-queries and executes them in parallel.

## Features

- Intelligent query decomposition into multiple focused searches
- Parallel execution using Claude WebSearch for speed
- Iterative follow-up searches based on initial findings
- Comprehensive synthesis of all findings

## Advantages

- Uses Claude's built-in WebSearch (no API keys needed)
- Free and unlimited usage
- Integrated with Claude's knowledge and reasoning

## When to Use

- User says "claude research" or "use websearch"
- Want free research without API costs
- Need Claude's reasoning integrated with search

## Workflow

### Step 1: Decompose Query

Break the research question into 4-8 focused sub-queries:

1. **Original question** - The exact query
2. **Background context** - "what is [topic] background context"
3. **Recent news** - "[topic] latest news [year]"
4. **Recent developments** - "[topic] recent developments [year]"
5. **Technical details** - "[topic] technical details explained"
6. **Comparison** - "[topic] comparison alternatives options"
7. **Expert analysis** - "[topic] expert analysis opinion"
8. **Implications** - "[topic] implications impact consequences"

### Step 2: Execute Parallel WebSearches

Launch all queries simultaneously using Claude's WebSearch:

```typescript
// Execute all in parallel
WebSearch({ query: query1 })
WebSearch({ query: query2 })
WebSearch({ query: query3 })
// ... up to 8 queries
```

### Step 3: Synthesize Results

Combine findings from all queries:
- Identify common themes
- Note unique findings per query
- Flag any conflicts
- Highlight high-confidence information (multiple sources agree)

### Step 4: Return Results

```markdown
SUMMARY: Claude web research on [topic]
ANALYSIS: [Synthesized findings from all queries]
ACTIONS: [N] WebSearch queries executed in parallel
RESULTS: [Comprehensive answer]
STATUS: Claude-only mode - free, no API keys
CAPTURE: [Key facts discovered]
NEXT: [Suggest standard research for more perspectives]
COMPLETED: Claude research on [topic] complete
```

## Example Query Decomposition

**Original:** "What are the best practices for AI agent security?"

**Decomposed queries:**
1. "best practices AI agent security"
2. "AI agent security background context"
3. "AI agent security latest news 2026"
4. "AI agent security recent developments 2026"
5. "AI agent security technical details explained"
6. "AI agent security comparison approaches"
7. "AI agent security expert analysis"
8. "AI agent security implications impact"

## Speed Target

~15-30 seconds for comprehensive results (parallel execution)
