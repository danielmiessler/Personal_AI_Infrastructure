# Cross-Talk Patterns for Multi-Agent Standup

**Purpose**: Guide agents on how to reference, build on, and challenge each other's perspectives

**Version**: 2.0
**Last Updated**: 2025-12-04

---

## Overview

Cross-talk is the practice of agents explicitly referencing and engaging with each other's perspectives during multi-round standups. Effective cross-talk creates richer discussions and better synthesis.

**When to Use Cross-Talk**:
- **Round 1**: No cross-talk (independent perspectives)
- **Round 2**: Cross-talk encouraged (reactive perspectives)
- **Round 3**: Cross-talk for consensus building only

---

## Pattern 1: Agreement Building

**Purpose**: Reinforce a point made by another agent and extend it with your own perspective

**Structure**:
```
"I agree with [Agent]'s point about [topic]. [Extension/addition]."
```

**Examples**:

**Amy agrees with Daniel (Security + Testing)**:
> "I agree with Daniel's concern about SQL injection. This affects my test plan - I'll add 15 unit tests specifically for parameterized query validation and 3 integration tests for ORM edge cases. That's an additional 2 hours of test development."

**Clay agrees with Mary (Implementation + UX)**:
> "I agree with Mary that this UI design creates friction. From an implementation perspective, simplifying from 5 steps to 2 steps also saves us 8 hours of state management complexity. This is a win-win for both UX and timeline."

**Hefley agrees with Amy (Product + Quality)**:
> "I agree with Amy that 90% coverage is critical for authentication. This aligns with our business goal of zero security incidents in first 6 months. I'm willing to extend timeline by 1 day to ensure this quality gate is met."

---

## Pattern 2: Constructive Disagreement

**Purpose**: Challenge another agent's perspective respectfully while proposing alternatives

**Structure**:
```
"I respect [Agent]'s [concern/point], but I see it differently because [reason]. [Alternative proposal]."
```

**Examples**:

**Hefley disagrees with Daniel (Speed + Security)**:
> "I respect Daniel's security concern about requiring MFA on every login, but I see it differently from a product perspective. Our user research shows 45% of daily users will switch to competitors if login friction is too high. Can we require MFA once per 30 days on trusted devices? That meets CMMC compliance while maintaining user-friendly experience."

**Daniel disagrees with Hefley (Security + Speed)**:
> "I respect Hefley's desire to ship quickly, but I have a different view on risk. Shipping without server-side role validation creates a privilege escalation vulnerability (CVSS 9.1 - Critical). I cannot approve deployment with this risk. However, I can support a phased approach: ship with basic validation now (2 hours), add advanced validation in v1.1 (3 hours deferred)."

**Mary disagrees with Clay (UX + Implementation)**:
> "I respect Clay's technical reasoning for using a complex state machine, but from a UX perspective this creates cognitive overload. Users don't need to see 8 different states - they need 3 (loading, success, error). Can we simplify the user-facing design even if the technical implementation is complex? That reduces UX friction while maintaining technical robustness."

---

## Pattern 3: Clarifying Questions

**Purpose**: Ask another agent to elaborate or provide specific details

**Structure**:
```
"[Agent], can you clarify [specific point]? [Why this matters to your domain]."
```

**Examples**:

**Amy asks Daniel (Testing → Security)**:
> "Daniel, you mentioned 25 security tests are needed. Can you break that down by category (injection, XSS, auth, etc.)? I need to understand the distribution to allocate my 4-hour test development budget appropriately."

**Clay asks Amy (Implementation → Testing)**:
> "Amy, you mentioned 90% coverage target. Can you clarify if that's line coverage, branch coverage, or function coverage? This affects my implementation approach - branch coverage requires more conditional logic testing."

**Hefley asks Mary (Product → UX)**:
> "Mary, you mentioned users find the current design confusing. Can you quantify that with specific data? For example, what % of users drop off at this step, or what's the average time-to-completion? I need data to justify the 3-day redesign effort."

**Daniel asks Clay (Security → Implementation)**:
> "Clay, you estimated 6 hours for authentication implementation. Does that include time for parameterized queries (SQL injection prevention) and input sanitization? If not, I need to add that to my security requirements."

---

## Pattern 4: Building on Ideas

**Purpose**: Take another agent's suggestion and enhance or refine it

**Structure**:
```
"Building on [Agent]'s [idea/suggestion], what if we [enhancement]?"
```

**Examples**:

**Clay builds on Mary (Implementation + UX)**:
> "Building on Mary's suggestion to simplify onboarding from 5 steps to 2 steps, what if we implement progressive disclosure? Show 2 steps upfront (name, email) and reveal advanced options (timezone, preferences) behind a 'More options' link. That gives us Mary's UX simplicity while keeping power-user features available. Implementation time: 3 hours instead of 8."

