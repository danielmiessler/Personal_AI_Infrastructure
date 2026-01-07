# Multi-Agent Standup Methodology

This document describes the philosophy, structure, and best practices for running effective multi-agent standups using the Council Framework.

## Purpose

The multi-agent standup methodology leverages diverse AI agent perspectives to produce better decisions than any single agent could achieve alone. By simulating a team of specialists with different expertise, priorities, and viewpoints, we surface issues, trade-offs, and opportunities that might otherwise be missed.

### Core Principles

1. **Diverse Perspectives**: Each agent brings unique expertise and concerns
2. **Structured Deliberation**: Rounds ensure thorough exploration before synthesis
3. **Conflict as Signal**: Disagreement highlights important trade-offs
4. **Synthesis over Voting**: Combine insights rather than pick a winner
5. **Actionable Output**: Every standup produces concrete next steps

### Why Multi-Agent?

Research and practice show that multi-agent deliberation finds **2-3x more issues** than solo agent mode:

| Approach | Issues Found | Coverage | Time |
|----------|--------------|----------|------|
| Solo Agent | Baseline | Focused | Fast |
| 2 Agents | 1.5x | Complementary | 1.2x |
| 3-4 Agents | 2-3x | Comprehensive | 1.5x |
| Full Team (9) | 3-4x | Exhaustive | 2x |

The sweet spot is typically 3-4 agents for most decisions.

## How Rounds Work

Standups proceed through distinct rounds, each with a specific purpose:

### Round 1: Independent Perspectives

**Goal**: Gather unbiased initial viewpoints

- Each agent analyzes the topic independently
- No cross-talk or influence between agents
- Agents apply their domain expertise and frameworks
- Output: Individual position statements

**Why Independent First?**
- Prevents groupthink and anchoring bias
- Ensures minority perspectives are captured
- Creates a baseline for measuring deliberation value

### Round 2: Cross-Talk & Refinement

**Goal**: Engage with other perspectives, identify conflicts

- Agents see and respond to Round 1 statements
- Direct engagement encouraged: "I agree with Daniel that... but I'm concerned about..."
- Conflicts are surfaced and explicitly named
- Devil's advocate may be activated
- Output: Refined positions, identified conflicts, trade-offs

**What Makes Good Cross-Talk?**
- Acknowledging valid points from others
- Explaining disagreements with reasoning
- Proposing compromises or alternatives
- Asking clarifying questions

### Round 3: Final Positions & Consensus Building

**Goal**: Move toward synthesis

- Agents state final positions
- Explicit consensus/dissent signals
- Remaining conflicts escalated
- Trade-off matrix populated
- Output: Final positions, confidence levels

### Synthesis Phase

**Goal**: Combine perspectives into actionable decision

After rounds complete, the SynthesisEngine:

1. Identifies areas of agreement (high confidence)
2. Maps remaining disagreements to trade-offs
3. Applies synthesis strategy (consensus/weighted/facilitator)
4. Generates decision with confidence score
5. Extracts action items

## When to Use Standups

### Ideal Use Cases

| Scenario | Recommended Roster | Rounds |
|----------|-------------------|--------|
| **Architecture Decisions** | architecture-review | 3 |
| **Security Reviews** | security-review | 3 |
| **Sprint Planning** | planning-estimation | 2-3 |
| **API Design** | architecture-review | 2-3 |
| **Production Incidents** | security + SRE | 2 |
| **Compliance Audits** | security-review | 3 |
| **Major Refactoring** | full-team | 3 |
| **New Feature Scoping** | planning-estimation | 2 |

### Decision Complexity Guide

```
Low Complexity (Quick Review - 2 agents, 1 round)
 - Minor scope adjustments
 - Routine backlog grooming
 - Simple technical questions
 - No security/compliance implications

Medium Complexity (Standard Standup - 3-4 agents, 2 rounds)
 - New feature design
 - API endpoint additions
 - Database schema changes
 - Testing strategy decisions

High Complexity (Full Standup - 4-5 agents, 3 rounds)
 - Architecture changes
 - Security-sensitive features
 - Cross-team dependencies
 - Compliance-impacting decisions

Critical (Security Review - 4 agents, 3+ rounds)
 - Authentication/authorization
 - Data handling changes
 - Compliance requirements
 - Security incidents
```

## Quality Features

### Devil's Advocate

When enabled, one agent is designated to actively challenge the emerging consensus:

- Rotates between agents each standup
- Challenges assumptions and identifies risks
- Required to find at least one concern
- Helps prevent premature consensus

**When to Enable**: Architecture decisions, high-stakes choices, when you suspect groupthink

**When to Disable**: Quick reviews, time-critical decisions, well-trodden ground

### Trade-Off Matrix

