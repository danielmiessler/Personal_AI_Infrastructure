# EvaluateAgent Workflow

> **Trigger:** "evaluate agent" OR "test prompt" OR "measure improvement"
> **Input:** Agent/skill/prompt to evaluate
> **Output:** Evaluation report with scores, analysis, and recommendations

## Phase 1: Define Evaluation Scope

### 1.1 Identify Target

Clarify what is being evaluated:
- Specific skill?
- System prompt?
- Tool definition?
- Full agent behavior?

### 1.2 Determine Evaluation Type

| Type | When to Use |
|------|-------------|
| Direct scoring | Clear rubric criteria exist |
| Pairwise comparison | Comparing two versions |
| Regression testing | After changes, ensure no degradation |
| Benchmark suite | Comprehensive capability assessment |

### 1.3 Define Success Criteria

What constitutes good performance? Document explicitly.

## Phase 2: Design Rubric

### 2.1 Select Dimensions

Choose relevant dimensions from:
- Instruction following (weight: 0.30)
- Output completeness (weight: 0.25)
- Tool efficiency (weight: 0.20)
- Reasoning quality (weight: 0.15)
- Response coherence (weight: 0.10)

Adjust weights based on evaluation goals.

### 2.2 Define Levels

For each dimension, define 5 levels with concrete descriptions:
- 5: Excellent
- 4: Good
- 3: Acceptable
- 2: Poor
- 1: Unacceptable

### 2.3 Create Test Cases

Stratify across complexity:
- 2-3 simple cases
- 2-3 medium cases
- 2-3 complex cases
- 1-2 edge cases

## Phase 3: Execute Evaluation

### 3.1 Run Test Cases

For each test case:
1. Execute against target agent/prompt
2. Capture full response including reasoning
3. Note any errors or unexpected behaviors

### 3.2 Apply LLM-as-Judge

For each response:
```markdown
Evaluate this response against the rubric.

**Response:**
[Agent response]

**Rubric:**
[Dimension definitions and levels]

Provide detailed reasoning for each dimension BEFORE giving scores.
Then provide scores for each dimension.
```

### 3.3 Mitigate Biases

- For pairwise: Run both orderings (A vs B, B vs A)
- Include explicit anti-length instruction
- Require justification before scores

## Phase 4: Analyze Results

### 4.1 Calculate Scores

```
Weighted Score = Σ (dimension_score × dimension_weight)
```

### 4.2 Identify Patterns

- Which dimensions score lowest?
- Which test case types fail most?
- Are failures systematic or random?

### 4.3 Statistical Analysis

If comparing versions:
- Calculate effect size
- Check for statistical significance
- Note confidence intervals

## Phase 5: Generate Report

```markdown
## Evaluation Report: [Target Name]

### Summary
- **Overall Score:** X.XX / 5.00
- **Test Cases:** N passed, M failed
- **Key Finding:** [One sentence]

### Dimension Breakdown

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Instruction Following | X.X | 0.30 | X.XX |
| Output Completeness | X.X | 0.25 | X.XX |
| Tool Efficiency | X.X | 0.20 | X.XX |
| Reasoning Quality | X.X | 0.15 | X.XX |
| Response Coherence | X.X | 0.10 | X.XX |

### Strengths
- [Strength 1]
- [Strength 2]

### Weaknesses
- [Weakness 1 with specific examples]
- [Weakness 2 with specific examples]

### Recommendations
1. [Actionable recommendation 1]
2. [Actionable recommendation 2]

### Test Case Details
[Detailed results for each test case]
```

## Completion

Report generated with:
- Overall weighted score
- Per-dimension analysis
- Specific recommendations for improvement

**Handoff:** If improvements needed, hand off to relevant skill:
- Prompt issues → Prompting
- Context issues → ContextEngineering
- Reasoning issues → ThoughtBasedReasoning

## Skills Invoked

| Phase | Skill |
|-------|-------|
| Phase 2.3 | Prompting (for rubric templates) |
| After completion | ContextEngineering (if context issues found) |
| After completion | ThoughtBasedReasoning (if reasoning issues found) |
