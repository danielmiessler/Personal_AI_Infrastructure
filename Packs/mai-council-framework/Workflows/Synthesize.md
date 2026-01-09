# Synthesize Workflow

**Purpose:** Combine multiple agent perspectives into a coherent recommendation, decision, or action plan.

**Triggers:** "synthesize perspectives", "combine opinions", "reach consensus", "make a decision", "what's the verdict"

---

## When to Use

- After a council session completes deliberation rounds
- When you have collected perspectives from multiple sources (not just council agents)
- To break a tie or deadlock between competing viewpoints
- When the user wants a clear recommendation from diverse inputs
- To document the reasoning behind a multi-stakeholder decision

---

## Procedure

### 1. Collect Perspectives

Gather all inputs to synthesize:

```typescript
interface Perspective {
  agent: string;           // Who provided this perspective
  position: string;        // Their recommendation/stance
  reasoning: string[];     // Key supporting points
  concerns: string[];      // Risks or downsides they identified
  confidence: number;      // 0-1 how confident they are
  priority: string[];      // What they're optimizing for
}

const perspectives: Perspective[] = [
  {
    agent: 'SecurityEngineer',
    position: 'Recommend OAuth2 with PKCE',
    reasoning: ['Industry standard', 'Token-based fits mobile', 'SSO compatible'],
    concerns: ['Token storage on device', 'Refresh token lifetime'],
    confidence: 0.85,
    priority: ['Security', 'Compliance']
  },
  // ... other agent perspectives
];
```

### 2. Select Synthesis Strategy

Choose based on the decision type and user needs:

```typescript
type SynthesisStrategy = 'consensus' | 'weighted' | 'facilitator';

const strategy = determineStrategy({
  hasDesignatedDecider: false,      // Is one perspective authoritative?
  needsTeamBuyIn: true,             // Does implementation require consensus?
  domainClearlyOwned: false,        // Is there an obvious domain expert?
  conflictLevel: 'moderate'         // How much do perspectives disagree?
});
```

### 3. Run Synthesis

```typescript
import { synthesize } from 'mai-council-framework/Engine/SynthesisEngine';

const decision = synthesize(perspectives, {
  strategy: strategy,
  topic: originalTopic,
  constraints: originalConstraints,
  weights: strategy === 'weighted' ? domainWeights : undefined,
  facilitator: strategy === 'facilitator' ? 'StrategicAdvisor' : undefined
});
```

### 4. Present Synthesis Output

Structure the output based on what the user needs:

```typescript
interface SynthesisResult {
  recommendation: string;           // Clear, actionable recommendation
  confidence: 'high' | 'medium' | 'low';
  consensusPoints: string[];        // Where all/most agents agreed
  dissent: DissentingView[];        // Unresolved disagreements
  nextSteps: string[];              // Concrete actions to take
  revisitTriggers: string[];        // Conditions that should reopen this decision
}
```

---

## Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| strategy | `'consensus'`, `'weighted'`, `'facilitator'` | How to combine perspectives. |
| weights | `Record<string, number>` | For weighted strategy: domain relevance scores. |
| facilitator | `string` | For facilitator strategy: which agent synthesizes. |
| requireUnanimity | `boolean` | Whether all agents must agree for high confidence. |
| surfaceDissent | `boolean` | Whether to include minority opinions in output. |

### Strategy Deep Dive

#### Consensus Strategy

**How it works:**
1. Identify points where 2+ agents agree
2. Surface disagreements and attempt resolution
3. Find the recommendation that satisfies the most constraints
4. Note any irreconcilable differences

**Best for:**
- Team decisions requiring buy-in
- Balanced trade-offs without clear "right answer"
- Situations where implementation needs multiple stakeholders

**Output characteristics:**
- Moderate recommendations (not extreme positions)
- Explicit acknowledgment of trade-offs
- Lower confidence when significant dissent exists

```typescript
synthesize(perspectives, {
  strategy: 'consensus',
  requireUnanimity: false,  // Majority agreement sufficient
  surfaceDissent: true      // Show minority views
});
```

#### Weighted Strategy

**How it works:**
1. Assign weights to each perspective based on domain relevance
2. Score each possible recommendation by weighted support
3. Select highest-scored option
4. Confidence scales with weight concentration

