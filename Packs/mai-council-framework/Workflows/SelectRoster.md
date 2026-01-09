# SelectRoster Workflow

**Purpose:** Determine which agents should participate in a council session based on the topic, required expertise, and session constraints.

**Triggers:** "who should be on the council", "select agents", "build roster", "which perspectives", "roster selection"

---

## When to Use

- Before running a council session when the user hasn't specified agents
- When the user wants to understand which perspectives are relevant to their decision
- To validate that a user-specified roster covers the necessary domains
- When refining a council composition after an inconclusive first session
- For teaching users which agent types exist and when they add value

---

## Procedure

### 1. Analyze the Decision Topic

Extract key signals from the topic and context:

```typescript
// Topic analysis extracts:
// - Domain keywords (security, performance, UX, cost, architecture, etc.)
// - Decision type (build vs buy, prioritization, risk assessment, trade-off)
// - Stakeholder implications (users, developers, ops, business, compliance)
```

### 2. Gather Selection Constraints

Ask the user if not provided:
- **Max agents:** How many perspectives? (Default: 4, Range: 2-6)
- **Required domains:** Any expertise that MUST be represented?
- **Excluded domains:** Any perspectives to intentionally omit?
- **Session depth:** Quick check vs deep deliberation?

```typescript
const constraints = {
  maxAgents: 4,
  required: ['Security'],      // Must include
  excluded: ['Legal'],         // Intentionally omit (e.g., already consulted)
  depth: 'standard'            // 'quick' | 'standard' | 'deep'
};
```

### 3. Run Selection Algorithm

```typescript
import { selectAgents } from 'mai-council-framework/Engine/RosterSelector';

const roster = selectAgents(topic, {
  featureContext: context,
  maxAgents: constraints.maxAgents,
  requiredAgents: constraints.required,
  excludedAgents: constraints.excluded
});
```

### 4. Present Roster with Rationale

Don't just return names - explain WHY each agent was selected:

```typescript
// Output format
{
  roster: ['SecurityEngineer', 'PlatformArchitect', 'ProductManager', 'FinanceAnalyst'],
  rationale: {
    'SecurityEngineer': 'Topic involves authentication - security review essential',
    'PlatformArchitect': 'System design implications of auth strategy',
    'ProductManager': 'User experience and adoption impact',
    'FinanceAnalyst': 'Cost implications of third-party auth services'
  },
  alternatives: {
    'DevOps': 'Could add if deployment/infrastructure concerns are primary',
    'ComplianceOfficer': 'Add if regulatory requirements are uncertain'
  },
  coverage: {
    technical: ['SecurityEngineer', 'PlatformArchitect'],
    business: ['ProductManager', 'FinanceAnalyst'],
    missing: ['Legal', 'UX'] // Domains not represented
  }
}
```

### 5. Allow Roster Refinement

Give the user options:
- Accept the roster as-is
- Swap an agent for an alternative
- Add an agent (if under max)
- Remove an agent they don't need
- Request a completely different composition

---

## Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| maxAgents | `2-6` | Maximum council size. Smaller = faster, larger = more comprehensive. |
| requiredAgents | `string[]` | Agents that MUST be included regardless of topic analysis. |
| excludedAgents | `string[]` | Agents to exclude (already consulted, not relevant, etc.). |
| balanceStrategy | `'technical'`, `'business'`, `'balanced'` | Bias selection toward technical or business perspectives. |

### Agent Categories

| Category | Agents | Selected When |
|----------|--------|---------------|
| **Technical** | TechLead, PlatformArchitect, SecurityEngineer, DevOps, DataEngineer, MobileArchitect | Architecture, implementation, infrastructure, security decisions |
| **Product** | ProductManager, UXLead, CustomerSuccess | User impact, adoption, roadmap, experience decisions |
| **Business** | FinanceAnalyst, OperationsManager, SalesEngineer | Cost, revenue, process, market decisions |
| **Governance** | ComplianceOfficer, LegalAdvisor, RiskManager | Regulatory, legal, risk decisions |
| **Generalist** | StrategicAdvisor, DevilsAdvocate, Synthesizer | Always-useful perspectives for any decision |

### Selection Heuristics

The selector uses these rules:

1. **Keyword matching:** Topic contains "security" → SecurityEngineer
2. **Decision type mapping:** "Build vs buy" → FinanceAnalyst + TechLead
3. **Stakeholder analysis:** Affects customers → ProductManager + UXLead
4. **Balance requirement:** Never all-technical or all-business
5. **Depth scaling:** Deep sessions get +1 agent, quick sessions get -1

---

## Examples

### Example 1: Technical Architecture Decision

