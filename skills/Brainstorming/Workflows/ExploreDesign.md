# ExploreDesign Workflow

> **Trigger:** New feature, component, or significant change
> **Input:** User's idea or requirement
> **Output:** Approved design decision

## Phase 1: Understanding the Idea

### 1.1 Check Project Context
- Read relevant files, docs, recent commits
- Understand current state before proposing changes

### 1.2 Ask Questions (One at a Time)
- Only ONE question per message
- Prefer multiple choice when possible
- Open-ended is fine when needed
- Focus on: purpose, constraints, success criteria

### 1.3 Refine Iteratively
- If a topic needs more exploration, break into multiple questions
- Don't overwhelm with question lists

## Phase 2: Exploring Approaches

### 2.1 Propose 2-3 Different Approaches
- Include trade-offs for each
- Present conversationally

### 2.2 Lead with Recommendation
- Explain why you recommend it
- Be clear about trade-offs

### 2.3 Get Alignment
- Confirm user agrees with approach before proceeding

## Phase 3: Presenting the Design

### 3.1 Present in Small Sections
- 200-300 words per section
- Ask after each: "Does this look right so far?"

### 3.2 Cover Key Areas
- Architecture
- Components
- Data flow
- Error handling
- Testing approach

### 3.3 Iterate as Needed
- Go back and clarify if something doesn't make sense
- Adjust based on feedback

## Completion Criteria

Brainstorming ends when you have:
1. **Approved approach** - User confirmed the recommended approach
2. **Key decisions documented** - Architecture, components, data flow
3. **Scope defined** - What's in, what's out (YAGNI applied)

## Completion

When design is approved, say:

```
Design approved: [One sentence summary of approach]

Ready to create the implementation plan? I'll use WritingPlans to break this into bite-sized TDD steps.
```

**Next skill:** WritingPlans

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Design approved | WritingPlans |
