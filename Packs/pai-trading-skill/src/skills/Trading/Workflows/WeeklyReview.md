# Weekly Review Workflow

**Trigger:** "weekly review", "week summary", "weekly stats"

Aggregate daily reviews into weekly patterns. Identify best setups, behavioral patterns, and set improvement goals for next week.

---

## Steps

### 1. Load Weekly Stats

```bash
bun run Tools/TradeLogger.ts stats --week
```

This aggregates the last 7 calendar days of trade logs and shows:
- Total days traded
- Total trades and P&L
- Win rate, profit factor
- Average win / average loss
- Per-symbol breakdown

### 2. Aggregate Daily Reviews

Read all `Data/TradeLog/review-YYYY-MM-DD.yaml` files from the past week.

Compile:
- Daily P&L trend (was it consistent or volatile?)
- Daily discipline ratings (trending up or down?)
- Recurring themes in reflections

### 3. Pattern Analysis

Analyze the week's trades for patterns:

**By Setup:**
- Which playbook setups were most profitable?
- Which setups had the highest win rate?
- Which setups should you trade more / less?

**By Time of Day:**
- When did you make the most money? (9:30-10:00, 10:00-11:30, etc.)
- When did you lose the most?
- Are you trading outside your best window?

**By Behavior:**
- Any revenge trading patterns?
- Stop honor rate (% of trades where stops were respected)
- Position sizing discipline (% within risk limits)

**By Symbol:**
- Which tickers did you trade best?
- Any tickers you should avoid?

### 4. Key Takeaways

Summarize the week in 3-5 bullet points:
- What worked
- What didn't
- What surprised you

### 5. Set Goals for Next Week

Help David set 1-3 specific, actionable goals:

**Examples:**
- "Only take A and B setups — no C setups this week"
- "Reduce position size by 25% until win rate improves"
- "No trades after 11:30 AM unless it's a power hour setup"
- "Focus on First Pullback setups — they had 80% win rate this week"
- "Improve discipline rating from 6 average to 7+ average"

### 6. Save Weekly Review

Save to `Data/TradeLog/weekly-review-YYYY-MM-DD.yaml` (dated by the Sunday/last day):

```yaml
week_ending: "YYYY-MM-DD"
days_traded: X
total_trades: X
total_pnl: X.XX
win_rate: X.X
profit_factor: X.X
avg_discipline: X.X
best_setup: "name"
worst_setup: "name"
takeaways:
  - "..."
goals_next_week:
  - "..."
```

---

## Notes

- Do this every Friday after close or Sunday before the new week
- The weekly review is where long-term improvement happens
- Track goals week-over-week to see progress
- "One good trade at a time" — Steve Spencer
