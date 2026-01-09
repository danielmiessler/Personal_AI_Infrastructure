# Council Framework Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `mai-council-framework/` exists in Packs directory
- [ ] `Engine/` contains 6 .ts files
- [ ] `Adapters/` contains 4 .ts files
- [ ] `Config/council.yaml` exists
- [ ] `Templates/AgentTemplate.md` exists

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Engine:"
ls "$PACK_DIR/Engine/"
echo ""
echo "Adapters:"
ls "$PACK_DIR/Adapters/"
echo ""
echo "Config:"
ls "$PACK_DIR/Config/"
echo ""
echo "Templates:"
ls "$PACK_DIR/Templates/"
```

---

## Dependencies

- [ ] `node_modules/` exists (bun install completed)
- [ ] `yaml` package installed

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

echo "Checking dependencies..."
ls "$PACK_DIR/node_modules/" | head -5

echo ""
echo "Package.json dependencies:"
bun run --cwd "$PACK_DIR" --shell-eval 'cat package.json | grep -A5 "dependencies"'
```

If missing, run:
```bash
cd "$PACK_DIR" && bun install
```

---

## Configuration Validation

- [ ] `council.yaml` parses without errors
- [ ] Required fields present (version, session, adapters)

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

echo "Validating config..."
bun -e "
const yaml = require('yaml');
const fs = require('fs');
const config = yaml.parse(fs.readFileSync('$PACK_DIR/Config/council.yaml', 'utf-8'));
console.log('Version:', config.version);
console.log('Max Rounds:', config.session?.defaults?.maxRounds);
console.log('Default Adapters:', config.adapters?.default?.join(', '));
console.log('Visibility Mode:', config.session?.defaults?.visibility);
console.log('Synthesis Strategy:', config.session?.defaults?.synthesisStrategy);
"
```

**Expected:**
```
Version: 1.0
Max Rounds: 3
Default Adapters: console, file
Visibility Mode: full
Synthesis Strategy: consensus
```

---

## TypeScript Compilation

- [ ] No TypeScript errors

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

cd "$PACK_DIR" && bun run typecheck
```

**Expected:** No errors, clean exit.

---

## Engine Components

### Orchestrator
- [ ] Orchestrator loads without errors

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { runCouncil, loadConfig } = require('$PACK_DIR/Engine/Orchestrator.ts');
const config = loadConfig();
console.log('Orchestrator loaded successfully');
console.log('Config version:', config.version);
"
```

### RosterSelector
- [ ] RosterSelector auto-selection works

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { selectAgents } = require('$PACK_DIR/Engine/RosterSelector.ts');
const result = selectAgents('authentication security review', { maxAgents: 3 });
console.log('Selected agents:', result.selected_agents);
console.log('Domain detected:', result.domain_detected);
console.log('Reason:', result.reason);
"
```

### AgentLoader
- [ ] AgentLoader can discover agent packs

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { listAvailableAgents } = require('$PACK_DIR/Engine/AgentLoader.ts');
const agents = listAvailableAgents();
console.log('Available agents:', agents.length > 0 ? agents.join(', ') : '(none found - install an agent pack)');
"
```

### SynthesisEngine
- [ ] SynthesisEngine exports properly

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { synthesize } = require('$PACK_DIR/Engine/SynthesisEngine.ts');
console.log('SynthesisEngine loaded successfully');
console.log('Strategy types: consensus, weighted, facilitator');
"
```

### ConflictResolver
- [ ] ConflictResolver loads

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { detectConflicts, resolveConflicts } = require('$PACK_DIR/Engine/ConflictResolver.ts');
console.log('ConflictResolver loaded successfully');
"
```

---

## Adapter Verification

### AdapterInterface
- [ ] Base adapter interface exports

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { BaseAdapter, adapterRegistry } = require('$PACK_DIR/Adapters/AdapterInterface.ts');
console.log('AdapterInterface loaded');
console.log('Registry available:', !!adapterRegistry);
"
```

### ConsoleAdapter
- [ ] Console adapter instantiates

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { ConsoleAdapter } = require('$PACK_DIR/Adapters/ConsoleAdapter.ts');
const adapter = new ConsoleAdapter('progress');
console.log('ConsoleAdapter created');
console.log('Adapter name:', adapter.name);
"
```

### FileAdapter
- [ ] File adapter instantiates

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
const { FileAdapter } = require('$PACK_DIR/Adapters/FileAdapter.ts');
const adapter = new FileAdapter('./test-output');
console.log('FileAdapter created');
console.log('Adapter name:', adapter.name);
"
```

