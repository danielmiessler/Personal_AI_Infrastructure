# Research Confidence Scoring

**Purpose:** Transparent, algorithmic confidence scoring for research findings.

This reference document defines the 4-factor confidence algorithm that produces calibrated 0-100% scores. Load this when calculating or explaining confidence levels.

---

## The 4-Factor Confidence Algorithm

Confidence scores are calculated from four weighted factors:

```
Confidence = (Source Quality × 0.30) + (Source Count × 0.25) +
             (Agent Agreement × 0.25) + (Specificity × 0.20)
```

### Factor 1: Source Quality (30% weight)

**What it measures:** The reliability and authority of information sources.

| Source Type | Quality Score |
|-------------|---------------|
| Peer-reviewed journals, official docs | 100 |
| Major news outlets, established experts | 85 |
| Industry publications, company blogs | 70 |
| General websites, forums | 50 |
| Social media, anonymous sources | 30 |
| No source / speculation | 10 |

**Calculation:** Average quality score across all sources for a finding.

### Factor 2: Source Count (25% weight)

**What it measures:** How many independent sources corroborate the finding.

| Source Count | Count Score |
|--------------|-------------|
| 5+ independent sources | 100 |
| 4 sources | 90 |
| 3 sources | 75 |
| 2 sources | 55 |
| 1 source | 35 |
| 0 sources (inference) | 10 |

**Note:** Sources must be independent (not citing each other).

### Factor 3: Agent Agreement (25% weight)

**What it measures:** Consensus across multiple research agents.

| Agreement Level | Agreement Score |
|-----------------|-----------------|
| All agents agree (3/3 or 8/8) | 100 |
| Strong majority (≥75%) | 85 |
| Majority (≥50%) | 65 |
| Split opinions | 40 |
| Single agent only | 25 |
| Agents contradict | 15 |

**Calculation:** Percentage of agents that found similar information.

### Factor 4: Specificity (20% weight)

**What it measures:** How concrete and verifiable the finding is.

| Specificity Level | Specificity Score |
|-------------------|-------------------|
| Exact data, dates, names, numbers | 100 |
| Specific claims with context | 80 |
| General statements with examples | 60 |
| Broad claims without specifics | 40 |
| Vague or hedged statements | 20 |

---

## Score Interpretation

### Confidence Bands

| Score Range | Label | Meaning | Display |
|-------------|-------|---------|---------|
| 90-100% | **Very High** | Extremely well-supported | ✅✅ |
| 80-89% | **High** | Well-corroborated | ✅ |
| 65-79% | **Medium-High** | Good support, minor gaps | 🔵 |
| 50-64% | **Medium** | Moderate support | 🟡 |
| 35-49% | **Low-Medium** | Limited corroboration | 🟠 |
| 20-34% | **Low** | Weak support | ⚠️ |
| 0-19% | **Very Low** | Speculation/single source | ❌ |

### Output Format

```markdown
**Finding:** [The research finding]
**Confidence:** 78% (Medium-High) 🔵
**Breakdown:**
- Source Quality: 85/100 (peer-reviewed + news)
- Source Count: 75/100 (3 sources)
- Agent Agreement: 65/100 (2/3 agents)
- Specificity: 80/100 (specific with context)
```

---

## Worked Examples

### Example 1: High Confidence Finding

**Finding:** "GPT-4 was released in March 2023"

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Source Quality | 95 | Official announcement + major outlets |
| Source Count | 100 | 5+ independent sources |
| Agent Agreement | 100 | All agents report same |
| Specificity | 100 | Exact date, verifiable |

**Calculation:** (95×0.30) + (100×0.25) + (100×0.25) + (100×0.20) = **98.5%**
**Label:** Very High ✅✅

### Example 2: Medium Confidence Finding

**Finding:** "AI could automate 30% of work tasks by 2030"

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Source Quality | 70 | McKinsey report + industry analysis |
| Source Count | 55 | 2 sources with similar estimates |
| Agent Agreement | 65 | 2/3 agents found similar claims |
| Specificity | 60 | Specific but forward-looking |

**Calculation:** (70×0.30) + (55×0.25) + (65×0.25) + (60×0.20) = **63%**
**Label:** Medium 🟡

### Example 3: Low Confidence Finding

**Finding:** "Company X is planning to launch product Y"

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Source Quality | 50 | Single tech blog, no official source |
| Source Count | 35 | 1 source only |
| Agent Agreement | 25 | Only 1 agent found this |
| Specificity | 40 | Vague "planning" language |

**Calculation:** (50×0.30) + (35×0.25) + (25×0.25) + (40×0.20) = **38%**
**Label:** Low-Medium 🟠

---

## Integration with Research Modes

### Quick Research
- Simplified scoring (High/Medium/Low only)
- Skip detailed breakdown
- Focus on source count primarily

### Standard Research
- Full 4-factor calculation
- Include confidence breakdown in report
- Flag findings below 50%

### Extensive Research
- Full calculation with detailed breakdown
- Cross-agent agreement analysis
- Confidence distribution chart
- Separate high/medium/low sections

---

## Confidence Calibration Guidelines

### Avoid Confidence Inflation

**DO:**
- Start with lower confidence, upgrade with evidence
- Require 3+ sources for "High" confidence
- Note when agents disagree

**DON'T:**
- Assume high confidence without corroboration
- Conflate popularity with accuracy
- Ignore contradicting sources

### When to Downgrade Confidence

- Sources cite each other (not independent)
- Only one agent type found the information
- Claims are vague or hard to verify
- Sources have known biases
- Information is very recent (less verification time)

### When to Upgrade Confidence

- Multiple agent types independently found same info
- Primary sources available (not just reporting)
- Claims are specific and verifiable
- Multiple time periods covered
- Expert consensus documented

---

## Display Templates

### Inline Confidence

```markdown
The market grew 15% in 2024 (Confidence: 82% ✅)
```

### Detailed Confidence Block

```markdown
| Finding | Confidence | Sources | Agents |
|---------|------------|---------|--------|
| Market grew 15% | 82% ✅ | 4 | 3/3 |
| Product launches Q2 | 58% 🟡 | 2 | 2/3 |
| Revenue targets | 35% 🟠 | 1 | 1/3 |
```

### Research Report Section

```markdown
## Confidence Summary

**High Confidence (≥80%):** 5 findings
**Medium Confidence (50-79%):** 8 findings
**Low Confidence (<50%):** 3 findings (see caveats)

### Low Confidence Findings (Require Verification)
1. [Finding] - 38% - Single source, no corroboration
2. [Finding] - 42% - Agents disagreed on details
```

---

*This scoring system implements TAC Tactic #5: Add Feedback - transparent, algorithmic quality assessment that can be verified and calibrated.*
