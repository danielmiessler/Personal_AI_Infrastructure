# mai-standup-skill

User-facing skill for running multi-agent standups and council sessions using the Council Framework.

## Metadata

```yaml
name: mai-standup-skill
version: 1.0.0
type: skill
requires:
  - mai-council-framework >= 1.0.0
  - mai-devsecops-agents >= 1.0.0
author: PAI
license: MIT
```

## Overview

The Standup Skill provides a natural language interface for invoking multi-agent deliberation sessions. It handles user interaction, configuration, and workflow selection while delegating the heavy lifting to the Council Framework.

**Key Innovation**: Multi-agent councils find 2-3x more issues than solo agent mode by bringing diverse specialist perspectives to bear on complex problems.

## What's Included

```
mai-standup-skill/
├── SKILL.md              # Skill definition and triggers
├── METHODOLOGY.md        # Multi-agent standup philosophy
├── README.md             # This file
├── package.json          # Package configuration
├── Config/
│   └── standup.yaml      # Default configuration
└── Workflows/
    ├── RunStandup.md     # Main standup workflow
    ├── QuickReview.md    # Lightweight 2-agent review
    └── SecurityReview.md # Security-focused standup
```

## Installation

### Prerequisites

1. **Council Framework** - Core orchestration engine
   ```bash
   cd ~/PAI/Packs
   git clone <repo> mai-council-framework
   cd mai-council-framework && bun install
   ```

2. **DevSecOps Agents** - Agent pack with specialist personas
   ```bash
   cd ~/PAI/Packs
   git clone <repo> mai-devsecops-agents
   ```

### Install Standup Skill

```bash
cd ~/PAI/Packs
git clone <repo> mai-standup-skill
cd mai-standup-skill && bun install
```

### Verify Installation

```bash
# Check dependencies
bun run verify

# Run a test standup
standup about "test topic"
```

## Usage

### Basic Standup

```
standup about authentication design
```

The skill will:
1. Detect relevant domains (security, architecture)
2. Auto-select appropriate agents
3. Run 3 rounds of deliberation
4. Present synthesized decision

### Quick Review

For faster decisions on lower-risk topics:

```
quick review this caching approach
```

Uses only 2 agents (Clay, Hefley) with a single round.

### Security Review

For security-sensitive topics:

```
security review the API authentication flow
```

Uses the security-review roster with Daniel leading and veto power enabled.

### With Options

```
# Specify agents
standup about deployment with Roger, Justin, and Daniel

# Use a preset roster
standup about security using security-review roster

# Control visibility
standup about database schema with summary visibility

# Save to Joplin
council on API design, save to Joplin
```

## Workflows

### RunStandup (Default)

Full multi-agent standup with:
- Auto-selected or specified roster
- 3 rounds of deliberation
- Cross-talk and conflict resolution
- Devil's advocate challenge
- Comprehensive synthesis

**Triggers**: `standup`, `standup about X`, `council on X`, `team review X`

### QuickReview

Lightweight review with:
- Fixed 2-agent roster (Clay, Hefley)
- Single round
- Streamlined output
- Escalation detection

**Triggers**: `quick review X`, `fast review X`, `quick check X`

### SecurityReview

Security-focused standup with:
- Security roster (Daniel leads)
- Veto power for critical issues
- Extra compliance check round
- Severity-rated findings output

**Triggers**: `security review X`, `security standup X`, `sec review X`

## Configuration

Edit `Config/standup.yaml` to customize defaults:

```yaml
defaults:
  visibility: full      # full | progress | summary
  adapters:
    - console           # Always enabled
  agentPack: mai-devsecops-agents

outputDestinations:
  joplin:
    enabled: false
    notebookName: Standups
  file:
    enabled: false
    path: ~/workshop/standups
```

### Visibility Modes

| Mode | Description |
|------|-------------|
| `full` | Complete transcript with all agent statements |
| `progress` | Round summaries and key events |
| `summary` | Final synthesis only |

### Output Adapters

- **console**: Always active, displays to terminal
- **file**: Saves markdown to configured path
- **joplin**: Saves to Joplin notebook (requires mai-joplin-skill)

## Agent Roster Presets

