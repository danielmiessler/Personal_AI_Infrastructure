# SynthesizeDecision Workflow

**Purpose**: Combine multiple agent perspectives into a single, actionable decision

**Input**: Agent perspectives from Hefley (PM), Daniel (Security), and Amy (QA)

**Output**: Synthesized decision with consensus, action items, and rationale

---

## What is Decision Synthesis?

**Decision Synthesis** is the art of combining multiple perspectives into a coherent decision that's better than any single perspective.

**Not**: Majority vote (2 agents agree, 1 loses)
**Not**: First opinion wins (Hefley speaks first, his view dominates)
**Not**: Averaging (compromise that satisfies no one)

**Is**: Finding the decision that best serves user value + security + quality collectively

**Key Principle**: The synthesized decision should be **better** than what any single agent would recommend alone.

---

## Why Synthesis Matters

**Problem with Single Perspective**:
- Product Manager alone: Ships fast but insecure, buggy
- Security Engineer alone: Secure but slow to ship, over-engineered
- QA Lead alone: Well-tested but scope too small (everything is high-risk)

**Power of Synthesis**:
- Product + Security + Quality → Ship fast with acceptable security and quality
- Find the "sweet spot" that balances all three concerns
- Surface trade-offs explicitly (not hidden)

**Example**:
- **Hefley alone**: "Ship with no MFA" (fast but insecure)
- **Daniel alone**: "Require hardware tokens for MFA" (secure but slow, expensive)
- **Amy alone**: "Comprehensive MFA testing suite" (thorough but delays)
- **Synthesis**: "Ship with TOTP MFA (app-based), defer hardware tokens to v1.1" (fast, secure enough, testable)

---

## Synthesis Workflow Steps

### Step 1: Identify Agreement

**Action**: Find where agents agree (easy consensus)

**Look For**:
- All agents recommend same approach
- No conflicting concerns raised
- Unanimous approval

**Example Agreement**:

```markdown
**Decision Context**: Should we use HTTPS for all traffic?

**Agent Responses**:
- Hefley: "HTTPS is standard practice, doesn't delay MVP"
- Daniel: "HTTPS is critical security requirement (CMMC SC.L2-3.13.1)"
- Amy: "HTTPS doesn't affect testability, recommend"

**Synthesis**: ✅ All agents agree → Decision: Use HTTPS everywhere
```

**Action**: Document consensus, move to implementation

---

### Step 2: Identify Conflicts

**Action**: Find where agents disagree (needs facilitation)

**Conflict Types**:

#### Type 1: Direct Conflict (mutually exclusive)
- Hefley: "Ship feature A"
- Daniel: "Ship feature B (A is insecure)"
- **Cannot do both**: Must choose A or B

#### Type 2: Priority Conflict (different rankings)
- Hefley: "Feature A is Must Have, B is Should Have"
- Daniel: "Feature B is Must Have (security), A is Should Have"
- **Can do both eventually**: Disagree on order

#### Type 3: Scope Conflict (different definitions of done)
- Hefley: "Ship basic version"
- Amy: "Need comprehensive test suite (delays by 2 weeks)"
- **Can compromise**: Find middle ground

**Example Conflict**:

```markdown
**Decision Context**: Should we add OAuth2 to MVP?

**Agent Responses**:
- Hefley: "Defer OAuth2 to v1.1 (saves 3 weeks, MVP is email/password)"
- Daniel: "Need OAuth2 for enterprise security (CMMC IA.L2-3.5.10)"
- Amy: "OAuth2 adds 40% testing complexity"

**Conflict Type**: Priority Conflict (all want OAuth2 eventually, disagree on timing)
```

**Action**: Move to facilitation (Step 3)

---

### Step 3: Facilitate Resolution

**Action**: Guide agents to consensus through structured discussion

#### Facilitation Technique 1: Find Common Ground

**Ask**: "What do we all agree on?"

**Example**:
```
Common Ground:
- All agree OAuth2 is valuable long-term
- All agree email/password is faster to ship
- All agree MVP must ship in 8 weeks
```

**Action**: Build decision from common ground

---

#### Facilitation Technique 2: Explore Trade-offs

**Ask**: "What do we gain vs what do we lose with each option?"

