# jai-trading-analysis Verification

## Quick Verification

```bash
cd ~/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis
source ~/.config/jai/load-secrets.sh
bun test
```

## Detailed Verification Steps

### 1. Dependencies Installed

```bash
ls node_modules | grep jai
```

Expected: Should show `jai-finance-core`

### 2. TypeScript Compiles

```bash
bun run typecheck
```

Expected: No errors

### 3. Unit Tests Pass

```bash
bun test
```

Expected: All tests pass

### 4. CLI Responds

```bash
./src/cli/jsa.ts --help
```

Expected: Help text with all commands listed

### 5. Live Analysis (Requires API Key)

```bash
source ~/.config/jai/load-secrets.sh
./src/cli/jsa.ts analyze AAPL --no-cache
```

Expected:
- Current price displayed (should match market)
- Verdict (BUY, MODERATE_RISK, HIGH_RISK, or AVOID)
- Timing action (BUY_NOW, ACCUMULATE, WAIT_TO_BUY, HOLD, REDUCE, SELL_NOW)
- Technical indicators (RSI, trend, moving averages)

### 6. Position Mode Works

```bash
source ~/.config/jai/load-secrets.sh
./src/cli/jsa.ts analyze AAPL --position
```

Expected: Different timing signals focused on HOLD/SELL decisions

### 7. Technical Analysis Module

```bash
bun test src/analysis/technical.test.ts
```

Expected: All technical analysis tests pass

### 8. Insider Analysis Module

```bash
bun test src/analysis/insider.test.ts
```

Expected: All insider analysis tests pass

## Module Verification Checklist

### Analysis Pipeline

- [ ] Dealbreaker checks run (11 checks)
- [ ] Yellow flag detection works
- [ ] Positive factor scoring works
- [ ] F-Score calculation correct

### Technical Analysis

- [ ] SMA (20/50/200) calculated
- [ ] EMA (12/26) calculated
- [ ] RSI (14) calculated
- [ ] MACD calculated
- [ ] Trend detection works
- [ ] Timing signals generated

### Insider Analysis

- [ ] Role detection works (CEO, CFO, Director, etc.)
- [ ] Significance scoring works
- [ ] 10b5-1 detection filters planned sales
- [ ] Sentiment analysis correct

### CLI Commands

- [ ] `jsa analyze` works
- [ ] `jsa analyze --position` works
- [ ] `jsa analyze --detailed` works
- [ ] `jsa analyze --json` works
- [ ] `jsa screen growth` works
- [ ] `jsa portfolio` works
- [ ] `jsa --help` shows all commands

## Troubleshooting

### "Cannot find module 'jai-finance-core'"

```bash
cd ../jai-finance-core && bun install && bun run build
cd ../jai-trading-analysis && bun install
```

### "FINNHUB_API_KEY not set"

```bash
source ~/.config/jai/load-secrets.sh
```

### Analysis shows wrong prices

Make sure `--no-cache` flag is used for fresh data:

```bash
jsa analyze AAPL --no-cache
```

### Technical analysis missing

Check that timing is not disabled:

```bash
# Wrong - skips technical
jsa analyze AAPL --no-timing

# Correct - includes technical
jsa analyze AAPL
```