**Best for:**
- Technical decisions where expertise matters
- Clear domain ownership (security decision = security expert weighted higher)
- When some perspectives are advisory vs. authoritative

**Output characteristics:**
- May favor specialist view over generalist consensus
- Higher confidence when domain expert strongly supports
- Clear reasoning chain: "SecurityEngineer (weight: 0.4) strongly recommends X"

```typescript
synthesize(perspectives, {
  strategy: 'weighted',
  weights: {
    'SecurityEngineer': 0.4,    // Primary domain
    'TechLead': 0.25,           // Implementation owner
    'ProductManager': 0.2,       // User impact
    'FinanceAnalyst': 0.15      // Advisory
  }
});
```

#### Facilitator Strategy

**How it works:**
1. Designated facilitator agent reviews all perspectives
2. Facilitator applies judgment to synthesize (not just aggregate)
3. Facilitator can introduce new considerations
4. Final recommendation is facilitator's call

**Best for:**
- Complex multi-factor decisions
- When you need a single accountable perspective
- Breaking true deadlocks
- Decisions that need creative resolution, not just combination

**Output characteristics:**
- May produce unexpected recommendations
- Strong narrative reasoning
- Facilitator takes ownership of the decision

```typescript
synthesize(perspectives, {
  strategy: 'facilitator',
  facilitator: 'StrategicAdvisor'  // Or user-specified agent
});
```

---

## Examples

### Example 1: Consensus on Technology Choice

```
Perspectives collected:
- TechLead: "Go with PostgreSQL - team knows it, proven at our scale"
- DataEngineer: "Consider TimescaleDB - better for our time-series data patterns"
- DevOps: "PostgreSQL - easier to manage, better tooling support"
- FinanceAnalyst: "Either works cost-wise, slight edge to PostgreSQL (no license)"

Strategy: consensus

Synthesis process:
1. Agreement: All accept PostgreSQL as viable
2. Dissent: DataEngineer prefers TimescaleDB for specific use case
3. Resolution: TimescaleDB is PostgreSQL extension - can add later if needed
4. Confidence: High (3/4 direct support, 1 conditional support)

Output:
{
  recommendation: "Use PostgreSQL with option to add TimescaleDB extension for time-series workloads if performance requires it",
  confidence: 'high',
  consensusPoints: [
    "PostgreSQL as foundation is universally supported",
    "Team familiarity reduces risk",
    "TimescaleDB extension available if specialized needs emerge"
  ],
  dissent: [{
    agent: 'DataEngineer',
    position: 'Would prefer TimescaleDB from start',
    weight: 'advisory',
    resolution: 'Extension path addresses concern'
  }],
  nextSteps: [
    "Provision PostgreSQL 15+",
    "Document time-series query patterns",
    "Set performance baseline for future TimescaleDB evaluation"
  ]
}
```

### Example 2: Weighted Security Decision

```
Perspectives collected:
- SecurityEngineer: "Require MFA for all users - non-negotiable for compliance"
- ProductManager: "MFA creates friction - users hate it, support tickets will spike"
- UXLead: "If we must have MFA, use passkeys - better UX than TOTP"
- TechLead: "Passkeys not mature enough - TOTP is proven"

Strategy: weighted (security decision)
Weights: Security 0.45, Tech 0.25, Product 0.15, UX 0.15

Synthesis process:
1. SecurityEngineer's position on MFA is heavily weighted (0.45)
2. Implementation approach: TechLead + UXLead disagree
3. Weighted resolution: TechLead (0.25) > UXLead (0.15) on implementation
4. ProductManager concern noted but outweighed

Output:
{
  recommendation: "Implement MFA using TOTP with passkeys as progressive enhancement",
  confidence: 'high',
  consensusPoints: [
    "MFA is required (security weight decisive)",
    "TOTP for reliability at launch",
    "Passkey option for users who prefer it"
  ],
  dissent: [{
    agent: 'ProductManager',
    position: 'Concerned about user friction',
    weight: 'noted',
    mitigation: 'Clear user communication, support documentation prepared'
  }],
  nextSteps: [
    "Implement TOTP with authenticator app support",
    "Add passkey registration as optional",
    "Prepare user communication plan",
    "Monitor support ticket volume post-launch"
  ]
}
```

### Example 3: Facilitator Breaking Deadlock

