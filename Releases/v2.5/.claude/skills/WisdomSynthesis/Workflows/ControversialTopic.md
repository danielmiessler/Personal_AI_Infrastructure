# ControversialTopic Workflow

Execute the balanced multi-perspective analysis pipeline: Research(extensive) → Council → RedTeam → FirstPrinciples

**Pipeline:** `controversial_topic` from `Data/Pipelines.yaml`

---

## Voice Notification

**MANDATORY - Execute immediately:**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the ControversialTopic workflow in the WisdomSynthesis skill for balanced multi-perspective analysis"}' \
  > /dev/null 2>&1 &
```

**Text notification:**
```
Running the **ControversialTopic** workflow in the **WisdomSynthesis** skill for balanced multi-perspective analysis...
```

---

## Workflow Steps

### Step 0: Identify the Controversial Topic

Extract the topic from the user's request:

| User Says | Topic |
|-----------|-------|
| "controversial topic analysis: [X]" | X |
| "balanced analysis of [X]" | X |
| "multi-perspective on [X]" | X |
| "nuanced analysis: [X]" | X |

**Important:** Verify topic is genuinely controversial/nuanced. If not, recommend simpler analysis.

### Step 1: Extensive Research with Bias Awareness

Launch comprehensive multi-source research focusing on diverse perspectives:

```typescript
// Launch 3x parallel research agents for maximum perspective coverage
Task({
  subagent_type: "ClaudeResearcher",
  description: "Research topic from multiple angles (1/3)",
  prompt: `Research this controversial topic comprehensively: [TOPIC]

  Focus: Mainstream perspectives and established positions
  - What are the dominant viewpoints?
  - What evidence supports each side?
  - What are the key arguments?
  - What organizations/experts hold these views?

  CRITICAL: Present ALL perspectives fairly, even those you might disagree with.
  Avoid editorializing. Report what each side actually believes and why.

  Return comprehensive findings with balanced source representation.`,
  model: "sonnet"
})

Task({
  subagent_type: "GeminiResearcher",
  description: "Research alternative and minority perspectives (2/3)",
  prompt: `Research this controversial topic comprehensively: [TOPIC]

  Focus: Alternative, minority, and underrepresented perspectives
  - What viewpoints are less commonly heard?
  - What are the contrarian positions?
  - What do marginalized groups say?
  - What historical context is often missed?

  CRITICAL: Seek out perspectives that challenge mainstream narratives.
  Look for thoughtful dissent and nuanced positions.

  Return comprehensive findings emphasizing diverse viewpoints.`,
  model: "sonnet"
})

Task({
  subagent_type: "ClaudeResearcher",
  description: "Research historical context and evolution (3/3)",
  prompt: `Research this controversial topic comprehensively: [TOPIC]

  Focus: Historical evolution and context
  - How has this debate evolved over time?
  - What were past perspectives that changed?
  - What are the underlying value differences?
  - What is the empirical evidence (not opinion)?

  CRITICAL: Distinguish facts from values/opinions.
  Track how the debate has shifted and why.

  Return comprehensive findings with historical depth.`,
  model: "sonnet"
})
```

**Wait for all 3 research agents to complete.** Combine outputs as `topic_research`.

### Step 2: Council Multi-Perspective Debate

Launch debate with diverse ideological perspectives:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "Multi-perspective council debate",
  prompt: `Invoke the Council skill for balanced debate on: [TOPIC]

  Research Context:
  [TOPIC_RESEARCH]

  Debate structure:
  - **Topic**: [TOPIC]
  - **Question**: "What is the right approach to this issue?"

  Required Perspectives (5 agents):
  1. **Progressive**: Focus on social justice, equity, systemic change
  2. **Conservative**: Focus on tradition, stability, individual responsibility
  3. **Libertarian**: Focus on freedom, markets, minimal intervention
  4. **Pragmatist**: Focus on evidence, outcomes, practical solutions
  5. **Academic/Neutral**: Focus on research, complexity, trade-offs

  Each agent should:
  - State their position clearly
  - Provide 2-3 strongest arguments
  - Acknowledge legitimate concerns from other sides
  - Identify areas of potential agreement

  Debate format: Round-robin (each speaks), then open discussion, then synthesis.

  Return:
  1. Each perspective's position and arguments
  2. Key points of disagreement
  3. Surprising areas of agreement
  4. Synthesized insights across perspectives`,
  model: "sonnet"
})
```

**Wait for Council debate completion.** Store output as `perspectives`.

### Step 3: RedTeam Critical Analysis

