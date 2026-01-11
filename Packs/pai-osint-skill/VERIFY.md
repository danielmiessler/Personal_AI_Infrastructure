# PAI OSINT Skill Verification

**All checks must pass for successful installation.**

---

## Core Structure (5 checks)

### Check 1: OSINT Directory
```bash
[ -d "$PAI_DIR/skills/osint" ] && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Directory exists at `$PAI_DIR/skills/osint/`

### Check 2: SKILL.md Present
```bash
[ -f "$PAI_DIR/skills/osint/SKILL.md" ] && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** File exists with intent routing configuration

### Check 3: Skill Name Lowercase
```bash
grep -q "^name: osint$" "$PAI_DIR/skills/osint/SKILL.md" && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Skill name is `osint` (lowercase)

### Check 4: Workflows Directory
```bash
[ -d "$PAI_DIR/skills/osint/Workflows" ] && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Workflows directory exists

### Check 5: Research Directory
```bash
[ -d "$PAI_DIR/history/research/osint" ] && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Research output directory exists

---

## Workflows (16 checks)

### Check 6: All Workflows Present
```bash
WORKFLOWS="UsernameRecon DomainRecon SocialCapture InfraMapping EntityLinking TimelineAnalysis TargetProfile IntelReport CompanyProfile CorporateStructure FinancialRecon CompetitorAnalysis RiskAssessment EmailRecon PhoneRecon ImageRecon"
for wf in $WORKFLOWS; do
  [ -f "$PAI_DIR/skills/osint/Workflows/${wf}.md" ] && echo "✓ ${wf}.md" || echo "✗ ${wf}.md MISSING"