```
Perspectives collected:
- TechLead: "Rewrite in Rust - performance is critical and worth the investment"
- ProductManager: "Optimize current Python - we can't pause features for 6 months"
- FinanceAnalyst: "Rust rewrite ROI is negative for 18 months"
- DevOps: "Either works for me, concerned about team split during transition"

Deadlock: TechLead vs ProductManager/FinanceAnalyst (no consensus possible)

Strategy: facilitator (StrategicAdvisor)

Facilitator analysis:
"The deadlock reflects a genuine tension between long-term technical health
and short-term business needs. Neither 'full rewrite' nor 'optimize in place'
addresses both concerns.

I recommend a third path: Profile and identify the 3 hottest code paths.
Rewrite ONLY those critical paths in Rust as PyO3 extensions. This gives:
- TechLead: Rust where it matters most, skills development
- ProductManager: No feature freeze, incremental improvement
- FinanceAnalyst: Bounded investment, measurable ROI per component
- DevOps: No team split, gradual transition"

Output:
{
  recommendation: "Hybrid approach: Rewrite top 3 performance-critical modules as Rust/PyO3 extensions while maintaining Python codebase",
  confidence: 'medium',
  consensusPoints: [
    "Performance improvement is needed",
    "Full rewrite carries significant risk",
    "Incremental approach reduces risk"
  ],
  dissent: [{
    agent: 'TechLead',
    position: 'Would prefer full rewrite for architectural benefits',
    weight: 'acknowledged',
    resolution: 'Hybrid success could justify broader rewrite later'
  }],
  nextSteps: [
    "Profile application to identify top 3 bottlenecks",
    "Spike: PyO3 integration with one module",
    "Define success metrics for hybrid approach",
    "6-month checkpoint to evaluate expansion"
  ],
  revisitTriggers: [
    "If hybrid modules show >50% improvement, consider expanding",
    "If Python optimization proves sufficient, pause Rust work",
    "If team struggles with hybrid complexity, reassess"
  ]
}
```

---

## Output Interpretation

### Confidence Levels

| Level | Meaning | User Action |
|-------|---------|-------------|
| **High** | Strong consensus or heavily weighted expert agreement | Proceed with confidence |
| **Medium** | Majority agreement with notable dissent | Proceed but monitor dissent concerns |
| **Low** | Significant disagreement, recommendation is "best available" | Consider gathering more input or constraints |

### Dissent Handling

Dissent is not failure - it's valuable signal. Present it as:

```
Dissenting View: [Agent]
Position: [What they recommended instead]
Concern: [Why they disagree]
Weight: [How much this should factor into your decision]
Mitigation: [How the recommendation addresses or accepts this concern]
```

### Revisit Triggers

Good synthesis includes conditions for reopening the decision:

```
Revisit this decision if:
- [Assumption] proves false
- [Metric] exceeds [threshold]
- [Timeline] is not met
- [External factor] changes
```

---

## Standalone Usage

Synthesize can be used outside of a full council session:

```typescript
// Synthesize perspectives from any source
const manualPerspectives = [
  { agent: 'UserResearch', position: '...', reasoning: [...] },
  { agent: 'EngineeringManager', position: '...', reasoning: [...] },
  { agent: 'CustomerFeedback', position: '...', reasoning: [...] }
];

const decision = synthesize(manualPerspectives, {
  strategy: 'consensus',
  topic: 'Feature prioritization for Q2'
});
```

This allows synthesis of:
- Perspectives gathered outside of council (meetings, surveys, interviews)
- Historical decisions being revisited
- Cross-team input that doesn't map to standard agents

---

## Integration with Council Flow

In a full council session, synthesis happens automatically:

```typescript
const result = await runCouncil({
  topic: '...',
  roster: [...],
  synthesisStrategy: 'consensus'  // Determines how Synthesize runs
});

// result.synthesis contains the Synthesize output
// result.deliberation contains the raw perspective data
```

For manual control over synthesis (e.g., to try multiple strategies):

```typescript
const councilResult = await runCouncil({
  topic: '...',
  roster: [...],
  skipSynthesis: true  // Get raw perspectives only
});

// Try different synthesis strategies
const consensusResult = synthesize(councilResult.perspectives, { strategy: 'consensus' });
const weightedResult = synthesize(councilResult.perspectives, { strategy: 'weighted', weights: {...} });

// Present both to user for comparison
```
