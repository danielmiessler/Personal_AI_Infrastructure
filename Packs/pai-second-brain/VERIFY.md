# Verification Checklist - PAI Second Brain

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/SecondBrain/SKILL.md` exists and is readable
- [ ] `$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Philosophy/AUTHORIZATION.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Philosophy/COGNITIVE-DIVERSITY.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Workflows/Delegate.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Workflows/Debate.md` exists
- [ ] `$PAI_DIR/skills/SecondBrain/Workflows/ArchiveSynthesis.md` exists
- [ ] `$PAI_DIR/config/para-mapping.yaml` exists
- [ ] `$PAI_DIR/config/context-thresholds.json` exists
- [ ] `$PAI_DIR/config/delegation-rules.yaml` exists

### Dependency Verification

- [ ] `$PAI_DIR/skills/CORE/SKILL.md` exists (pai-core-install required)

### Content Verification

- [ ] DELEGATION.md contains "NEVER EXECUTE DIRECTLY" principle
- [ ] SPARRING.md contains challenge/friction guidelines
- [ ] para-mapping.yaml contains PARA folder mappings
- [ ] delegation-rules.yaml contains agent routing rules

---

## Functional Tests

### Test 1: File Structure Check

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== Second Brain File Structure ==="
find "$PAI_DIR/skills/SecondBrain" -type f -name "*.md" | sort
find "$PAI_DIR/config" -type f \( -name "*.yaml" -o -name "*.json" \) | grep -E "(para|context|delegation)" | sort
```

**Expected:** Shows all 8 markdown files and 3 config files

### Test 2: Philosophy Content Check

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== Delegation Protocol Check ==="
grep -l "NEVER EXECUTE DIRECTLY\|never execute directly" "$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md" && echo "PASS: Delegation protocol found" || echo "FAIL: Delegation protocol missing"

echo ""
echo "=== Sparring Mode Check ==="
grep -l "challenge\|friction\|sparring" "$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md" && echo "PASS: Sparring mode found" || echo "FAIL: Sparring content missing"
```

**Expected:** Both checks show PASS

### Test 3: Config File Validity

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PARA Mapping Check ==="
cat "$PAI_DIR/config/para-mapping.yaml" | head -20

echo ""
echo "=== Context Thresholds Check ==="
cat "$PAI_DIR/config/context-thresholds.json"

echo ""
echo "=== Delegation Rules Check ==="
cat "$PAI_DIR/config/delegation-rules.yaml" | head -20
```

**Expected:** All three config files display valid content

### Test 4: CORE Dependency Check

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== CORE Skill Check ==="
if [ -f "$PAI_DIR/skills/CORE/SKILL.md" ]; then
  echo "PASS: pai-core-install is installed"
else
  echo "FAIL: pai-core-install is NOT installed (REQUIRED)"
fi
```

**Expected:** Shows PASS

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Second Brain Verification ==="
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

# Dependency check
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ]
check $? "pai-core-install dependency"

# Skill files
[ -f "$PAI_DIR/skills/SecondBrain/SKILL.md" ]
check $? "SKILL.md exists"

# Philosophy files
[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md" ]
check $? "DELEGATION.md exists"

[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md" ]
check $? "SPARRING.md exists"

[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/AUTHORIZATION.md" ]
check $? "AUTHORIZATION.md exists"

[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/COGNITIVE-DIVERSITY.md" ]
check $? "COGNITIVE-DIVERSITY.md exists"

# Workflow files
[ -f "$PAI_DIR/skills/SecondBrain/Workflows/Delegate.md" ]
check $? "Delegate.md exists"

[ -f "$PAI_DIR/skills/SecondBrain/Workflows/Debate.md" ]
check $? "Debate.md exists"

[ -f "$PAI_DIR/skills/SecondBrain/Workflows/ArchiveSynthesis.md" ]
check $? "ArchiveSynthesis.md exists"

# Config files
[ -f "$PAI_DIR/config/para-mapping.yaml" ]
check $? "para-mapping.yaml exists"

[ -f "$PAI_DIR/config/context-thresholds.json" ]
check $? "context-thresholds.json exists"

[ -f "$PAI_DIR/config/delegation-rules.yaml" ]
check $? "delegation-rules.yaml exists"

# Content checks
grep -q "NEVER EXECUTE DIRECTLY\|never execute directly\|Never Execute Directly" "$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md" 2>/dev/null
check $? "DELEGATION.md contains core principle"

grep -q "challenge\|friction\|sparring" "$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md" 2>/dev/null
check $? "SPARRING.md contains challenge content"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "Second Brain installation verified successfully!"
  echo ""
  echo "Your AI now operates as:"
  echo "  - DIRECTOR (not executor)"
  echo "  - Sparring partner (not assistant)"
  echo "  - Context protector (budget-aware)"
  echo "  - Archive synthesizer (subconscious retrieval)"
  exit 0
else
  echo ""
  echo "Some checks failed. Review the output above."
  echo "Run INSTALL.md again or check file permissions."
  exit 1
fi
```

---

## Behavioral Verification

After installation, test the Second Brain philosophy by asking a complex question:

**Test Prompt:**
```
"Should I quit my job to start a business, or keep my job and build on the side?"
```

**Expected Behavior (Second Brain active):**
1. AI assesses this as COMPLEX (life-changing decision)
2. AI spawns 3+ subagents with different perspectives
3. Subagents debate/challenge each other
4. AI synthesizes breakthrough insight from friction
5. User sees the cognitive collision, not just a balanced answer

**Old Behavior (without Second Brain):**
- AI gives diplomatic answer weighing pros and cons
- No friction, no debate
- Safe, forgettable response

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Files missing | Re-run INSTALL.md Phase 4 |
| Permission denied | `chmod -R u+rw $PAI_DIR/skills/SecondBrain` |
| Config files empty | Check pack src/ directory has files |
| CORE not found | Install pai-core-install first |
| Behavior unchanged | Restart Claude Code session |
| No delegation happening | Check DELEGATION.md loaded correctly |

---

## Manual Verification Commands

If the quick script doesn't work, run these individually:

```bash
# Set PAI_DIR
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check each file
ls -la "$PAI_DIR/skills/SecondBrain/SKILL.md"
ls -la "$PAI_DIR/skills/SecondBrain/Philosophy/"
ls -la "$PAI_DIR/skills/SecondBrain/Workflows/"
ls -la "$PAI_DIR/config/para-mapping.yaml"
ls -la "$PAI_DIR/config/context-thresholds.json"
ls -la "$PAI_DIR/config/delegation-rules.yaml"

# Read key content
head -20 "$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md"
head -20 "$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md"
```
