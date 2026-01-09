---
name: standup
description: Multi-agent standup and council sessions for collaborative decision-making
version: 1.0.0
type: skill
depends_on:
  - mai-council-framework >= 1.0.0
  - mai-devsecops-agents >= 1.0.0
author: PAI
license: MIT
---

# Standup Skill

User-facing interface for running multi-agent standups using the Council Framework.

## Triggers

This skill activates when the user says:

| Trigger Pattern | Example | Workflow |
|-----------------|---------|----------|
| `standup` | "standup" | RunStandup (interactive) |
| `standup about {topic}` | "standup about authentication design" | RunStandup |
| `standup on {topic}` | "standup on database migration" | RunStandup |
| `council on {topic}` | "council on microservices architecture" | RunStandup |
| `team review {topic}` | "team review the API design" | RunStandup |
| `quick review {topic}` | "quick review this PR approach" | QuickReview |
| `security review {topic}` | "security review the auth flow" | SecurityReview |
| `security standup {topic}` | "security standup on CMMC compliance" | SecurityReview |

## Workflow Routing

```yaml
workflows:
  RunStandup:
    file: Workflows/RunStandup.md
    triggers:
      - standup
      - standup about *
      - standup on *
      - council on *
      - team review *
    default: true

  QuickReview:
    file: Workflows/QuickReview.md
    triggers:
      - quick review *
      - fast review *
      - quick check *

  SecurityReview:
    file: Workflows/SecurityReview.md
    triggers:
      - security review *
      - security standup *
      - security council *
      - sec review *
```

## Configuration Options

### Visibility Modes

Control how much detail is shown during the standup:

| Mode | Description | When to Use |
|------|-------------|-------------|
| `full` | Complete transcript with all agent statements | Deep analysis, learning |
| `progress` | Round summaries and key events | Normal standups |
| `summary` | Final synthesis only | Time-constrained, status updates |

### Output Destinations

Configure where standup results are stored:

```yaml
# In Config/standup.yaml
outputDestinations:
  console:
    enabled: true  # Always enabled

  joplin:
    enabled: false
    notebookName: Standups

  file:
    enabled: false
    path: ~/workshop/standups
```

### Roster Selection

The skill automatically selects agents based on topic keywords, or you can specify:

```
# Auto-select (recommended)
standup about authentication design

# Explicit roster
standup about deployment with Roger, Justin, and Daniel

# Named roster preset
standup about security using security-review roster
```

## Domain Keywords

The skill uses these keywords to auto-select appropriate agents:

| Domain | Keywords | Primary Agents |
|--------|----------|----------------|
| Security | auth, vulnerability, CMMC, encryption, token, OAuth | Daniel, Amy |
| Architecture | design, API, microservice, scalability, pattern | Clay, Hefley, Daniel |
| Planning | timeline, estimate, sprint, velocity, roadmap | Clay, Hefley, Amy, Rekha |
| Testing | coverage, E2E, ATDD, testability, regression | Amy, Hefley |
| Infrastructure | k8s, container, CI/CD, deploy, pipeline | Roger, Justin |
| Network | VLAN, firewall, DNS, routing, network | Geoff, Daniel |
| Database | schema, migration, SQL, query, data model | Clay, Daniel |
| Compliance | CMMC, GDPR, HIPAA, audit, regulation | Daniel, Amy, Mary |

## Examples

### Basic Standup

```
User: standup about authentication design

AI: Starting standup on "authentication design"...

[Selecting agents based on topic keywords: auth, design]
[Roster: Daniel (Security), Clay (Tech Lead), Hefley (Product)]

--- Round 1: Independent Perspectives ---

Daniel (Security Engineer):
For authentication, we need to consider...

Clay (Tech Lead):
From an implementation standpoint...

Hefley (Product Manager):
From a product perspective...

--- Round 2: Cross-Talk & Refinement ---
[Agents respond to each other's points]

--- Synthesis ---
Decision: [synthesized recommendation]
Confidence: High (85%)
Action Items:
- [ ] Item 1
- [ ] Item 2
```

### Quick Review

```
User: quick review this caching approach

AI: Starting quick review on "caching approach"...

[Using quick-review roster: Clay, Hefley]
[Single round, streamlined output]

Clay (Tech Lead): [perspective]
Hefley (Product Manager): [perspective]

Quick Synthesis: [recommendation]
```

### Security Review

```
User: security review the API authentication flow

AI: Starting security review on "API authentication flow"...

[Using security-review roster: Daniel (lead), Clay, Amy, Geoff]
[Daniel has veto power for critical security issues]

--- Security Analysis ---
[Extended security-focused discussion]

--- Compliance Check ---
[Additional round for compliance verification]

Security Findings:
- CRITICAL: [if any]
- HIGH: [if any]
- MEDIUM: [if any]
- LOW: [if any]

Recommendation: [synthesized decision]
Security Sign-off: [Daniel's approval status]
```

### With Explicit Options

```
User: standup about database schema with summary visibility

AI: [Runs standup, shows only final synthesis]
```

```
User: council on API design, save to Joplin

AI: [Runs council, saves full transcript to Joplin notebook]
```

## Integration Points

### Council Framework

This skill delegates to:
- `runCouncil()` from mai-council-framework/Engine/Orchestrator
- Uses RosterSelector for auto-agent selection
- Uses SynthesisEngine for decision synthesis
- Uses adapters for output formatting

### Agent Pack

Uses agents from:
- `mai-devsecops-agents` (default)
- Custom agent packs can be configured

### Output Adapters

- ConsoleAdapter: Always active, displays to terminal
- FileAdapter: Saves to configured path
- JoplinAdapter: Saves to Joplin notebook (if enabled)

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No topic provided | Interactive prompt for topic |
| Unknown roster | Falls back to auto-selection |
| Agent pack missing | Error with installation instructions |
| Joplin unavailable | Warning, continues without Joplin |
| Conflict deadlock | Escalates to user for decision |

## Related Skills

- `mai-council-framework`: Core orchestration engine
- `mai-devsecops-agents`: Default agent pack
- `mai-joplin-skill`: For Joplin output integration