Generated during synthesis, the trade-off matrix makes explicit:

```
Trade-Off: Speed vs. Security
 - Option A (faster): 3 days, basic auth, 70% confidence
 - Option B (secure): 7 days, OAuth2 + MFA, 95% confidence
 - Recommendation: Option B (security-critical feature)
```

Captures:
- Competing concerns between agents
- Explicit costs/benefits
- Recommended resolution with reasoning

### Confidence Scoring

Every synthesis includes a confidence score:

| Score | Meaning | Action |
|-------|---------|--------|
| 90-100% | Strong consensus, clear decision | Proceed confidently |
| 70-89% | Good alignment, minor concerns | Proceed, monitor concerns |
| 50-69% | Moderate agreement, notable trade-offs | Document trade-offs, proceed carefully |
| 30-49% | Significant disagreement | May need more discussion or user input |
| <30% | No consensus | Escalate to user for decision |

### Veto Power

Certain agents have veto authority in their domain:

**Daniel (Security)**:
- Can veto on CRITICAL vulnerabilities (CVSS >= 9.0)
- Can veto on CMMC compliance blockers
- Veto triggers: "This is a security veto because..."

**Amy (QA)**:
- Can veto on untestable designs
- Can veto on missing quality gates
- Veto triggers: "This is a quality veto because..."

When a veto is exercised:
1. Standup pauses
2. Veto reason is prominently displayed
3. Resolution options presented
4. Cannot proceed until veto is addressed

## Anti-Patterns

### Do NOT Use Standups For

1. **Trivial Decisions**
   - Color choices, minor naming, obvious implementations
   - Use: Direct action or quick review

2. **Already-Decided Topics**
   - Stakeholder has made the call
   - Use: Inform agents of constraint, ask for implementation advice

3. **Insufficient Context**
   - Vague topics without enough detail
   - Fix: Gather context first, then standup

4. **Time-Critical Emergencies**
   - Production is down, need action now
   - Use: Single expert mode, standup after for postmortem

### Common Mistakes

1. **Skipping Synthesis**
   - Running rounds but not synthesizing
   - Result: No decision, wasted effort
   - Fix: Always complete synthesis phase

2. **Wrong Roster**
   - Using full team for simple questions
   - Using quick review for security topics
   - Fix: Match roster to topic complexity

3. **Ignoring Conflicts**
   - Conflicts are flagged but not addressed
   - Result: Fragile decisions
   - Fix: Trade-off matrix, explicit resolution

4. **Overriding Vetoes**
   - Proceeding despite security/quality veto
   - Result: Technical debt, risk
   - Fix: Address veto concerns first

5. **Too Many Rounds**
   - Continuing past productive discussion
   - Diminishing returns after round 3
   - Fix: Trust synthesis, move on

## Workflow Integration

### Before the Standup

1. **Frame the Question**
   - Specific, actionable topic
   - Include relevant context
   - State any constraints

2. **Select Roster**
   - Auto-select usually works well
   - Override for domain-specific needs
   - Consider complexity level

3. **Set Expectations**
   - Visibility mode (full/progress/summary)
   - Output destinations
   - Time constraints if any

### During the Standup

1. **Observe Rounds**
   - Note emerging concerns
   - Watch for conflicts
   - Identify knowledge gaps

2. **Intervene if Needed**
   - Provide missing context
   - Clarify constraints
   - Answer agent questions

### After the Standup

1. **Review Synthesis**
   - Verify decision makes sense
   - Check confidence level
   - Review trade-offs

2. **Capture Action Items**
   - Who is responsible
   - What is the deliverable
   - When is it due

3. **Document Decision**
   - Save to Joplin or file
   - Link to related artifacts
   - Note any deferred concerns

## Measuring Effectiveness

### Quality Metrics

- **Issues Found**: Count of concerns raised
- **Conflicts Resolved**: Trade-offs explicitly handled
- **Confidence Level**: Synthesis confidence score
- **Time to Decision**: Round count and duration

### Signs of Effective Standups

- Multiple perspectives surfaced
- At least one non-obvious concern raised
- Clear decision with reasoning
- Actionable next steps
- Appropriate confidence level

### Signs of Ineffective Standups

- All agents agree immediately (groupthink?)
- No conflicts or trade-offs (too shallow?)
- Low confidence synthesis (wrong roster?)
- No action items (too abstract?)
- Topic unchanged from start (not enough context?)

## Evolution and Improvement

### Learning from Standups

Each standup teaches us:
- Which rosters work for which topics
- Where domain gaps exist
- How to frame better questions
- When to escalate vs. proceed

### Continuous Improvement

- Review past standup decisions after implementation
- Note where predictions were right/wrong
- Adjust agent definitions based on patterns
- Add new agents for missing expertise