done
```
**Expected:** All 16 workflow files present

### Check 7: Knowledge Skill Integration
```bash
for f in $PAI_DIR/skills/osint/Workflows/*.md; do
  name=$(basename "$f")
  grep -q 'Use the \*\*knowledge\*\* skill' "$f" && echo "✓ $name" || echo "✗ $name - no knowledge integration"
done
```
**Expected:** All workflows reference the **knowledge** skill

---

## Dependencies (2 checks)

### Check 8: Browser Skill Available
```bash
[ -d "$PAI_DIR/skills/Browser" ] && echo "✓ PASS" || echo "⚠ WARNING: Browser skill not installed"
```
**Expected:** Browser skill installed (optional but recommended)

### Check 9: Knowledge Skill Available
```bash
[ -d "$PAI_DIR/skills/Knowledge" ] && echo "✓ PASS" || echo "⚠ WARNING: Knowledge skill not installed"
```
**Expected:** Knowledge skill installed (optional but recommended)

---

## Skill Configuration (3 checks)

### Check 11: Valid YAML Frontmatter
```bash
head -20 "$PAI_DIR/skills/osint/SKILL.md" | grep -q "^name:" && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Valid YAML frontmatter with name field

### Check 12: Triggers Defined
```bash
grep -q "triggers:" "$PAI_DIR/skills/osint/SKILL.md" && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Trigger phrases defined in SKILL.md

### Check 13: Intent Routing Present
```bash
grep -q "Intent Routing" "$PAI_DIR/skills/osint/SKILL.md" && echo "✓ PASS" || echo "✗ FAIL"
```
**Expected:** Intent routing section documented

---

## Summary

### Run All Checks
```bash
export PAI_DIR=~/.claude

echo "=== PAI OSINT Skill Verification ==="
echo ""

PASS=0
FAIL=0
WARN=0

# Core Structure
echo "Core Structure:"
if [ -d "$PAI_DIR/skills/osint" ]; then echo "  ✓ osint directory"; ((PASS++)); else echo "  ✗ osint directory"; ((FAIL++)); fi
if [ -f "$PAI_DIR/skills/osint/SKILL.md" ]; then echo "  ✓ SKILL.md"; ((PASS++)); else echo "  ✗ SKILL.md"; ((FAIL++)); fi
if grep -q "^name: osint$" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  ✓ Skill name lowercase"; ((PASS++)); else echo "  ✗ Skill name not lowercase"; ((FAIL++)); fi
if [ -d "$PAI_DIR/skills/osint/Workflows" ]; then echo "  ✓ Workflows directory"; ((PASS++)); else echo "  ✗ Workflows directory"; ((FAIL++)); fi
if [ -d "$PAI_DIR/history/research/osint" ]; then echo "  ✓ Research directory"; ((PASS++)); else echo "  ✗ Research directory"; ((FAIL++)); fi

# Workflows
echo ""
echo "Workflows (16 required):"
WF_COUNT=$(ls "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $WF_COUNT/16 workflows"
if [ "$WF_COUNT" -eq 16 ]; then ((PASS++)); else ((FAIL++)); fi

# Knowledge integration
echo ""
echo "Knowledge Integration:"
KI_COUNT=$(grep -l 'Use the \*\*knowledge\*\* skill' "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $KI_COUNT/16 workflows with knowledge skill"
if [ "$KI_COUNT" -eq 16 ]; then ((PASS++)); else ((FAIL++)); fi

# Dependencies
echo ""
echo "Dependencies:"
if [ -d "$PAI_DIR/skills/Browser" ]; then echo "  ✓ Browser skill"; ((PASS++)); else echo "  ⚠ Browser skill not installed"; ((WARN++)); fi
if [ -d "$PAI_DIR/skills/Knowledge" ]; then echo "  ✓ Knowledge skill"; ((PASS++)); else echo "  ⚠ Knowledge skill not installed"; ((WARN++)); fi

# Configuration
echo ""
echo "Configuration:"
if grep -q "^name:" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  ✓ Valid frontmatter"; ((PASS++)); else echo "  ✗ Invalid frontmatter"; ((FAIL++)); fi
if grep -q "triggers:" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  ✓ Triggers defined"; ((PASS++)); else echo "  ✗ Triggers missing"; ((FAIL++)); fi
if grep -q "Intent Routing" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  ✓ Intent routing"; ((PASS++)); else echo "  ✗ Intent routing missing"; ((FAIL++)); fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✓ OSINT System installation VERIFIED"
else
  echo "✗ Installation incomplete - review failed checks"
fi
```

---

## Expected Results

| Category | Checks | Required |
|----------|--------|----------|
| Core Structure | 5 | All must pass |
| Workflows | 2 | All must pass (16 files, 16 with knowledge) |
| Dependencies | 2 | Warnings acceptable |
| Configuration | 3 | All must pass |
| **Total** | **12** | **10+ pass, 0 fail** |

---

## Troubleshooting

### Debugging Commands

```bash
# Check skill file syntax
cat "$PAI_DIR/skills/osint/SKILL.md" | head -30

# Verify workflow file integrity
for f in "$PAI_DIR/skills/osint/Workflows"/*.md; do
  echo "Checking: $(basename "$f")"
  head -10 "$f" | grep -q "^#" && echo "  ✓ Valid markdown" || echo "  ✗ Invalid"
done

# Test knowledge skill integration
echo "Testing knowledge skill..."
# knowledge skill should respond with status

# Check file permissions
ls -la "$PAI_DIR/skills/osint/"
ls -la "$PAI_DIR/skills/osint/Workflows/"

# Verify PAI_DIR
echo "PAI_DIR: $PAI_DIR"
echo "Write access: [ -w "$PAI_DIR" ] && echo 'Yes' || echo 'No'"
```

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Permission denied" | No write access to $PAI_DIR | Run: `chmod u+w $PAI_DIR` |
| "SKILL.md not found" | Incomplete installation | Re-run Phase 4.2 |
| "Workflows missing" | Copy command failed | Re-run Phase 4.3 |
| "Knowledge skill error" | Dependency not installed | Install pai-knowledge-system |
| "Wrong workflow count" | Not all workflows copied | Re-copy from PACK_SOURCE |

### Rollback Procedure

```bash
# If installation fails, restore from backup
BACKUP_DIR="$PAI_DIR/Backups/osint-YYYYMMDD-HHMMSS"
rm -rf "$PAI_DIR/skills/osint"
cp -r "$BACKUP_DIR/osint" "$PAI_DIR/skills/"

# Or manually uninstall
rm -rf "$PAI_DIR/skills/osint"
rm -rf "$PAI_DIR/history/research/osint"
```

### Detailed Troubleshooting by Issue

#### Failed: OSINT Directory
**Symptoms:** Installation fails with "osint directory not found"

**Causes:**
- PAI_DIR not set correctly
- Parent directory doesn't exist
- Insufficient permissions

**Solutions:**
```bash
# Check PAI_DIR
echo "PAI_DIR is set to: ${PAI_DIR:-$HOME/.claude}"

# Create parent directory if needed
mkdir -p "$PAI_DIR/skills"

# Set proper permissions
chmod u+w "$PAI_DIR"
```

#### Failed: Skill Name Not Lowercase
**Symptoms:** Verification shows "Skill name not lowercase"

**Solution:**
```bash
# Edit SKILL.md to fix name
sed -i '' 's/^name: OSINT$/name: osint/' "$PAI_DIR/skills/osint/SKILL.md"

# Verify fix
grep "^name:" "$PAI_DIR/skills/osint/SKILL.md"
```

#### Failed: Workflows Missing
**Symptoms:** Workflow count is less than 16

**Solution:**
```bash
# Determine PACK_SOURCE (if installing from git repo)
PACK_SOURCE="$(git rev-parse --show-toplevel 2>/dev/null)/Packs/pai-osint-skill"

# Or set manually if archive/download
# PACK_SOURCE="/path/to/pai-osint-skill"

# Re-copy workflows
cp "$PACK_SOURCE/src/skills/osint/Workflows/"*.md "$PAI_DIR/skills/osint/Workflows/"

# Verify
ls "$PAI_DIR/skills/osint/Workflows/"*.md | wc -l
```

#### Failed: Knowledge Integration Missing
**Symptoms:** Workflows don't reference knowledge skill

**Check which workflows are missing:**
```bash
for f in "$PAI_DIR/skills/osint/Workflows"/*.md; do
  if ! grep -q 'Use the \*\*knowledge\*\* skill' "$f"; then
    echo "Missing: $(basename "$f")"
  fi
done
```

**Solution:** Re-copy workflows from updated pack source

#### Warning: Browser Skill
**Impact:** Limited web scraping, some workflows fail on JS-heavy sites

**Install browser skill (optional but recommended):**
```bash
# Install pai-browser-skill pack
# OSINT will work without it but with reduced functionality
```

#### Warning: Knowledge Skill
**Impact:** Findings stored to files only, no cross-investigation linking

**Install knowledge skill (required for full functionality):**
```bash
# Install pai-knowledge-system pack
# The knowledge skill handles its own MCP and database configuration
```

### Getting Help

If troubleshooting doesn't resolve the issue:

1. Check documentation in `docs/` directory
2. Review installation logs
3. Run verification script with verbose output
4. Check PAI system requirements
5. Report issue with verification output
