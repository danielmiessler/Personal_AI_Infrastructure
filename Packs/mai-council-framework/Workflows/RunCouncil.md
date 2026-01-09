# RunCouncil Workflow

**Purpose:** Execute a full council session where multiple agent perspectives deliberate on a decision or problem.

**Triggers:** "run council", "convene council", "get perspectives", "council session", "multi-agent discussion"

---

## When to Use

- Making decisions that benefit from diverse expertise (architecture, strategy, prioritization)
- Evaluating trade-offs where different stakeholders have legitimate concerns
- Reviewing proposals that affect multiple domains (security, performance, UX, cost)
- Breaking deadlocks when a single perspective feels stuck or biased
- High-stakes decisions where you want documented reasoning from multiple angles

---

## Procedure

### 1. Gather Decision Context

Collect from the user:
- **Topic:** The specific question or decision (should be answerable, not open-ended exploration)
- **Context:** Background information, current state, constraints
- **Stakes:** What's riding on this decision? (helps calibrate depth)
- **Timeline:** How quickly is a decision needed?

```typescript
// Example context object
const context = {
  topic: "Should we adopt GraphQL for our new API layer?",
  background: "Currently REST with 47 endpoints, 3 mobile clients, growing complexity",
  constraints: ["Team has no GraphQL experience", "6-month deadline", "Must maintain existing REST during transition"],
  stakes: "high" // affects 18-month roadmap
};
```

### 2. Determine Roster

Either accept user-specified agents or use auto-selection:

```typescript
import { selectAgents } from 'mai-council-framework/Engine/RosterSelector';

// Auto-select based on topic analysis
const roster = selectAgents(context.topic, {
  featureContext: context.background,
  maxAgents: 4  // 3-5 agents optimal for most decisions
});

// Or use explicit roster
const roster = ['TechLead', 'SecurityEngineer', 'ProductManager'];
```

### 3. Configure Council Parameters

```typescript
const councilConfig = {
  topic: context.topic,
  context: `${context.background}\n\nConstraints: ${context.constraints.join(', ')}`,
  roster: roster,
  maxRounds: determineRounds(context.stakes), // 2 for low, 3 for medium, 4+ for high
  visibility: selectVisibility(userPreference),
  synthesisStrategy: selectStrategy(context)
};
```

### 4. Execute Council

```typescript
import { runCouncil } from 'mai-council-framework/Engine/Orchestrator';

const result = await runCouncil(councilConfig);
```

### 5. Present Results

Based on visibility mode, present:
- **full:** Show each agent's perspective, the deliberation, and synthesis
- **progress:** Stream key points as agents contribute, then synthesis
- **summary:** Present only the final synthesized recommendation

---

## Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| roster | `'auto'` or `string[]` | Which agents participate. Auto analyzes topic to select relevant expertise. |
| maxRounds | `1-5` | How many rounds of deliberation. More rounds = deeper analysis but higher latency. |
| visibility | `'full'`, `'progress'`, `'summary'` | How much of the process to show the user. |
| synthesisStrategy | `'consensus'`, `'weighted'`, `'facilitator'` | How to combine perspectives into a recommendation. |

### Visibility Modes Explained

| Mode | Shows | Best For |
|------|-------|----------|
| `full` | All agent perspectives, deliberation rounds, synthesis reasoning | Learning, documentation, high-stakes decisions |
| `progress` | Streaming updates as agents contribute, key disagreements, final synthesis | Interactive sessions, medium complexity |
| `summary` | Only the final recommendation with key supporting points | Quick decisions, lower stakes, time-constrained |

### Synthesis Strategies Explained

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `consensus` | Seeks common ground, highlights where agents agree/disagree | Balanced decisions, team buy-in needed |
| `weighted` | Weights perspectives by domain relevance to the topic | Technical decisions, clear domain ownership |
| `facilitator` | Designated agent synthesizes others' input | Complex multi-factor decisions, need clear accountability |

---

## Examples

### Example 1: Architecture Decision

