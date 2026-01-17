# PAI Annual Reports Skill - Verification Checklist

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/skills/AnnualReports/` directory exists
- [ ] `$PAI_DIR/skills/AnnualReports/Tools/` directory exists
- [ ] `$PAI_DIR/skills/AnnualReports/Workflows/` directory exists
- [ ] `$PAI_DIR/skills/AnnualReports/Data/` directory exists
- [ ] `$PAI_DIR/skills/AnnualReports/Reports/` directory exists (for cached reports)

### Core Files

- [ ] `$PAI_DIR/skills/AnnualReports/SKILL.md` exists

### Tools

- [ ] `$PAI_DIR/skills/AnnualReports/Tools/ListSources.ts` exists
- [ ] `$PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts` exists
- [ ] `$PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts` exists

### Workflows

- [ ] `$PAI_DIR/skills/AnnualReports/Workflows/Update.md` exists
- [ ] `$PAI_DIR/skills/AnnualReports/Workflows/Analyze.md` exists
- [ ] `$PAI_DIR/skills/AnnualReports/Workflows/Fetch.md` exists

### Data Files

- [ ] `$PAI_DIR/skills/AnnualReports/Data/sources.json` exists

---

## Functional Tests

### Test 1: Verify Directory Structure

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

ls -la $PAI_CHECK/skills/AnnualReports/
# Expected: SKILL.md Tools/ Workflows/ Data/ Reports/

ls -la $PAI_CHECK/skills/AnnualReports/Tools/
# Expected: ListSources.ts UpdateSources.ts FetchReport.ts

ls -la $PAI_CHECK/skills/AnnualReports/Workflows/
# Expected: Update.md Analyze.md Fetch.md

ls -la $PAI_CHECK/skills/AnnualReports/Data/
# Expected: sources.json
```

### Test 2: Test ListSources Tool

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# List all categories
bun run $PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts
# Expected: Shows category counts (Analysis and Survey sections)
```

### Test 3: Test Category Listing

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# List specific category
bun run $PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts "global_threat_intelligence"
# Expected: Lists reports in Global Threat Intelligence category
```

### Test 4: Test Vendor Search

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Search by vendor
bun run $PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts --vendor crowdstrike
# Expected: Lists all CrowdStrike reports
```

### Test 5: Test Keyword Search

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Search by keyword
bun run $PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts --search ransomware
# Expected: Lists reports matching "ransomware"
```

### Test 6: Verify Data File Content

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check data file has metadata
cat $PAI_CHECK/skills/AnnualReports/Data/sources.json | head -20
# Expected: JSON with metadata (source, lastUpdated, totalReports)

# Count total reports
cat $PAI_CHECK/skills/AnnualReports/Data/sources.json | grep -c '"url"'
# Expected: 200+ (should be 300+ when fully populated)
```

### Test 7: Test UpdateSources Dry Run

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Run update in dry-run mode
bun run $PAI_CHECK/skills/AnnualReports/Tools/UpdateSources.ts --dry-run
# Expected: Shows parsing results without modifying files
```

### Test 8: Verify SKILL.md Content

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check frontmatter
head -10 $PAI_CHECK/skills/AnnualReports/SKILL.md
# Expected: YAML frontmatter with name: AnnualReports

# Check workflow routing
grep -A5 "Workflow Routing" $PAI_CHECK/skills/AnnualReports/SKILL.md
# Expected: UPDATE, ANALYZE, FETCH workflow references
```

---

## Integration Tests

### Test A: Skill Routing (if CORE installed)

In a Claude Code session:
1. Say "update annual reports"
2. AI should invoke AnnualReports skill
3. Should trigger UPDATE workflow

### Test B: Report Search

In a Claude Code session:
1. Say "what threat reports are available?"
2. AI should use ListSources tool
3. Should return threat intelligence category

### Test C: Vendor Analysis

In a Claude Code session:
1. Say "show me all CrowdStrike reports"
2. AI should run: `bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --vendor crowdstrike`
3. Should list CrowdStrike's annual reports

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== PAI Annual Reports Skill v2.3.0 Verification ==="
echo ""

# Check directories
echo "Directory Structure:"
for dir in "skills/AnnualReports" "skills/AnnualReports/Tools" "skills/AnnualReports/Workflows" "skills/AnnualReports/Data"; do
  if [ -d "$PAI_CHECK/$dir" ]; then
    echo "  ✓ $dir/"
  else
    echo "  ❌ $dir/ MISSING"
  fi
done

echo ""

# Check core file
echo "Core Files:"
if [ -f "$PAI_CHECK/skills/AnnualReports/SKILL.md" ]; then
  echo "  ✓ SKILL.md"
else
  echo "  ❌ SKILL.md MISSING"
fi

echo ""

# Check tools
echo "Tools:"
for file in "ListSources.ts" "UpdateSources.ts" "FetchReport.ts"; do
  if [ -f "$PAI_CHECK/skills/AnnualReports/Tools/$file" ]; then
    echo "  ✓ Tools/$file"
  else
    echo "  ❌ Tools/$file MISSING"
  fi
done

echo ""

# Check workflows
echo "Workflows:"
for file in "Update.md" "Analyze.md" "Fetch.md"; do
  if [ -f "$PAI_CHECK/skills/AnnualReports/Workflows/$file" ]; then
    echo "  ✓ Workflows/$file"
  else
    echo "  ❌ Workflows/$file MISSING"
  fi
done

echo ""

# Check data file
echo "Data Files:"
if [ -f "$PAI_CHECK/skills/AnnualReports/Data/sources.json" ]; then
  REPORT_COUNT=$(cat "$PAI_CHECK/skills/AnnualReports/Data/sources.json" | grep -c '"url"' 2>/dev/null || echo "0")
  echo "  ✓ Data/sources.json ($REPORT_COUNT report URLs)"
else
  echo "  ❌ Data/sources.json MISSING"
fi

echo ""

# Test tool execution
echo "Tool Execution Test:"
if bun run "$PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts" > /dev/null 2>&1; then
  echo "  ✓ ListSources.ts runs successfully"
else
  echo "  ❌ ListSources.ts failed to run"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. ✅ All directory structure items are checked
2. ✅ SKILL.md exists with proper frontmatter
3. ✅ All 3 tools are installed (ListSources, UpdateSources, FetchReport)
4. ✅ All 3 workflows are installed (Update, Analyze, Fetch)
5. ✅ Data/sources.json exists with 200+ report URLs
6. ✅ `bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts` runs without error
7. ✅ Tool returns category listing with counts
