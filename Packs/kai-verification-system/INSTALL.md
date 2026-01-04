# Installation Guide: Kai Verification System

> **FOR AI AGENTS:** Follow these steps exactly. Do not simplify or skip steps. Verify each step before proceeding.

## Prerequisites

- PAI core installed (`kai-core-install` pack)
- Bun runtime installed
- `$PAI_DIR` environment variable set (defaults to `~/.claude`)

## Installation Steps

### Step 1: Create Directory Structure

```bash
# Create skill directory
mkdir -p $PAI_DIR/skills/VERIFICATION/Workflows

# Create context directory
mkdir -p $PAI_DIR/context/verification

# Create tools directory
mkdir -p $PAI_DIR/tools/verification

# Create lib directory
mkdir -p $PAI_DIR/lib
```

**Verify:** All directories exist before proceeding.

### Step 2: Copy Skill Files

Copy from this pack's `src/` directory to your PAI installation:

```bash
# From the pack directory (where this INSTALL.md lives):

# Skill definition
cp src/skills/VERIFICATION/SKILL.md $PAI_DIR/skills/VERIFICATION/

# Workflows (all 4 tiers)
cp src/skills/VERIFICATION/Workflows/tier-1-universal.md $PAI_DIR/skills/VERIFICATION/Workflows/
cp src/skills/VERIFICATION/Workflows/tier-2-stateful.md $PAI_DIR/skills/VERIFICATION/Workflows/
cp src/skills/VERIFICATION/Workflows/tier-3-distributed.md $PAI_DIR/skills/VERIFICATION/Workflows/
cp src/skills/VERIFICATION/Workflows/tier-4-storage.md $PAI_DIR/skills/VERIFICATION/Workflows/
```

**Verify:** 5 files in `$PAI_DIR/skills/VERIFICATION/`

### Step 3: Copy Context Files

```bash
# Context files (principles, patterns, checklists)
cp src/context/verification-principles.md $PAI_DIR/context/verification/
cp src/context/assertion-patterns.md $PAI_DIR/context/verification/
cp src/context/simulation-patterns.md $PAI_DIR/context/verification/
cp src/context/checklist-templates.md $PAI_DIR/context/verification/
```

**Verify:** 4 files in `$PAI_DIR/context/verification/`

### Step 4: Copy Tools

```bash
# Analysis and simulation tools
cp src/tools/assertion-density.ts $PAI_DIR/tools/verification/
cp src/tools/bounds-checker.ts $PAI_DIR/tools/verification/
cp src/tools/simulation-harness.ts $PAI_DIR/tools/verification/
```

**Verify:** 3 files in `$PAI_DIR/tools/verification/`

### Step 5: Copy Library Files

```bash
# Shared library
cp src/lib/deterministic-random.ts $PAI_DIR/lib/
```

**Verify:** File exists at `$PAI_DIR/lib/deterministic-random.ts`

### Step 6: Verify Tool Execution

```bash
# Test assertion density analyzer
echo 'function test() { console.log("hello"); }' | bun $PAI_DIR/tools/verification/assertion-density.ts --stdin

# Expected output: Warning about 0 assertions in function
```

### Step 7: Register Skill (Optional)

If using skill routing, add to `$PAI_DIR/skills/SKILL_REGISTRY.md`:

```markdown
## VERIFICATION
- **Triggers:** review, audit, verify, test, assert, invariant, bounds, simulate, fuzz, correctness
- **Path:** skills/VERIFICATION/SKILL.md
- **Description:** Verification-first engineering with deterministic simulation testing
```

## Post-Installation

### Recommended: Set Default Verification Tier

Add to your `$PAI_DIR/.env`:

```bash
# Default verification tier (1-4)
# 1 = All code (assertions, bounds, exhaustive)
# 2 = Stateful systems (+ time simulation)
# 3 = Distributed systems (+ network faults)
# 4 = Storage systems (+ disk faults)
VERIFICATION_DEFAULT_TIER=1
```

### Recommended: Enable Assertion Density Checks

For TypeScript/JavaScript projects, add to your project's `package.json`:

```json
{
  "scripts": {
    "verify:assertions": "bun $PAI_DIR/tools/verification/assertion-density.ts src/",
    "verify:bounds": "bun $PAI_DIR/tools/verification/bounds-checker.ts src/",
    "verify": "bun run verify:assertions && bun run verify:bounds"
  }
}
```

## File Count Summary

| Location | Files | Purpose |
|----------|-------|---------|
| `$PAI_DIR/skills/VERIFICATION/` | 1 | Skill definition |
| `$PAI_DIR/skills/VERIFICATION/Workflows/` | 4 | Tiered workflows |
| `$PAI_DIR/context/verification/` | 4 | Principles and patterns |
| `$PAI_DIR/tools/verification/` | 3 | Analysis tools |
| `$PAI_DIR/lib/` | 1 | Shared library |
| **Total** | **13** | |

## Troubleshooting

### Tools fail to run

```bash
# Check Bun is installed
bun --version

# Check file permissions
chmod +x $PAI_DIR/tools/verification/*.ts
```

### Skill not detected

Ensure `SKILL.md` contains valid triggers and the skill router can find it:

```bash
cat $PAI_DIR/skills/VERIFICATION/SKILL.md | head -20
```

### Context not loading

Verify context files are readable:

```bash
ls -la $PAI_DIR/context/verification/
```
