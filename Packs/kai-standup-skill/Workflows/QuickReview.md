# QuickReview Workflow

Lightweight 2-agent review for fast decisions on smaller topics.

## Metadata

```yaml
workflow: QuickReview
skill: standup
version: 1.0.0
triggers:
  - quick review *
  - fast review *
  - quick check *
```

## Overview

QuickReview is a streamlined standup variant designed for:
- Low-risk decisions
- Fast turnaround needs
- Simple technical questions
- Routine backlog grooming

Key differences from full standup:
- Uses only 2 agents (Clay and Hefley)
- Single round (no cross-talk phase)
- No devil's advocate
- Streamlined output

## When to Use

### Appropriate Use Cases

- Minor scope adjustments
- Simple implementation questions
- Quick sanity checks on approach
- Routine grooming decisions
- Non-security, non-infrastructure topics

### When to Escalate

If any of these are detected, escalate to a full standup:

| Trigger | Escalate To |
|---------|-------------|
| Security implications | SecurityReview |
| Infrastructure changes | RunStandup with infra agents |
| Cross-team dependencies | RunStandup with full roster |
| Compliance requirements | SecurityReview |
| High-risk changes | RunStandup |

## Workflow Steps

### Step 1: Parse Request

```typescript
function parseQuickReview(userMessage: string): {
  topic: string;
  escalationCheck: boolean;
} {
  // Extract topic
  const patterns = [
    /quick\s+review\s+(.+?)(?:\s*$)/i,
    /fast\s+review\s+(.+?)(?:\s*$)/i,
    /quick\s+check\s+(.+?)(?:\s*$)/i,
  ];

  let topic: string | null = null;
  for (const pattern of patterns) {
    const match = userMessage.match(pattern);
    if (match) {
      topic = match[1].trim();
      break;
    }
  }

  if (!topic) {
    throw new Error('Could not extract topic from quick review request');
  }

  return {
    topic,
    escalationCheck: true
  };
}
```

### Step 2: Check for Escalation Triggers

```typescript
const ESCALATION_KEYWORDS = {
  security: [
    'auth', 'authentication', 'authorization', 'token', 'jwt', 'oauth',
    'password', 'credential', 'encrypt', 'vulnerability', 'cmmc', 'security'
  ],
  infrastructure: [
    'deploy', 'kubernetes', 'k8s', 'container', 'docker', 'pipeline',
    'ci/cd', 'infrastructure', 'server', 'production'
  ],
  compliance: [
    'cmmc', 'gdpr', 'hipaa', 'audit', 'compliance', 'regulation', 'pci'
  ],
  crossTeam: [
    'integration', 'api contract', 'breaking change', 'migration',
    'cross-team', 'dependency'
  ]
};

function checkEscalation(topic: string): {
  shouldEscalate: boolean;
  reason?: string;
  recommendedWorkflow?: string;
} {
  const topicLower = topic.toLowerCase();

  for (const [category, keywords] of Object.entries(ESCALATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (topicLower.includes(keyword)) {
        return {
          shouldEscalate: true,
          reason: `Topic contains ${category}-related keyword: "${keyword}"`,
          recommendedWorkflow: category === 'security' || category === 'compliance'
            ? 'SecurityReview'
            : 'RunStandup'
        };
      }
    }
  }

  return { shouldEscalate: false };
}
```

### Step 3: Prompt for Escalation (if triggered)

```typescript
async function handleEscalation(
  topic: string,
  escalation: { reason: string; recommendedWorkflow: string }
): Promise<'proceed' | 'escalate'> {
  console.log(`\n[Warning] ${escalation.reason}`);
  console.log(`[Recommendation] Consider using ${escalation.recommendedWorkflow} instead.`);

  const choice = await promptUser(
    '\nOptions:\n' +
    '  1. Proceed with quick review anyway\n' +
    '  2. Escalate to recommended workflow\n' +
    'Choice (1/2): '
  );

  return choice === '2' ? 'escalate' : 'proceed';
}
```

### Step 4: Execute Quick Review

```typescript
import { runCouncil } from 'kai-council-framework/Engine/Orchestrator';

async function executeQuickReview(topic: string): Promise<CouncilResult> {
  // Fixed roster for quick review
  const roster = ['Clay', 'Hefley'];

  console.log(`\nStarting quick review on "${topic}"...\n`);
  console.log(`[Using quick-review roster: ${roster.join(', ')}]`);
  console.log(`[Single round, streamlined output]\n`);

  return runCouncil({
    topic,
    roster,
    maxRounds: 1,  // Single round only
    visibility: 'progress',  // Streamlined output
    synthesisStrategy: 'consensus',
    agentPack: 'kai-devsecops-agents',
    options: {
      devilsAdvocate: false,  // Skip devil's advocate
      conflictDetection: false  // Skip conflict analysis
    }
  });
}
```