| Preset | Agents | Use Case |
|--------|--------|----------|
| `full-team` | All 9 | Comprehensive review |
| `security-review` | Daniel, Clay, Amy, Geoff | Security analysis |
| `architecture-review` | Clay, Daniel, Amy, Roger | System design |
| `planning-estimation` | Clay, Hefley, Amy, Rekha | Sprint planning |
| `quick-review` | Clay, Hefley | Fast decisions |

## Integration

### With Council Framework

The skill uses Council Framework components:

```typescript
import { runCouncil } from 'mai-council-framework/Engine/Orchestrator';
import { RosterSelector } from 'mai-council-framework/Engine/RosterSelector';
import { ConsoleAdapter } from 'mai-council-framework/Adapters/ConsoleAdapter';
```

### With Joplin Skill

When Joplin output is enabled:

```typescript
import { JoplinAdapter } from 'mai-council-framework/Adapters/JoplinAdapter';
// or
import { saveNote } from 'mai-joplin-skill/Tools/notes';
```

### With Other Skills

Standups can be invoked from other skills:

```typescript
import { runStandup } from 'mai-standup-skill/Workflows/RunStandup';

// Within another workflow
await runStandup('standup about authentication design');
```

## Examples

### Architecture Decision

```
User: standup about microservices vs monolith for our new project

AI: Starting standup on "microservices vs monolith for our new project"...

[Detected domains: architecture]
[Roster: Clay, Daniel, Hefley, Roger]

[... 3 rounds of deliberation ...]

SYNTHESIS:
Given the team size (4 developers) and timeline (3 months to MVP),
recommend starting with a modular monolith. Microservices add complexity
that outweighs benefits at current scale. Design for eventual extraction.

Confidence: High (78%)

Action Items:
- [ ] Define module boundaries for future extraction
- [ ] Set up monitoring to identify extraction candidates
```

### Security Review

```
User: security review the OAuth2 implementation

AI: Starting security review on "OAuth2 implementation"...

[Using security-review roster: Daniel, Clay, Amy, Geoff]
[Daniel has veto power for critical issues]

[... security-focused deliberation ...]

SECURITY FINDINGS:
- CRITICAL: Refresh tokens not rotated on use
- HIGH: Authorization code reuse possible
- MEDIUM: Token storage in localStorage

Security Sign-Off: CONDITIONAL - Fix CRITICAL before production

Action Items:
- [ ] Implement refresh token rotation (Critical)
- [ ] Add authorization code one-time-use check (High)
- [ ] Migrate to httpOnly cookies (Medium)
```

### Quick Check

```
User: quick review naming convention for the new API endpoints

AI: Starting quick review...

[Using quick-review roster: Clay, Hefley]
[Single round, streamlined output]

Clay: RESTful naming with resource-based paths is standard.
Hefley: Consider API versioning strategy from the start.

RECOMMENDATION: Use /api/v1/{resource}/{id} pattern with lowercase,
hyphenated resource names. Document in OpenAPI spec.

Status: Proceed (85% confidence)
```

## Troubleshooting

### Common Issues

**"Agent pack not found"**
```bash
# Install the agent pack
cd ~/PAI/Packs
git clone <repo> mai-devsecops-agents
```

**"Council framework not available"**
```bash
# Install the framework
cd ~/PAI/Packs
git clone <repo> mai-council-framework
cd mai-council-framework && bun install
```

**"Joplin adapter failed"**
- Check that Joplin is running
- Verify the Web Clipper service is enabled
- Check API token in Joplin skill configuration

### Debug Mode

Enable verbose logging:
```yaml
# In Config/standup.yaml
debug:
  enabled: true
  logLevel: verbose
```

## Version History

- **1.0.0**: Initial release
  - RunStandup, QuickReview, SecurityReview workflows
  - Auto roster selection
  - Joplin and file output adapters

## Contributing

Contributions welcome! Areas of interest:

- New workflow types (e.g., PostmortemReview, PlanningPoker)
- Additional output adapters
- Roster optimization algorithms
- Integration with other PAI skills

## License

MIT License - See LICENSE file for details.

---

**Pack Version**: 1.0.0
**Last Updated**: 2026-01-06
**Compatibility**: mai-council-framework >= 1.0.0
