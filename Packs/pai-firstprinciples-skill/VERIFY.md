# Verification Checklist - FirstPrinciples Skill

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/FirstPrinciples/SKILL.md` exists
- [ ] `$PAI_DIR/skills/FirstPrinciples/Workflows/Deconstruct.md` exists
- [ ] `$PAI_DIR/skills/FirstPrinciples/Workflows/Challenge.md` exists
- [ ] `$PAI_DIR/skills/FirstPrinciples/Workflows/Reconstruct.md` exists

### Content Verification

- [ ] `SKILL.md` contains the 3-step framework diagram
- [ ] `SKILL.md` contains constraint classification table
- [ ] `Deconstruct.md` contains output template
- [ ] `Challenge.md` contains constraint classification criteria
- [ ] `Reconstruct.md` contains blank slate design process

### Integration Verification

- [ ] CORE skill is installed (required dependency)
- [ ] Skill appears in skill routing when invoking "first principles"

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== FirstPrinciples Skill Verification ==="
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
[ -f "$PAI_DIR/skills/FirstPrinciples/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Deconstruct.md" ]
check $? "Deconstruct.md exists"

[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Challenge.md" ]
check $? "Challenge.md exists"

[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Reconstruct.md" ]
check $? "Reconstruct.md exists"

# Content checks
grep -q "DECONSTRUCT" "$PAI_DIR/skills/FirstPrinciples/SKILL.md"
check $? "SKILL.md contains DECONSTRUCT framework"

grep -q "HARD.*SOFT.*ASSUMPTION" "$PAI_DIR/skills/FirstPrinciples/SKILL.md" 2>/dev/null || \
grep -q "hard constraint" "$PAI_DIR/skills/FirstPrinciples/SKILL.md"
check $? "SKILL.md contains constraint types"

grep -q "Output Template" "$PAI_DIR/skills/FirstPrinciples/Workflows/Deconstruct.md"
check $? "Deconstruct.md has output template"

grep -q "Constraint Classification" "$PAI_DIR/skills/FirstPrinciples/Workflows/Challenge.md" 2>/dev/null || \
grep -q "HARD" "$PAI_DIR/skills/FirstPrinciples/Workflows/Challenge.md"
check $? "Challenge.md has constraint classification"

grep -q "Blank Slate" "$PAI_DIR/skills/FirstPrinciples/Workflows/Reconstruct.md"
check $? "Reconstruct.md has blank slate process"

# Dependency check
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ]
check $? "CORE skill is installed (dependency)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "FirstPrinciples Skill installation verified successfully!"
  exit 0
else
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Functional Tests

### Test 1: Skill Routing

Ask the AI:
```
"Use first principles on: Why does software development take so long?"
```

**Expected**: AI invokes FirstPrinciples skill, begins with DECONSTRUCT phase

### Test 2: Deconstruct Workflow

Ask the AI:
```
"Deconstruct our cloud infrastructure costs"
```

**Expected**: Output includes:
- List of stated components
- Actual constituents breakdown
- Fundamental truths identified
- Gap analysis between stated and actual

### Test 3: Challenge Workflow

Ask the AI:
```
"Challenge the assumption that we need microservices"
```

**Expected**: Output includes:
- Constraint classification (HARD/SOFT/ASSUMPTION)
- Evidence for each classification
- "What if removed?" analysis
- Recommendations for which constraints to challenge

### Test 4: Reconstruct Workflow

Ask the AI:
```
"Given our actual requirements, reconstruct our architecture approach"
```

**Expected**: Output includes:
- Hard constraints only (from Challenge output)
- Function to optimize (not form)
- 2-3 blank slate solutions
- Comparison to current approach
- Implementation path

### Test 5: Full Framework Flow

Ask the AI:
```
"Use the full first principles framework on: Our deployment pipeline takes 45 minutes"
```

**Expected**:
1. DECONSTRUCT: Breaks down pipeline components
2. CHALLENGE: Classifies each step as HARD/SOFT/ASSUMPTION
3. RECONSTRUCT: Proposes optimized pipeline from fundamentals

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill not found | Check `$PAI_DIR` is set correctly |
| Workflows not loading | Verify Workflows directory exists with all 3 files |
| No output template | Re-copy files from pack `src/` directory |
| Integration failing | Ensure CORE skill is properly installed |
| Voice not working | Check pai-voice-system is running (optional) |

## Integration Verification

After installation, verify integration with other skills:

```bash
# Test that CORE skill is available (required)
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ] && echo "CORE skill: OK" || echo "CORE skill: MISSING"

# Test optional integrations
[ -f "$PAI_DIR/skills/RedTeam/SKILL.md" ] && echo "RedTeam skill: OK (integration available)" || echo "RedTeam skill: Not installed (optional)"
[ -f "$PAI_DIR/skills/Council/SKILL.md" ] && echo "Council skill: OK (integration available)" || echo "Council skill: Not installed (optional)"
[ -f "$PAI_DIR/skills/THEALGORITHM/SKILL.md" ] && echo "THE ALGORITHM skill: OK (integration available)" || echo "THE ALGORITHM skill: Not installed (optional)"
```
