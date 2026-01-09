# Verification Checklist - THE ALGORITHM Skill

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/THEALGORITHM/SKILL.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Data/Capabilities.yaml` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/CapabilityLoader.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/CapabilitySelector.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/TraitModifiers.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Observe.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Think.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Plan.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Build.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Execute.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Verify.md` exists
- [ ] `$PAI_DIR/skills/THEALGORITHM/Phases/Learn.md` exists
- [ ] `$PAI_DIR/MEMORY/Work/` directory exists

### CLI Tool Verification

- [ ] `bun run EffortClassifier.ts --help` shows usage information
- [ ] `bun run CapabilityLoader.ts --list-all` displays all capabilities
- [ ] `bun run ISCManager.ts --help` shows usage information
- [ ] `bun run AlgorithmDisplay.ts --help` shows usage information
- [ ] `bun run TraitModifiers.ts --list` shows effort configurations
- [ ] `bun run RalphLoopExecutor.ts --help` shows usage information

### Functional Tests

#### Test 1: Effort Classification
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts \
  --request "Add a new authentication system" \
  --output json
```
**Expected**: Returns JSON with effort level (likely THOROUGH), confidence score, and reasoning

#### Test 2: Capability Loading
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/CapabilityLoader.ts \
  --effort STANDARD \
  --output markdown
```
**Expected**: Shows available capabilities for STANDARD effort level

#### Test 3: ISC Creation
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts create \
  --request "Test feature" \
  --effort STANDARD
```
**Expected**: Creates new ISC, outputs confirmation message

#### Test 4: ISC Row Addition
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts add \
  -d "Feature works correctly" \
  -s EXPLICIT
```
**Expected**: Adds row to ISC, shows row ID

#### Test 5: ISC Display
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts show -o markdown
```
**Expected**: Displays formatted ISC table

#### Test 6: Capability Selection
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/CapabilitySelector.ts \
  --row "Research best practices for API design" \
  --effort STANDARD
```
**Expected**: Suggests research capability (likely perplexity)

#### Test 7: Algorithm Display
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts show
```
**Expected**: Shows LCARS-style display with phase progression

#### Test 8: Trait Modifiers
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/TraitModifiers.ts \
  --effort THOROUGH \
  --phase verify
```
**Expected**: Returns verification traits (skeptical, meticulous, adversarial)

#### Test 9: Ralph Loop Status
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts --status
```
**Expected**: Shows "No active Ralph loop" or current loop status

#### Test 10: Clean ISC
```bash
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts clear
```
**Expected**: Archives and clears current ISC

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "=== THE ALGORITHM Skill Verification ==="
echo ""

PASS=0
FAIL=0

check() {
  if [ "$1" = "0" ]; then
    echo "[PASS] $2"
    ((PASS++))
  else
    echo "[FAIL] $2"
    ((FAIL++))
  fi
}

# File checks
[ -f "$PAI_DIR/skills/THEALGORITHM/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/THEALGORITHM/Data/Capabilities.yaml" ]
check $? "Capabilities.yaml exists"

[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" ]
check $? "EffortClassifier.ts exists"

[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts" ]
check $? "ISCManager.ts exists"

[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts" ]
check $? "AlgorithmDisplay.ts exists"

[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts" ]
check $? "RalphLoopExecutor.ts exists"

[ -d "$PAI_DIR/MEMORY/Work" ]
check $? "MEMORY/Work directory exists"

# CLI checks
bun run "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" --help >/dev/null 2>&1
check $? "EffortClassifier CLI runs"

bun run "$PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts" --help >/dev/null 2>&1
check $? "ISCManager CLI runs"

bun run "$PAI_DIR/skills/THEALGORITHM/Tools/CapabilityLoader.ts" --list-all >/dev/null 2>&1
check $? "CapabilityLoader CLI runs"

# Functional checks
bun run "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" \
  --request "Test request" --output json 2>/dev/null | grep -q "effort"
check $? "Effort classification works"

bun run "$PAI_DIR/skills/THEALGORITHM/Tools/TraitModifiers.ts" \
  --effort STANDARD --output json 2>/dev/null | grep -q "traits"
check $? "Trait modifiers work"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "THE ALGORITHM Skill installation verified successfully!"
  exit 0
else
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tool not found | Check `$PAI_DIR` is set correctly |
| YAML parse error | Verify Capabilities.yaml syntax |
| ISC not saving | Ensure MEMORY/Work directory exists with write permissions |
| Missing dependencies | Run `bun add yaml` in Tools directory |
| Voice not working | Check pai-voice-system is running on port 8888 |
| Display garbled | Terminal may not support ANSI colors |

## Integration Verification

After installation, verify integration with other skills:

```bash
# Test that Agents skill is available (for custom agent composition)
[ -f "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" ] && echo "Agents skill: OK" || echo "Agents skill: MISSING"

# Test that CORE skill is available (for user context)
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ] && echo "CORE skill: OK" || echo "CORE skill: MISSING"
```