```
User: "Should we migrate our monolith to microservices?"

Gathering:
- Topic: "Should we decompose our Rails monolith into microservices?"
- Context: "500k LOC Rails app, 5 engineers, scaling issues in checkout flow"
- Constraints: ["No dedicated DevOps", "AWS-hosted", "3-month runway for refactoring"]
- Stakes: High (affects next 2 years of development)

Process:
1. roster = 'auto' → selects: PlatformArchitect, TechLead, DevOps, ProductManager
2. maxRounds = 3 (high stakes)
3. visibility = 'full' (document reasoning)
4. synthesisStrategy = 'consensus'

Result presentation:
"After 3 rounds of deliberation, the council recommends:
**Strangler Fig pattern targeting checkout service only**

Key perspectives:
- PlatformArchitect: Full decomposition premature given team size
- DevOps: Current infrastructure can't support service mesh complexity
- TechLead: Checkout is clear bounded context, low-risk extraction target
- ProductManager: Checkout performance is primary pain point

Consensus: Start with checkout extraction as a learning exercise,
reassess after 6 months of running hybrid architecture."
```

### Example 2: Security Trade-off

```
User: "We need to decide on our authentication strategy for the new mobile app"

Gathering:
- Topic: "Which auth strategy: OAuth2/OIDC, API keys, or session-based?"
- Context: "B2B mobile app, offline-capable, enterprise customers"
- Constraints: ["Must support SSO", "Offline access for 72hrs", "SOC2 compliance required"]
- Stakes: High (security + customer trust)

Process:
1. roster = ['SecurityEngineer', 'MobileArchitect', 'ComplianceOfficer', 'UXLead']
2. maxRounds = 3
3. visibility = 'progress' (stay engaged without full transcript)
4. synthesisStrategy = 'weighted' (security domain has higher weight)

Progress output:
→ SecurityEngineer analyzing threat model...
→ MobileArchitect evaluating offline token refresh patterns...
→ ComplianceOfficer mapping to SOC2 controls...
→ UXLead assessing login friction impact...
→ Key disagreement: Token lifetime vs offline usability
→ Synthesis in progress...

Final: "OAuth2 with PKCE, 72hr refresh tokens stored in secure enclave,
biometric re-auth for sensitive operations. SecurityEngineer's concern
about long-lived tokens addressed via device binding."
```

### Example 3: Prioritization Decision

```
User: "Help me prioritize Q1 initiatives"

Gathering:
- Topic: "Which 3 initiatives from this list of 8 should we commit to for Q1?"
- Context: [List of 8 initiatives with brief descriptions]
- Constraints: ["4 engineers", "1 designer", "$50k budget"]
- Stakes: Medium

Process:
1. roster = 'auto' → selects: ProductManager, TechLead, FinanceAnalyst
2. maxRounds = 2
3. visibility = 'summary' (just need the answer)
4. synthesisStrategy = 'facilitator' (ProductManager synthesizes)

Summary output:
"Q1 Priorities:
1. Customer dashboard revamp (highest user impact, design-ready)
2. API performance optimization (unblocks 2 enterprise deals)
3. Audit logging (compliance deadline March 15)

Deferred: Mobile app, ML features (insufficient resources),
internal tooling (nice-to-have)"
```

---

## Output Interpretation

### Full Visibility Output Structure

```
=== COUNCIL SESSION ===
Topic: [The decision question]
Roster: [Agent1, Agent2, Agent3, Agent4]

--- ROUND 1 ---
[Agent1]: [Initial perspective, key concerns, recommendations]
[Agent2]: [Initial perspective, key concerns, recommendations]
[Agent3]: [Initial perspective, key concerns, recommendations]
[Agent4]: [Initial perspective, key concerns, recommendations]

--- ROUND 2 ---
[Agents respond to each other, refine positions, identify common ground]

--- ROUND 3 ---
[Final positions, remaining disagreements noted]

=== SYNTHESIS ===
Strategy: [consensus/weighted/facilitator]

Recommendation: [Clear actionable recommendation]

Supporting rationale:
- [Key point from Agent1]
- [Key point from Agent2]
- [Where perspectives aligned]

Dissenting views:
- [Any unresolved concerns]

Confidence: [high/medium/low based on consensus strength]
```

### Handling Low Confidence Results

If synthesis produces low confidence:
1. Surface the specific disagreements to the user
2. Ask if they want to add constraints that might break the tie
3. Offer to run additional rounds with clarifying context
4. Suggest which agent perspectives might deserve more weight given user's priorities

---

## Error Handling

| Situation | Response |
|-----------|----------|
| Topic too vague | Ask user to narrow to a specific, answerable question |
| No relevant agents found | Suggest running with generalist council or defining custom agent |
| Agents in deadlock after max rounds | Present deadlock transparently, highlight the core tension |
| User cancels mid-session | Save partial results for potential resumption |