Challenge all perspectives with adversarial critique:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "RedTeam adversarial critique",
  prompt: `Invoke the RedTeam skill to critique all perspectives on: [TOPIC]

  Perspectives from Council:
  [PERSPECTIVES]

  RedTeam mission: Challenge EVERY perspective, not just one side.

  For each perspective (Progressive, Conservative, Libertarian, Pragmatist, Academic):
  1. **Steelman**: State the strongest version of their argument
  2. **Attack**: Identify the weakest points and contradictions
  3. **Blind Spots**: What are they not seeing or acknowledging?
  4. **Base Rate**: What does the empirical evidence actually say?

  Special focus:
  - Hidden assumptions each side makes
  - Cherry-picked evidence
  - Logical fallacies
  - Motivated reasoning
  - Trade-offs they minimize

  Return: Ruthlessly fair critique of ALL sides.`,
  model: "sonnet"
})
```

**Wait for RedTeam critique completion.** Store output as `critiqued_perspectives`.

### Step 4: First Principles Decomposition

Strip away rhetoric to reach core principles and values:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "First principles decomposition",
  prompt: `Using first principles thinking, decompose this controversy to fundamentals:

  Topic: [TOPIC]
  Perspectives: [PERSPECTIVES]
  Critiques: [CRITIQUED_PERSPECTIVES]

  Questions to answer:
  1. **Core Values**: What fundamental values does each side prioritize?
     - What do they care most about? (e.g., freedom, equality, security, tradition)

  2. **Empirical Disagreements**: What are the factual disputes?
     - What do they disagree about regarding how the world works?
     - Which disagreements are resolvable with evidence?

  3. **Value Trade-offs**: What are the real trade-offs?
     - What are we actually choosing between?
     - Can both values be satisfied, or is there genuine conflict?

  4. **Hidden Assumptions**: What axioms does each side assume?
     - What must be true for their position to be correct?
     - Are these assumptions testable?

  5. **Crux Points**: What would change someone's mind?
     - What evidence or argument would shift each position?
     - Are positions based on values (immutable) or beliefs (updatable)?

  Return: Clear mapping from surface disagreements to fundamental differences.`,
  model: "opus"  // Use opus for deep analysis
})
```

**Wait for decomposition completion.** Store output as `fundamental_analysis`.

### Step 5: Synthesize Balanced Analysis

Combine all layers into nuanced synthesis:

**Report Structure:**

