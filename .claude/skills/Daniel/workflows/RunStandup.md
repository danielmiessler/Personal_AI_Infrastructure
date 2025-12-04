# RunStandup Workflow

**Purpose**: Multi-agent security review coordinating Daniel with Mary, Bob, and Murat

**Input**: Feature description, code, or architecture diagram

**Output**: Comprehensive analysis from multiple perspectives (security, business, capacity, testing)

---

## What is RunStandup?

**RunStandup** orchestrates collaboration between specialist agents to provide comprehensive feature analysis:

**Agent Roster**:
- **Daniel** (Security Engineer): Security threats, CMMC compliance, vulnerability analysis
- **Mary** (Business Analyst): User value, business impact, UX considerations
- **Bob** (Tech Lead): Timeline estimates, capacity planning, technical feasibility
- **Murat** (QA Lead): Test coverage, quality assurance, edge cases

**Use Cases**:
- Feature design review (get all perspectives before coding)
- Security decision-making (understand trade-offs)
- Risk assessment (identify issues from multiple angles)
- Architectural review (comprehensive analysis)

**Value Proposition**: Standup finds **3.67x more issues** than solo agent mode (validated through A/B testing)

**Example**: "Should we add OAuth2 to MVP or defer to v1.1?"
- **Daniel**: Security/compliance perspective → "Defer OAuth2, add MFA"
- **Mary**: User value perspective → "Solo developers don't need OAuth2 initially"
- **Bob**: Timeline perspective → "OAuth2 adds 3-4 weeks of work"
- **Murat**: Testing perspective → "OAuth2 adds 15 test scenarios"
- **Synthesized Decision**: Ship email/password + MFA for MVP, add OAuth2 in v1.1

---

## When to Use RunStandup

### ✅ Use RunStandup For:

**Design Decisions**:
- Feature prioritization (MVP vs v2)
- Architecture choices (monolith vs microservices)
- Security trade-offs (convenience vs security)
- Technology selection (which library/framework)

**High-Risk Features**:
- Authentication and authorization systems
- Payment processing
- Data encryption
- Multi-tenant systems
- Admin panels
- Public APIs

**Complex Analysis**:
- Multiple competing concerns (security vs UX vs timeline)
- Unclear requirements (need multiple perspectives)
- High-stakes decisions (production security)
- Compliance requirements (CMMC, PCI-DSS, SOC 2)

**Examples**:
- "Review authentication system with full team"
- "Should we use session storage or JWT tokens?"
- "Evaluate security implications of this API design"

---

### ❌ Don't Use RunStandup For:

**Simple Vulnerability Scanning**:
- Known vulnerability patterns → Use ScanCode workflow
- STRIDE threat modeling → Use PerformSTRIDE workflow
- CMMC audit trail → Use GenerateAudit workflow

**Trivial Decisions**:
- Code formatting → Use linters
- Naming conventions → Use team style guide
- Simple bug fixes → Use ScanCode workflow

**Single-Perspective Analysis**:
- Pure security review → Use ScanCode or PerformSTRIDE
- Pure business analysis → Use AgilePm skill
- Pure testing strategy → Use TestArchitect skill

---

## Workflow Steps

### Step 1: Define Standup Context

**Action**: Provide feature description and context

**Required Context**:
- **Feature name**: What are you analyzing?
- **Decision question**: What do you need to decide?
- **Code/design** (optional): Code snippets or architecture diagram
- **Constraints** (optional): Timeline, budget, compliance requirements

**Example**:
```typescript
const context = {
  feature: 'User authentication system',
  decision: 'Should we implement OAuth2 in MVP or defer to v1.1?',
  codeSnippet: loginCode,
  designDoc: {
    components: ['Login API', 'JWT service', 'User database'],
    constraints: ['CMMC Level 2 compliance required', '8-week MVP timeline']
  }
}
```

---

### Step 2: Daniel Performs Security Analysis

**Daniel's Contribution**:
- **STRIDE threat modeling**: Identify security threats
- **CMMC compliance**: Map to CMMC practices
- **Vulnerability detection**: Scan code for security issues
- **Risk assessment**: Rate threat severity

