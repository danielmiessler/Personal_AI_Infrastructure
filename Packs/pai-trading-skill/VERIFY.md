# PAI Trading Skill — Verification Checklist

## Mandatory Completion Checklist

**All items must be verified before considering this pack installed.**

### Directory Structure

- [ ] `$PAI_DIR/skills/Trading/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Data/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Data/TradeLog/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Data/TradeLog/charts/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Tools/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Templates/` directory exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/` directory exists

### Core Files

- [ ] `$PAI_DIR/skills/Trading/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Trading/Data/Playbooks.yaml` exists
- [ ] `$PAI_DIR/skills/Trading/Data/RiskRules.yaml` exists

### Tools

- [ ] `$PAI_DIR/skills/Trading/Tools/TradeLogger.ts` exists
- [ ] `$PAI_DIR/skills/Trading/Tools/TradeDB.ts` exists
- [ ] `$PAI_DIR/skills/Trading/Tools/ChartGen.ts` exists

### Templates

- [ ] `$PAI_DIR/skills/Trading/Templates/GamePlan.hbs` exists
- [ ] `$PAI_DIR/skills/Trading/Templates/TradeEntry.hbs` exists
- [ ] `$PAI_DIR/skills/Trading/Templates/SessionReview.hbs` exists
- [ ] `$PAI_DIR/skills/Trading/Templates/CandleChart.hbs` exists

### Workflows

- [ ] `$PAI_DIR/skills/Trading/Workflows/MorningPrep.md` exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/TradeSetup.md` exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/IngestTrades.md` exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/SessionReview.md` exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/WeeklyReview.md` exists
- [ ] `$PAI_DIR/skills/Trading/Workflows/Playbooks.md` exists

---

## Functional Tests

### Test 1: TradeLogger Help

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts --help
# Expected: Shows usage with ingest/stats/review/list/log commands
```

### Test 2: ChartGen Help

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/ChartGen.ts --help
# Expected: Shows usage with --ticker, --date, --entry, --exit options
```

### Test 3: Dry-Run Ingest

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts ingest -d 2026-02-10 --dry-run
# Expected: Parses Trade_Review CSVs, shows symbols (DDOG, EVMN, SPOT),
#           ~6+ round-trip trades, ~$701 total P&L
```

### Test 4: Full Ingest

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts ingest -d 2026-02-10
# Expected: Writes Data/TradeLog/2026-02-10.yaml
```

### Test 5: Stats

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts stats -d 2026-02-10
# Expected: Shows trade count, P&L, win rate, per-symbol breakdown
```

### Test 6: List Trades

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts list -d 2026-02-10
# Expected: Table of round-trip trades with ID, side, shares, entry, exit, P&L
```

### Test 7: Review

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts review -d 2026-02-10
# Expected: Stats + best/worst trades + setup breakdown + SMB reflection questions
```

### Test 8: Manual Log

```bash
cd "$PAI_DIR/skills/Trading"
bun run Tools/TradeLogger.ts log -t TEST --side long --entry 100 --exit 102 --shares 50
# Expected: Logs a manual trade to Data/TradeLog/<today>.yaml
# Cleanup: Remove the test file after verification
```

### Test 9: Database Smoke Test

```bash
cd "$PAI_DIR/skills/Trading"
# After running ingest (Test 4), the database should exist
if [ -f "Data/trades.db" ]; then
  echo "OK: trades.db exists"
else
  echo "FAIL: trades.db not found"
fi

# Verify data was written to DB
bun run Tools/TradeLogger.ts stats -d 2026-02-10
# Expected: Same stats output as Test 5 (reads from DB now)

# Test new analytics flags
bun run Tools/TradeLogger.ts stats --by-setup
# Expected: Setup breakdown table (may show only "(untagged)" initially)

# Test migrate command
bun run Tools/TradeLogger.ts migrate
# Expected: Reports importing existing YAML files into DB

# Test export command
bun run Tools/TradeLogger.ts export -d 2026-02-10
# Expected: Exports DB data back to YAML file
```

### Test 10: Playbooks YAML

```bash
cat "$PAI_DIR/skills/Trading/Data/Playbooks.yaml" | head -5
# Expected: YAML with playbooks key containing 5 setups
```

### Test 11: Risk Rules YAML

```bash
cat "$PAI_DIR/skills/Trading/Data/RiskRules.yaml" | head -5
# Expected: YAML with config and account sections
```

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SKILL_DIR="$PAI_DIR/skills/Trading"

echo "=== PAI Trading Skill Verification ==="
echo ""

# Check directories
echo "Directories:"
for dir in "" "Data" "Data/TradeLog" "Data/TradeLog/charts" "Tools" "Templates" "Workflows"; do
  if [ -d "$SKILL_DIR/$dir" ]; then
    echo "  OK  $dir/"
  else
    echo "  FAIL $dir/ MISSING"
  fi
done

echo ""

# Check files
echo "Files:"
FILES=(
  "SKILL.md"
  "Data/Playbooks.yaml"
  "Data/RiskRules.yaml"
  "Tools/TradeLogger.ts"
  "Tools/TradeDB.ts"
  "Tools/ChartGen.ts"
  "Templates/GamePlan.hbs"
  "Templates/TradeEntry.hbs"
  "Templates/SessionReview.hbs"
  "Templates/CandleChart.hbs"
  "Workflows/MorningPrep.md"
  "Workflows/TradeSetup.md"
  "Workflows/IngestTrades.md"
  "Workflows/SessionReview.md"
  "Workflows/WeeklyReview.md"
  "Workflows/Playbooks.md"
)

PASS=0
FAIL=0
for file in "${FILES[@]}"; do
  if [ -f "$SKILL_DIR/$file" ]; then
    echo "  OK  $file"
    ((PASS++))
  else
    echo "  FAIL $file MISSING"
    ((FAIL++))
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"
echo ""

# Smoke test
echo "Smoke tests:"
cd "$SKILL_DIR"
if bun run Tools/TradeLogger.ts --help > /dev/null 2>&1; then
  echo "  OK  TradeLogger.ts --help"
else
  echo "  FAIL TradeLogger.ts --help"
fi

if bun run Tools/ChartGen.ts --help > /dev/null 2>&1; then
  echo "  OK  ChartGen.ts --help"
else
  echo "  FAIL ChartGen.ts --help"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. All 7 directories exist
2. All 16 files are present
3. `bun run TradeLogger.ts --help` works
4. `bun run ChartGen.ts --help` works
5. Dry-run ingest parses existing Trade_Review data correctly
6. Risk rules are personalized with user's account settings
7. Database initializes on first ingest (`Data/trades.db` created)
8. Skill index is updated (if GenerateSkillIndex.ts is available)
