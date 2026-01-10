# OptimizeContext Workflow

> **Trigger:** "optimize context" OR "context issues" OR "diagnose degradation"
> **Input:** Skill, agent, or conversation with context concerns
> **Output:** Diagnosis and optimization recommendations

## Phase 1: Context Audit

### 1.1 Identify Context Components

Inventory all context sources:
- System prompts (fixed)
- Tool definitions (fixed)
- Retrieved documents (variable)
- Message history (accumulating)
- Tool outputs (variable)

### 1.2 Measure Current State

| Metric | How to Measure |
|--------|----------------|
| Total tokens | Count all context components |
| Token distribution | Percentage per component type |
| Growth rate | Tokens added per turn |
| Refresh frequency | How often context is compacted |

### 1.3 Identify Symptoms

Check for degradation patterns:
- [ ] Instructions being forgotten (lost-in-middle)
- [ ] Hallucinated facts persisting (poisoning)
- [ ] Irrelevant content accumulating (distraction)
- [ ] Task requirements mixing (confusion)
- [ ] Contradictory behavior (clash)

## Phase 2: Diagnose Root Cause

### 2.1 Lost-in-Middle Analysis

If instructions forgotten:
1. Map instruction positions in context
2. Check if critical items are in middle third
3. Test recall rate per position

**Diagnostic question:** Are high-priority instructions buried?

### 2.2 Poisoning Analysis

If factual errors compound:
1. Trace error to first occurrence
2. Check if error was in source or hallucinated
3. Verify propagation path

**Diagnostic question:** Where did the bad information enter?

### 2.3 Distraction Analysis

If performance degrades with length:
1. Score relevance of each context section
2. Identify never-referenced sections
3. Calculate signal-to-noise ratio

**Diagnostic question:** What context is never used?

### 2.4 Confusion Analysis

If tasks mix incorrectly:
1. Check section boundary clarity
2. Test task isolation
3. Verify scoping language

**Diagnostic question:** Are task boundaries clear?

### 2.5 Clash Analysis

If behavior is inconsistent:
1. Scan for contradictory statements
2. Check for version conflicts
3. Identify missing conflict resolution rules

**Diagnostic question:** Are there conflicting instructions?

## Phase 3: Design Optimization

### 3.1 Apply Four-Bucket Strategy

For each context component:

| Component | Recommended Strategy |
|-----------|---------------------|
| Large persistent data | Write (external storage) |
| Retrieved documents | Select (relevance filter) |
| Long conversation | Compress (summarize) |
| Independent subtasks | Isolate (sub-agents) |

### 3.2 Restructure for Attention

If lost-in-middle detected:
```
BEFORE:
- Background context
- Critical instructions  ← buried
- Examples
- Constraints

AFTER:
- Critical instructions  ← moved to top
- Background context
- Examples
- Constraints
- Critical instructions (repeated) ← also at bottom
```

### 3.3 Implement Verification

If poisoning detected:
- Add verification step before incorporating claims
- Establish trusted source hierarchy
- Create fact-checking checkpoints

### 3.4 Prune Distractors

If distraction detected:
- Remove sections with <10% relevance
- Convert static context to just-in-time loading
- Implement relevance-based filtering

### 3.5 Clarify Boundaries

If confusion detected:
- Add explicit section headers
- Use task scoping language: "For THIS task only..."
- Isolate with sub-agents if necessary

### 3.6 Resolve Conflicts

If clash detected:
- Remove contradictory statements
- Add version stamps
- Create explicit precedence rules

## Phase 4: Create Optimization Plan

```markdown
## Context Optimization Plan

### Current State
- Total tokens: [N]
- Distribution: [breakdown]
- Primary symptom: [pattern]
- Root cause: [diagnosis]

### Recommended Changes

1. **[Change 1]**
   - Action: [specific change]
   - Expected impact: [improvement]
   - Implementation: [how to do it]

2. **[Change 2]**
   - Action: [specific change]
   - Expected impact: [improvement]
   - Implementation: [how to do it]

### Expected Outcome
- Token reduction: [X%]
- Performance improvement: [description]
- Maintenance changes: [ongoing requirements]

### Monitoring
- Check [metric] every [interval]
- Alert if [condition]
```

## Phase 5: Validate Changes

After implementing optimizations:

1. Run same test cases as before
2. Compare performance metrics
3. Verify symptoms resolved
4. Check for new issues introduced

**Success criteria:**
- Target symptom eliminated
- No new symptoms introduced
- Performance maintained or improved

## Completion

Optimization plan generated with:
- Specific diagnosis of context issues
- Actionable recommendations
- Expected improvements
- Monitoring requirements

**Handoff:**
- If evaluation needed after changes → AgentEvaluation
- If errors found during diagnosis → SystematicDebugging

## Skills Invoked

| Phase | Skill |
|-------|-------|
| Phase 2 | DeepResearch (for context patterns) |
| Phase 2 | SystematicDebugging (for error tracing) |
| Phase 5 | AgentEvaluation (for validation) |
