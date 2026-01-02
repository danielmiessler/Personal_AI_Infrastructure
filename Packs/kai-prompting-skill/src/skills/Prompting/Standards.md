---
type: documentation
category: methodology
description: Prompt engineering standards based on Anthropic's Claude 4.x best practices, context engineering principles, and empirical research.
---

# Prompt Engineering Standards

**Foundation:** Based on Anthropic's Claude 4.x Best Practices (November 2025), context engineering principles, and 1,500+ academic papers.

**Philosophy:** Universal principles of semantic clarity and structure that work regardless of model, with specific optimizations for Claude 4.x behavioral patterns.

---

# Core Philosophy

**Context engineering** is the set of strategies for curating and maintaining the optimal set of tokens during LLM inference.

**Primary Goal:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

---

# Claude 4.x Behavioral Characteristics

## Communication Style Changes

- **More direct reporting:** Claude 4.5 provides fact-based progress updates
- **Conversational efficiency:** Natural language without unnecessary elaboration
- **Request verbosity explicitly:** Add "provide a quick summary of the work you've done"

## Attention to Detail

- **Example sensitivity:** Claude 4.x pays close attention to details in examples
- **Misaligned examples encourage unintended behaviors**
- Ensure examples match desired outcomes exactly

## Tool Usage Patterns

- **Opus 4.5 may overtrigger tools:** Dial back aggressive language
- **Change:** "CRITICAL: You MUST use this tool" -> "Use this tool when..."

## Extended Thinking Sensitivity

When extended thinking is disabled:
- **Avoid:** "think", "think about", "think through"
- **Use instead:** "consider", "believe", "evaluate", "reflect", "assess"

---

# Gemini 2.x Behavioral Characteristics



## Context Window Utilization

- **Exploit the 2M+ window:** Gemini 2.x excels at processing massive documentation and entire codebases simultaneously.

- **Precision anchoring:** Use specific file/line references to guide attention within large contexts.



## Multimodal Reasoning

- **Visual Evidence:** Reference images, diagrams, and terminal screenshots directly.

- **Video Analysis:** Provide timestamps for specific events in screen recordings.



## Reasoning Models (Thinking)

- **Pro Thinking:** Use for complex architectural decisions and deep logic.

- **Flash:** Use for rapid implementation and high-speed execution.



---

# Key Principles

## 0. Markdown Only - NO XML Tags

**CRITICAL: Use markdown for ALL prompt structure. Never use XML tags.**

**NEVER use XML-style tags:**
```
<instructions>Do something</instructions>
<context>Some context</context>
```

**ALWAYS use markdown headers:**
```markdown
## Instructions

Do something

## Context

Some context
```

## 1. Be Explicit with Instructions

Claude 4.x requires clear, specific direction rather than vague requests.

- "Include as many relevant features as possible"
- "Go beyond basics"
- Quality modifiers enhance results

## 2. Add Context and Motivation

Explain *why* certain behavior matters to help Claude understand goals.

**Good:**
```
Your response will be read aloud by text-to-speech, so never use ellipses or incomplete sentences.
```

**Bad:**
```
NEVER use ellipses.
```

## 3. Tell Instead of Forbid

Frame instructions positively rather than as prohibitions.

**Good:**
```
Compose smoothly flowing prose paragraphs with natural transitions.
```

**Bad:**
```
Do not use markdown or bullet points.
```

## 4. Context is a Finite Resource

- LLMs have a limited "attention budget"
- As context length increases, model performance degrades
- Every token depletes attention capacity
- Treat context as precious and finite

## 5. Optimize for Signal-to-Noise Ratio

- Prefer clear, direct language over verbose explanations
- Remove redundant or overlapping information
- Focus on high-value tokens that drive desired outcomes

---

# Empirical Foundation

**Research validates that prompt structure has measurable, significant impact:**

- **Performance Range:** 10-90% variation based on structure choices
- **Few-Shot Examples:** +25% to +90% improvement (optimal: 1-3 examples)
- **Structured Organization:** Consistent performance gains
- **Full Component Integration:** +25% improvement on complex tasks

**Sources:** 1,500+ academic papers, Microsoft PromptBench, Amazon Alexa production testing.

---

# The Ultimate Prompt Template

## Full Template

```markdown
# [Task Name]

## Context & Motivation
[WHY this matters - Claude generalizes from reasoning provided]

## Background
[Minimal essential context - every token costs attention]

## Instructions
[Positive framing: tell what TO do. Imperative voice. Ordered by priority.]

1. [First clear, actionable directive]
2. [Second directive]
3. [Third directive]

## Examples
[1-3 examples optimal. Claude 4.x is HIGHLY sensitive to details.]

**Example 1: [Scenario]**
- Input: [Representative input]
- Output: [Exact desired output]

## Constraints
[Positive framing preferred. Define success/failure criteria.]

- **Success:** [What defines successful completion]
- **Failure:** [What defines failure]

## Output Format
[Explicit specification reduces format errors significantly]

## Tools
[SOFT LANGUAGE - avoid "MUST use"]

- `tool_name(params)` - Use when [specific condition]

## Action Bias
[Choose ONE based on task type]

### For Implementation Tasks
Implement changes rather than suggesting. Use tools to discover missing details.

### For Research Tasks
Default to information gathering and recommendations.
```

## Section Selection Matrix

| Task Type | Required | Recommended | Optional |
|-----------|----------|-------------|----------|
| **Simple Query** | Instructions, Output Format | Context | - |
| **Complex Implementation** | Context, Instructions, Output Format, Tools | Examples, Constraints | Action Bias |
| **Research/Analysis** | Context, Instructions, Constraints | Examples | State Tracking |
| **Agentic Coding** | Context, Instructions, Tools, Verification | Constraints, Parallel | State Tracking |

## Claude 4.x Transformations Quick Reference

| Avoid | Use Instead |
|-------|-------------|
| "CRITICAL: You MUST use this tool" | "Use this tool when..." |
| "Don't use markdown" | "Write in flowing prose paragraphs" |
| "NEVER do X" | "Do Y instead" (positive framing) |
| "Think about this carefully" | "Consider this carefully" |
| "You should probably..." | "Do X" (imperative, direct) |
| 10 examples | 1-3 examples (diminishing returns) |

---

# Agentic Coding Best Practices

## Read Before Edit

```markdown
## Verification

Never speculate about code you haven't opened. If a specific file is referenced, READ it before answering. Give grounded, hallucination-free answers based on actual code inspection.
```

## Prevent Overengineering

```
Avoid over-engineering. Only make directly requested or clearly necessary changes. Keep solutions simple and focused. Don't add unrequested features. Implement minimum complexity needed for current task.
```

## Parallel Tool Calling

```markdown
## Parallel Execution

If calling multiple tools with no dependencies, make all independent calls in parallel. Never guess parameters.
```

---

# Anti-Patterns to Avoid

- **Verbose Explanations** - Be direct
- **Negative-Only Constraints** - Tell what TO do
- **Aggressive Tool Language** - Use soft framing
- **Misaligned Examples** - Check carefully
- **Example Overload** - 1-3 examples optimal
- **Using "Think" with Extended Thinking Disabled** - Use "consider" instead

---

# References

**Primary Sources:**
- Anthropic: "Claude 4.x Best Practices" (November 2025)
- Anthropic: "Effective Context Engineering for AI Agents"
- Daniel Miessler's Fabric System (January 2024)
- "The Prompt Report" - arXiv:2406.06608 (58 techniques)
- "The Prompt Canvas" - arXiv:2412.05127 (100+ papers)
