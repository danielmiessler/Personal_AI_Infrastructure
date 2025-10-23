# 🎯 PROMPT ENGINEERING STANDARDS

## Overview

This document defines the standards for creating effective prompts and context documentation for AI agents within the PAI system, based on Anthropic's context engineering principles.

## Core Philosophy

**Context engineering** is the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference.

**Primary Goal:** Find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes.

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

Organize prompts into distinct semantic sections using standard Markdown headers:

```markdown
## Background Information
Essential context about the domain, system, or task

## Instructions
Clear, actionable directives for the agent

## Examples
Concrete examples demonstrating expected behavior

## Constraints
Boundaries, limitations, and requirements
```

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

## Constraints
- [Boundary or limitation 1]
- [Boundary or limitation 2]
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

## References

Based on Anthropic's article: "Effective Context Engineering for AI Agents"
https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

## Related PAI Documentation

- Core Context: `${CLAUDE_PLUGIN_ROOT}/context/CLAUDE.md`
- Architecture: `${CLAUDE_PLUGIN_ROOT}/context/architecture/CLAUDE.md`
