# PAI Algorithm Skill Verification

> **MANDATORY:** All checks must pass before installation is complete.

---

## Quick Verification

```bash
# Run these commands to verify installation
ls -la ~/.claude/skills/THEALGORITHM/SKILL.md && \
ls -la ~/.claude/skills/THEALGORITHM/Data/Capabilities.yaml && \
ls -la ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts && \
echo "Core files present"
```

---

## Detailed Checklist

### 1. File Structure

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Main skill file | `ls ~/.claude/skills/THEALGORITHM/SKILL.md` | File exists | [ ] |
| 2 | Data directory | `ls ~/.claude/skills/THEALGORITHM/Data/` | Contains Capabilities.yaml, VerificationMethods.yaml | [ ] |
| 3 | Tools directory | `ls ~/.claude/skills/THEALGORITHM/Tools/` | Contains 7 .ts files | [ ] |
| 4 | Phases directory | `ls ~/.claude/skills/THEALGORITHM/Phases/` | Contains 7 .md files | [ ] |
| 5 | Reference directory | `ls ~/.claude/skills/THEALGORITHM/Reference/` | Contains 3 .md files | [ ] |
| 6 | Memory directories | `ls ~/.claude/MEMORY/Work/ ~/.claude/MEMORY/State/` | Directories exist | [ ] |

### 2. Tool Execution

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | EffortClassifier help | `bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --help` | Shows usage info | [ ] |
| 2 | CapabilityLoader help | `bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --help` | Shows usage info | [ ] |
| 3 | ISCManager help | `bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts --help` | Shows usage info | [ ] |
| 4 | AlgorithmDisplay help | `bun run ~/.claude/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts --help` | Shows usage info | [ ] |
| 5 | CapabilitySelector help | `bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilitySelector.ts --help` | Shows usage info | [ ] |
| 6 | TraitModifiers help | `bun run ~/.claude/skills/THEALGORITHM/Tools/TraitModifiers.ts --help` | Shows usage info | [ ] |
| 7 | RalphLoopExecutor help | `bun run ~/.claude/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --help` | Shows usage info | [ ] |

### 3. Functionality Tests

```bash
# Test 1: Effort Classification
bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "Hello"
# Expected: EFFORT: TRIVIAL

bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "Refactor the authentication system"
# Expected: EFFORT: THOROUGH

bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "Keep going until done"
# Expected: EFFORT: DETERMINED
```

```bash
# Test 2: Capability Loading
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort STANDARD
# Expected: Lists available capabilities including models, thinking, execution

bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort THOROUGH
# Expected: Shows additional capabilities like debate.council, thinking.plan_mode
```

```bash
# Test 3: ISC Management
# Create ISC
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts create --request "Add dark mode"
# Expected: ISC created for: Add dark mode

# Add row
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts add --description "Toggle works" --source EXPLICIT
# Expected: Added row 1

# Show ISC
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts show
# Expected: Displays ISC table with the added row

# Clean up
bun run ~/.claude/skills/THEALGORITHM/Tools/ISCManager.ts clear
# Expected: Current ISC cleared
```

```bash
# Test 4: Capability Selection
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilitySelector.ts --row "Research best practices" --effort STANDARD
# Expected: PRIMARY CAPABILITY: perplexity (research category)

bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilitySelector.ts --row "Implement the feature" --effort STANDARD
# Expected: PRIMARY CAPABILITY: engineer (execution category)
```

```bash
# Test 5: Trait Modifiers
bun run ~/.claude/skills/THEALGORITHM/Tools/TraitModifiers.ts --effort STANDARD
# Expected: TRAITS: analytical, systematic

bun run ~/.claude/skills/THEALGORITHM/Tools/TraitModifiers.ts --effort STANDARD --phase verify
# Expected: TRAITS: skeptical, meticulous, adversarial
```

```bash
# Test 6: Algorithm Display (visual test)
bun run ~/.claude/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts show
# Expected: Visual display with phase progression (may show "No active ISC")

bun run ~/.claude/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts effort THOROUGH
# Expected: Effort banner in orange/red colors
```

### 4. Data File Validation

```bash
# Test YAML parsing
bun run -e "import { parse } from 'yaml'; import { readFileSync } from 'fs'; const data = parse(readFileSync(process.env.HOME + '/.claude/skills/THEALGORITHM/Data/Capabilities.yaml', 'utf-8')); console.log('Capabilities version:', data.version); console.log('Models:', Object.keys(data.models).join(', '));"
# Expected: Shows version 1.0 and model names
```

---

## Verification Complete

When all checks pass:

- [ ] All file structure checks passed (6/6)
- [ ] All tool execution checks passed (7/7)
- [ ] All functionality tests passed (6/6)
- [ ] Data file validation passed (1/1)

**Installation verified. THE ALGORITHM skill is ready for use.**

---

## Troubleshooting

### Tools fail to execute

```bash
# Ensure bun is installed
bun --version

# If yaml import fails, install it
cd ~/.claude/skills/THEALGORITHM/Tools && bun add yaml
```

### ISC commands fail with "No current ISC"

This is expected behavior when no ISC has been created. Run `create` first.

### Voice notifications don't work

Voice is optional. The algorithm works without it. Ensure the voice server is running at localhost:8888 if you want voice announcements.