### Step 5: Present Quick Results

```typescript
function presentQuickResults(result: CouncilResult): void {
  console.log('\n' + '-'.repeat(50));
  console.log('QUICK REVIEW SUMMARY');
  console.log('-'.repeat(50));

  // Agent perspectives (brief)
  console.log('\n## Perspectives\n');
  for (const contribution of result.contributions) {
    console.log(`**${contribution.agent}**: ${contribution.summary}`);
  }

  // Decision
  console.log('\n## Recommendation\n');
  console.log(result.synthesis.decision);

  // Quick confidence indicator
  const confidence = Math.round(result.synthesis.confidence * 100);
  const indicator = confidence >= 70 ? 'Proceed' : 'Consider deeper review';
  console.log(`\n**Status**: ${indicator} (${confidence}% confidence)`);

  // Action items (if any)
  if (result.synthesis.actionItems.length > 0) {
    console.log('\n## Next Steps\n');
    for (const item of result.synthesis.actionItems) {
      console.log(`- ${item.description}`);
    }
  }

  console.log('\n' + '-'.repeat(50));
}
```

## Complete Workflow

```typescript
export async function quickReview(userMessage: string): Promise<void> {
  // Step 1: Parse request
  const { topic } = parseQuickReview(userMessage);

  // Step 2: Check for escalation triggers
  const escalation = checkEscalation(topic);

  if (escalation.shouldEscalate) {
    // Step 3: Prompt for escalation
    const decision = await handleEscalation(topic, escalation);

    if (decision === 'escalate') {
      // Delegate to appropriate workflow
      if (escalation.recommendedWorkflow === 'SecurityReview') {
        const { securityReview } = await import('./SecurityReview');
        return securityReview(`security review ${topic}`);
      } else {
        const { runStandup } = await import('./RunStandup');
        return runStandup(`standup about ${topic}`);
      }
    }
    // If proceed, continue with quick review
  }

  // Step 4: Execute quick review
  const result = await executeQuickReview(topic);

  // Step 5: Present results
  presentQuickResults(result);
}
```

## Output Example

```
User: quick review this caching approach for user sessions

Starting quick review on "caching approach for user sessions"...

[Using quick-review roster: Clay, Hefley]
[Single round, streamlined output]

--------------------------------------------------
QUICK REVIEW SUMMARY
--------------------------------------------------

## Perspectives

**Clay**: Session caching with Redis is a solid approach. Consider TTL
alignment with session timeout and cluster mode for HA.

**Hefley**: From a testing perspective, ensure cache invalidation is
testable and consider cache miss scenarios in integration tests.

## Recommendation

Proceed with Redis-based session caching. Use consistent TTL with session
timeouts. Add integration tests for cache miss and invalidation scenarios.

**Status**: Proceed (78% confidence)

## Next Steps

- Define TTL configuration aligned with session policy
- Add integration test cases for cache scenarios

--------------------------------------------------
```

## Escalation Example

```
User: quick review the JWT token implementation

[Warning] Topic contains security-related keyword: "jwt"
[Recommendation] Consider using SecurityReview instead.

Options:
  1. Proceed with quick review anyway
  2. Escalate to recommended workflow
Choice (1/2): 2

Escalating to security review...

[Starting SecurityReview workflow...]
```

## Configuration

QuickReview uses minimal configuration:

```yaml
# In Config/standup.yaml
quickReview:
  roster: ['Clay', 'Hefley']
  maxRounds: 1
  visibility: progress
  devilsAdvocate: false
  escalationCheck: true
```

## Limitations

Quick reviews intentionally skip:

- Security deep-dive (escalate if needed)
- Infrastructure considerations (escalate if deployment-critical)
- Network concerns (escalate to Geoff if networking involved)
- Multiple rounds of deliberation
- Devil's advocate challenge
- Conflict resolution

If any of these are important for the decision, use a full standup instead.

## Related Workflows

- [RunStandup.md](./RunStandup.md) - Full multi-round standup
- [SecurityReview.md](./SecurityReview.md) - Security-focused standup