**Amy builds on Daniel (Testing + Security)**:
> "Building on Daniel's STRIDE threat model, I can convert each threat into a specific test scenario. For example, his 'Spoofing' threat becomes 3 unit tests (session hijacking, token reuse, replay attacks) and 1 integration test (end-to-end session flow). This ensures every threat Daniel identified has automated test coverage."

**Hefley builds on Clay (Product + Implementation)**:
> "Building on Clay's parallel testing workflow, what if we apply the same pattern to feature development? We could parallelize authentication (Clay: 3 hours) with profile management (separate task: 2 hours) and save a full day. That gets us to MVP 1 week earlier."

**Mary builds on Amy (UX + Testing)**:
> "Building on Amy's idea to test user flows with automated E2E tests, what if we use those same test scripts to generate user documentation? The test steps (Given-When-Then) map directly to 'How to' guides. This ensures docs stay in sync with actual product behavior."

---

## Pattern 5: Conflict Resolution Proposals

**Purpose**: Propose a solution that addresses concerns from multiple agents

**Structure**:
```
"I hear both [Agent1]'s concern about [X] and [Agent2]'s concern about [Y]. What if we [synthesis/middle ground]?"
```

**Examples**:

**Clay synthesizes Daniel + Hefley (Implementation bridges Security + Speed)**:
> "I hear both Daniel's concern about comprehensive security and Hefley's timeline pressure. What if we take a phased approach: implement critical security controls for MVP (input validation, MFA, server-side auth - 6 hours) and defer nice-to-have controls to v1.1 (WAF, advanced rate limiting - 4 hours deferred)? That addresses Daniel's top threats while hitting Hefley's deadline."

**Amy synthesizes Daniel + Hefley (Testing bridges Security + Speed)**:
> "I hear both Daniel's need for security testing and Hefley's desire to ship fast. What if we use risk-based testing: 90% coverage for authentication (critical), 80% for profile (important), 70% for settings (standard)? That ensures Daniel's security concerns are well-tested while saving 2 hours on lower-risk features."

**Mary synthesizes Daniel + Users (UX bridges Security + Usability)**:
> "I hear both Daniel's security requirement for 2FA and users' frustration with login friction. What if we implement adaptive 2FA: required every login for admin accounts (high risk, low volume), required once per 30 days for standard users (medium risk, high volume), optional for read-only users (low risk)? That balances security with usability across different user personas."

---

## Pattern 6: Acknowledging Trade-offs

**Purpose**: Explicitly state the costs and benefits of different approaches

**Structure**:
```
"If we follow [Agent]'s approach, we gain [benefits] but lose [costs]. If we follow [alternative], we gain [different benefits] but lose [different costs]. I recommend [choice] because [rationale]."
```

**Examples**:

**Hefley acknowledges trade-offs (Product perspective)**:
> "If we follow Daniel's approach (comprehensive security), we gain CMMC compliance and zero critical vulnerabilities but lose 2 weeks of timeline and delay market entry. If we follow my approach (minimum viable security), we gain fast time-to-market but lose CMMC compliance and risk security audit failures. I recommend Daniel's phased approach (critical security now, advanced security later) because it balances both concerns."

**Clay acknowledges trade-offs (Implementation perspective)**:
> "If we follow Mary's approach (progressive disclosure UI), we gain better UX and lower cognitive load but lose 3 hours of state management complexity. If we follow my approach (simple 2-tier UI), we gain faster implementation but lose some UX polish. I recommend Mary's approach because 3 hours is a reasonable investment for significantly better user experience, and we can parallelize with backend work."

---

## Cross-Talk Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Dismissive Disagreement

**Bad Example**:
> "Daniel's security concerns are overblown. We don't need all that."

**Why It's Bad**: Dismisses expertise without proposing alternatives

**Good Example** (Constructive Disagreement Pattern):
> "I respect Daniel's security concerns, but I'm wondering if we can prioritize. Which threats are critical (must fix for MVP) vs important (defer to v1.1)? That lets us address top risks while hitting our timeline."

---

### ❌ Anti-Pattern 2: Agreement Without Value-Add

**Bad Example**:
> "I agree with Amy."

**Why It's Bad**: Doesn't extend the discussion or add new perspective

**Good Example** (Agreement Building Pattern):
> "I agree with Amy's 90% coverage target for authentication. From a security perspective, this is critical because auth bugs have the highest exploit impact. I'll support this by providing specific test scenarios from my STRIDE analysis."

---

### ❌ Anti-Pattern 3: Vague Challenges

**Bad Example**:
> "I'm not sure about Clay's timeline estimate."

**Why It's Bad**: Raises doubt without specifics or alternatives

**Good Example** (Clarifying Questions Pattern):
> "Clay, you estimated 6 hours for authentication. Can you break that down? I'm wondering if it includes time for input sanitization and session management, because those add complexity."

---

### ❌ Anti-Pattern 4: Ignoring Previous Discussion

**Bad Example** (Round 2):
> "Here's my perspective on authentication..." (repeats Round 1 without referencing other agents)

