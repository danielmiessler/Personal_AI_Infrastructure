# Trade Setup Workflow

**Trigger:** "trade setup", "evaluate setup", "position size", "should I trade"

Evaluate a specific trade idea against playbook criteria and risk rules. Returns a setup grade (A/B/C/F) with position sizing.

---

## Steps

### 1. Gather Trade Idea

Ask David for:
- **Ticker** — which stock?
- **Direction** — long or short?
- **Entry price** — where would you enter?
- **Stop price** — where is the stop?
- **Why** — what's the catalyst/setup?

### 2. Run Analysis

```bash
uv run tradekit analyze <TICKER>
uv run tradekit levels <TICKER>
```

Gather:
- Current price, RVOL, ATR
- Key support/resistance levels
- Technical indicators (RSI, MACD, etc.)

### 3. Match to Playbook

Read `Data/Playbooks.yaml` and check which setup this trade matches:

| Playbook | Key Criteria |
|----------|-------------|
| ORB | Opening range breakout with volume, 9:30-10:00 range |
| VWAP Reclaim | Dip below VWAP, reclaim with higher low, 10:00+ |
| First Pullback | Strong opener, low-volume pullback, flag break |
| Red to Green | Gap down, bottom formation, cross previous close |
| Breakdown Short | Losing support, increasing volume on drops |

**Grade the setup:**
- **A** — Matches all criteria of a playbook, strong catalyst, good R:R
- **B** — Matches most criteria, acceptable R:R
- **C** — Partial match, marginal R:R — smaller size
- **F** — No playbook match or violates risk rules — NO TRADE

### 4. Validate Risk Rules

Read `Data/RiskRules.yaml` and check:

1. **Risk per share:** |entry - stop|
2. **Position size:** max_risk_per_trade / risk_per_share
3. **Position value:** shares × entry ≤ max_position_size
4. **R:R ratio:** |entry - target| / |entry - stop| ≥ minimum_rr (2.0)
5. **Daily loss check:** Has David hit or approached max daily loss?
6. **Concurrent positions:** Would this exceed max_concurrent_positions?
7. **Time check:** Is this within the best trading window?

### 5. Present Setup Card

Display:

```
SETUP: [Playbook Name] — Grade [A/B/C/F]

Ticker:    XXXX
Direction: Long/Short
Entry:     $XX.XX
Stop:      $XX.XX
Target 1:  $XX.XX (1R)
Target 2:  $XX.XX (2R)

Risk/share: $X.XX
Shares:     XXX
Position $: $X,XXX
Max loss:   $XXX
R:R ratio:  X.X:1

Scale-out plan:
  1R → Sell 1/3, move stop to breakeven
  2R → Sell 1/3, trail stop at 1R
  3R → Sell remaining or trail
```

### 6. Recommendation

- **A setup:** "This is a high-quality setup. Execute per plan."
- **B setup:** "Solid setup. Consider slightly smaller size."
- **C setup:** "Marginal. Only take if nothing better is available."
- **F setup:** "No trade. This doesn't match your playbook."

---

## Notes

- "Every good trade starts with a plan" — Steve Spencer
- If the R:R is below 2:1, it's not worth the risk
- When in doubt, sit it out — there's always another trade
