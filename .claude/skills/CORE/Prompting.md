---
type: documentation
category: methodology
description: Prompt engineering standards and context engineering principles based on Anthropic best practices and Daniel Miessler's Fabric system (2024). Universal principles for semantic clarity and structure that transcend specific model implementations. Validated by empirical research showing 10-90% performance impact from structure choices.
---

# Prompt Engineering Standards

**Foundation:** Based on Anthropic's context engineering principles and Daniel Miessler's Fabric system (January 2024), validated by empirical research across 1,500+ academic papers and production systems.

**Philosophy:** Universal principles of semantic clarity and structure that work regardless of model implementation.

---

# 🎯 PROMPT ENGINEERING METHODOLOGY

## Overview

This document defines the standards for creating effective prompts and context documentation for AI agents within the PAI system, based on Anthropic's context engineering principles.

## Core Philosophy

**Context engineering** is the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference.

**Primary Goal:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

## Empirical Foundation

**Research validates that prompt structure has measurable, significant impact:**

- **Performance Range:** 10-90% variation based on structure choices
- **Few-Shot Examples:** +25% to +90% improvement (optimal: 1-3 examples)
- **Structured Organization:** Consistent performance gains across reasoning tasks
- **Full Component Integration:** +25% improvement on complex tasks
- **Clear Instructions:** Reduces ambiguity and improves task completion
- **Production Impact:** +23% conversion, +31% satisfaction (production A/B testing, 50K users)

**Sources:** 1,500+ academic papers, Microsoft PromptBench, Amazon Alexa production testing, PMC clinical NLP studies.

**Key Insight:** Structure optimization is not subjective art—it's measurable science with quantified ROI. The principles below work because they align with how intelligence processes information, regardless of implementation.

## Key Principles

### 1. Context is a Finite Resource

- LLMs have a limited "attention budget"
- As context length increases, model performance degrades
- Every token depletes attention capacity
- Treat context as precious and finite

### 2. Optimize for Signal-to-Noise Ratio

- Prefer clear, direct language over verbose explanations
- Remove redundant or overlapping information
- Focus on high-value tokens that drive desired outcomes

### 3. Progressive Information Discovery

- Use lightweight identifiers rather than full data dumps
- Load detailed information dynamically when needed
- Allow agents to discover information just-in-time

## Markdown Structure Standards

### Use Markdown Headers for Organization

Organize prompts into distinct semantic sections using standard Markdown headers.

**Essential Sections (Empirically Validated):**

```markdown
## Background Information
Essential context about the domain, system, or task

## Instructions
Clear, actionable directives for the agent

## Examples
Concrete examples demonstrating expected behavior (1-3 optimal)

## Constraints
Boundaries, limitations, and requirements

## Output Format
Explicit specification of desired response structure
```

**Research Validation:**
- Background/Context: Required - reduces ambiguity
- Instructions: Required - baseline performance component
- Examples: +25-90% improvement (1-3 examples optimal, diminishing returns after 3)
- Constraints: Improves quality, reduces hallucination
- Output Format: Improves compliance and reduces format errors

### Section Guidelines

**Background Information:**
- Provide minimal essential context
- Avoid historical details unless critical
- Focus on "what" and "why", not "how we got here"

**Instructions:**
- Use imperative voice ("Do X", not "You should do X")
- Be specific and actionable
- Order by priority or logical flow

**Examples:**
- Show, don't tell
- Include both correct and incorrect examples when useful
- Keep examples concise and representative

**Constraints:**
- Clearly state boundaries and limitations
- Specify what NOT to do
- Define success/failure criteria

**Output Format:**
- Specify exact structure (JSON, Markdown, lists, etc.)
- Include format examples when helpful
- Define length constraints if applicable
- Improves compliance and reduces formatting errors

## Writing Style Guidelines

### Clarity Over Completeness

✅ **Good:**
```markdown
## Instructions
- Validate user input before processing
- Return errors in JSON format
- Log all failed attempts
```

❌ **Bad:**
```markdown
## Instructions
You should always make sure to validate the user's input before you process it because invalid input could cause problems. When you encounter errors, you should return them in JSON format so that the calling system can parse them properly. It's also important to log all failed attempts so we can debug issues later.
```

### Be Direct and Specific

✅ **Good:**
```markdown
Use the `calculate_tax` tool with amount and jurisdiction parameters.
```

❌ **Bad:**
```markdown
You might want to consider using the calculate_tax tool if you need to determine tax amounts, and you should probably pass in the amount and jurisdiction if you have them available.
```

### Use Structured Lists

