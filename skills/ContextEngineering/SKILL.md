---
name: ContextEngineering
description: Context management for agent systems. USE WHEN writing skills OR optimizing prompts OR diagnosing context degradation OR designing multi-agent workflows OR context issues detected OR performance degrades over conversation.
---

# ContextEngineering

Strategies for curating and maintaining the optimal set of tokens during LLM inference. Context is a finite resource—treat it accordingly.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **OptimizeContext** | "optimize context" OR "context issues" OR "diagnose degradation" | `Workflows/OptimizeContext.md` |

## Context Engineering Fundamentals

### Context Anatomy

| Component | Description | Token Cost |
|-----------|-------------|------------|
| System prompts | Persistent instructions | Fixed |
| Tool definitions | Available capabilities | Fixed |
| Retrieved documents | RAG content | Variable |
| Message history | Conversation turns | Accumulating |
| Tool outputs | Results from tool calls | Variable |

### Primary Goal

**Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.**

Quality exceeds quantity. Smaller high-signal sets outperform larger noisy ones.

### Attention Mechanics

- **Position encoding matters**: Information at edges (beginning/end) receives more attention
- **Progressive disclosure**: Defer loading until needed
- **U-shaped attention curve**: Middle content receives 10-40% lower recall

## Context Degradation Patterns

### 1. Lost-in-Middle Phenomenon

Information buried in the middle suffers dramatically reduced recall accuracy.

**Detection:**
- Run 5+ agents identically
- Check compliance rates per instruction
- Instructions with < 80% compliance are at-risk

**Mitigation:**
- Move critical instructions to beginning/end
- Repeat key constraints at multiple positions
- Use headers to create visual breaks

### 2. Context Poisoning

Errors compound through repeated reference. One hallucinated fact becomes "established truth."

**Detection:**
- Extract factual claims from responses
- Verify each claim against source tools
- Calculate poisoning risk score

**Mitigation:**
- Verify before incorporating into context
- Use external tools for fact-checking
- Establish "trusted source" hierarchy

### 3. Context Distraction

Irrelevant information consumes attention budget without value.

**Detection:**
- Score each context section for relevance
- Identify sections never referenced in outputs
- Track attention patterns

**Mitigation:**
- Remove low-relevance sections
- Use just-in-time loading
- Implement relevance filtering

### 4. Context Confusion

Agent mixes up task requirements from different sources.

**Detection:**
- Test task isolation
- Check for cross-task contamination
- Monitor instruction adherence

**Mitigation:**
- Clear section boundaries
- Explicit task scoping
- Isolated sub-agent contexts

### 5. Context Clash

Contradictory information creates uncertainty.

**Detection:**
- Scan for conflicting statements
- Check for version mismatches
- Monitor hedging language in outputs

**Mitigation:**
- Single source of truth principle
- Version-stamp all context
- Explicit conflict resolution rules

## The Four-Bucket Approach

When context grows too large:

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Write** | Save externally | Persistent state, large documents |
| **Select** | Filter to relevant | Retrieved documents, tool outputs |
| **Compress** | Summarize | Long conversations, verbose outputs |
| **Isolate** | Sub-agents | Independent subtasks |

## Multi-Agent Verification Workflows

### Hallucination Detection

```
For each claim in response:
  1. Extract claim as testable statement
  2. Search for verification via tools
  3. Score confidence (verified/unverified/contradicted)
  4. Flag contradicted claims
```

### Error Propagation Analysis

```
When error detected:
  1. Trace backward through agent chain
  2. Find first occurrence of error
  3. Identify propagation path
  4. Fix at source, not symptoms
```

### Context Health Monitoring

Every 10 turns, run health check:
- Relevance score of current context
- Compression ratio recommendation
- Degradation symptom detection
- Refresh recommendation

## Context Optimization Techniques

### 1. Compaction

When approaching context limits:

**Priority order for compaction:**
1. Tool outputs (most verbose, least persistent)
2. Old conversation turns (summarize, keep decisions)
3. Retrieved documents (keep citations, summarize content)
4. System prompts (never compact)

### 2. Observation Masking

Replace verbose outputs with compact references:

```
BEFORE: [5000 token API response]
AFTER: "API returned 47 records. Key findings: [summary]. Full data saved to $ref_123."
```

### 3. Context Partitioning

Split work across specialized sub-agents:

```
Main Agent (orchestrator)
  ├── Research Agent (clean context for research)
  ├── Code Agent (clean context for implementation)
  └── Review Agent (clean context for review)
```

Each agent gets minimal, task-specific context.

### 4. KV-Cache Optimization

For repeated patterns:
- Keep system prompts consistent (enables caching)
- Batch similar requests
- Reuse cached computations

## Examples

**Example 1: Diagnose context issues**
```
User: "The agent keeps forgetting my requirements after long conversations"
→ Invokes OptimizeContext workflow
→ Runs context health check
→ Identifies lost-in-middle issue
→ Recommends moving requirements to context edges
```

**Example 2: Optimize a skill's context usage**
```
User: "The Brainstorming skill uses too many tokens"
→ Invokes OptimizeContext workflow
→ Analyzes skill's context composition
→ Identifies compaction opportunities
→ Recommends specific optimizations
```

**Example 3: Design multi-agent context strategy**
```
User: "How should I structure context for a research + implementation flow?"
→ Invokes OptimizeContext workflow
→ Designs context partitioning strategy
→ Defines handoff protocols
→ Recommends verification checkpoints
```

## Related Skills

**Called by:**
- Prompting (when context issues detected)
- AgentEvaluation (when context-related failures found)

**Calls:**
- DeepResearch (for context audit patterns)
- SystematicDebugging (for error propagation analysis)

## Key Principles

1. **Context is finite** - Every token costs attention
2. **Position matters** - Edges get more attention than middle
3. **Quality over quantity** - High-signal beats comprehensive
4. **Verify before including** - Prevent poisoning
5. **Progressive disclosure** - Load when needed, not before
6. **Monitor health** - Detect degradation early
