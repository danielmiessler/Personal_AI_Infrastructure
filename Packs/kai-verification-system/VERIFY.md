# Verification Checklist: Kai Verification System

> **FOR AI AGENTS:** Complete ALL checks below. Present this checklist to the user with status. If ANY check fails, installation is NOT complete.

## Directory Structure

- [ ] `$PAI_DIR/skills/VERIFICATION/` exists
- [ ] `$PAI_DIR/skills/VERIFICATION/Workflows/` exists
- [ ] `$PAI_DIR/context/verification/` exists
- [ ] `$PAI_DIR/tools/verification/` exists
- [ ] `$PAI_DIR/lib/` exists

**Command to verify:**
```bash
ls -la $PAI_DIR/skills/VERIFICATION/ && \
ls -la $PAI_DIR/skills/VERIFICATION/Workflows/ && \
ls -la $PAI_DIR/context/verification/ && \
ls -la $PAI_DIR/tools/verification/ && \
ls -la $PAI_DIR/lib/deterministic-random.ts
```

## File Count Verification

### Skill Files (5 total)

- [ ] `$PAI_DIR/skills/VERIFICATION/SKILL.md` exists
- [ ] `$PAI_DIR/skills/VERIFICATION/Workflows/tier-1-universal.md` exists
- [ ] `$PAI_DIR/skills/VERIFICATION/Workflows/tier-2-stateful.md` exists
- [ ] `$PAI_DIR/skills/VERIFICATION/Workflows/tier-3-distributed.md` exists
- [ ] `$PAI_DIR/skills/VERIFICATION/Workflows/tier-4-storage.md` exists

### Context Files (4 total)

- [ ] `$PAI_DIR/context/verification/verification-principles.md` exists
- [ ] `$PAI_DIR/context/verification/assertion-patterns.md` exists
- [ ] `$PAI_DIR/context/verification/simulation-patterns.md` exists
- [ ] `$PAI_DIR/context/verification/checklist-templates.md` exists

### Tool Files (3 total)

- [ ] `$PAI_DIR/tools/verification/assertion-density.ts` exists
- [ ] `$PAI_DIR/tools/verification/bounds-checker.ts` exists
- [ ] `$PAI_DIR/tools/verification/simulation-harness.ts` exists

### Library Files (1 total)

- [ ] `$PAI_DIR/lib/deterministic-random.ts` exists

**Total files: 13**

## Functional Verification

### Test 1: Assertion Density Analyzer

```bash
# Create test file
echo 'function noAsserts() { return 1; }' > /tmp/test-verify.ts

# Run analyzer
bun $PAI_DIR/tools/verification/assertion-density.ts /tmp/test-verify.ts

# Expected: Warning about function with 0 assertions
```

- [ ] Analyzer runs without error
- [ ] Analyzer detects missing assertions

### Test 2: Bounds Checker

```bash
# Create test file with unbounded loop
cat > /tmp/test-bounds.ts << 'EOF'
function unbounded(items: any[]) {
  let i = 0;
  while (items.length > 0) {
    items.pop();
    i++;
  }
}
EOF

# Run bounds checker
bun $PAI_DIR/tools/verification/bounds-checker.ts /tmp/test-bounds.ts

# Expected: Warning about unbounded while loop
```

- [ ] Bounds checker runs without error
- [ ] Bounds checker detects unbounded loop

### Test 3: Deterministic Random Library

```bash
# Test seeded randomness
bun -e "
const { createSeededRandom } = require('$PAI_DIR/lib/deterministic-random.ts');
const rng1 = createSeededRandom(12345);
const rng2 = createSeededRandom(12345);
const a = [rng1.next(), rng1.next(), rng1.next()];
const b = [rng2.next(), rng2.next(), rng2.next()];
console.log('Same seed produces same sequence:', JSON.stringify(a) === JSON.stringify(b));
"

# Expected: true
```

- [ ] Library loads without error
- [ ] Same seed produces identical sequence

### Test 4: Skill File Validity

```bash
# Check SKILL.md has required sections
grep -q "## Triggers" $PAI_DIR/skills/VERIFICATION/SKILL.md && echo "Has Triggers"
grep -q "## Workflows" $PAI_DIR/skills/VERIFICATION/SKILL.md && echo "Has Workflows"
```

- [ ] SKILL.md contains Triggers section
- [ ] SKILL.md contains Workflows section

## Content Verification

### Workflow Files Have Required Sections

For each workflow file, verify:
- [ ] Has "## When to Use" section
- [ ] Has "## Steps" section
- [ ] Has "## Checklist" section

```bash
for f in $PAI_DIR/skills/VERIFICATION/Workflows/*.md; do
  echo "=== $f ==="
  grep -l "## When to Use" "$f" && echo "✓ When to Use"
  grep -l "## Steps" "$f" && echo "✓ Steps"
  grep -l "## Checklist" "$f" && echo "✓ Checklist"
done
```

### Context Files Are Non-Empty

```bash
for f in $PAI_DIR/context/verification/*.md; do
  lines=$(wc -l < "$f")
  echo "$f: $lines lines"
  [ "$lines" -gt 10 ] && echo "✓ Sufficient content"
done
```

- [ ] All context files have >10 lines of content

## Cleanup Test Files

```bash
rm -f /tmp/test-verify.ts /tmp/test-bounds.ts
```

## Final Summary

Present to user:

```markdown
## Kai Verification System Installation Complete

### Files Installed
- Skill files: 5/5 ✓
- Context files: 4/4 ✓
- Tool files: 3/3 ✓
- Library files: 1/1 ✓
- **Total: 13/13 ✓**

### Functional Tests
- Assertion density analyzer: ✓
- Bounds checker: ✓
- Deterministic random: ✓
- Skill file validity: ✓

### Ready to Use
The verification skill will activate when you:
- Ask to review code for correctness
- Ask to write tests
- Ask to audit code quality
- Mention assertions, invariants, or bounds
- Ask about simulation testing

### Quick Test
Try: "Review this function using verification-first principles"
```

## If Any Check Fails

1. Identify which file is missing or malformed
2. Re-copy from the pack's `src/` directory
3. Re-run the specific verification check
4. Do NOT mark installation complete until ALL checks pass
