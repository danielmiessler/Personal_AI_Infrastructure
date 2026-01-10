# SelectReasoning Workflow

> **Trigger:** "which reasoning technique" OR "complex problem" OR "reasoning fails"
> **Input:** Problem description or failing approach
> **Output:** Recommended technique with implementation template

## Phase 1: Analyze Problem

### 1.1 Identify Problem Type

| Type | Indicators |
|------|------------|
| Arithmetic | Numbers, calculations, "how many", "what is" |
| Logical | If-then, conditions, deductions |
| Compositional | Multiple parts, "and then", sequences |
| Knowledge-intensive | Facts, entities, "who/what/when/where" |
| Creative | Open-ended, multiple valid solutions |
| Symbolic | Variables, formulas, patterns |

### 1.2 Assess Complexity

| Level | Characteristics |
|-------|-----------------|
| Simple | Single-step, direct answer |
| Medium | 2-4 steps, clear path |
| Complex | 5+ steps, some ambiguity |
| Very Complex | Many steps, exploration needed |

### 1.3 Check Constraints

- Exemplars available? (enables few-shot)
- Discrete answer? (enables voting)
- External info needed? (requires tools)
- Iterative improvement allowed? (enables reflexion)
- Latency constraints? (limits exploration)

## Phase 2: Match to Technique

### Decision Tree

```
START
  │
  ├── Is this a simple lookup/factual question?
  │   └── YES → No special reasoning needed
  │
  ├── Is arithmetic/symbolic manipulation involved?
  │   └── YES → Consider PAL
  │
  ├── Does problem require external information?
  │   └── YES → Use ReAct
  │
  ├── Does problem naturally decompose?
  │   └── YES → Use Least-to-Most
  │
  ├── Are quality exemplars available?
  │   ├── YES → Use Chain-of-Thought
  │   └── NO → Use Zero-Shot CoT
  │
  ├── Is high reliability required?
  │   └── YES → Add Self-Consistency (N=5-10)
  │
  ├── Does problem require exploration?
  │   └── YES → Consider Tree of Thoughts
  │
  └── Is iterative improvement possible?
      └── YES → Add Reflexion layer
```

### Quick Reference

| Problem Profile | Primary Technique | Enhancement |
|----------------|-------------------|-------------|
| Arithmetic, calculation | PAL | Self-Consistency |
| Multi-step reasoning | Chain-of-Thought | Self-Consistency |
| No exemplars, quick | Zero-Shot CoT | None |
| Needs external facts | ReAct | CoT for reasoning steps |
| Naturally decomposes | Least-to-Most | PAL for subproblems |
| Exploration required | Tree of Thoughts | Reflexion for refinement |
| High-stakes decision | CoT + Self-Consistency | Multiple judges |
| Learning from failures | Reflexion | Any base technique |

## Phase 3: Generate Template

### 3.1 Select Base Template

Based on Phase 2 selection, provide the appropriate template from SKILL.md.

### 3.2 Customize for Problem

Adapt template:
- Use problem-specific terminology
- Include relevant examples if available
- Set appropriate parameters (N for Self-Consistency, etc.)

### 3.3 Provide Implementation

```markdown
## Recommended Approach: [Technique Name]

**Why this technique:**
[Reasoning for selection]

**Template:**
[Customized template]

**Parameters:**
- [Key parameter 1]: [Value] - [Rationale]
- [Key parameter 2]: [Value] - [Rationale]

**Expected improvement:**
[Estimated accuracy gain]

**Potential limitations:**
[What to watch for]
```

## Phase 4: Handle Edge Cases

### If Current Approach is Failing

1. Identify the failure mode:
   - Calculation errors → Upgrade to PAL
   - Inconsistent answers → Add Self-Consistency
   - Missing information → Add ReAct
   - Poor decomposition → Use Least-to-Most
   - Stuck in local optima → Try Tree of Thoughts

2. Recommend upgrade path

### If Multiple Techniques Could Work

1. Consider constraints (cost, latency, reliability)
2. Start with simpler technique
3. Provide escalation path if needed

### If No Technique Fits

1. Check if problem is well-defined
2. Consider breaking into sub-problems
3. Recommend reformulating the problem

## Phase 5: Provide Guidance

```markdown
## Implementation Guidance

### Step 1: Apply Template
[Specific instructions]

### Step 2: Test with Examples
- Try on 2-3 test cases
- Check for consistent reasoning
- Verify answer format

### Step 3: Monitor for Issues
- Watch for: [specific failure modes]
- If [condition], escalate to [technique]

### Step 4: Iterate if Needed
- If accuracy < [threshold], add [enhancement]
- If failing consistently, apply Reflexion
```

## Completion

Recommendation provided with:
- Selected technique with justification
- Customized template
- Implementation guidance
- Escalation path if needed

**Handoff:**
- If debugging needed → SystematicDebugging
- If evaluation needed → AgentEvaluation

## Skills Invoked

| Phase | Skill |
|-------|-------|
| If technique comparison needed | AgentEvaluation |
| If consistent failures | SystematicDebugging |
