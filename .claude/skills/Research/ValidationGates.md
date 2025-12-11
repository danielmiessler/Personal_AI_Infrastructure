# Research Validation Gates

**Purpose:** Automated quality verification for research outputs before final delivery.

This reference document defines the 3-gate validation system that ensures research reliability. Load this when validation is needed during research synthesis.

---

## The 3-Gate Validation System

Research must pass through three validation gates before being marked as complete. Each gate catches different types of quality issues.

### Gate 1: Source Validation

**Purpose:** Verify that claims are properly attributed and sources are accessible.

**Checks:**
1. **Citation Presence** - Every factual claim has at least one source
2. **Source Accessibility** - URLs are valid and content is retrievable
3. **Source Recency** - Sources are appropriately recent for the topic
4. **Source Diversity** - Multiple independent sources (not same origin)

**Pass Criteria:**
- ✅ 100% of factual claims have citations
- ✅ ≥80% of URLs are accessible (some may be paywalled)
- ✅ ≥70% of sources from last 2 years (for current topics)
- ✅ ≥3 independent source origins

**Failure Actions:**
- Flag uncited claims for verification
- Remove or note inaccessible sources
- Add recency warnings for dated sources
- Note limited source diversity in report

### Gate 2: Confidence Validation

**Purpose:** Ensure confidence scores are accurate and well-calibrated.

**Checks:**
1. **Score Consistency** - Confidence matches source corroboration
2. **Threshold Compliance** - Scores align with defined thresholds
3. **Uncertainty Flagging** - Conflicting information properly noted
4. **Speculation Labeling** - Inferences clearly marked as such

**Pass Criteria:**
- ✅ High confidence (≥80%) only with 3+ corroborating sources
- ✅ Medium confidence (50-79%) with 1-2 sources
- ✅ Low confidence (<50%) for single/weak sources
- ✅ All speculation explicitly labeled

**Failure Actions:**
- Downgrade inflated confidence scores
- Add corroboration notes
- Insert uncertainty markers
- Label speculative content

### Gate 3: Contradiction Detection

**Purpose:** Identify and surface conflicting information between sources.

**Checks:**
1. **Fact Conflicts** - Same topic, different claims
2. **Number Conflicts** - Statistical disagreements
3. **Date Conflicts** - Timeline inconsistencies
4. **Opinion vs Fact** - Mixing analysis types

**Pass Criteria:**
- ✅ All contradictions explicitly noted in report
- ✅ Conflicting claims show all perspectives
- ✅ Statistical ranges provided for number conflicts
- ✅ Clear separation of fact vs opinion

**Failure Actions:**
- Add "Conflicting Information" section
- Present multiple viewpoints
- Note statistical uncertainty
- Clarify fact/opinion boundaries

---

## Validation Workflow Integration

### When to Run Validation

**Automatic (Built into Conduct.md):**
- After synthesis, before final output
- Runs all 3 gates sequentially
- Gate failures don't block output (warnings only)

**Manual Trigger:**
- User says "validate research" or "check sources"
- Runs full validation with detailed report

### Validation Output Format

```markdown
## 🔍 Validation Report

### Gate 1: Source Validation
- Citations: [X/Y claims cited] [✅ PASS / ⚠️ WARN]
- Accessibility: [X% accessible] [✅ PASS / ⚠️ WARN]
- Recency: [X% within 2 years] [✅ PASS / ⚠️ WARN]
- Diversity: [X independent sources] [✅ PASS / ⚠️ WARN]

### Gate 2: Confidence Validation
- Score Calibration: [✅ PASS / ⚠️ WARN]
- Threshold Compliance: [✅ PASS / ⚠️ WARN]
- Uncertainty Flagging: [✅ PASS / ⚠️ WARN]

### Gate 3: Contradiction Detection
- Conflicts Found: [X]
- Conflicts Documented: [✅ PASS / ⚠️ WARN]

### Overall Status: [✅ VALIDATED / ⚠️ WARNINGS / ❌ FAILED]
```

---

## Quick Reference: Validation Thresholds

| Metric | Pass | Warn | Fail |
|--------|------|------|------|
| Citation Rate | ≥95% | 80-94% | <80% |
| Source Accessibility | ≥80% | 60-79% | <60% |
| Source Recency | ≥70% | 50-69% | <50% |
| Source Diversity | ≥3 | 2 | 1 |
| Confidence Calibration | Aligned | Minor drift | Major drift |
| Contradiction Documentation | 100% | ≥80% | <80% |

---

## Integration with Research Modes

### Quick Research
- Gate 1 only (source validation)
- Warn on issues, don't block

### Standard Research
- Gates 1 + 2 (source + confidence)
- Full validation report in output

### Extensive Research
- All 3 gates with detailed analysis
- Separate validation section in report
- Contradiction analysis required

---

## Error Recovery

If validation fails significantly:

1. **Re-query** - Launch additional agents for uncited claims
2. **Source Check** - Verify accessibility of key URLs
3. **Confidence Recalibration** - Adjust scores based on actual corroboration
4. **Contradiction Resolution** - Explicitly document disagreements

**Never block research output** - validation issues become warnings in the final report.

---

*This validation system implements TAC Tactic #5: Add Feedback - self-correcting systems that validate their own work.*
