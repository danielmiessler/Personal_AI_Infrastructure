# Session Review Workflow

**Trigger:** "session review", "daily review", "how did I do", "end of day review"

End-of-day review with trade stats, best/worst analysis, setup breakdown, and SMB Capital reflection questions.

---

## Steps

### 1. Load Trade Log

Ensure today's trades have been ingested first:

```bash
bun run Tools/TradeLogger.ts list -d <YYYY-MM-DD>
```

If no trade log exists, redirect to the IngestTrades workflow first.

### 2. Generate Review Data

```bash
bun run Tools/TradeLogger.ts review -d <YYYY-MM-DD>
```

This displays:
- Summary stats (trades, P&L, win rate)
- Best and worst trades
- Setup breakdown (P&L by playbook)
- SMB reflection questions

### 3. Present Stats

Use `Templates/SessionReview.hbs` to format the review. Show:

| Metric | Value |
|--------|-------|
| Total trades | X |
| Total P&L | $X.XX |
| Win rate | X% (XW / XL / XBE) |
| Best trade | ID +$X.XX |
| Worst trade | ID -$X.XX |

### 4. Setup Breakdown

Show P&L by playbook setup:

| Setup | Trades | P&L | Win Rate |
|-------|--------|-----|----------|
| ORB | X | +$XX | X% |
| VWAP Reclaim | X | +$XX | X% |
| (untagged) | X | -$XX | X% |

If trades are untagged, prompt David to annotate them now.

### 5. SMB Capital Reflection Questions

Walk David through these questions (from Mike Bellafiore's training):

1. **What was your best trade today and why?**
   - What made it work? Was it the setup, execution, or both?

2. **What was your worst trade today and why?**
   - Was it a bad setup, bad execution, or bad discipline?

3. **Did you follow your playbook on every trade?**
   - Any revenge trades, FOMO entries, or stop violations?

4. **What is the one thing you will improve tomorrow?**
   - Pick ONE specific, actionable improvement.

5. **Did you honor your stops and risk rules?**
   - Any widened stops, oversized positions, or exceeded daily loss?

6. **Rate your discipline today (1-10):**
   - 10 = perfect execution of plan, 1 = complete breakdown

### 6. Save Review

Save the review and reflections to:
```
Data/TradeLog/review-YYYY-MM-DD.yaml
```

Schema:
```yaml
date: "YYYY-MM-DD"
stats:
  total_trades: X
  total_pnl: X.XX
  win_rate: X.X
best_trade: "ID"
worst_trade: "ID"
reflections:
  best_trade_why: "..."
  worst_trade_why: "..."
  followed_playbook: "..."
  improve_tomorrow: "..."
  honored_stops: "..."
  discipline_rating: X
goals_tomorrow:
  - "..."
```

---

## Notes

- This is the most important part of the trading day
- "The best traders are the best reviewers" — Mike Bellafiore
- Be honest in reflections — the journal is for you, not anyone else
- The discipline rating trend over time reveals your growth