**Why It's Bad**: Wastes Round 2 opportunity for reactive perspectives

**Good Example** (Building on Ideas Pattern):
> "Building on Daniel's STRIDE analysis and Clay's parallel workflow idea, I can write security tests alongside Clay's implementation. That saves us 2 hours compared to sequential work."

---

## Round-Specific Cross-Talk Guidelines

### Round 1: No Cross-Talk (Independent Perspectives)

**Goal**: Get diverse, unbiased initial perspectives

**Instructions to Agents**:
- Do NOT reference other agents (you haven't heard from them yet)
- Provide your independent analysis
- Focus on your domain expertise
- Identify conflicts you foresee with other domains

**Example Round 1 Response**:
> "From a security perspective, this design needs input validation and server-side auth. I estimate 4 hours of security hardening. This may conflict with aggressive timelines." *(No references to other agents)*

---

### Round 2: Cross-Talk Encouraged (Reactive Perspectives)

**Goal**: Build on, challenge, and synthesize perspectives

**Instructions to Agents**:
- REFERENCE other agents by name
- Use cross-talk patterns (agreement, disagreement, questions, building)
- Address conflicts raised in Round 1
- Propose middle-ground solutions

**Example Round 2 Response**:
> "I heard Clay's concern about my 4-hour security estimate. Let me prioritize: input validation (2 hours, critical) and server-side auth (1.5 hours, critical) are non-negotiable. Advanced security (CSRF, WAF) can defer to v1.1 (1 hour saved). Amy, can you test the critical items in parallel with implementation?"

---

### Round 3: Consensus Cross-Talk (Final Positions)

**Goal**: Reach final decision with clear approve/block/defer

**Instructions to Agents**:
- Reference consensus points from Rounds 1-2
- State your final position clearly
- If blocking, state what would change your mind
- If approving with conditions, list conditions

**Example Round 3 Response**:
> "Based on Round 2 discussion, I approve with conditions: (1) input validation implemented (2 hours), (2) server-side auth (1.5 hours), (3) CSRF/WAF deferred to v1.1 with documented technical debt. Clay and Amy's parallel workflow addresses my timeline concerns. Final position: Approve."

---

## Success Metrics for Cross-Talk Quality

**Good Cross-Talk Indicators**:
- ✅ 5+ explicit references to other agents per round (Round 2)
- ✅ 2+ questions asked between agents
- ✅ 1+ synthesis proposal (middle-ground solutions)
- ✅ Conflicts from Round 1 addressed in Round 2
- ✅ Clear evolution from Round 1 → Round 2 → Round 3

**Poor Cross-Talk Indicators**:
- ❌ No agent references in Round 2 (isolated thinking)
- ❌ Only agreement, no constructive disagreement (harmonization)
- ❌ Questions asked but not answered
- ❌ Conflicts raised but not resolved
- ❌ Round 2 responses identical to Round 1 (no reaction)

---

## Examples: Full 3-Round Cross-Talk Flow

### Example: Authentication Design Decision

**Round 1** (No Cross-Talk):
- Daniel: "Need server-side validation + MFA. 4 hours."
- Clay: "6 hours base implementation. Daniel's additions push us over budget."
- Amy: "25 tests needed. 4-hour test development."
- **Conflict**: Timeline vs Security

**Round 2** (Cross-Talk):
- Daniel: "Clay, I hear your timeline concern. Let me prioritize: server-side validation (CRITICAL, 2 hours) vs MFA (defer to v1.1, 2 hours saved). Amy, can you test validation in parallel?"
- Clay: "Daniel, that works. 2 hours keeps us in budget. Amy, parallel testing saves 3 hours - can you start tests while I implement?"
- Amy: "Yes to both. Daniel, I'll test your server-side validation scenarios. Clay, parallel workflow is perfect. I'll write tests Days 1-2 while you code."
- **Resolution**: Phased security + parallel testing

**Round 3** (Final Positions):
- Daniel: "Approve with conditions: server-side validation (2 hours). Monitoring mitigates deferred MFA risk."
- Clay: "Approve. 7-hour timeline via parallel work. Feasible."
- Amy: "Approve. 25 tests in 4 hours, parallel workflow. Quality gates clear."
- **Outcome**: Consensus Achieved

---

## Integration with Conflict Protocols

Cross-talk patterns work alongside conflict protocols:

**Conflict Protocols** (from agent personas):
- Force agents to advocate for their domain even when unpopular
- Create authentic disagreement

**Cross-Talk Patterns** (this document):
- Structure HOW agents engage with each other's disagreements
- Guide agents from conflict → synthesis

**Together**:
- Conflict protocols ensure diverse perspectives surface
- Cross-talk patterns ensure those perspectives are synthesized productively

---

**Pattern Library Version**: 1.0
**Last Updated**: 2025-12-04
**Purpose**: Guide multi-agent conversation for richer synthesis and better decisions
