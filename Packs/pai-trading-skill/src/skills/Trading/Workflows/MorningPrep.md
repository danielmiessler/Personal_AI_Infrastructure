# Morning Prep Workflow

**Trigger:** "morning prep", "game plan", "stocks in play"

This is the daily entry point. Run before market open to build a focused game plan with 2-4 stocks in play, entry/stop/target for each, and a risk budget.

---

## Steps

### 1. Pre-Market Scan

Run the tradekit scanner to find stocks with catalysts and volume:

```bash
uv run tradekit morning --top-n 5
```

This returns the top gap movers with pre-market volume, float, and catalyst data.

### 2. Load Watchlist

Check the personal watchlist for tickers David is already tracking:

```bash
uv run tradekit watchlist
```

### 3. Load Risk Rules

Read `Data/RiskRules.yaml` for:
- Account size and max daily loss
- Max risk per trade and position limits
- Time rules (best trading window, avoid periods)

### 4. Evaluate Each Candidate

For each top pick from the scan + watchlist (max 4-5 tickers):

1. Run analysis: `uv run tradekit analyze <TICKER>`
2. Run levels: `uv run tradekit levels <TICKER>`
3. Identify the catalyst (earnings, news, sector move, technical)
4. Match to a playbook setup in `Data/Playbooks.yaml`:
   - ORB, VWAP Reclaim, First Pullback, Red to Green, Breakdown Short
5. Plan entry price, stop price, target price
6. Calculate position size:
   - Risk per share = |entry - stop|
   - Shares = max_risk_per_trade / risk_per_share
   - Validate: shares × entry ≤ max_position_size
   - Validate: concurrent positions ≤ max_concurrent_positions

### 5. Present Game Plan

Use the `Templates/GamePlan.hbs` template to format:
- Stocks in play table with ticker, catalyst, setup, entry/stop/target, risk, shares
- Risk budget showing remaining daily risk capacity
- Pre-market checklist

### 6. Confirm with David

Ask David to:
- Confirm or adjust the stocks in play
- Add any tickers he's been watching independently
- Confirm his mental state / readiness

---

## Output

A formatted game plan ready for the trading day. David should reference this throughout the session.

## Notes

- Run this between 8:30-9:25 AM ET
- Focus on 2-4 high-conviction setups, not 10 mediocre ones
- "If you don't have a plan, you don't have a trade" — Mike Bellafiore
