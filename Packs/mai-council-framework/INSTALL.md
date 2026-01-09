# mai-council-framework Installation

Multi-agent orchestration framework for collaborative decision-making in PAI v2.0. The Council Framework enables multiple specialist agents to collaborate on complex decisions through structured discussion, conflict resolution, and synthesis.

**Key Innovation**: Multi-agent councils find 2-3x more issues than solo agent mode by bringing diverse specialist perspectives to bear on complex problems.

## Prerequisites

- **Bun** v1.0.0 or later
- **TypeScript** v5.3.0 or later (for development)
- **At least one agent pack** installed (e.g., `mai-devsecops-agents`, `mai-agents-engineering`)
- macOS, Linux, or Windows with WSL

---

## Step 1: Clone or Copy the Pack

If not already present in your Packs directory:

```bash
# Navigate to your Packs directory
cd "${PAI_PACKS:-$HOME/PAI/Packs}"

# Clone or copy the pack
# (If using git)
git clone <repository-url> mai-council-framework

# Or copy from existing location
cp -r /path/to/mai-council-framework ./
```

---

## Step 2: Install Dependencies

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"
bun install
```

This installs:
- `yaml` - YAML parsing for configuration files
- `@types/node` - Node.js type definitions
- `bun-types` - TypeScript types for Bun runtime
- `typescript` - TypeScript compiler

---

## Step 3: Verify TypeScript Compilation

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"
bun run typecheck
```

Expected: No output (clean compilation with no errors).

---

## Step 4: Install Agent Pack(s)

The Council Framework requires agent packs to function. Install at least one:

```bash
# Check for available agent packs
ls "${PAI_PACKS:-$HOME/PAI/Packs}"/mai-*-agents/ 2>/dev/null
ls "${PAI_PACKS:-$HOME/PAI/Packs}"/mai-agents-*/ 2>/dev/null

# Install an agent pack (example)
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-devsecops-agents"
bun install
```

---

## Step 5: Configure the Framework (Optional)

The framework comes with sensible defaults in `Config/council.yaml`. Customize if needed:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

# View current configuration
cat Config/council.yaml
```

Default configuration:
```yaml
version: "1.0"
session:
  defaults:
    visibility: full        # full | progress | summary
    maxRounds: 3            # Maximum discussion rounds
    conflictThreshold: 0.3  # Conflict detection sensitivity
    synthesisStrategy: consensus  # consensus | weighted | facilitator
adapters:
  default: [console, file]
  optional: [joplin]
```

---

## Step 6: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

# Verify engine components load
bun -e "
const { runCouncil, loadConfig } = require('./Engine/Orchestrator.ts');
const config = loadConfig();
console.log('Orchestrator loaded successfully');
console.log('Config version:', config.version);
"

# Verify roster selector
bun -e "
const { selectAgents } = require('./Engine/RosterSelector.ts');
const result = selectAgents('authentication security review', { maxAgents: 3 });
console.log('Selected agents:', result.selected_agents || 'auto-selection working');
"

# Verify CLI help
bun run Engine/Orchestrator.ts --help
```

---

## Troubleshooting

### "Cannot find module 'yaml'"

Dependencies not installed. Run:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"
bun install
```

### "No agents could be loaded"

Install an agent pack:
```bash
# List available agent packs
ls "${PAI_PACKS:-$HOME/PAI/Packs}"/mai-*agents*/

# If none exist, you need to install one
```

### TypeScript errors

Ensure Bun is up to date:
```bash
bun upgrade
```

### Config parse errors

Validate YAML syntax:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"
bun -e "
const yaml = require('yaml');
const fs = require('fs');
yaml.parse(fs.readFileSync('./Config/council.yaml', 'utf-8'));
console.log('Config OK');
"
```

---

## File Locations

After installation, the pack structure should be:

```
mai-council-framework/
├── Engine/                   # Core orchestration engine
│   ├── Orchestrator.ts       # Main entry point
│   ├── AgentLoader.ts        # Dynamic agent loading
│   ├── RosterSelector.ts     # Smart agent selection
│   ├── SynthesisEngine.ts    # Decision synthesis
│   ├── ConflictResolver.ts   # Conflict detection/resolution
│   └── index.ts
├── Adapters/                 # Output adapters
│   ├── AdapterInterface.ts   # Base adapter interface
│   ├── ConsoleAdapter.ts     # Console output
│   ├── FileAdapter.ts        # File output
│   ├── JoplinAdapter.ts      # Joplin integration (optional)
│   └── index.ts
├── Config/
│   └── council.yaml          # Framework configuration
├── Templates/
│   └── AgentTemplate.md      # Template for custom agents
├── Tests/
│   └── (test files)
├── Workflows/                # Workflow documentation
│   ├── RunCouncil.md
│   ├── SelectRoster.md
│   └── Synthesize.md
├── package.json
├── tsconfig.json
├── SKILL.md
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Usage Examples

### Basic Council Session (TypeScript)

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

### CLI Usage

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

# Run a council session with auto roster selection
bun run Engine/Orchestrator.ts "Review authentication design" --roster auto

# Specify roster manually
bun run Engine/Orchestrator.ts "Database migration strategy" --roster TechLead,DBA,QALead

# Use specific visibility mode
bun run Engine/Orchestrator.ts "Feature prioritization" --roster auto --visibility progress
```

### Roster Selection

```typescript
import { selectAgents } from './Engine/RosterSelector';

const roster = selectAgents('authentication security review', {
  featureContext: 'Enterprise SaaS platform',
  maxAgents: 3
});
// Returns: ['SecurityEngineer', 'TechLead', 'ProductManager']
```

---

## Visibility Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `full` | Complete transcript with all agent statements | Deep analysis, audit trail |
| `progress` | Round summaries and key conflicts | Active participation |
| `summary` | Final synthesis only | Quick decisions |

---

## Synthesis Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `consensus` | Find common ground across all perspectives | Equal weight decisions |
| `weighted` | Weight by domain expertise relevance | Domain-specific topics |
| `facilitator` | Designated agent makes final call | Deadlocked decisions |

---

## Optional Integrations

### Joplin Integration

If `mai-joplin-skill` is installed, council decisions can be recorded to Joplin notes:

```yaml
# In Config/council.yaml
adapters:
  default: [console, file, joplin]
```

### Security Tools Integration

If `mai-security-tools` is installed, security-focused councils can leverage automated scanning:

```typescript
const scanResults = await runSecurityScans(projectPath);
const result = await runCouncil({
  topic: 'Security review of authentication module',
  context: incorporateScanResults(baseContext, scanResults),
  roster: ['SecurityEngineer', 'TechLead', 'QALead'],
  synthesisStrategy: 'weighted'
});
```

---

## Next Steps

After installation:

1. **Install agent packs** - The framework needs agents to function
2. **Run a test council** - Use the CLI to verify everything works
3. **Create custom agents** - Use `Templates/AgentTemplate.md` as a starting point
4. **Integrate with workflows** - Use councils in your decision-making processes
