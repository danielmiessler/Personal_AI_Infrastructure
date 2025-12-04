---
name: Standup
description: Multi-agent collaborative decision-making for complex problems. USE WHEN you need multiple specialist perspectives on high-stakes decisions (architecture, prioritization, security, compliance). Orchestrates conversation between custom agent rosters, synthesizes perspectives into actionable decisions. Finds 2-3x more issues than solo agent mode.
---

# Standup

Multi-agent orchestration: Better decisions through collaborative specialist perspectives.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| RunStandup | Complex decision needing multiple perspectives | Synthesized decision from agent discussion |
| ManageContext | Creating or updating project-context.md | Updated project "bible" with decisions |
| SynthesizeDecision | Combining agent perspectives into consensus | Actionable decision with rationale and action items |

## Examples

### Example 1: Architecture design review
```
User: "Review this microservices architecture design"
Skill loads: Standup → RunStandup workflow
Process:
  1. Load project context
  2. Present architecture to agents (Product, Security, QA)
  3. Each agent provides perspective
  4. Synthesize recommendations
Output: Design feedback with security, testability, and business concerns identified
```

### Example 2: Feature prioritization
```
User: "Should we add OAuth2 to MVP or defer to v1.1?"
Skill loads: Standup → RunStandup workflow
Process:
  1. Load project context
  2. Present decision to agents
  3. Product: User value perspective
  4. Security: Security/compliance perspective
  5. QA: Testing complexity perspective
  6. Synthesize: Balanced recommendation
Output: Prioritization decision (Must Have / Should Have / Could Have / Won't Have)
```

### Example 3: Smart roster selection (auto-suggest)
```
User: "Review this authentication feature design"
Skill loads: Standup → RunStandup workflow
Smart roster: Daniel, Mary, Clay, Hefley, Amy (full team - critical feature)
Process:
  1. Load project context
  2. Auto-detect: authentication = critical feature → suggest full team
  3. Daniel: Security threats (credential storage, session management)
  4. Mary: User experience (signup friction, password reset flow)
  5. Clay: Timeline estimates (6h for email/password, 9h for OAuth2)
  6. Hefley: Business priority (MVP vs v1.1)
  7. Amy: Test requirements (60 tests - 25 unit + 12 integration + 8 E2E + 15 security)
  8. Synthesize: Team consensus with conflict resolution
Output: Multi-perspective design review with actionable recommendations
```

### Example 4: Custom roster - Code review
```typescript
// Specify exact roster for focused code review
const result = await runStandup({
  feature: 'Database migration script',
  roster: ['Daniel', 'Clay'],  // Only security + tech lead
  codeSnippet: migrationScript
})
// Output: Daniel finds SQL injection risks, Clay estimates timeline
```

### Example 5: Custom roster - Full team override
```typescript
// Force full team review (override smart defaults)
const result = await runStandup({
  feature: 'Minor UI tweak',
  roster: ['Mary', 'Clay', 'Hefley', 'Daniel', 'Amy'],  // All 5 agents
  description: 'Change button color from blue to green'
})
// Output: Full team perspective on what seems like a simple change
//         (may uncover accessibility, brand, or UX issues)
```

### Example 6: Custom roster - Domain-specific experts
```
User: "Run standup with Investment Advisory Team to review portfolio allocation strategy"
Skill loads: Standup → RunStandup workflow with custom roster
Agents: Financial Analyst, Compliance Officer, Client Advisor
Output: Investment strategy with risk, compliance, and client perspective
```

### Example 7: Custom roster - Two agents only
```typescript
// Minimal roster for quick checks
const result = await runStandup({
  feature: 'Performance optimization',
  roster: ['Clay', 'Amy'],  // Only tech lead + QA
  question: 'Is this optimization worth the complexity?'
})
// Output: Clay's capacity estimate + Amy's testing complexity
```

### Example 8: Record decision
```
User: "Update project context with our decision on auth approach"
Skill loads: Standup → ManageContext workflow
Output: project-context.md updated with decision, rationale, and action items
```

## Agent Rosters

### Smart Roster Selection (Auto-Suggest)
FORGE automatically suggests the right experts based on your feature context:

| Feature Type | Suggested Roster | Why |
|--------------|------------------|-----|
| Authentication | Daniel, Mary, Clay, Hefley, Amy | Critical feature - full team review |
| Security/Vulnerabilities | Daniel, Clay, Amy | Security-focused: threat + implementation + security tests |
| UX/User Experience | Mary, Daniel, Clay, Amy | UX-focused: user research + security review + implementation |
| Database/SQL | Daniel, Clay, Amy | Database-focused: SQL injection + implementation + testing |
| Architecture/Design | Clay, Mary, Hefley, Amy | Architecture-focused: tech lead + business impact + priority |
| Testing/QA | Amy, Daniel, Clay | QA-focused: test strategy + security tests + implementation |
| Timeline/Estimates | Clay, Hefley, Amy | Planning-focused: tech lead + priority + test time |
| Prioritization | Hefley, Mary, Clay | Prioritization-focused: product + UX + tech feasibility |

**Question Context Override**: Questions override feature patterns
- "How long?" → Clay, Hefley, Amy (timeline focus)
- "How many tests?" → Amy, Daniel, Clay (testing focus)
- "Should we build this?" → Hefley, Mary, Clay (prioritization focus)

**Manual Override**: Explicitly specify roster to override smart defaults
```typescript
runStandup({ feature: 'Auth', roster: ['Daniel', 'Clay'] }) // Override: only Daniel + Clay
```

### Software Development Roster
- **Daniel** (Security Engineer): Security threats, CMMC compliance, secure design
- **Mary** (Business Analyst): User value, UX design, user research, stakeholder communication
- **Clay** (Tech Lead): Technical feasibility, timeline estimates (Claude-time), capacity planning
- **Hefley** (Product Manager): User value, business priorities, MVP scoping, MoSCoW prioritization
- **Amy** (QA Lead): Test strategy, testability, quality gates, ATDD

### Custom Rosters (Your Domain)
Define your own agent rosters for different domains:
- **Investment Advisory**: Financial Analyst, Compliance Officer, Client Advisor
- **Legal Review**: Contract Specialist, Risk Manager, Business Counsel
- **Healthcare**: Clinical Specialist, Regulatory Affairs, Patient Advocate
- **Product Design**: UX Designer, Brand Manager, Accessibility Expert

**How to Create Custom Agents**:
Use `templates/custom-agent-template.md` to define new agents with:
- Role, expertise, personality
- Standup participation style
- Integration with other agents

## Integration

- Works with AgilePm skill (standup reviews PRDs, prioritizes epics)
- Works with Security skill (Daniel uses threat modeling in standup)
- Works with TestArchitect skill (Amy defines test strategy in standup)
- Generates project-context.md (project "bible" for all agents)
- Records decisions with rationale (audit trail for compliance)

## Methodology

This skill follows multi-agent orchestration principles:
- **Diverse perspectives**: Multiple specialists find more issues than solo agent
- **Smart roster selection**: Auto-suggest experts based on feature context (authentication → full team, security → Daniel/Clay/Amy)
- **Structured discussion**: Each agent speaks in turn, providing their unique expertise
- **Synthesis over voting**: Find consensus that's better than any single perspective
- **Decision documentation**: Record rationale in project-context.md

**Core Innovation**: Standup finds **2-3x more issues** than solo agent mode (validated Week 8)

**Key Features**:
- **Context-aware roster suggestion**: Automatically suggests the right experts (implemented)
- **Question context override**: Questions override feature patterns ("How long?" → planning team)
- **Manual override**: Explicitly specify roster to override smart defaults
- **Synthesis with conflict detection**: Identifies disagreements and finds middle ground

Based on: Multi-agent systems, Ensemble learning, Scrum standup ceremonies (adapted for AI)

## Customization (Release 0.3)

Future enhancements:
- **Configurable rosters**: Define agent teams per project type
- **Agent voting**: Tie-breaking when consensus fails
- **Historical decision search**: "Why did we decide X?" answered from project-context.md
- **Domain-specific roster templates**: Pre-defined rosters for finance, healthcare, legal, etc.