**Daniel's Output**:
```markdown
## Daniel (Security Engineer)

### Security Analysis
- SQL Injection risk in login endpoint (Critical)
- Missing MFA enforcement (High)
- JWT secret hardcoded (High)
- No rate limiting on login (Medium)

### CMMC Compliance
- IA.L2-3.5.1: MFA required for privileged accounts
- SI.L2-3.14.6: Protect system inputs (SQL injection)
- AU.L2-3.3.1: Create audit logs for auth events

### OAuth2 Security Perspective
- **Pros**: Industry-standard auth, better for enterprise users
- **Cons**: Complex implementation, increases attack surface
- **Recommendation**: Defer OAuth2 to v1.1, implement MFA on email/password for MVP
- **Rationale**: Email/password + MFA meets CMMC requirements, lower complexity

### Security Requirements for MVP
1. Fix SQL injection (parameterized queries)
2. Add MFA for privileged accounts (TOTP)
3. Implement rate limiting (5 attempts/min)
4. Add audit logging for all auth events
5. Move JWT secret to environment variable

**Timeline**: 2 weeks to implement security requirements
**Risk Level**: Medium (manageable with focused effort)
```

---

### Step 3: Mary Provides Business Perspective

**Mary's Contribution**:
- **User value**: What do users actually need?
- **Business impact**: How does this affect revenue/adoption?
- **UX considerations**: User experience trade-offs
- **Prioritization**: MVP vs v1.1 vs v2

**Mary's Output**:
```markdown
## Mary (Business Analyst)

### User Value Analysis
- **Target users**: Solo developers and small teams (MVP focus)
- **User research**: 80% of solo developers use email/password auth
- **OAuth2 demand**: 15% of current users request it (mostly enterprise)

### Business Impact
- **MVP goal**: Prove product value, get initial adoption
- **Time-to-market**: Critical for competitive positioning
- **Revenue impact**: OAuth2 not required for MVP pricing tier

### UX Perspective
- **Email/password**: Familiar, low friction, works for 80% of users
- **OAuth2**: Better for enterprise, but adds complexity for solo users
- **MFA**: Required for security, adds minimal friction (TOTP apps widely adopted)

### Recommendation
- **MVP**: Ship email/password + MFA (fast time-to-market, meets user needs)
- **v1.1**: Add OAuth2 when enterprise users request it (demand-driven)
- **Rationale**: Don't build features users don't need yet

**Timeline**: No additional business requirements beyond security baseline
**User Satisfaction**: High (meeting core need without over-engineering)
```

---

### Step 4: Bob Estimates Timeline & Capacity

**Bob's Contribution**:
- **Timeline estimates**: How long will this take?
- **Capacity planning**: Do we have resources?
- **Technical feasibility**: Can we build this?
- **Risk assessment**: What can go wrong?

**Bob's Output**:
```markdown
## Bob (Tech Lead)

### Timeline Estimates

**Email/Password + MFA (MVP)**:
- Email/password auth: 3 days (already mostly done)
- MFA implementation (TOTP): 4 days
- Security fixes (SQL injection, rate limiting): 3 days
- Total: 10 days (2 weeks with buffer)

**OAuth2 (if included in MVP)**:
- OAuth2 provider integration: 5 days
- Token exchange flow: 3 days
- Provider-specific handling (Google, GitHub, Microsoft): 4 days
- Security hardening: 3 days
- Total: 15 days (3 weeks with buffer)

**Impact**: Adding OAuth2 increases MVP timeline by 3 weeks (38% increase)

### Capacity Analysis
- **Current sprint**: 8-week MVP timeline
- **Team size**: 1 developer (you)
- **OAuth2 cost**: 3 weeks = 37.5% of remaining budget
- **Recommendation**: Defer OAuth2 to avoid timeline risk

### Technical Feasibility
- **Email/password**: Low risk (standard pattern, well-documented)
- **MFA**: Medium risk (TOTP library integration, QR code generation)
- **OAuth2**: High risk (multiple providers, token refresh, error handling)

### Risk Assessment
- **Timeline risk**: OAuth2 likely to slip (3 weeks estimate → 4 weeks actual)
- **Scope creep**: OAuth2 opens door to "can we support X provider too?"
- **Technical debt**: Rushing OAuth2 leads to security issues

**Recommendation**: Ship MVP with email/password + MFA, add OAuth2 in v1.1
**Confidence**: High (conservative estimate, low technical risk)
```