```
User: "Help me figure out who should weigh in on our caching strategy"

Analysis:
- Keywords: caching, performance, infrastructure
- Type: Technical architecture
- Stakeholders: Developers, users (latency), ops (infrastructure)

Selection:
{
  roster: ['PlatformArchitect', 'DevOps', 'DataEngineer'],
  rationale: {
    'PlatformArchitect': 'Cache layer design and system integration',
    'DevOps': 'Infrastructure provisioning, monitoring, failure modes',
    'DataEngineer': 'Data consistency, invalidation patterns, query optimization'
  },
  alternatives: {
    'TechLead': 'Add if team implementation capacity is a concern',
    'FinanceAnalyst': 'Add if cloud cost is a primary constraint'
  }
}
```

### Example 2: Product Direction Decision

```
User: "We're deciding whether to add AI features to our product"

Analysis:
- Keywords: AI, features, product
- Type: Build/invest decision
- Stakeholders: Users, business (differentiation), tech (feasibility)

Selection:
{
  roster: ['ProductManager', 'TechLead', 'FinanceAnalyst', 'UXLead'],
  rationale: {
    'ProductManager': 'Market demand, competitive positioning, roadmap fit',
    'TechLead': 'Technical feasibility, team capability, build vs integrate',
    'FinanceAnalyst': 'Investment required, ROI timeline, make vs buy cost',
    'UXLead': 'How AI features would integrate into user experience'
  },
  alternatives: {
    'DataEngineer': 'Add if data pipeline readiness is uncertain',
    'SecurityEngineer': 'Add if AI involves sensitive data processing'
  }
}
```

### Example 3: Risk/Compliance Decision

```
User: "Need to decide on our data retention policy"

Analysis:
- Keywords: data, retention, policy
- Type: Compliance/governance
- Stakeholders: Legal, compliance, users, engineering

Selection:
{
  roster: ['ComplianceOfficer', 'LegalAdvisor', 'DataEngineer', 'ProductManager'],
  rationale: {
    'ComplianceOfficer': 'Regulatory requirements (GDPR, CCPA, industry-specific)',
    'LegalAdvisor': 'Legal exposure, user agreements, liability',
    'DataEngineer': 'Technical implementation, storage costs, deletion mechanics',
    'ProductManager': 'User expectations, feature implications (history, analytics)'
  },
  alternatives: {
    'SecurityEngineer': 'Add if data sensitivity classification is needed',
    'FinanceAnalyst': 'Add if storage cost optimization is a driver'
  }
}
```

### Example 4: Quick Sanity Check

```
User: "Just need a quick gut check on this API naming convention"

Analysis:
- Keywords: API, naming, convention
- Type: Quick technical decision
- Depth: quick (low stakes)

Selection:
{
  roster: ['TechLead', 'DevOps'],
  rationale: {
    'TechLead': 'Code consistency, developer experience',
    'DevOps': 'Monitoring, logging, debugging implications of naming'
  },
  note: 'Small roster appropriate for low-stakes, quick decisions'
}
```

---

## Output Interpretation

### Successful Selection

```
=== ROSTER SELECTION ===
Topic: "Should we implement feature flags?"

Selected Council (4 agents):

1. TechLead
   Why: Code complexity management, release process ownership

2. DevOps
   Why: Deployment pipeline integration, environment management

3. ProductManager
   Why: Feature rollout strategy, A/B testing requirements

4. QAEngineer
   Why: Testing complexity, configuration permutations

Coverage Analysis:
  Technical: TechLead, DevOps, QAEngineer
  Business: ProductManager

  Not represented: Security, Finance, UX

Alternatives to consider:
- SecurityEngineer: If flags will control security-sensitive features
- FinanceAnalyst: If evaluating commercial feature flag services

Proceed with this roster? [Yes / Modify / Regenerate]
```

### When Selection Fails

```
=== ROSTER SELECTION ===
Topic: "What should we do?"

Problem: Topic is too vague for effective agent selection.

To select appropriate agents, I need:
- A specific decision or question (not open-ended exploration)
- Context about your system/situation
- What kind of outcome you're looking for

Examples of refinable topics:
- "What should we do about performance?" → "Should we add caching or optimize queries?"
- "Help with the project" → "Which features should we prioritize for Q1?"

Please refine your topic and I'll select the right council.
```

---

## Advanced: Custom Agent Definitions

If the built-in agents don't cover your domain, you can define custom agents:

```typescript
const customAgent = {
  name: 'FarmOperationsAdvisor',
  domain: 'agriculture',
  expertise: ['livestock', 'crop rotation', 'equipment', 'seasonal planning'],
  perspective: 'Practical farm operations with focus on sustainability and efficiency',
  triggers: ['farm', 'livestock', 'crop', 'tractor', 'harvest', 'breeding']
};

// Include in roster selection
selectAgents(topic, {
  customAgents: [customAgent],
  maxAgents: 4
});
```

---

## Integration with RunCouncil

After roster selection, seamlessly flow into council execution:

```typescript
// In practice, these often chain together
const roster = await selectAgents(topic, constraints);

// User confirms or modifies roster
const confirmedRoster = await getUserConfirmation(roster);

// Then run the council
const result = await runCouncil({
  topic,
  context,
  roster: confirmedRoster.agents,
  // ... other config
});
```