✅ **Good:**
```markdown
## Constraints
- Maximum response length: 500 tokens
- Required fields: name, email, timestamp
- Timeout: 30 seconds
```

❌ **Bad:**
```markdown
## Constraints
The response should not exceed 500 tokens, and you need to include the name, email, and timestamp fields. Also, make sure the operation completes within 30 seconds.
```

## Tool Design Principles

### Self-Contained Tools

Each tool should:
- Have a single, clear purpose
- Include all necessary parameters in its definition
- Return complete, actionable results
- Handle errors gracefully without external dependencies

### Robust Error Handling

Tools must:
- Validate inputs before execution
- Return structured error messages
- Gracefully degrade when possible
- Provide actionable feedback for failures

### Clear Purpose and Scope

✅ **Good:** `calculate_shipping_cost(origin, destination, weight, service_level)`

❌ **Bad:** `process_order(order_data)` - Too broad, unclear what it does

## Context Management Strategies

### 1. Just-in-Time Context Loading

**Instead of:**
```markdown
## Available Products
Product 1: Widget A - $10.99 - In stock: 500 units - SKU: WGT-001 - Category: Hardware...
Product 2: Widget B - $15.99 - In stock: 200 units - SKU: WGT-002 - Category: Hardware...
[100 more products...]
```

**Use:**
```markdown
## Available Products
Use `get_product(sku)` to retrieve product details when needed.
Product SKUs available: WGT-001, WGT-002, [reference product catalog]
```

### 2. Compaction for Long Conversations

When context grows too large:
- Summarize older conversation segments
- Preserve critical decisions and state
- Discard resolved sub-tasks
- Keep recent context verbatim

### 3. Structured Note-Taking

For multi-step tasks:
- Persist important information outside context window
- Use external storage (files, databases) for state
- Reference stored information with lightweight identifiers
- Update notes progressively as task evolves

### 4. Sub-Agent Architectures

For complex tasks:
- Delegate subtasks to specialized agents
- Each agent gets minimal, task-specific context
- Parent agent coordinates and synthesizes results
- Agents communicate through structured interfaces

## Context File Templates

### Basic Context Template

```markdown
# [Domain/Feature Name]

## Background Information
[Minimal essential context about the domain]

## Instructions
- [Clear, actionable directive 1]
- [Clear, actionable directive 2]
- [Clear, actionable directive 3]

## Examples
**Example 1: [Scenario]**
Input: [Example input]
Expected Output: [Example output]

**Example 2: [Edge Case]**
Input: [Example input]
Expected Output: [Example output]

**Example 3: [Optional - 1-3 examples optimal]**
Input: [Example input]
Expected Output: [Example output]

## Constraints
- [Boundary or limitation 1]
- [Boundary or limitation 2]

## Output Format
[Specific structure specification - JSON, Markdown, list format, etc.]
[Length requirements if applicable]
```

### Agent-Specific Context Template

```markdown
# [Agent Name] - [Primary Function]

## Role
You are a [role description] responsible for [core responsibility].

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Available Tools
- `tool_name(params)` - [Brief description]
- `tool_name2(params)` - [Brief description]

## Workflow
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Output Format
[Specify exact format for agent responses]

## Constraints
- [Constraint 1]
- [Constraint 2]
```

### Command Context Template

```markdown
# Command: [Command Name]

## Purpose
[One-sentence description of what this command does]

## When to Use
Use this command when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Parameters
- `param1` (required): [Description]
- `param2` (optional): [Description]

## Usage Example
```bash
[command example]
```

## Output
[Description of what the command returns]

## Error Handling
- [Error condition 1]: [How to handle]
- [Error condition 2]: [How to handle]
```

## Best Practices Checklist

When creating or reviewing context documentation:

- [ ] Uses Markdown headers for semantic organization
- [ ] Language is clear, direct, and minimal
- [ ] No redundant or overlapping information
- [ ] Instructions are actionable and specific
- [ ] Examples are concrete and representative
- [ ] Constraints are clearly defined
- [ ] Uses just-in-time loading when appropriate
- [ ] Follows consistent formatting throughout
- [ ] Focuses on high-signal tokens only
- [ ] Structured for progressive discovery

## Anti-Patterns to Avoid

❌ **Verbose Explanations**
Don't explain the reasoning behind every instruction. Be direct.

❌ **Historical Context Dumping**
Don't include how things evolved unless critical to understanding.

❌ **Overlapping Tool Definitions**
Don't create multiple tools that do similar things.

❌ **Premature Information Loading**
Don't load detailed data until actually needed.

❌ **Unstructured Lists**
Don't use paragraphs where bulleted lists would be clearer.