---

### Step 5: Murat Defines Test Requirements

**Murat's Contribution**:
- **Test coverage**: What needs testing?
- **Quality assurance**: How do we ensure quality?
- **Edge cases**: What can break?
- **Test timeline**: How long to test?

**Murat's Output**:
```markdown
## Murat (QA Lead)

### Test Coverage Requirements

**Email/Password + MFA (MVP)**:
- Unit tests: 25 tests (auth logic, MFA verification, rate limiting)
- Integration tests: 12 tests (API endpoints, database, sessions)
- E2E tests: 8 tests (login flow, MFA setup, password reset)
- Security tests: 15 tests (SQL injection, XSS, brute force)
- Total: 60 tests

**OAuth2 (if included)**:
- Unit tests: +20 tests (token exchange, provider handling)
- Integration tests: +15 tests (OAuth flows, token refresh)
- E2E tests: +12 tests (provider-specific flows × 3 providers)
- Security tests: +8 tests (CSRF, token leakage, state validation)
- Total: +55 tests (183% increase in test effort)

### Edge Cases to Test

**Email/Password + MFA**:
- Invalid credentials
- Account lockout after 5 attempts
- MFA setup flow
- MFA code expiration
- Lost MFA device recovery

**OAuth2** (additional edge cases):
- Provider unavailable
- Token expiration during flow
- User denies OAuth permission
- Provider account already linked to different user
- Provider changes their API

### Test Timeline

**Email/Password + MFA**: 1 week testing
**OAuth2**: +1.5 weeks testing (150% increase)

### Quality Concerns
- **OAuth2 complexity**: More edge cases, more points of failure
- **Provider-specific bugs**: GitHub works, Google fails → hard to debug
- **Token management**: Refresh token expiration, revocation testing

**Recommendation**: Defer OAuth2 to v1.1, focus on high-quality MVP
**Quality Level**: MVP can achieve 90% test coverage, OAuth2 would drop to 70%
```

---

### Step 6: Synthesize Decision

**Action**: Daniel synthesizes all perspectives into actionable decision

**Synthesis Format**:
```markdown
# Synthesized Decision: Authentication Strategy for MVP

## Decision
**Ship email/password + MFA for MVP, add OAuth2 in v1.1**

## Rationale

### All Agents Agree (Unanimous)
- **Daniel** (Security): Email/password + MFA meets CMMC requirements
- **Mary** (Business): 80% of users don't need OAuth2 yet
- **Bob** (Tech Lead): OAuth2 adds 3 weeks to timeline (38% increase)
- **Murat** (QA): OAuth2 adds 55 tests, increases testing time by 150%

### Trade-offs Considered
- **Security**: ✅ Email/password + MFA is CMMC Level 2 compliant
- **User Value**: ✅ Meets needs of 80% of target users (solo developers)
- **Timeline**: ✅ Saves 3 weeks, keeps MVP on track
- **Quality**: ✅ Achieves 90% test coverage vs 70% with OAuth2
- **Business**: ✅ Faster time-to-market, prove product value first

### MVP Implementation Plan
1. **Week 1**: Fix SQL injection, add rate limiting, add audit logging
2. **Week 2**: Implement MFA (TOTP), move JWT secret to env var
3. **Week 3**: Write 60 tests (unit, integration, E2E, security)
4. **Total**: 3 weeks to production-ready auth

### v1.1 OAuth2 Plan
- **Trigger**: When enterprise users request it (demand-driven)
- **Timeline**: 4-5 weeks implementation + testing
- **Scope**: Google, GitHub, Microsoft providers
- **Value**: Unlocks enterprise market segment

## Conflicts Identified
None - all agents agree OAuth2 should be deferred

## Next Steps
1. Start Week 1 tasks (security fixes)
2. Document decision in project-context.md
3. Add "OAuth2 support" to v1.1 backlog
4. Communicate timeline to stakeholders

## Success Metrics
- MVP ships in 8 weeks (on time)
- 90% test coverage achieved
- 0 critical security vulnerabilities
- CMMC Level 2 compliance verified
```

