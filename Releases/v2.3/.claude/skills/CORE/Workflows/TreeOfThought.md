# Tree of Thought (ToT) Methodology

**Purpose:** Explore multiple solution paths before synthesis for complex decisions where the first idea isn't always best.

**When to Use:**
- Architectural decisions with multiple valid approaches
- Complex problems with competing trade-offs
- Strategic choices requiring deep analysis
- Merge conflict resolution strategies
- Feature design with unclear requirements

**Source:** Network Chuck prompting video (2025) - ToT explores multiple paths, evaluates each, then synthesizes the "golden path"

---

## The Three-Step Process

### STEP 1: Branch Generation

Generate 3-5 fundamentally different approaches to the problem:

```
<instructions>
TREE OF THOUGHT - BRANCH GENERATION:

For this problem, generate 3-5 fundamentally different approaches.
Each approach should:
- Challenge different assumptions
- Come from different perspectives or paradigms
- Have distinct trade-offs
- Be genuinely viable (not strawmen)

For each branch, briefly describe:
- The core approach
- Key assumption it makes
- Primary trade-off
</instructions>

[Problem description]
```

### STEP 2: Branch Evaluation

Evaluate each branch's strengths and weaknesses:

```
<instructions>
TREE OF THOUGHT - BRANCH EVALUATION:

For each of the [N] approaches identified:

1. **Strengths:**
   - What does this approach do well?
   - Where does it excel?
   - What problems does it elegantly solve?

2. **Weaknesses:**
   - Where does this approach struggle?
   - What edge cases break it?
   - What maintenance burden does it create?

3. **Fit Score (1-10):**
   - How well does this fit our constraints?
   - How aligned with our principles?

4. **Hidden Costs:**
   - What's the real price of this approach?
   - What future problems does it create?
</instructions>
```

### STEP 3: Golden Path Synthesis

Synthesize the best elements into an optimal solution:

```
<instructions>
TREE OF THOUGHT - GOLDEN PATH SYNTHESIS:

Based on the branch evaluation, synthesize the optimal approach:

1. **Primary Path:** Which branch is the foundation?
2. **Borrowed Elements:** What good ideas from other branches should we incorporate?
3. **Mitigations:** How do we address the primary path's weaknesses?
4. **Final Recommendation:** Clear, actionable decision with rationale
</instructions>
```

---

## Complete ToT Template

For maximum effect, use all three steps in one prompt:

```
<instructions>
TREE OF THOUGHT - COMPLETE ANALYSIS:

STEP 1 - BRANCH GENERATION:
Generate 3-5 fundamentally different approaches to this problem.
Each should challenge different assumptions and have distinct trade-offs.

STEP 2 - BRANCH EVALUATION:
For each branch, analyze:
- Strengths (what it does well)
- Weaknesses (where it struggles)
- Fit score (1-10) for our context
- Hidden costs and future implications

STEP 3 - GOLDEN PATH SYNTHESIS:
- Which branch is the foundation?
- What elements from other branches should we borrow?
- How do we mitigate the primary path's weaknesses?
- Final recommendation with clear rationale

Output your reasoning, then provide a clear recommendation.
</instructions>

[Problem/Decision to analyze]
```

---

## Integration Points

### With Becreative Skill (Mode 4)
The Becreative skill already has "deep thinking with Tree of Thoughts" as Mode 4. This workflow provides the detailed methodology that mode references.

### With Complex Decisions & Planning
When `/plan` mode is active and facing complex decisions, ToT provides structured exploration before committing to an approach.

### With RedTeam Skill
ToT can precede red-teaming - explore multiple approaches first, then red-team the chosen approach to stress-test it.

### With Merge Conflict Resolution
When merge conflicts have multiple valid resolution strategies, use ToT to evaluate before choosing.

---

## Example: Architecture Decision

**Problem:** "Should we use Redis, in-memory cache, or file-based caching for our API?"

**ToT Analysis:**

**Branch 1: Redis**
- Strengths: Distributed, persistent, mature
- Weaknesses: External dependency, operational overhead
- Fit: 7/10 (overkill for current scale)
- Hidden cost: DevOps complexity

**Branch 2: In-Memory (Node cache)**
- Strengths: Zero dependencies, fast, simple
- Weaknesses: Lost on restart, doesn't scale horizontally
- Fit: 8/10 (matches current needs)
- Hidden cost: Future migration if we scale

**Branch 3: File-Based**
- Strengths: Persistent, simple, debuggable
- Weaknesses: I/O bottleneck, concurrency issues
- Fit: 5/10 (wrong paradigm for API caching)
- Hidden cost: Performance ceiling

**Golden Path:** Start with in-memory (Branch 2), borrow persistence idea from Branch 3 via periodic snapshots, design interface to allow Redis migration (Branch 1) when scale demands it.

---

## Key Principles

1. **Generate genuinely different branches** - Not variations, but different paradigms
2. **Evaluate honestly** - Find real weaknesses, not just validate preferred option
3. **Synthesize, don't just pick** - The best solution often borrows from multiple branches
4. **Document the reasoning** - Future you needs to understand why this path was chosen
5. **Permission to fail applies** - If no branch is clearly superior, say so

---

## When NOT to Use ToT

- Simple decisions with obvious answers
- Time-critical situations requiring immediate action
- Problems where trying is better than analyzing
- Creative tasks where exploration IS the output

**Principle:** ToT is for decisions where getting it wrong has significant cost. Don't over-engineer simple choices.

---

**Related Workflows:**
- `SessionContinuity.md` - For tracking ToT decisions across sessions

**Last Updated:** 2025-11-27
