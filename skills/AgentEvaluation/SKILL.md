---
name: AgentEvaluation
description: Evaluate and improve Claude Code agents using LLM-as-judge patterns, rubrics, and metrics. USE WHEN testing prompt effectiveness OR validating context engineering OR measuring agent improvement OR designing evaluation rubrics OR comparing agent performance.
---

# AgentEvaluation

Comprehensive evaluation methodology for agent systems, addressing non-determinism and multiple valid solution paths.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **EvaluateAgent** | "evaluate agent" OR "test prompt" OR "measure improvement" | `Workflows/EvaluateAgent.md` |

## The 95% Performance Variance

Research on browsing agents revealed three factors explaining most performance differences:

| Factor | Variance Explained |
|--------|-------------------|
| Token usage | ~80% |
| Tool call frequency | ~10% |
| Model selection | ~5% |

**Implication:** Upgrading models provides larger gains than increasing token budgets.

## Evaluation Challenges

### 1. Non-Determinism

Agents may reach correct outcomes through different paths. Evaluate outcomes, not steps.

### 2. Context-Dependent Failures

Quality varies across:
- Complexity levels
- Interaction duration
- Task domain

### 3. Composite Quality

Multiple independent dimensions require multi-dimensional rubrics:
- Accuracy
- Completeness
- Efficiency
- Coherence

## LLM-as-Judge Approaches

### Direct Scoring

For objective criteria with clear standards.

```markdown
## Evaluation Task

Rate the following response on a scale of 1-5:

**Criteria:** [Specific criterion]

**Response to Evaluate:**
[Response]

**Scoring Rubric:**
- 5: Excellent - [description]
- 4: Good - [description]
- 3: Acceptable - [description]
- 2: Poor - [description]
- 1: Unacceptable - [description]

Provide your reasoning BEFORE your score.
```

### Pairwise Comparison

For preference-based evaluation. Always swap positions to mitigate position bias.

```markdown
## Comparison Task

Compare Response A and Response B on [criterion].

**Response A:**
[First response]

**Response B:**
[Second response]

Which response is better for [criterion]? Explain your reasoning before stating your preference.
```

### Chain-of-Thought Requirement

Requiring justification before scores improves reliability by 15-25%.

```markdown
Provide your detailed reasoning and analysis BEFORE giving any scores or ratings.
```

## Bias Mitigation

| Bias Type | Mitigation Strategy |
|-----------|---------------------|
| Position bias | Swap positions, average results |
| Length bias | Explicit anti-length instructions: "Length does not indicate quality" |
| Self-enhancement bias | Cross-model evaluation |
| Authority bias | Require evidence, not appeals to authority |

## Rubric Design

Effective rubrics use weighted dimensions with descriptive levels:

```yaml
dimensions:
  instruction_following:
    weight: 0.30
    levels:
      5: "Follows all instructions precisely"
      4: "Follows most instructions with minor deviations"
      3: "Follows key instructions but misses details"
      2: "Misses significant instructions"
      1: "Ignores or contradicts instructions"

  output_completeness:
    weight: 0.25
    levels:
      5: "Complete solution with all required elements"
      4: "Nearly complete, missing minor elements"
      3: "Partial solution covering main requirements"
      2: "Incomplete, missing major elements"
      1: "Minimal or no useful output"

  tool_efficiency:
    weight: 0.20
    levels:
      5: "Optimal tool usage, no redundant calls"
      4: "Efficient with minor redundancy"
      3: "Acceptable efficiency"
      2: "Inefficient, multiple redundant calls"
      1: "Extremely inefficient or failed tool use"

  reasoning_quality:
    weight: 0.15
    levels:
      5: "Clear, logical, well-structured reasoning"
      4: "Good reasoning with minor gaps"
      3: "Adequate reasoning"
      2: "Weak or unclear reasoning"
      1: "No evident reasoning"

  response_coherence:
    weight: 0.10
    levels:
      5: "Perfectly coherent and well-organized"
      4: "Mostly coherent"
      3: "Acceptable coherence"
      2: "Somewhat disorganized"
      1: "Incoherent"
```

## Test Set Stratification

| Complexity | Characteristics | Examples |
|------------|-----------------|----------|
| Simple | Single tool call | "What's the weather?" |
| Medium | Multiple calls, clear path | "Find and summarize file" |
| Complex | Many calls, some ambiguity | "Refactor this module" |
| Very Complex | Extended interaction | "Debug production issue" |

## Advanced Patterns

### Hierarchical Evaluation

Cheap screening followed by expensive detailed review:

```
Phase 1: Quick heuristic check (cheap model)
  ↓ Pass threshold?
Phase 2: Detailed evaluation (expensive model)
```

### Panel of LLM Judges

Multiple evaluators with voting:

```
Judge 1 (Model A) → Score
Judge 2 (Model B) → Score    → Aggregate → Final Score
Judge 3 (Model C) → Score
```

### Confidence Calibration

Track confidence scores against actual accuracy to calibrate evaluator reliability.

## Metrics

| Scenario | Recommended Metrics |
|----------|---------------------|
| Binary classification | Precision, Recall, F1 |
| Ordinal scales | Spearman's ρ, Cohen's κ |
| Pairwise comparison | Agreement rate, position consistency |

**Good evaluation systems show:**
- Spearman's ρ > 0.8
- Position consistency > 0.9

## Examples

**Example 1: Evaluate a skill's effectiveness**
```
User: "Evaluate how well the Brainstorming skill helps users explore designs"
→ Invokes EvaluateAgent workflow
→ Creates rubric based on skill's stated purpose
→ Runs test cases across complexity levels
→ Generates evaluation report with scores and recommendations
```

**Example 2: Compare two prompt versions**
```
User: "Compare the old vs new system prompt for code generation"
→ Invokes EvaluateAgent workflow
→ Runs pairwise comparison with position swapping
→ Reports which version performs better and why
```

**Example 3: Measure improvement after changes**
```
User: "Measure if the context engineering changes improved performance"
→ Invokes EvaluateAgent workflow
→ Runs before/after comparison on standardized test set
→ Calculates statistical significance of improvement
```

## Related Skills

**Called by:**
- AskDaniel (Principle #7: Specs/Tests/Evals)

**Calls:**
- Prompting (for rubric templates)
- DeepResearch (for benchmark research)

## References

- "The 95% CI for Agent Performance" - browsing agent variance study
- LLM-as-Judge methodologies from academic literature
- Anthropic evaluation best practices