---

### Step 7: Document Decision

**Action**: Record decision in project context

**Documentation**:
- Update `project-context.md` with decision
- Record agent perspectives
- Track trade-offs considered
- Document next steps

---

## API Usage

For programmatic usage:

```typescript
import { runStandup } from './src/standup/orchestrator'

const result = await runStandup({
  feature: 'User authentication system',
  roster: ['Daniel', 'Mary', 'Bob', 'Murat'],
  codeSnippet: loginCode,
  designDoc: {
    components: ['Login API', 'JWT service', 'User database'],
    constraints: ['CMMC Level 2 compliance', '8-week MVP timeline']
  }
})

console.log(result.Daniel?.vulnerability)  // Daniel's security findings
console.log(result.Mary?.recommendation) // Mary's business recommendation
console.log(result.Bob?.timeline)        // Bob's timeline estimate
console.log(result.Murat?.testCoverage)  // Murat's test requirements
console.log(result.synthesis)            // Synthesized decision
```

---

## Benefits of Multi-Agent Review

### Catches More Issues (3.67x Better)

**Validated**: FORGE dogfooding found standup identifies 3.67x more issues than solo mode

**Example**:
- **Solo mode** (Daniel only): Found SQL injection, missing MFA (2 issues)
- **Standup mode** (Daniel + team): Found SQL injection, missing MFA, timeline risk, test coverage gap, scope creep risk, UX friction, enterprise demand gap (7 issues)

### Diverse Perspectives

**Security** (Daniel):
- Threat modeling
- Compliance requirements
- Vulnerability detection

**Business** (Mary):
- User value
- Market demand
- Revenue impact

**Technical** (Bob):
- Timeline estimates
- Capacity planning
- Technical feasibility

**Quality** (Murat):
- Test coverage
- Edge cases
- Quality assurance

### Better Decisions

**Trade-off Analysis**:
- Security vs UX
- Speed vs quality
- MVP vs v2
- Compliance vs convenience

**Conflict Detection**:
- Daniel says "secure it now"
- Mary says "users don't need it"
- Bob says "no time"
- Synthesis finds middle ground

---

## Related Workflows

- **ScanCode**: Daniel's vulnerability scanning (used within RunStandup)
- **PerformSTRIDE**: Daniel's threat modeling (used within RunStandup)
- **GenerateAudit**: CMMC audit trail generation
- **Standup** (Standup skill): General-purpose multi-agent orchestration

---

## Customization

**Custom Agent Rosters**:
- Adapt for different domains (legal, finance, healthcare)
- Define custom agent personas
- See `.claude/skills/Standup/templates/custom-agent-template.md`

**Example Custom Roster** (Legal Tech):
```typescript
const result = await runStandup({
  feature: 'Contract review automation',
  roster: ['Daniel', 'LegalCounsel', 'ComplianceOfficer', 'UXDesigner']
})
```

---

## Best Practices

**Before Standup**:
- Define clear decision question
- Provide code or architecture diagram
- List constraints (timeline, budget, compliance)

**During Standup**:
- Let each agent complete their analysis
- Don't interrupt agent thought process
- Collect all perspectives before deciding

**After Standup**:
- Document decision in project-context.md
- Create tickets for action items
- Communicate decision to stakeholders
- Track decision outcomes (learn from results)

**Continuous Improvement**:
- Review past standup decisions
- Track decision quality (right call?)
- Update agent prompts based on learnings
- Share best practices with team

---

## References

- **BMAD METHOD v6**: Multi-agent collaboration patterns (MIT License)
- **PAI**: Personal AI Infrastructure (agent orchestration)
- **FORGE**: Multi-agent collaboration system (FORGE is built on PAI)
