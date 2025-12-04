# Standup Methodology

This document explains the principles, approach, and workflow sequence for PAI's Standup skill.

## Core Principles

### 1. Diverse Perspectives Find More Issues

**Principle**: Multiple specialist perspectives identify 2-3x more issues than solo agent mode.

**Evidence**: A/B testing showed standup mode (Hefley + Daniel + Amy) found **3.67x more issues** than solo mode (Hefley only) on the same decision.

**Why It Works**:
- **Hefley** (Product Manager): Sees user value, prioritization, business impact
- **Daniel** (Security Engineer): Sees security threats, compliance gaps, attack surface
- **Amy** (QA Lead): Sees testability, quality gates, coverage needs

**Result**: Each agent finds issues the others don't (complementary expertise).

---

### 2. Synthesis Over Voting

**Principle**: Don't vote or average opinions. Find a decision **better** than any single perspective.

**Not Voting**:
- Voting = majority wins, minority perspective lost
- Example: 2 agents say "ship now", 1 says "add security" → Security concern ignored

**Not Averaging**:
- Averaging = mediocre compromise
- Example: "Ship in 6 weeks" (avg of 4 weeks + 8 weeks) → Satisfies no one

**Is Synthesis**:
- Find solution that addresses all perspectives
- Example: "Ship email/password now (Hefley's speed), add MFA (Daniel's security), defer OAuth2 to v1.1 (Amy's testing complexity)"
- Result: Faster than full OAuth2, more secure than basic email/password, testable in timeframe

**Facilitation Techniques**:
1. **Find common ground**: Where do agents agree?
2. **Address concerns**: What's each agent worried about?
3. **Explore trade-offs**: Can we reduce risk without full cost?
4. **Phased approach**: Can we ship something now, add more later?

---

### 3. Structured Discussion

**Principle**: Agents speak in a defined order for coherent conversation.

**Discussion Order**:
1. **Product Manager (Hefley)** speaks first
   - Sets user value context
   - Applies MoSCoW prioritization
   - Frames business impact

2. **Security Engineer (Daniel)** speaks second
   - Identifies security threats
   - Checks compliance requirements
   - Can veto critical vulnerabilities

3. **QA Lead (Amy)** speaks third
   - Assesses testability
   - Defines quality gates
   - Estimates testing complexity

