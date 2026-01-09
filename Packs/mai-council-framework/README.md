# Council Framework

Multi-agent orchestration framework for collaborative decision-making in PAI v2.0.

## Metadata

| Field | Value |
|-------|-------|
| Name | mai-council-framework |
| Version | 1.0.0 |
| Type | framework |
| Author | PAI |
| License | MIT |

## Description

The Council Framework provides a structured approach to multi-agent orchestration, enabling multiple specialist agents to collaborate on complex decisions. It handles agent loading, roster selection, conflict resolution, and synthesis of perspectives into actionable decisions.

**Key Innovation**: Multi-agent councils find 2-3x more issues than solo agent mode by bringing diverse specialist perspectives to bear on complex problems.

## What's Included

```
mai-council-framework/
├── Engine/
│   ├── Orchestrator.ts      # Main orchestration entry point
│   ├── AgentLoader.ts       # Dynamic agent loading from packs
│   ├── RosterSelector.ts    # Smart agent selection
│   ├── SynthesisEngine.ts   # Decision synthesis strategies
│   └── ConflictResolver.ts  # Conflict detection and resolution
├── Adapters/
│   ├── AdapterInterface.ts  # Base adapter interface
│   ├── ConsoleAdapter.ts    # Console output adapter
│   └── FileAdapter.ts       # File-based output adapter
├── Config/
│   └── council.yaml         # Framework configuration
├── Templates/
│   └── AgentTemplate.md     # Template for creating custom agents
└── Tests/
    └── (test files)
```

## Installation

1. Clone into your PAI Packs directory:
   ```bash
   cd ~/PAI/Packs
   git clone <repo> mai-council-framework
   ```

2. Install dependencies:
   ```bash
   cd mai-council-framework
   bun install
   ```

3. Configure (optional):
   ```bash
   # Edit Config/council.yaml to customize defaults
   ```

## Usage

### Basic Council Session

```typescript
import { runCouncil } from './Engine/Orchestrator';

const result = await runCouncil({
  topic: 'Should we add OAuth2 to MVP?',
  context: 'Building a SaaS platform targeting enterprise users',
  roster: ['ProductManager', 'SecurityEngineer', 'TechLead'],
  maxRounds: 3
});

console.log(result.synthesis);
```

### With Custom Configuration

```typescript
import { runCouncil } from './Engine/Orchestrator';

const result = await runCouncil({
  topic: 'Architecture review for microservices migration',
  context: 'Current monolith handles 10K RPM, need to scale to 100K',
  roster: 'auto',  // Auto-select based on topic
  visibility: 'full',  // full | progress | summary
  synthesisStrategy: 'weighted',  // consensus | weighted | facilitator
  maxRounds: 2
});
```

### CLI Usage

```bash
# Run a council session
bun run Engine/Orchestrator.ts "Review authentication design" --roster auto

# Specify roster manually
bun run Engine/Orchestrator.ts "Database migration strategy" --roster TechLead,DBA,QALead
```

## Core Concepts

### Agents
Specialist personas with defined expertise, personality, and decision-making frameworks. Agents are loaded from agent packs (e.g., `mai-agents-engineering`).

### Roster
The set of agents participating in a council session. Can be manually specified or auto-selected based on topic keywords.

### Rounds
Council sessions proceed in rounds:
- **Round 1**: Independent perspectives (no cross-talk)
- **Round 2**: Reactive perspectives (cross-talk encouraged)
- **Round 3**: Final positions and consensus building

### Synthesis
The process of combining multiple agent perspectives into a coherent decision that's better than any single perspective.

### Adapters
Output handlers that receive council events (agent speaking, conflicts detected, etc.) and format them for different targets (console, file, Joplin).

## Configuration

See `Config/council.yaml` for all configuration options:

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

## Integration

The Council Framework integrates with:

- **Agent Packs** (`mai-agents-*`): Provides specialist agents
- **Joplin Skill**: Records decisions to Joplin notebooks
- **Other PAI Skills**: Can be invoked as a decision-making substrate

## API Reference

### `runCouncil(options)`

Main entry point for council sessions.

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| topic | string | required | The decision or question to discuss |
| context | string | '' | Background context for the decision |
| roster | string[] \| 'auto' | 'auto' | Agents to participate |
| maxRounds | number | 3 | Maximum discussion rounds |
| visibility | 'full' \| 'progress' \| 'summary' | 'full' | Output verbosity |
| synthesisStrategy | 'consensus' \| 'weighted' \| 'facilitator' | 'consensus' | How to combine perspectives |

**Returns**: `CouncilResult` with synthesis, transcript, and action items.

## Creating Custom Agents

Use `Templates/AgentTemplate.md` as a starting point. See the template for detailed instructions on defining:

- Role and expertise
- Personality and communication style
- Decision-making frameworks
- Integration with other agents

## Version History

- **1.0.0**: Initial release with core orchestration, synthesis, and adapters

## License

MIT