### JoplinAdapter (Optional)
- [ ] Joplin adapter loads (requires mai-joplin-skill)

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun -e "
try {
  const { JoplinAdapter } = require('$PACK_DIR/Adapters/JoplinAdapter.ts');
  console.log('JoplinAdapter loaded');
} catch (e) {
  console.log('JoplinAdapter not available (requires mai-joplin-skill)');
}
"
```

---

## CLI Verification

- [ ] CLI shows help without errors

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

bun run "$PACK_DIR/Engine/Orchestrator.ts"
```

**Expected:** Usage help message showing options.

---

## Agent Pack Discovery (Optional)

For full functionality, at least one agent pack should be installed:

- [ ] Agent pack exists (e.g., `mai-agents-engineering`, `mai-devsecops-agents`)

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}"

echo "Checking for agent packs..."
ls -d "$PACK_DIR"/mai-agents-* 2>/dev/null || echo "(no agent packs found)"
ls -d "$PACK_DIR"/mai-*-agents 2>/dev/null || echo "(no alternative agent packs found)"
```

**Note:** The council framework requires agent packs to function. Without agents, roster selection will fail.

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | - |
| Dependencies installed | - |
| Config parses correctly | - |
| TypeScript compiles | - |
| Orchestrator loads | - |
| RosterSelector works | - |
| AgentLoader works | - |
| SynthesisEngine loads | - |
| ConflictResolver loads | - |
| Adapters load | - |
| CLI works | - |
| Agent pack available | - |

**Core checks must pass for installation to be complete.**
**Agent pack check is optional but required for actual council sessions.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${PAI_PACKS:-$HOME/PAI/Packs}/mai-council-framework"

echo "=== Council Framework Verification ==="
echo ""

echo "1. Directory structure..."
[ -d "$PACK_DIR/Engine" ] && [ -d "$PACK_DIR/Adapters" ] && [ -d "$PACK_DIR/Config" ] && echo "  Directory structure OK" || echo "  Directory structure FAILED"

echo ""
echo "2. Dependencies..."
[ -d "$PACK_DIR/node_modules/yaml" ] && echo "  Dependencies OK" || echo "  Dependencies MISSING - run: cd $PACK_DIR && bun install"

echo ""
echo "3. TypeScript check..."
cd "$PACK_DIR" && bun run typecheck 2>/dev/null && echo "  TypeScript OK" || echo "  TypeScript FAILED"

echo ""
echo "4. Config validation..."
bun -e "
const yaml = require('yaml');
const fs = require('fs');
try {
  const config = yaml.parse(fs.readFileSync('$PACK_DIR/Config/council.yaml', 'utf-8'));
  if (config.version && config.session && config.adapters) {
    console.log('  Config OK');
  } else {
    console.log('  Config INCOMPLETE');
  }
} catch (e) {
  console.log('  Config FAILED:', e.message);
}
"

echo ""
echo "5. Engine components..."
bun -e "
try {
  require('$PACK_DIR/Engine/Orchestrator.ts');
  require('$PACK_DIR/Engine/RosterSelector.ts');
  require('$PACK_DIR/Engine/AgentLoader.ts');
  require('$PACK_DIR/Engine/SynthesisEngine.ts');
  require('$PACK_DIR/Engine/ConflictResolver.ts');
  console.log('  Engine components OK');
} catch (e) {
  console.log('  Engine components FAILED:', e.message);
}
"

echo ""
echo "6. Adapters..."
bun -e "
try {
  require('$PACK_DIR/Adapters/AdapterInterface.ts');
  require('$PACK_DIR/Adapters/ConsoleAdapter.ts');
  require('$PACK_DIR/Adapters/FileAdapter.ts');
  console.log('  Adapters OK');
} catch (e) {
  console.log('  Adapters FAILED:', e.message);
}
"

echo ""
echo "=== Verification Complete ==="
```

---

## Troubleshooting

### "Cannot find module 'yaml'"
```bash
cd "$PACK_DIR" && bun install
```

### "No agents could be loaded"
Install an agent pack:
```bash
# Check PAI Packs repository for available agent packs
ls ~/PAI/Packs/mai-agents-* 2>/dev/null || echo "No agent packs installed"
```

### TypeScript errors
Ensure Bun is up to date:
```bash
bun upgrade
```

### Config parse errors
Validate YAML syntax:
```bash
bun -e "const yaml = require('yaml'); yaml.parse(require('fs').readFileSync('$PACK_DIR/Config/council.yaml', 'utf-8'));"
```
