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

## Workflows (13 checks)

### Check 6: All Workflows Present
```bash
WORKFLOWS="UsernameRecon DomainRecon SocialCapture InfraMapping EntityLinking TimelineAnalysis TargetProfile IntelReport CompanyProfile CorporateStructure FinancialRecon CompetitorAnalysis RiskAssessment"
for wf in $WORKFLOWS; do
  [ -f "$PAI_DIR/skills/osint/Workflows/${wf}.md" ] && echo "✓ ${wf}.md" || echo "✗ ${wf}.md MISSING"
done
```
**Expected:** All 13 workflow files present

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
echo "Workflows (13 required):"
WF_COUNT=$(ls "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $WF_COUNT/13 workflows"
if [ "$WF_COUNT" -eq 13 ]; then ((PASS++)); else ((FAIL++)); fi

# Knowledge integration
echo ""
echo "Knowledge Integration:"
KI_COUNT=$(grep -l 'Use the \*\*knowledge\*\* skill' "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $KI_COUNT/13 workflows with knowledge skill"
if [ "$KI_COUNT" -eq 13 ]; then ((PASS++)); else ((FAIL++)); fi

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
| Workflows | 2 | All must pass (13 files, 13 with knowledge) |
| Dependencies | 2 | Warnings acceptable |
| Configuration | 3 | All must pass |
| **Total** | **12** | **10+ pass, 0 fail** |

---

## Troubleshooting

### Failed: OSINT Directory
- Re-run installation
- Check `$PAI_DIR` is set correctly (default: `~/.claude`)

### Failed: Skill Name Not Lowercase
- Edit `$PAI_DIR/skills/osint/SKILL.md`
- Change `name: OSINT` to `name: osint`

### Failed: Workflows Missing
- Copy workflows from pack source:
  ```bash
  cp /path/to/pai-osint-skill/src/skills/osint/Workflows/*.md $PAI_DIR/skills/osint/Workflows/
  ```

### Failed: Knowledge Integration Missing
- Workflows should contain: `Use the **knowledge** skill`
- Re-copy workflows from updated pack source

### Warning: Browser Skill
- Install `pai-browser-skill` for web scraping capabilities
- OSINT will work with reduced functionality without it

### Warning: Knowledge Skill
- Install `pai-knowledge-system` for persistent intelligence storage
- Reports will still generate but won't be stored in graph
- The knowledge skill handles its own MCP and database configuration
