# jai-finance-core Verification

## Quick Verification

```bash
cd ~/src/pai/Personal_AI_Infrastructure/Packs/jai-finance-core
source ~/.config/jai/load-secrets.sh
bun test
```

## Detailed Verification Steps

### 1. Dependencies Installed

```bash
# Should show jai-finance-core dependencies
ls node_modules | head -10
```

Expected: Should list packages like `commander`, `yaml`, etc.

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

### 4. API Keys Loaded

```bash
source ~/.config/jai/load-secrets.sh
echo "Finnhub: ${FINNHUB_API_KEY:0:5}..."
echo "Alpaca: ${ALPACA_API_KEY:0:5}..."
```

Expected: First 5 characters of each key displayed

### 5. Finnhub Connection (Live Test)

```bash
# Quick test using curl
source ~/.config/jai/load-secrets.sh
curl -s "https://finnhub.io/api/v1/quote?symbol=AAPL&token=$FINNHUB_API_KEY" | head -c 100
```

Expected: JSON with current price data

### 6. Policy Loads

```bash
cat ~/.config/jai/policy.yaml
```

Expected: YAML policy file contents

## Module Verification

### Data Module

- [ ] FinnhubProvider fetches quotes
- [ ] YahooProvider fetches quotes (fallback)
- [ ] CacheManager caches responses

### Portfolio Module

- [ ] PortfolioManager loads positions
- [ ] Position calculations correct
- [ ] Tax lot tracking works

### Execution Module

- [ ] AlpacaExecutor connects (paper mode)
- [ ] Order validation works
- [ ] Paper trading executes

### Config Module

- [ ] PolicyLoader reads YAML
- [ ] Schema validation works
- [ ] Default policy fallback works

### Notifications Module

- [ ] DiscordNotifier sends (if webhook configured)
- [ ] Message formatting correct

## Troubleshooting

### "FINNHUB_API_KEY not set"

```bash
source ~/.config/jai/load-secrets.sh
```

### "Cannot find module"

```bash
bun install
```

### Tests failing

```bash
# Check for TypeScript errors first
bun run typecheck
```