```markdown
# Balanced Analysis: [TOPIC]

## Executive Summary

### The Core Tension
[One sentence capturing the fundamental trade-off or disagreement]

### Key Finding
[Most important insight from multi-layer analysis]

### Recommendation
[If applicable - or "No clear answer exists" with explanation]

---

## Layer 1: Topic Overview

### What Is This About?
[Clear explanation of the controversial issue]

### Why Does This Matter?
[Stakes and real-world impact]

### Historical Context
[How this debate evolved]

### Current Landscape
[State of the debate today]

---

## Layer 2: Perspectives Matrix

### Progressive Perspective
**Core Values**: [What they prioritize]

**Position**: [Their stance in 2-3 sentences]

**Strongest Arguments**:
1. [Argument 1]
2. [Argument 2]
3. [Argument 3]

**Evidence Cited**:
- [Evidence 1]
- [Evidence 2]

**Legitimate Concerns**: [What they're rightfully worried about]

---

### Conservative Perspective
**Core Values**: [What they prioritize]

**Position**: [Their stance in 2-3 sentences]

**Strongest Arguments**:
1. [Argument 1]
2. [Argument 2]
3. [Argument 3]

**Evidence Cited**:
- [Evidence 1]
- [Evidence 2]

**Legitimate Concerns**: [What they're rightfully worried about]

---

### Libertarian Perspective
**Core Values**: [What they prioritize]

**Position**: [Their stance in 2-3 sentences]

**Strongest Arguments**:
1. [Argument 1]
2. [Argument 2]
3. [Argument 3]

**Evidence Cited**:
- [Evidence 1]
- [Evidence 2]

**Legitimate Concerns**: [What they're rightfully worried about]

---

### Pragmatist Perspective
**Core Values**: [What they prioritize]

**Position**: [Their stance in 2-3 sentences]

**Strongest Arguments**:
1. [Argument 1]
2. [Argument 2]
3. [Argument 3]

**Evidence Cited**:
- [Evidence 1]
- [Evidence 2]

**Legitimate Concerns**: [What they're rightfully worried about]

---

### Academic/Neutral Perspective
**Core Values**: [What they prioritize]

**Position**: [Their stance in 2-3 sentences]

**Strongest Arguments**:
1. [Argument 1]
2. [Argument 2]
3. [Argument 3]

**Evidence Cited**:
- [Evidence 1]
- [Evidence 2]

**Legitimate Concerns**: [What they're rightfully worried about]

---

## Layer 3: Critical Analysis (RedTeam)

### Critiques of Progressive Position
**Steelman**: [Strongest version of argument]
**Weaknesses**: [Vulnerabilities and contradictions]
**Blind Spots**: [What they're not acknowledging]

### Critiques of Conservative Position
**Steelman**: [Strongest version of argument]
**Weaknesses**: [Vulnerabilities and contradictions]
**Blind Spots**: [What they're not acknowledging]

### Critiques of Libertarian Position
**Steelman**: [Strongest version of argument]
**Weaknesses**: [Vulnerabilities and contradictions]
**Blind Spots**: [What they're not acknowledging]

### Critiques of Pragmatist Position
**Steelman**: [Strongest version of argument]
**Weaknesses**: [Vulnerabilities and contradictions]
**Blind Spots**: [What they're not acknowledging]

### Critiques of Academic Position
**Steelman**: [Strongest version of argument]
**Weaknesses**: [Vulnerabilities and contradictions]
**Blind Spots**: [What they're not acknowledging]

---

## Layer 4: First Principles Analysis

### Core Value Differences

| Perspective | Primary Value | Secondary Value | Trade-off Accept |
|-------------|---------------|-----------------|------------------|
| Progressive | [value] | [value] | [what they sacrifice] |
| Conservative | [value] | [value] | [what they sacrifice] |
| Libertarian | [value] | [value] | [what they sacrifice] |
| Pragmatist | [value] | [value] | [what they sacrifice] |
| Academic | [value] | [value] | [what they sacrifice] |

### Empirical Disagreements

**Factual disputes that could be resolved with evidence:**
1. [Disagreement 1] - Current evidence: [summary]
2. [Disagreement 2] - Current evidence: [summary]
3. [Disagreement 3] - Current evidence: [summary]

**Factual disputes that are hard to resolve:**
1. [Disagreement 1] - Why hard: [reason]
2. [Disagreement 2] - Why hard: [reason]

### Fundamental Trade-offs

**Real trade-offs (can't satisfy both fully):**
- [Value A] vs [Value B]: [Explanation of tension]
- [Value C] vs [Value D]: [Explanation of tension]

**False trade-offs (both could be satisfied):**
- [Claimed trade-off]: [Why it's false]

### Hidden Assumptions

| Perspective | Key Assumption | If This Is False... |
|-------------|----------------|---------------------|
| Progressive | [assumption] | [Their argument fails because...] |
| Conservative | [assumption] | [Their argument fails because...] |
| Libertarian | [assumption] | [Their argument fails because...] |
| Pragmatist | [assumption] | [Their argument fails because...] |
| Academic | [assumption] | [Their argument fails because...] |

### Crux Points (What Would Change Minds?)

**Progressive would change position if:**
- [Evidence/argument that would shift them]

**Conservative would change position if:**
- [Evidence/argument that would shift them]

**Libertarian would change position if:**
- [Evidence/argument that would shift them]

**Pragmatist would change position if:**
- [Evidence/argument that would shift them]

---

## Nuanced Synthesis

### Areas of Agreement

Surprisingly, most perspectives agree on:
1. [Area of agreement 1]
2. [Area of agreement 2]
3. [Area of agreement 3]

### Core Disagreements (Irreducible)

Fundamental conflicts that can't be resolved by evidence:
1. [Value disagreement 1] - [Explanation]
2. [Value disagreement 2] - [Explanation]

### Empirical Questions Still Open

Questions that better research could answer:
1. [Research question 1]
2. [Research question 2]

### Potential Synthesis Approaches

**Approach 1**: [Partial solution addressing multiple values]
- Satisfies: [Which perspectives]
- Doesn't satisfy: [Which perspectives and why]

**Approach 2**: [Alternative partial solution]
- Satisfies: [Which perspectives]
- Doesn't satisfy: [Which perspectives and why]

**Approach 3**: [Experimental/local approach]
- Satisfies: [Which perspectives]
- Doesn't satisfy: [Which perspectives and why]

### The Honest Answer

[What we actually know and don't know about this topic. Where is there genuine uncertainty vs. value disagreements?]

---

## Recommendations

### For Further Research
[What studies or evidence would most help resolve empirical disagreements]

### For Productive Dialogue
[How people on different sides can have better conversations]

### For Personal Position
[Framework for thinking through your own position on this issue]

---

## Meta-Analysis

### Bias Check
- Research source diversity: [Assessment]
- Perspective balance: [Assessment]
- Steelmanning quality: [Assessment]

### Confidence Levels
- **Factual claims**: [High/Medium/Low] - [Reason]
- **Perspective representation**: [High/Medium/Low] - [Reason]
- **Synthesis quality**: [High/Medium/Low] - [Reason]

### Limitations
[What this analysis doesn't cover or might be missing]

---

## Curated Resources

### For Each Perspective

**Progressive viewpoint:**
- Book: [title] by [author]
- Article: [title] ([URL])

**Conservative viewpoint:**
- Book: [title] by [author]
- Article: [title] ([URL])

**Libertarian viewpoint:**
- Book: [title] by [author]
- Article: [title] ([URL])

**Academic/Research:**
- Paper: [title] ([year])
- Study: [title] ([URL])

### Balanced Sources
[Sources that present multiple perspectives fairly]

---

*Generated by WisdomSynthesis ControversialTopic Pipeline v1.0.0*
*Research: 3 parallel agents (bias-aware) | Debate: Council (5 perspectives) | Critique: RedTeam | Analysis: FirstPrinciples*
*Total analysis time: ~60-90 seconds*
```