**Example**:
```
Option A: Email/password only
- Gain: 3 weeks faster, simpler testing
- Lose: No enterprise SSO (some users request OAuth2)

Option B: Email/password + OAuth2
- Gain: Enterprise-ready, meets all CMMC practices
- Lose: 3 weeks delay, 40% more testing

Option C: Email/password + TOTP MFA (middle ground)
- Gain: 2 weeks faster than OAuth2, meets CMMC IA.L2-3.5.3 (MFA)
- Lose: Not full OAuth2 (but acceptable for MVP)
```

**Action**: Identify option with best trade-off

---

#### Facilitation Technique 3: Risk-Based Decision

**Ask**: "What's the risk of each option?"

**Example**:
```
Option A (email/password only):
- Security risk: Medium (no MFA, vulnerable to credential stuffing)
- Business risk: Medium (enterprise users may reject)
- Timeline risk: Low (ships on time)

Option B (email/password + OAuth2):
- Security risk: Low (enterprise-grade security)
- Business risk: Low (all user segments covered)
- Timeline risk: High (3-week delay, might miss MVP deadline)

Option C (email/password + TOTP MFA):
- Security risk: Low (MFA mitigates credential stuffing)
- Business risk: Medium (enterprise users prefer OAuth2, but TOTP acceptable)
- Timeline risk: Low (ships on time)
```

**Action**: Choose option with acceptable risk profile

---

#### Facilitation Technique 4: Phased Approach

**Ask**: "Can we do both, but in phases?"

**Example**:
```
Phase 1 (MVP, 8 weeks):
- Email/password + TOTP MFA
- Meets CMMC IA.L2-3.5.3 (multi-factor)
- Testable, ships on time

Phase 2 (v1.1, 10 weeks later):
- Add OAuth2 (if users request it)
- Add hardware token support (if enterprise demand)
```

**Action**: Define phased roadmap

---

### Step 4: Synthesize Consensus

**Action**: Combine insights into a coherent decision

**Synthesis Format**:

```markdown
## Synthesized Decision

**Decision**: [One-line summary combining all perspectives]

**Rationale** (How Agent Perspectives Align):

**Hefley's Contribution (Product/Business)**:
[What Hefley's perspective adds to the decision]

**Daniel's Contribution (Security/Compliance)**:
[What Daniel's perspective adds to the decision]

**Amy's Contribution (Quality/Testability)**:
[What Amy's perspective adds to the decision]

**Why This Decision is Better Than Any Single Perspective**:
[How synthesis creates value beyond individual opinions]

**Trade-offs** (What We Gain vs Lose):
- ✅ **Gain**: [Benefits of this decision]
- ⚠️ **Lose/Defer**: [What we're giving up or postponing]

**Risks & Mitigations**:
- Risk 1: [Potential issue] → Mitigation: [How we address it]
- Risk 2: [Potential issue] → Mitigation: [How we address it]
```

**Example**:

```markdown
## Synthesized Decision

**Decision**: Ship email/password authentication with TOTP MFA for MVP, defer OAuth2 to v1.1

**Rationale**:

**Hefley's Contribution**:
Primary persona (solo developers) needs fast access to FORGE. Email/password gets them started in 2 weeks vs 5 weeks for OAuth2. Success metric is 50 users in month 1, achievable with email/password.

**Daniel's Contribution**:
TOTP MFA meets CMMC IA.L2-3.5.3 (multi-factor authentication for privileged users). Email/password + MFA provides acceptable security for MVP, no critical CMMC gaps. OAuth2 can be added in v1.1 for enhanced enterprise security.

**Amy's Contribution**:
Email/password + TOTP has 40% less testing complexity than OAuth2 (fewer integration points, no third-party dependency testing). Achievable coverage target of 90% in 1 week vs 2 weeks for OAuth2.

**Why This Decision is Better Than Any Single Perspective**:
- Hefley alone would ship email/password without MFA (fast but insecure)
- Daniel alone would require OAuth2 + hardware tokens (secure but slow, over-engineered for MVP)
- Amy alone would focus only on testability (missing user value and security perspectives)
- **Synthesis**: Fast time-to-market (Hefley) + Acceptable security (Daniel) + Testable (Amy) = Optimal MVP

**Trade-offs**:
- ✅ **Gain**: 3 weeks faster to MVP, acceptable security (meets CMMC), testable in 1 week
- ⚠️ **Lose/Defer**: OAuth2 integration (v1.1), hardware token support (v2.0)

**Risks & Mitigations**:
- Risk: Enterprise users reject TOTP, demand OAuth2 → Mitigation: Build OAuth2 in v1.1 if >20% users request it
- Risk: TOTP MFA adds user friction → Mitigation: Offer "remember this device for 30 days" option
```

