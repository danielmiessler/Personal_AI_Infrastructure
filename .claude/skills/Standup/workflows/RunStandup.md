# RunStandup Workflow

**Purpose**: Orchestrate multi-agent conversation for collaborative decision-making

**Input**: Decision context (PRD review, architecture design, feature prioritization, etc.)

**Output**: Synthesized recommendations from Mary (Business Analyst), Clay (Scrum Master), and Hefley (Test Architect) with decision recorded in project-context.md

---

## What is Standup?

**Standup** is FORGE's multi-agent conversation system where specialist agents collaborate on complex decisions.

**Not** Daily Standup (that's a scrum ceremony)
**Is** Multi-Agent Standup (collaborative decision-making session)

**Key Innovation**: Instead of one AI perspective, you get multiple specialist perspectives collaborating.

**Hypothesis**: Standup finds **2-3x more issues** than solo agent mode (validated in Week 8)

---

## Agent Rosters (Customizable)

### Smart Roster Selection ✅ **IMPLEMENTED**
FORGE automatically suggests the right experts based on your feature context:

| Feature Type | Auto-Suggested Roster | Why |
|--------------|----------------------|-----|
| Authentication | Daniel, Mary, Clay, Hefley, Amy | Critical feature - full team review |
| Security/Vulnerabilities | Daniel, Clay, Amy | Security-focused: threat + implementation + security tests |
| UX/User Experience | Mary, Daniel, Clay, Amy | UX-focused: user research + security review + implementation |
| Database/SQL | Daniel, Clay, Amy | Database-focused: SQL injection + implementation + testing |
| Architecture/Design | Clay, Mary, Hefley, Amy | Architecture-focused: tech lead + business impact + priority |
| Testing/QA | Amy, Daniel, Clay | QA-focused: test strategy + security tests + implementation |
| Timeline/Estimates | Clay, Hefley, Amy | Planning-focused: tech lead + priority + test time |
| Prioritization | Hefley, Mary, Clay | Prioritization-focused: product + UX + tech feasibility |

**Question Context Override** ✅ **IMPLEMENTED**
Questions override feature patterns for focused discussions:
- "How long will this take?" → Clay, Hefley, Amy (timeline focus)
- "How many tests do we need?" → Amy, Daniel, Clay (testing focus)
- "Should we build this?" → Hefley, Mary, Clay (prioritization focus)

**Manual Override** ✅ **IMPLEMENTED**
Explicitly specify roster to override smart defaults:
```typescript
runStandup({ feature: 'Auth', roster: ['Daniel', 'Clay'] }) // Override: only Daniel + Clay
```

### Software Development Roster
- **Daniel** (Security Engineer): STRIDE threat modeling, CMMC Level 2 compliance, OWASP Top 10 prevention
- **Mary** (Business Analyst): User value, UX design, user research, business priorities, stakeholder communication
- **Clay** (Tech Lead): Technical feasibility, timeline estimates (Claude-time), capacity planning, risk assessment
- **Hefley** (Product Manager): User value, business priorities, MVP scoping, MoSCoW prioritization
- **Amy** (QA Lead): Test strategy, testability, quality gates, ATDD, risk-based testing

### Custom Rosters (Your Domain)
You can define custom agent rosters for different domains:

**Example: Investment Advisory Team**
- **Financial Analyst**: Risk assessment, portfolio allocation, market analysis
- **Compliance Officer**: SEC regulations, fiduciary requirements, disclosure rules
- **Client Advisor**: Client goals, risk tolerance, communication strategy

**Example: Legal Review Team**
- **Contract Specialist**: Terms review, liability clauses, negotiation points
- **Risk Manager**: Legal risk assessment, compliance gaps
- **Business Counsel**: Business objectives, deal structure, tax implications

**How to Define Custom Roster**:
Create a `.claude/agents/[AgentName]/agent.md` file with:
- Role, expertise, personality
- Triggers (when to involve this agent)
- Communication style
- Integration with other agents

**How Roster Selection Works**:
1. **Auto-suggest** (default): FORGE analyzes feature context and suggests appropriate roster
2. **Question override**: Questions like "How long?" override feature patterns
3. **Manual override**: Explicitly specify roster to override auto-suggestion
4. **Fallback**: If no match, suggests full team (Daniel, Mary, Clay, Hefley, Amy)

---

## When to Use Standup

### ✅ Use Standup For:

**High-Stakes Decisions**:
- Architecture design (multiple services, data flows, security boundaries)
- Feature prioritization (Must Have vs Should Have for MVP)
- API design (authentication, authorization, data contracts)
- Security-sensitive features (authentication, payment, data handling)
- Complex user stories (multiple acceptance criteria, edge cases)

**Cross-Functional Concerns**:
- Decisions requiring product + security + quality perspectives
- Trade-offs (time vs features vs quality vs security)
- Compliance requirements (CMMC, GDPR, SOX)

**Examples**:
- "Design user authentication system" (Security + Quality + Product concerns)
- "Should we add OAuth2 to MVP or defer to v1.1?" (Product + Security trade-off)
- "Review this API design for security and testability" (Security + Quality review)

---

### ❌ Don't Use Standup For:

**Simple Decisions**:
- Single-perspective questions ("What's the best way to hash passwords?" → Ask Daniel directly)
- Implementation details ("How do I write a Jest test?" → Standard documentation)
- Debugging ("Why is this test failing?" → Solo troubleshooting)

**Low-Stakes Decisions**:
- Cosmetic UI changes (button color, spacing)
- Trivial utilities (string formatting, date parsing)
- Well-understood patterns (CRUD operations)

**Rule of Thumb**: If the decision affects only one domain (product OR security OR quality), ask that agent directly. If it affects multiple domains, use Standup.

---

## Workflow Steps

### Step 1: Load Project Context

**Action**: Read project-context.md to understand the project

**What to Load**:
- Project overview (what we're building, for whom)
- System architecture (components, data flows, tech stack)
- Success metrics (user adoption, performance, compliance)
- Key decisions made (rationale, date, owner)
- Constraints (budget, timeline, technical, regulatory)

**File Location**: `docs/project-context.md`

**Why This Matters**:
- Agents need shared context for informed discussion
- Prevents redundant explanations ("What is this project?")
- Ensures alignment with product vision

**Example Context Loaded**:
```markdown
Project: FORGE (Multi-Agent Standup System)
Target Users: Solo developers, small teams, government contractors
Tech Stack: TypeScript, PAI skills framework, Claude API
Success Metric: Standup finds 2-3x more issues than solo mode
Constraint: CMMC Level 2 compliance required (DoD contractors)
```

---

### Step 2: Present Decision Context

**Action**: Frame the decision/design for agent review

**What to Present**:
- **Decision**: What needs to be decided?
- **Context**: Why is this decision needed? What's the background?
- **Constraints**: What limits our options? (time, budget, tech, compliance)
- **Proposed Approach**: What's the current thinking? (if any)
- **Open Questions**: What are we uncertain about?

**Format** (Structured):
```markdown
## Decision: [One-line summary]

**Context**:
[Why we're making this decision, background information]

**Constraints**:
- Timeline: [e.g., Must ship in 2 weeks]
- Budget: [e.g., Solo developer, limited resources]
- Technical: [e.g., Must use existing PAI framework]
- Regulatory: [e.g., CMMC Level 2 required]

**Proposed Approach**:
[Current design or leading option, if any]

**Open Questions**:
1. [Question 1]
2. [Question 2]
3. [Question 3]

**Requesting Input From**:
- Hefley: [Specific product/prioritization question]
- Daniel: [Specific security/compliance question]
- Amy: [Specific testing/quality question]
```

**Example**:
```markdown
## Decision: Add OAuth2 authentication to MVP or defer to v1.1?

**Context**:
Our PRD includes both email/password login and OAuth2. Email/password takes 2 weeks, OAuth2 adds 3-4 weeks. Our MVP deadline is 8 weeks away, and we have 6 weeks of features already planned.

**Constraints**:
- Timeline: 8-week MVP deadline
- Primary persona: Solo developers (not enterprise teams)
- Success metric: 50 users in first month

**Proposed Approach**:
Ship email/password for MVP, add OAuth2 in v1.1 if user demand exists.

**Open Questions**:
1. Do solo developers need OAuth2 for initial adoption?
2. Is email/password sufficient security for MVP?
3. Will lack of OAuth2 hurt user acquisition in month 1?

**Requesting Input From**:
- Hefley: Is OAuth2 Must Have or Should Have for our primary persona?
- Daniel: Does email/password meet security/CMMC requirements for MVP?
- Amy: What's the testing complexity difference (email/password vs OAuth2)?
```

---

### Step 3: Agent Discussion Round

**Action**: Each agent provides their perspective

**Discussion Order** (Default roster: Mary/Clay/Hefley/Daniel):
1. **Mary (Business Analyst)** speaks first
   - User value perspective
   - Business priorities (MoSCoW)
   - Success metrics

2. **Clay (Scrum Master)** speaks second
   - Sprint capacity and timeline
   - Dependencies and risks
   - Process implications

3. **Hefley (Test Architect)** speaks third
   - Test strategy and ATDD requirements
   - Risk-based testing approach
   - Quality gates

4. **Daniel (Security Engineer)** speaks fourth (when included)
   - Security threats (STRIDE)
   - CMMC compliance
   - Risk mitigation

**Why This Order**:
- Mary frames user value and business impact (sets context)
- Clay assesses feasibility and timeline (practical constraints)
- Hefley defines quality requirements (testing strategy)
- Daniel identifies security concerns last (can veto if Critical)

---

#### Mary's Response Format:

```markdown
### Mary's Perspective (Business Analyst)

**User Value Analysis**:
[Does this serve our primary persona? What problem does it solve?]

**Business Prioritization** (MoSCoW):
- Must Have / Should Have / Could Have / Won't Have
- Rationale: [Why this priority level?]

**Success Metrics**:
- Success looks like: [Measurable outcome]
- Failure looks like: [Measurable negative outcome]

**Recommendation**:
- Ship now / Defer to next release / Reject
- Rationale: [Business value vs effort]
```

---

#### Clay's Response Format:

```markdown
### Clay's Perspective (Scrum Master)

**Capacity Analysis**:
- Estimated effort: [Story points]
- Current sprint capacity: [Available points]
- Fits in sprint: Yes / No / With adjustments

**Timeline & Dependencies**:
- Dependencies: [What do we need before starting?]
- Risks: [What could delay this?]
- Recommended timeline: [Sprint X, Y weeks]

**Process Implications**:
- Impact on sprint goal: [Supports / Neutral / Conflicts]
- Velocity impact: [On track / Behind / Ahead]

**Recommendation**:
- Approve for current sprint / Defer to next sprint / Need more time to estimate
```

---

#### Hefley's Response Format:

```markdown
### Hefley's Perspective (Test Architect)

**Risk Assessment**:
- Risk level: Critical / High / Medium / Low
- Risk factors: [Business criticality, complexity, security, compliance]
- Coverage target: [90% / 80% / 70% / 50%]

**Test Strategy**:
- Test types required: [Unit, Integration, E2E, Security, Performance]
- ATDD compliance: [Given-When-Then scenarios defined?]
- Test count estimate: [N unit, M integration, K E2E tests]
- Estimated testing effort: [Story points]

**Quality Gates**:
- Acceptance criteria defined: Yes / No
- Tests before code (ATDD): Required / Recommended
- Coverage enforcement: [Threshold %]

**Recommendation**:
- Approve / Approve with modifications / Block (untestable design)
- Required modifications: [List]
```

---

#### Daniel's Response Format:

```markdown
### Daniel's Perspective (Security Engineer)

**Security Threats** (STRIDE):
- Spoofing: [Threat and mitigation]
- Tampering: [Threat and mitigation]
- Repudiation: [Threat and mitigation]
- Information Disclosure: [Threat and mitigation]
- Denial of Service: [Threat and mitigation]
- Elevation of Privilege: [Threat and mitigation]

**CMMC Compliance**:
- Practices addressed: [List CMMC practices]
- Gaps: [Missing practices, if any]
- Risk level: Critical / High / Medium / Low

**Recommendation**:
- Approve as-is / Approve with mitigations / Veto (critical vulnerability)
- Required mitigations: [List]

**Veto?**: Yes (critical security issue) / No (acceptable risk)
```

---

#### Amy's Response Format:

```markdown
### Amy's Perspective (QA Lead)

**Testability Analysis**:
- Design is testable: Yes / No / With modifications
- Test types required: [Unit, Integration, E2E, Security, Performance]
- Testability concerns: [Issues that make testing hard]

**Test Strategy**:
- Risk level: Critical / High / Medium / Low
- Coverage target: [90% / 80% / 70% / 50%]
- Test count estimate: [N unit, M integration, K E2E tests]
- Effort: [Story points for testing]

**Quality Gates**:
- Acceptance criteria defined: Yes / No
- Tests before code: Required / Recommended
- Coverage enforcement: [Threshold]

**Recommendation**:
- Approve / Approve with modifications / Block (untestable design)
- Required modifications: [List]
```

---

### Step 4: Collaborative Discussion (If Needed)

**Action**: If agents disagree, facilitate discussion to reach consensus

**Conflict Scenarios**:

#### Scenario 1: Hefley vs Daniel (Speed vs Security)
**Hefley**: "Ship email/password only (faster)"
**Daniel**: "Need OAuth2 for enterprise security"

**Facilitation**:
- What's the security risk of email/password for our persona (solo developers)?
- Can we ship email/password now, add OAuth2 when enterprise users request it?
- Is there a middle ground? (e.g., TOTP MFA with email/password)

**Resolution**: Find balance (e.g., email/password + MFA for MVP, OAuth2 for v1.1)

---

#### Scenario 2: Daniel vs Amy (Security vs Testability)
**Daniel**: "Encrypt all data at rest with custom crypto"
**Amy**: "Custom crypto is hard to test; use proven library"

**Facilitation**:
- Can we use FIPS-validated library (secure + testable)?
- What's the trade-off: security vs testability?

**Resolution**: Use proven library (e.g., OpenSSL FIPS, AWS KMS)

---

#### Scenario 3: Hefley vs Amy (Speed vs Quality)
**Hefley**: "Ship with 60% coverage to save time"
**Amy**: "Critical code needs 90% coverage"

**Facilitation**:
- What's the risk level of this code? (Critical / High / Medium / Low)
- Can we use risk-based coverage? (90% critical, 70% medium, 50% low)

**Resolution**: Risk-based testing (not blanket 60% or 90%)

---

### Step 5: Synthesize Recommendations

**Action**: Combine agent perspectives into actionable decision

**Synthesis Format**:

```markdown
# Standup Decision: [Decision Title]

**Date**: YYYY-MM-DD
**Participants**: Hefley (PM), Daniel (Security), Amy (QA)
**Context**: [Brief context from Step 2]

---

## Agent Perspectives Summary

**Hefley (Product Manager)**:
- Prioritization: [Must Have / Should Have / Could Have / Won't Have]
- User value: [Key user benefit]
- Recommendation: [Ship now / Defer / Reject]

**Daniel (Security Engineer)**:
- Security risk: [Critical / High / Medium / Low]
- CMMC compliance: [Practices addressed, gaps identified]
- Veto: [Yes / No]
- Recommendation: [Approve / Approve with mitigations / Veto]

**Amy (QA Lead)**:
- Test complexity: [Low / Medium / High]
- Coverage target: [90% / 80% / 70% / 50%]
- Testability: [Testable / Needs modifications / Untestable]
- Recommendation: [Approve / Modify / Block]

---

## Consensus Decision

**Decision**: [Final decision in one sentence]

**Rationale**:
[Why this decision? How do agent perspectives align?]

**Trade-offs**:
- What we gain: [Benefits]
- What we lose: [Costs/Deferrals]

**Action Items**:
1. [ ] Action 1 (Owner: [Name], Due: [Date])
2. [ ] Action 2 (Owner: [Name], Due: [Date])
3. [ ] Action 3 (Owner: [Name], Due: [Date])

**Success Criteria**:
- [ ] Criterion 1 (Measurable outcome)
- [ ] Criterion 2 (Measurable outcome)

**Risks & Mitigations**:
- Risk 1: [Risk] → Mitigation: [How to address]
- Risk 2: [Risk] → Mitigation: [How to address]

---

## Dissenting Opinions (If Any)

[If an agent disagreed with the final decision, document their concern and why it was overridden]

---

**Decision Status**: Approved | Blocked | Deferred
**Recorded By**: [Orchestrator/User]
**Next Review**: [Date for re-evaluation, if applicable]
```

---

### Step 6: Update Project Context

**Action**: Record decision in project-context.md

**What to Add**:

```markdown
## Key Decisions & Rationale

### Decision: [Title] (YYYY-MM-DD)
- **Decision**: [One-line summary]
- **Rationale**: [Why this choice?]
- **Participants**: Hefley (PM), Daniel (Security), Amy (QA)
- **Trade-offs**: [What we gained vs what we deferred]
- **Owner**: [Who owns implementation]
- **Status**: Approved | In Progress | Complete
```

**Why This Matters**:
- Future standup discussions reference past decisions
- Prevents re-litigating settled decisions
- Provides audit trail for compliance (CMMC, SOX)
- Documents rationale for future team members

**File Location**: `docs/project-context.md` (append to "Key Decisions" section)

---

## Standup Patterns

### Pattern 1: PRD Review Standup

**Trigger**: New PRD created (AgilePm skill)

**Participants**: Hefley, Daniel, Amy

**Discussion Focus**:
- Hefley: Are features prioritized correctly? Is user value clear?
- Daniel: Are security requirements included? Any CMMC gaps?
- Amy: Are acceptance criteria testable? Test strategy defined?

**Output**: PRD with agent feedback, updated feature prioritization

---

### Pattern 2: Architecture Design Standup

**Trigger**: Designing new system or major feature

**Participants**: Hefley, Daniel, Amy

**Discussion Focus**:
- Hefley: Does architecture support product vision? Over-engineered?
- Daniel: Trust boundaries identified? STRIDE applied? Defense-in-depth?
- Amy: Architecture testable? Mockable dependencies?

**Output**: Threat model, test strategy, architecture decision recorded

---

### Pattern 3: Feature Prioritization Standup

**Trigger**: Deciding Must Have vs Should Have for MVP

**Participants**: Hefley, Daniel, Amy

**Discussion Focus**:
- Hefley: MoSCoW prioritization (Must/Should/Could/Won't)
- Daniel: Critical security features that can't be deferred
- Amy: Features that require extensive testing (defer if not Must Have)

**Output**: Prioritized feature list, MVP scope finalized

---

### Pattern 4: Security Review Standup

**Trigger**: Reviewing security-sensitive feature (auth, payment, data handling)

**Participants**: Hefley, Daniel, Amy (Daniel leads)

**Discussion Focus**:
- Daniel: STRIDE threats, CMMC practices, mitigations
- Hefley: Security vs time-to-market trade-offs
- Amy: Security test strategy (OWASP ZAP, penetration testing)

**Output**: Threat model, security requirements, test plan

---

## Tips for Effective Standup

### DO:
✅ Use standup for complex, multi-perspective decisions
✅ Load project context first (shared understanding)
✅ Present clear decision context (constraints, options, questions)
✅ Let each agent speak fully (don't interrupt)
✅ Facilitate consensus when agents disagree
✅ Synthesize into actionable decision
✅ Record decision in project-context.md

### DON'T:
❌ Use standup for simple, single-perspective decisions
❌ Skip project context (agents need background)
❌ Present vague problems ("How do we improve security?")
❌ Override agent veto without addressing concern
❌ Forget to record decision (lost tribal knowledge)
❌ Re-litigate settled decisions (check project-context.md first)

---

## Validation Metrics (Week 8 Gate)

**Hypothesis**: Standup finds 2-3x more issues than solo agent mode

**Test Method**: A/B comparison on same decision
- **Solo mode**: Ask one agent (e.g., just Hefley)
- **Standup mode**: Ask all three agents (Hefley, Daniel, Amy)

**Issues Tracked**:
- Security vulnerabilities identified
- Testability concerns raised
- Prioritization changes recommended
- Trade-offs surfaced

**Success Criteria**: Standup identifies ≥2x issues compared to solo

**Example Result**:
```
Decision: Design user authentication

Solo Mode (Hefley only):
- Issues found: 3 (prioritization, user value, scope)

Standup Mode (Hefley + Daniel + Amy):
- Issues found: 9
  - Hefley: 3 (same as solo)
  - Daniel: 4 (SQL injection, weak passwords, no audit logs, missing MFA)
  - Amy: 2 (testability concerns, coverage targets)

Result: 3x more issues found in standup ✅
```

---

## Integration with Skills

### AgilePm Skill
- **PRD created** → Standup reviews PRD
- **Epics prioritized** → Standup validates Must Have vs Should Have
- **User stories created** → Standup adds security/test requirements

### Security Skill
- **Threat model needed** → Daniel leads standup on security review
- **CMMC baseline** → Daniel ensures compliance in decisions

### TestArchitect Skill
- **Test strategy needed** → Amy defines testing approach in standup
- **Coverage gaps** → Amy recommends improvement plan in standup

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Core Innovation**: Multi-agent collaboration finds 2-3x more issues than solo mode