---

## Error Handling

### Research Phase Issues

**Source bias detected:**
```
Research heavily weighted toward [perspective].

Actions taken:
- Added targeted search for [opposing perspective]
- Weighted down [biased source]
- Flagged in final report

Confidence impact: Reduced to [level]
```

**Topic too polarized:**
```
Research shows extreme polarization with minimal nuanced positions.

Options:
1. Continue with polarized analysis (flag as limitation)
2. Extend research for moderate voices
3. Focus on first principles and values instead of positions
```

### Council Phase Issues

**Perspectives converging:**
```
Council debate showing low diversity (high agreement across perspectives).

Possible reasons:
- Topic not actually controversial
- Perspectives not sufficiently distinct
- Missing key viewpoint

Actions:
1. Add more contrarian perspective
2. Re-run with clearer position differentiation
3. Flag as "less controversial than assumed"
```

**Strawmanning detected:**
```
One or more perspectives appear strawmanned (weak version of argument).

Failed perspective: [name]
Issue: [What's wrong]

Action: Re-run that perspective with explicit steelmanning instruction.
```

### RedTeam Phase Issues

**One-sided critique:**
```
RedTeam critique disproportionately attacked [perspective].

Quality check:
- Progressive critique: [word count]
- Conservative critique: [word count]
- [Imbalance detected]

Action: Re-run with explicit equal-critique instruction.
```

---

## Performance Notes

**Typical execution time:** 60-90 seconds

**Breakdown:**
- Research (extensive, bias-aware): ~20-30s (3 agents)
- Council debate (5 perspectives): ~20-30s
- RedTeam critique: ~15-20s
- FirstPrinciples analysis: ~15-20s (opus)
- Synthesis: <5s

**Model recommendations:**
- Research: `sonnet` (bias awareness requires intelligence)
- Council: `sonnet` (perspective representation)
- RedTeam: `sonnet` (fair critique)
- FirstPrinciples: `opus` (deep value analysis)

---

## Examples

**Example 1: Policy debate**
```
User: "Balanced analysis of universal basic income"

→ Research: Progressive (social safety net), Conservative (work incentives), Libertarian (economic freedom)
→ Council: Debate implementation, funding, effects
→ RedTeam: Challenge assumptions about human motivation, economic effects
→ FirstPrinciples: Values (dignity vs incentives), empirical (pilot programs)
→ Output: Nuanced analysis showing trade-offs and open questions
```

**Example 2: Ethical issue**
```
User: "Controversial topic analysis: AI regulation"

→ Research: Tech industry, policymakers, ethicists, public interest groups
→ Council: Innovation vs safety, markets vs governance, speed vs caution
→ RedTeam: Challenge regulatory capture, innovation stifling, alignment feasibility
→ FirstPrinciples: Values (progress, safety, control), uncertainties (AI capabilities)
→ Output: Multi-layered analysis of competing values and uncertainties
```

**Example 3: Social issue**
```
User: "Nuanced analysis: free speech vs content moderation"

→ Research: Free speech absolutists, harm reduction advocates, legal scholars
→ Council: Debate platforms, governments, individual rights, community harm
→ RedTeam: Challenge slippery slopes on both sides
→ FirstPrinciples: Values (liberty vs safety), empirical (moderation effects)
→ Output: Framework showing genuine trade-offs vs. false dilemmas
```