❌ **Vague Instructions**
Don't use "might", "could", "should consider" - be direct.

❌ **Example Overload**
Don't provide 10 examples when 2 would suffice.

## Evolution and Refinement

Context engineering is an ongoing process:

1. **Start Minimal:** Begin with the smallest viable context
2. **Measure Performance:** Track task completion and accuracy
3. **Identify Gaps:** Note when agent lacks critical information
4. **Add Strategically:** Include only high-value tokens
5. **Prune Regularly:** Remove unused or low-value context
6. **Iterate:** Continuously refine based on outcomes

## The Fabric System (January 2024)

**Created by Daniel Miessler** as an open-source framework for augmenting humans using AI.

### Core Architecture

**Philosophy:** UNIX principles applied to prompting
- Solve each problem exactly once
- Turn solutions into reusable modules (Patterns)
- Make modules chainable

**Components:**
- **Patterns:** Granular AI use cases (242+ prompts) - the core building blocks
- **Stitches:** Chained patterns creating advanced functionality
- **Looms:** Client-side apps calling specific Patterns
- **Mills:** Hosting infrastructure for patterns

### Key Principles

**Markdown-First Design:**
- Maximum readability for creators and users
- Clear structure emphasizes what AI should do and in what order
- Enables community contribution and improvement

**Clarity in Instructions:**
- Extremely clear, specific directives
- Markdown structure for order and priority
- System section usage (validated through extensive testing)
- Implements Chain of Thought and Chain of Draft strategies

**Modular Execution:**
- Each pattern solves one specific problem perfectly
- Patterns are chainable for complex workflows
- Community-driven pattern library (10,000+ GitHub stars)

### Pattern Structure

- **Format:** Markdown files
- **Purpose:** Detailed descriptions of pattern function
- **Accessibility:** Usable in any AI application
- **Location:** github.com/danielmiessler/Fabric

**Key Insight:** "We are extremely clear in our instructions, and we use the Markdown structure to emphasize what we want the AI to do, and in what order."

## Universal Principles for Future-Proof Prompting

**Core Insight:** Focus on semantic clarity and universal structure principles that transcend specific models.

### 1. Semantic Organization Over Format

**What Endures:**
- Clear hierarchical structure using headers
- Semantic boundaries between concept areas
- Logical information flow

**Why It Works:**
- Human-readable = AI-parseable
- Structure conveys intent regardless of model architecture
- Reduces ambiguity through explicit organization

### 2. Extreme Clarity in Instructions

**Principles:**
- Direct, imperative language ("Do X" not "You might want to consider X")
- Specific, actionable directives
- One concept per instruction
- No ambiguity or hedging

**Why It Works:**
- Removes interpretation overhead
- Minimizes token waste on clarification
- Works across all model types and generations

### 3. Minimal, High-Signal Examples

**Guidelines:**
- 1-3 concrete examples showing desired behavior
- Include edge cases, not just happy path
- Show, don't tell (examples > explanations)
- Stop when pattern is clear (diminishing returns after 3)

**Why It Works:**
- Demonstrates intent without over-specification
- Provides concrete anchor points
- Efficient token usage

### 4. Explicit Constraints and Boundaries

**What to Specify:**
- What NOT to do (as important as what to do)
- Success/failure criteria
- Scope boundaries
- Output requirements

**Why It Works:**
- Reduces hallucination by defining limits
- Prevents drift and over-elaboration
- Makes expectations testable

### 5. Progressive Information Discovery

**Pattern:**
- Provide lightweight identifiers, not full data dumps
- Enable just-in-time loading of detailed information
- Reference external context rather than duplicating

**Why It Works:**
- Preserves attention budget for reasoning
- Scales to large information spaces
- Future-proof as context windows grow

**Key Takeaway:** These principles work because they align with how intelligence processes information—whether biological or artificial. They'll remain effective as models evolve.

## References

**Primary Sources:**
- Anthropic: "Effective Context Engineering for AI Agents"
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Daniel Miessler's Fabric System (January 2024)
  https://github.com/danielmiessler/Fabric
- "The Prompt Report" - arXiv:2406.06608 (systematic survey, 58 techniques)
- "The Prompt Canvas" - arXiv:2412.05127 (100+ papers reviewed)
- Microsoft PromptBench - Comprehensive benchmarking framework
- Amazon Alexa Production Testing - Real-world A/B testing (50K users)
- PMC Clinical NLP Studies - Empirical performance validation

**Philosophy:** These standards focus on universal principles of semantic clarity and structure that transcend specific model implementations. What works is based on how intelligence—biological or artificial—processes information efficiently.
