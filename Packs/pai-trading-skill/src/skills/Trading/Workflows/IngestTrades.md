# Ingest Trades Workflow

**Trigger:** "ingest trades", "import trades", "end of day import", "load today's trades"

Parse broker CSV exports from the Trade_Review folder and create a structured daily trade log. This is the primary way trades enter the system.

---

## Steps

### 1. Determine Date

Ask David which date to ingest, or default to today:
- "Which date should I ingest? (default: today)"
- Format: YYYY-MM-DD

### 2. Run Ingestion

Execute the TradeLogger ingest command:

```bash
bun run Tools/TradeLogger.ts ingest -d <YYYY-MM-DD>
```

This will:
1. Read `trades-YYYY-MM-DD.csv` from the Trade_Review folder
2. Group individual fills into round-trip trades per symbol
3. Compute per-trade: VWAP entry, VWAP exit, shares, P&L, fees
4. Cross-check against `positions-YYYY-MM-DD.csv` summary P&L
5. Link any chart screenshots (`.jpg` files) found in the folder
6. Write to `Data/TradeLog/YYYY-MM-DD.yaml`

**For a dry run first** (recommended for first time):

```bash
bun run Tools/TradeLogger.ts ingest -d <YYYY-MM-DD> --dry-run
```

### 3. Display Summary

Show David:
- Number of round-trip trades
- Symbols traded
- Total P&L
- Any P&L discrepancies vs positions CSV

### 4. Generate Charts (Optional)

For each round-trip trade, offer to generate an interactive candlestick chart:

```bash
bun run Tools/ChartGen.ts -t <TICKER> -d <YYYY-MM-DD> --entry <price> --exit <price> --entry-time <HH:MM> --exit-time <HH:MM>
```

Ask David: "Want me to generate charts for each trade?"

### 5. Annotate Trades

For each round-trip trade, ask David:
1. **Which playbook setup was this?** (ORB, VWAP Reclaim, First Pullback, Red to Green, Breakdown Short, or other)
2. **Any notes?** (what went well, what didn't, what you'd do differently)

Update the trade entries in `Data/TradeLog/YYYY-MM-DD.yaml` with the setup and notes.

### 6. Cross-Check P&L

Compare the ingested total P&L against the positions CSV summary:
- If they match (within $0.50): confirm accuracy
- If they differ: flag the discrepancy for David to investigate

### 7. Fallback: Manual Entry

If no broker CSV exists for the date, offer manual entry:

```bash
bun run Tools/TradeLogger.ts log -t <TICKER> --side long --entry <price> --exit <price> --shares <qty>
```

---

## Source Files

The Trade_Review folder is structured as:
```
Trade_Review/YYYY/MM/YYYY-MM-DD/
  trades-YYYY-MM-DD.csv      ← Primary: per-fill execution data
  positions-YYYY-MM-DD.csv   ← Validation: realized P&L summary
  Trades.csv                 ← Order-execution mapping (optional)
  Orders.csv                 ← Order lifecycle (optional)
  *.jpg                      ← Platform chart screenshots
```

Default path: `C:\Users\David\OneDrive\Documents\Trade_Review`
(Configured in `Data/RiskRules.yaml` → `config.trade_review_path`)

---

## Notes

- Run this within 30 minutes of market close while the day is fresh
- Annotating setups is critical — it's how you build your edge data
- The annotation step feeds into SessionReview and WeeklyReview