---

### Step 5: Document Dissent (If Any)

**Action**: If an agent strongly disagrees with final decision, document their concern

**Why Document Dissent**:
- Respects minority opinion
- May prove correct later (revisit if needed)
- Audit trail for compliance

**Dissent Format**:

```markdown
## Dissenting Opinion

**Agent**: [Name]
**Concern**: [What they disagree with]
**Alternative Recommendation**: [What they would prefer]
**Why Overridden**: [Why consensus went a different direction]
**Revisit Trigger**: [Condition under which we reconsider dissenting view]
```

**Example**:

```markdown
## Dissenting Opinion

**Agent**: Daniel (Security Engineer)
**Concern**: Email/password + TOTP is not enterprise-grade security; OAuth2 should be Must Have for MVP
**Alternative Recommendation**: Delay MVP by 3 weeks, ship with OAuth2 from Day 1
**Why Overridden**:
- Hefley + Amy consensus: MVP timeline is critical constraint (8 weeks)
- TOTP MFA meets CMMC Level 2 requirements (acceptable risk)
- Primary persona (solo developers) doesn't require OAuth2 for adoption

**Revisit Trigger**: If >20% of beta users request OAuth2, escalate to v1.1 Must Have (currently Should Have)
```

**Result**: Dissent documented, not ignored

---

### Step 6: Create Action Items

**Action**: Convert decision into executable tasks with owners and due dates

**Action Item Format**:

```markdown
## Action Items

1. [ ] **Task**: [Specific, actionable task]
   - **Owner**: [Person responsible]
   - **Due**: [Date]
   - **Acceptance Criteria**: [How we know it's done]

2. [ ] **Task**: [Next task]
   - **Owner**: [Person]
   - **Due**: [Date]
   - **Acceptance Criteria**: [Done criteria]
```

**Example**:

```markdown
## Action Items

1. [ ] **Implement email/password authentication**
   - **Owner**: Backend Team
   - **Due**: 2025-12-15 (2 weeks)
   - **Acceptance Criteria**:
     - [ ] Users can register with email/password
     - [ ] Passwords hashed with bcrypt (12+ rounds)
     - [ ] Password complexity enforced (12+ chars, special char, number)
     - [ ] Unit test coverage ≥90%

2. [ ] **Implement TOTP MFA**
   - **Owner**: Backend Team
   - **Due**: 2025-12-18 (2.5 weeks)
   - **Acceptance Criteria**:
     - [ ] Users can enable TOTP MFA (QR code enrollment)
     - [ ] TOTP validation on login (6-digit code)
     - [ ] Backup codes generated (10 codes)
     - [ ] "Remember device for 30 days" option
     - [ ] Unit test coverage ≥90%

3. [ ] **Security testing**
   - **Owner**: Daniel (Security)
   - **Due**: 2025-12-20 (3 weeks)
   - **Acceptance Criteria**:
     - [ ] OWASP ZAP scan passes (no critical/high vulnerabilities)
     - [ ] Brute force protection tested (5 attempts = account lock)
     - [ ] TOTP timing attack prevention validated

4. [ ] **Track OAuth2 feature requests**
   - **Owner**: Hefley (PM)
   - **Due**: Ongoing (monthly review)
   - **Acceptance Criteria**:
     - [ ] Survey beta users: "Do you need OAuth2?"
     - [ ] If >20% say yes, escalate OAuth2 to v1.1 Must Have
```

---

## Synthesis Patterns

### Pattern 1: All Agents Agree (Easy Consensus)

**Scenario**: All agents recommend same approach

**Example**: "Should we use HTTPS?" → All say yes

**Synthesis**:
- Document consensus
- Create action items
- No facilitation needed

**Time**: 5 minutes

---

### Pattern 2: Two Agree, One Disagrees (Majority)

**Scenario**: 2 agents recommend A, 1 agent recommends B

**Example**:
- Hefley + Amy: "Ship with 80% coverage"
- Daniel: "Need 90% coverage for security"

