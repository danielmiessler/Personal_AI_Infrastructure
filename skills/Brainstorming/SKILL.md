---
name: Brainstorming
description: Design exploration before implementation. USE WHEN creating features OR building components OR adding functionality OR modifying behavior OR starting new work. Explores intent, requirements, and design before touching code.
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

**Core principle:** Understand before building. Design before coding.

**Announce at start:** "I'm using the Brainstorming skill to explore this idea."

## Entry Point

This skill is the **starting point** for the development methodology.

**When to start here:**
- New features or components
- Significant changes to existing behavior
- Unclear requirements that need exploration
- Any work that will take more than a few tasks

**Skip to WritingPlans if:**
- Requirements are already crystal clear
- You've already explored the design
- Straightforward implementation with known approach

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **ExploreDesign** | New feature/component | Question-driven design exploration |

## The Process

### Phase 1: Understanding the Idea

1. **Check project context first**
   - Read relevant files, docs, recent commits
   - Understand current state before proposing changes

2. **Ask questions one at a time**
   - Only ONE question per message
   - Prefer multiple choice when possible
   - Open-ended is fine when needed
   - Focus on: purpose, constraints, success criteria

3. **Refine iteratively**
   - If a topic needs more exploration, break into multiple questions
   - Don't overwhelm with question lists

### Phase 2: Exploring Approaches

1. **Propose 2-3 different approaches**
   - Include trade-offs for each
   - Present conversationally

2. **Lead with your recommendation**
   - Explain why you recommend it
   - Be clear about trade-offs

3. **Get alignment before proceeding**

### Phase 3: Presenting the Design

1. **Present in small sections (200-300 words)**
   - Don't dump entire design at once
   - Ask after each section: "Does this look right so far?"

2. **Cover key areas:**
   - Architecture
   - Components
   - Data flow
   - Error handling
   - Testing approach

3. **Be ready to iterate**
   - Go back and clarify if something doesn't make sense
   - Adjust based on feedback

## After the Design

### Output: Design Decision (NOT a document)

Brainstorming ends when you have:
1. **Approved approach** - User confirmed the recommended approach
2. **Key decisions documented** - Architecture, components, data flow
3. **Scope defined** - What's in, what's out (YAGNI applied)

**Do NOT write a design doc here.** The design decision lives in the conversation.

### Handoff to WritingPlans

When design is approved, say:

```
Design approved: [One sentence summary of approach]

Ready to create the implementation plan? I'll use WritingPlans to break this into bite-sized TDD steps.
```

**WritingPlans** will capture the design in a formal plan document with exact code.

## Key Principles

| Principle | Why |
|-----------|-----|
| **One question at a time** | Don't overwhelm |
| **Multiple choice preferred** | Easier to answer |
| **YAGNI ruthlessly** | Remove unnecessary features |
| **Explore alternatives** | Always 2-3 approaches before settling |
| **Incremental validation** | Present in sections, validate each |
| **Be flexible** | Go back when something's unclear |

## Examples

**Example 1: New feature**
```
User: "I want to add caching to the API"
-> Check current API implementation
-> Ask: "What's the main goal - speed, cost reduction, or offline support?"
-> Ask: "What data changes frequently vs rarely?"
-> Propose: Redis vs in-memory vs file-based with trade-offs
-> Present architecture in sections
-> Write design doc
-> Hand off to WritingPlans
```

**Example 2: Refactoring**
```
User: "The auth system is messy, help me clean it up"
-> Read current auth code
-> Ask: "What's the main pain point - complexity, bugs, or extensibility?"
-> Identify 2-3 refactoring approaches
-> Present incremental refactoring plan
-> Validate each step
```

## Red Flags - STOP

- Jumping to code without understanding intent
- Proposing solutions before asking questions
- Presenting entire design at once
- Only offering one approach
- Adding features user didn't ask for (YAGNI)

## Related Skills

- **WritingPlans** - Creates implementation plan after design
- **TestDrivenDevelopment** - Guides actual implementation
