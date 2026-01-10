---
name: ThoughtBasedReasoning
description: Reasoning techniques for complex problems. USE WHEN tackling multi-step logic OR arithmetic OR commonsense reasoning OR symbolic manipulation OR problems where simple prompting fails OR selecting reasoning approach.
---

# ThoughtBasedReasoning

Comprehensive guide to Chain-of-Thought and related prompting techniques for enhanced LLM reasoning.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **SelectReasoning** | "which reasoning technique" OR "complex problem" OR "reasoning fails" | `Workflows/SelectReasoning.md` |

## Nine Reasoning Techniques

### 1. Chain-of-Thought (CoT)

Demonstrate intermediate reasoning steps through exemplars.

**Template:**
```markdown
Q: [Problem]
A: Let's solve this step by step.
Step 1: [First reasoning step]
Step 2: [Second reasoning step]
...
Therefore, the answer is [answer].
```

**Accuracy gain:** +30-70% on complex tasks

**Best for:** Multi-step arithmetic, logical deduction, word problems

**Limitation:** Requires quality exemplars

### 2. Zero-Shot CoT

Trigger reasoning without exemplars using magic phrases.

**Template:**
```markdown
Q: [Problem]
A: Let's think step by step.
```

**Alternative triggers:**
- "Let's work through this systematically."
- "Let's break this down."
- "Let's analyze this carefully."

**Accuracy gain:** +20-60%

**Best for:** When exemplars unavailable, quick prototyping

**Limitation:** Less reliable than few-shot CoT

### 3. Self-Consistency

Generate multiple reasoning paths and use majority voting.

**Process:**
```
Problem → Generate N solutions (temperature > 0)
       → Extract answer from each
       → Return majority answer
```

**Recommended N:** 5-10 for balance of accuracy and cost

**Accuracy gain:** +10-20% over single CoT

**Best for:** High-stakes decisions, ambiguous problems

**Limitation:** N× cost, only works for problems with discrete answers

### 4. Tree of Thoughts (ToT)

Explore problem-solving via tree search with self-evaluation.

**Process:**
```
Problem
├── Thought 1 → Evaluate → [promising]
│   ├── Thought 1.1 → Evaluate → [dead end]
│   └── Thought 1.2 → Evaluate → [solution!]
├── Thought 2 → Evaluate → [dead end]
└── Thought 3 → Evaluate → [promising]
    └── ...
```

**Accuracy gain:** +50-70% on challenging problems

**Best for:** Puzzles, planning, creative problems with exploration

**Limitation:** High latency, complex implementation

### 5. Least-to-Most Prompting

Decompose complex problems into simpler subproblems solved sequentially.

**Template:**
```markdown
Problem: [Complex problem]

First, let's identify the subproblems:
1. [Simpler subproblem 1]
2. [Simpler subproblem 2]
3. [Simpler subproblem 3]

Now let's solve each:
Subproblem 1: [Solution 1]
Subproblem 2: Using the result from subproblem 1, [Solution 2]
Subproblem 3: Using results from above, [Solution 3]

Final answer: [Combined solution]
```

**Accuracy gain:** +30-80% on compositional tasks

**Best for:** Problems that naturally decompose, teaching sequences

**Limitation:** Requires clear decomposition structure

### 6. ReAct (Reasoning + Acting)

Interleave reasoning with external actions.

**Template:**
```markdown
Question: [Question requiring external information]

Thought 1: I need to find [information].
Action 1: Search[query]
Observation 1: [Search results]

Thought 2: Based on this, I should check [next thing].
Action 2: Lookup[specific item]
Observation 2: [Lookup results]

Thought 3: Now I can answer the question.
Action 3: Finish[answer]
```

**Available actions:** Search, Lookup, Calculate, Finish

**Best for:** Knowledge-intensive tasks, fact verification

**Limitation:** Requires tool integration

### 7. Program-Aided Language (PAL)