**Why This Order**:
- Hefley frames value (prevents security-for-security's-sake)
- Daniel can veto before testing investment (prevents wasted effort on insecure design)
- Amy has final quality check (ensures shippable quality)

**Flexibility**: Order can change for domain-specific rosters (e.g., Compliance Officer speaks first for regulatory decisions).

---

### 4. Decision Documentation

**Principle**: Record decisions with rationale for future reference and compliance.

**What to Document**:
- **Decision**: One-line summary
- **Rationale**: Why this choice? (from agent perspectives)
- **Participants**: Who was in the standup?
- **Trade-offs**: What we gained vs what we deferred
- **Action Items**: Who does what by when?
- **Status**: Approved / In Progress / Complete

**Where to Document**: `docs/project-context.md` (project "bible")

**Why It Matters**:
- Prevents re-litigating settled decisions
- Provides audit trail for compliance (CMMC AU.L2-3.3.1)
- Documents rationale for future team members
- Enables decision search ("Why did we choose X?")

---

### 5. Customizable Agent Rosters

**Principle**: Standup is domain-agnostic. Define agents for any field.

**Default Roster** (Software Development):
- Hefley (Product Manager)
- Daniel (Security Engineer)
- Amy (QA Lead)

**Custom Rosters** (Your Domain):
- **Investment Advisory**: Financial Analyst, Compliance Officer, Client Advisor
- **Legal Review**: Contract Specialist, Risk Manager, Business Counsel
- **Healthcare**: Clinical Specialist, Regulatory Affairs, Patient Advocate
- **Product Design**: UX Designer, Brand Manager, Accessibility Expert

**How to Define**:
Create `.claude/agents/[AgentName]/agent.md` with:
- Role, expertise, personality
- Communication style (catchphrases, tone)
- Decision-making framework
- Integration with other agents

**Roster Selection**:
- Default: Defined in `project-context.md`
- Override: "Run standup with Investment Advisory Team"
- Future: Auto-detection based on decision context

---

## Workflow Sequence

### When to Use Each Workflow

| Workflow | When to Use | Input | Output |
|----------|-------------|-------|--------|
| **RunStandup** | Complex decision needing multiple perspectives | Decision context, constraints, options | Synthesized recommendations from all agents |
| **ManageContext** | Creating or updating project-context.md | Project overview, decisions, architecture | Updated project "bible" |
| **SynthesizeDecision** | Combining agent perspectives into consensus | Agent responses, decision criteria | Actionable decision with rationale |

---

### Typical Standup Flow

```
1. User presents decision
   ↓
2. Load project-context.md (shared context)
   ↓
3. Agent discussion round
   - Hefley: User value, prioritization, business impact
   - Daniel: Security threats, compliance, veto authority
   - Amy: Testability, quality gates, coverage
   ↓
4. Collaborative discussion (if agents disagree)
   - Facilitate consensus using synthesis techniques
   ↓
5. Synthesize recommendations
   - Find decision better than any single perspective
   - Document rationale, action items, trade-offs
   ↓
6. Update project-context.md
   - Record decision, participants, date
   - Append to "Key Decisions" section
```

---

## Multi-Agent Systems Theory

Standup is inspired by:

### Ensemble Learning (Machine Learning)
- **Concept**: Multiple models (agents) perform better than single model
- **Applied**: Multiple agents find more issues than solo agent
- **Evidence**: Bagging, boosting, stacking all outperform single models

### Wisdom of Crowds (James Surowiecki)
- **Concept**: Diverse, independent opinions aggregate to better decision
- **Applied**: Hefley/Daniel/Amy have diverse expertise, independent perspectives
- **Caveat**: Synthesis required (not simple averaging)

### Scrum Daily Standup (Agile)
- **Concept**: Team synchronizes on progress, blockers, plans
- **Adapted**: Agents synchronize on decision, concerns, recommendations
- **Difference**: Focus on decision-making, not status updates

### Red Team / Blue Team (Security)
- **Concept**: Adversarial teams find more vulnerabilities
- **Applied**: Daniel plays "security advocate", Hefley plays "speed advocate", Amy plays "quality advocate"
- **Result**: Tension surfaces trade-offs, leads to better synthesis

---

## Success Metrics

### 1. Issues Found (2-3x more than solo)

**Hypothesis**: Standup finds 2-3x more issues than solo agent mode

**Validation Method**: A/B testing on same decision
- **Solo mode**: Ask one agent (e.g., just Hefley)
- **Standup mode**: Ask all three agents (Hefley + Daniel + Amy)

**Result** (validated 2025-12-02):
- Solo mode: 3 issues found (discoverability)
- Standup mode: 11 issues found (discoverability + security + testability)
- **Ratio: 3.67x** (exceeded 2-3x target)

**Why**: Each agent finds issues in their domain that solo mode misses.

---

### 2. Decision Quality

**Indicators**:
- Action items have owners and dates (accountability)
- Trade-offs documented (transparency)
- Rationale clear (future reference)
- All agent perspectives included (comprehensive)

**Measurement**: Review decisions in project-context.md
- Are action items completed?
- Did we revisit decision? (instability indicates poor synthesis)
- Did unexpected issues arise? (missed in standup)

---

### 3. User Trust

**Indicators**:
- Users return to standup for complex decisions
- Users cite agent perspectives in their thinking ("Daniel would say...")
- Users create custom agents (extending to new domains)

**Measurement**: Adoption rate, custom agent creation, feedback

---

## Common Standup Patterns

### Pattern 1: PRD Review Standup

**Trigger**: New PRD created (AgilePm skill)

**Focus**:
- Hefley: Feature prioritization correct? User value clear?
- Daniel: Security requirements included? CMMC gaps?
- Amy: Acceptance criteria testable? Test strategy defined?

**Output**: PRD with agent feedback, updated prioritization

---

### Pattern 2: Architecture Design Standup

**Trigger**: Designing new system or major feature

**Focus**:
- Hefley: Architecture supports product vision? Over-engineered?
- Daniel: Trust boundaries identified? STRIDE applied? Defense-in-depth?
- Amy: Architecture testable? Dependencies mockable?

**Output**: Threat model, test strategy, architecture decision

---

### Pattern 3: Feature Prioritization Standup

**Trigger**: Deciding Must Have vs Should Have for MVP

**Focus**:
- Hefley: MoSCoW prioritization (Must/Should/Could/Won't)
- Daniel: Critical security features that can't be deferred
- Amy: Features requiring extensive testing (defer if not Must Have)

**Output**: Prioritized feature list, MVP scope finalized

---

### Pattern 4: Security Review Standup

**Trigger**: Reviewing security-sensitive feature (auth, payment, data)

**Focus**:
- Daniel: STRIDE threats, CMMC practices, mitigations (leads discussion)
- Hefley: Security vs time-to-market trade-offs
- Amy: Security test strategy (OWASP ZAP, penetration testing)

**Output**: Threat model, security requirements, test plan

---

## Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Solo Decision, Label it Standup

**Problem**: Only one agent speaks, call it "standup"

**Why It Fails**: Loses diverse perspectives benefit

**Solution**: Ensure all agents speak, document all perspectives

---

### ❌ Anti-Pattern 2: Voting Instead of Synthesis

**Problem**: "2 agents say ship, 1 says wait → Ship wins"

**Why It Fails**: Minority concern (security, quality) ignored

**Solution**: Facilitate consensus that addresses all concerns

---

### ❌ Anti-Pattern 3: Vague Decision Context

**Problem**: "How do we improve security?" (too broad)

**Why It Fails**: Agents provide generic advice, not specific recommendations

**Solution**: Specific decision with constraints
- Good: "Should we add OAuth2 to MVP or defer? Constraints: 8-week deadline, solo developer persona"

---

### ❌ Anti-Pattern 4: Ignoring Agent Veto

**Problem**: Daniel vetoes (critical vulnerability), ship anyway

**Why It Fails**: Ships insecure code, defeats purpose of security review

**Solution**: Address veto concern or defer feature (veto = deployment blocker)

---

### ❌ Anti-Pattern 5: Not Recording Decision

**Problem**: Great standup discussion, decision not documented

**Why It Fails**: Lost tribal knowledge, re-litigate later

**Solution**: Always update project-context.md with decision, rationale, date

---

## References

- **Ensemble Learning**: Breiman, L. (1996). "Bagging Predictors"
- **Wisdom of Crowds**: Surowiecki, J. (2004). "The Wisdom of Crowds"
- **Scrum Guide**: Schwaber, K. & Sutherland, J. (2020). "The Scrum Guide"
- **Red Team Handbook**: U.S. Department of Defense (2015)

---

**Methodology Version**: 1.0
**Last Updated**: 2025-12-02
**Core Innovation**: Multi-agent collaboration finds 2-3x more issues than solo mode (validated: 3.67x)