**Synthesis**:
- Explore dissenting opinion (why does Daniel want 90%?)
- Find compromise (risk-based coverage: 90% for auth, 80% for utils)
- Document dissent if unresolved

**Time**: 15-30 minutes

---

### Pattern 3: All Three Disagree (Complex)

**Scenario**: Each agent has different recommendation

**Example**:
- Hefley: "Ship feature A"
- Daniel: "Ship feature B (A is insecure)"
- Amy: "Ship feature C (A and B are hard to test)"

**Synthesis**:
- Find common ground (what do all agree on?)
- Explore trade-offs (what do we gain/lose with each?)
- Risk-based decision (which risk is acceptable?)
- Phased approach (can we do all three, but staged?)

**Time**: 30-60 minutes

---

### Pattern 4: Veto (Critical Issue)

**Scenario**: One agent exercises veto (typically Daniel on critical security)

**Example**:
- Daniel: "This design exposes all user passwords. I veto this approach."

**Synthesis**:
- Veto cannot be overridden (critical security/quality issue)
- Find alternative that addresses veto concern
- Document veto and resolution

**Time**: 30 minutes (design must be revised)

---

## Common Synthesis Mistakes

### Mistake 1: Majority Vote Without Exploration

**Problem**: "2 agents say A, 1 says B, so we choose A" (ignores minority perspective)

**Fix**: Explore WHY the dissenting agent disagrees (may have valid concern)

**Example**:
- Hefley + Amy: "Ship without audit logs"
- Daniel: "Need audit logs for CMMC compliance"
- **Bad Synthesis**: 2 vs 1, ship without audit logs
- **Good Synthesis**: Explore Daniel's concern → Audit logs required for CMMC AU.L2-3.3.1 → Ship with audit logs

---

### Mistake 2: Averaging (Compromises That Satisfy No One)

**Problem**: "Hefley wants 50% coverage, Amy wants 90%, so let's do 70%" (arbitrary middle)

**Fix**: Use risk-based approach (different coverage for different code)

**Example**:
- **Bad**: 70% coverage for all code (arbitrary compromise)
- **Good**: 90% for critical (auth, payment), 50% for utilities (risk-based)

---

### Mistake 3: First Opinion Wins

**Problem**: Hefley speaks first, his view dominates (others don't challenge)

**Fix**: Ensure all agents speak fully, then synthesize

**Example**:
- **Bad**: Hefley says "ship fast", others nod along
- **Good**: Hefley speaks (product view), Daniel speaks (security view), Amy speaks (quality view), then synthesize all three

---

### Mistake 4: Ignoring Dissent

**Problem**: One agent disagrees, decision proceeds without addressing concern

**Fix**: Document dissent, define revisit trigger

**Example**:
- **Bad**: Daniel objects to lack of OAuth2, decision proceeds, concern ignored
- **Good**: Daniel's objection documented, revisit trigger defined (if >20% users request OAuth2)

---

## Tips for Effective Synthesis

### DO:
✅ Listen to all perspectives before synthesizing
✅ Find common ground first (what do all agree on?)
✅ Explore trade-offs explicitly (gain vs lose)
✅ Use risk-based decisions (acceptable vs unacceptable risk)
✅ Consider phased approaches (do both, but staged)
✅ Document dissent with revisit trigger
✅ Create actionable items (owners, due dates)

### DON'T:
❌ Majority vote without exploring dissent
❌ Average opinions (arbitrary compromise)
❌ Let first opinion dominate
❌ Ignore minority perspective
❌ Override veto without addressing concern
❌ Create vague decisions ("improve security")
❌ Skip action items (decision without implementation = no decision)

---

## Validation Checklist

Before finalizing synthesis:

- [ ] All agent perspectives considered
- [ ] Consensus identified (or conflicts facilitated)
- [ ] Synthesized decision documented
- [ ] Rationale explains how perspectives align
- [ ] Trade-offs explicitly stated
- [ ] Risks and mitigations defined
- [ ] Dissent documented (if any)
- [ ] Action items created (owners, dates, acceptance criteria)
- [ ] Decision recorded in project-context.md

---

**Workflow Version**: 1.0
**Last Updated**: 2025-12-02
**Core Principle**: Synthesized decision is better than any single perspective alone
