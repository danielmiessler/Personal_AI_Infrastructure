---
name: Council
description: Multi-agent orchestration framework for collaborative decision-making. USE WHEN you need multiple specialist perspectives on complex decisions. Provides agent loading, roster selection, conflict resolution, and synthesis.
type: framework
version: "1.0"
---

# Council Framework

Multi-agent orchestration: Better decisions through collaborative specialist perspectives.

## When to Use

Use the Council Framework when you need:
- Multiple specialist perspectives on a complex decision
- Architecture or design reviews
- Prioritization decisions with trade-offs
- Security and compliance reviews
- Any high-stakes decision benefiting from diverse viewpoints

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| runCouncil | Complex decision needing multiple perspectives | Synthesized decision from agent discussion |
| selectRoster | Determine which agents should participate | Agent list with relevance scores |
| synthesize | Combine agent perspectives into consensus | Actionable decision with rationale |

## API

### Primary Entry Point

```typescript
import { runCouncil } from 'mai-council-framework/Engine/Orchestrator';

const result = await runCouncil({
  topic: 'Decision question or topic',
  context: 'Background context and constraints',
  roster: ['Agent1', 'Agent2'] | 'auto',
  maxRounds: 3,
  visibility: 'full' | 'progress' | 'summary',
  synthesisStrategy: 'consensus' | 'weighted' | 'facilitator'
});
```

### Roster Selection

```typescript
import { selectAgents } from 'mai-council-framework/Engine/RosterSelector';

const roster = selectAgents('authentication design', {
  featureContext: 'Enterprise SaaS platform',
  maxAgents: 3
});
// Returns: ['SecurityEngineer', 'TechLead', 'ProductManager']
```

### Synthesis

```typescript
import { synthesize } from 'mai-council-framework/Engine/SynthesisEngine';

const decision = synthesize(agentPerspectives, {
  strategy: 'consensus',
  conflictThreshold: 0.3
});
```

## Examples

### Example 1: Architecture Review

```typescript
const result = await runCouncil({
  topic: 'Should we migrate from monolith to microservices?',
  context: 'Current system: 50K LOC monolith, 10K RPM, 5 developers',
  roster: 'auto'
});

// Auto-selected roster: TechLead, PlatformEngineer, ProductManager
// Output: Synthesized recommendation with phased migration plan
```

### Example 2: Security Decision

```typescript
const result = await runCouncil({
  topic: 'Review authentication design for compliance',
  context: 'CMMC Level 2 compliance required, MVP deadline in 8 weeks',
  roster: ['SecurityEngineer', 'TechLead', 'QALead'],
  synthesisStrategy: 'weighted'  // Weight by security expertise
});

// Output: Security-weighted decision with compliance checklist
```

### Example 3: Prioritization

```typescript
const result = await runCouncil({
  topic: 'What features should be in MVP vs v1.1?',
  context: 'Feature list attached, 8-week timeline',
  roster: ['ProductManager', 'TechLead', 'BusinessAnalyst'],
  maxRounds: 2
});

// Output: MoSCoW prioritization with rationale from each perspective
```

## Configuration

Configuration is loaded from `Config/council.yaml`:

```yaml
version: "1.0"
session:
  defaults:
    visibility: full
    maxRounds: 3
    conflictThreshold: 0.3
    synthesisStrategy: consensus
adapters:
  default: [console, file]
  optional: [joplin]
```

## Visibility Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| full | Complete transcript with all agent statements | Deep analysis, audit trail |
| progress | Round summaries and key conflicts | Active participation |
| summary | Final synthesis only | Quick decisions |

## Synthesis Strategies

### Consensus (Default)
Find common ground across all agent perspectives. Best when all perspectives should carry equal weight.

### Weighted
Weight perspectives by domain expertise relevance. Best when the topic clearly falls into one agent's specialty.

### Facilitator
Designate one agent (typically Charles/Facilitator) to make final call after hearing all perspectives. Best for deadlocked decisions.

## Conflict Resolution

The framework automatically detects conflicts:
- **Direct conflicts**: Mutually exclusive positions
- **Priority conflicts**: Different rankings of same options
- **Scope conflicts**: Different definitions of "done"

Conflicts trigger additional discussion rounds until resolved or maximum rounds reached.

## Integration Points

### Agent Packs
Load agents from installed agent packs:
```typescript
// Looks for agents in Packs/mai-agents-*/
const agents = await loadAgents(['SecurityEngineer', 'TechLead']);
```

### Output Adapters
Register custom output handlers:
```typescript
import { registerAdapter } from 'mai-council-framework/Engine/Orchestrator';
registerAdapter(myCustomAdapter);
```

### Session Recording
Sessions can be recorded to:
- Console (always active)
- Markdown files (FileAdapter)
- Joplin notes (JoplinAdapter - optional)

## Methodology

Based on proven multi-agent orchestration principles:

1. **Diverse Perspectives**: Multiple specialists find more issues than solo analysis
2. **Structured Discussion**: Round-based discussion with clear rules
3. **Cross-Talk Patterns**: Agents build on, challenge, and synthesize each other's views
4. **Synthesis Over Voting**: Find decisions better than any single perspective
5. **Decision Documentation**: Full audit trail with rationale

**Core Innovation**: Council sessions find **2-3x more issues** than solo agent mode.

## Dependencies

**Required:**
- Agent packs providing specialist agents
- Bun runtime for TypeScript execution
- yaml package for configuration parsing

**Optional Integrations:**
- `mai-security-tools`: Automated security scanning during security reviews
- `mai-security-skill`: CMMC compliance knowledge base for Daniel agent
- `mai-joplin-skill`: Record council decisions to Joplin notes

## Security Integration

When `mai-security-tools` is installed, security-focused council sessions can leverage automated scanning:

```typescript
// Security sessions can run automated scans before discussion
const scanResults = await runSecurityScans(projectPath);

const result = await runCouncil({
  topic: 'Security review of authentication module',
  context: incorporateScanResults(baseContext, scanResults),
  roster: ['SecurityEngineer', 'TechLead', 'QALead'],
  synthesisStrategy: 'weighted'
});
```

**Scan Integration:**
- `DependencyAudit`: CVE findings inform Daniel's risk assessment
- `SecretsScan`: Detected secrets trigger automatic veto consideration
- `SbomGenerator`: SBOM satisfies CMMC SA.L2-3.17.2 compliance

## Related Skills

- `mai-devsecops-agents`: DevSecOps team agents (Daniel, Mary, Clay, etc.)
- `mai-security-tools`: Automated security scanning tools
- `mai-security-skill`: Security workflows and CMMC knowledge
- `mai-joplin-skill`: Record decisions to Joplin