Generate executable code instead of natural language reasoning.

**Template:**
```markdown
Question: [Math or logic problem]

Let me write code to solve this:

```python
# [Problem breakdown in comments]
variable1 = [calculation]
variable2 = [calculation]
result = [final calculation]
print(result)
```

Running this code gives: [answer]
```

**Best for:** Arithmetic, symbolic manipulation, algorithmic problems

**Advantage:** Eliminates calculation errors

**Limitation:** Requires code execution capability

### 8. Auto-CoT

Automatically generate few-shot exemplars.

**Process:**
```
Training set → Cluster by similarity
            → Select representative from each cluster
            → Generate reasoning with Zero-Shot CoT
            → Use as exemplars
```

**Best for:** When manual exemplar creation is impractical

**Performance:** Matches manual CoT quality

### 9. Reflexion

Learn from failures through verbal reflection.

**Process:**
```
Attempt → Failure → Reflect on what went wrong
                 → Generate corrected approach
                 → Retry with reflection as context
```

**Accuracy:** 91% on HumanEval with iteration

**Best for:** Iterative refinement, learning from mistakes

**Limitation:** Multiple attempts required

## Decision Matrix

| Condition | Recommended Technique |
|-----------|----------------------|
| Exemplars available, high accuracy needed | Chain-of-Thought |
| No exemplars, quick solution needed | Zero-Shot CoT |
| High-stakes, discrete answer | Self-Consistency |
| Exploration required, complex | Tree of Thoughts |
| Problem naturally decomposes | Least-to-Most |
| External information needed | ReAct |
| Arithmetic/symbolic problem | PAL |
| Many similar problems | Auto-CoT |
| Learning from failures | Reflexion |

## Common Mistakes

| Mistake | Correction |
|---------|------------|
| Using CoT for simple lookups | Skip reasoning for factual retrieval |
| Insufficient sampling in Self-Consistency | Use N ≥ 5 for reliable voting |
| Applying ToT to linear problems | Reserve for genuinely branching problems |
| Skipping decomposition in Least-to-Most | Always list subproblems first |
| Not verifying ReAct observations | Check tool output quality |

## Technique Combinations

**CoT + Self-Consistency:** Most reliable for important decisions

**ReAct + CoT:** Tool use with explicit reasoning

**Least-to-Most + PAL:** Decompose then compute

**Reflexion + Any:** Add iterative improvement layer

## Examples

**Example 1: Select technique for word problem**
```
User: "How do I solve this: If a train leaves at 3pm going 60mph..."
→ Invokes SelectReasoning workflow
→ Identifies: arithmetic + multi-step
→ Recommends: Chain-of-Thought or PAL
→ Provides template
```

**Example 2: Improve failing solution**
```
User: "My agent keeps getting this calculation wrong"
→ Invokes SelectReasoning workflow
→ Current approach: Zero-Shot CoT (failing)
→ Recommends: PAL (eliminate arithmetic errors)
→ Shows implementation
```

**Example 3: High-stakes decision**
```
User: "Need reliable answer for this logic puzzle"
→ Invokes SelectReasoning workflow
→ Recommends: CoT + Self-Consistency
→ Explains voting mechanism
→ Sets N=7 for reliability
```

## Related Skills

**Called by:**
- WritingPlans (for complex problem decomposition)
- SystematicDebugging (for hypothesis testing)

**Calls:**
- SystematicDebugging (when reasoning consistently fails)
- AgentEvaluation (for technique comparison)

## References

- Wei et al. "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
- Kojima et al. "Large Language Models are Zero-Shot Reasoners"
- Wang et al. "Self-Consistency Improves Chain of Thought Reasoning"
- Yao et al. "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
- Zhou et al. "Least-to-Most Prompting Enables Complex Reasoning"
- Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models"
- Gao et al. "PAL: Program-aided Language Models"
- Shinn et al. "Reflexion: Language Agents with Verbal Reinforcement Learning"
