# SmartMoneyAnalysis Workflow

> **Trigger:** "who's buying X", "whale activity", "smart money", "is smart money accumulating"
> **Input:** Token symbol or address
> **Output:** Smart money flow analysis with actionable signals

## Step 1: Identify Token

- Resolve token symbol to address if needed
- Confirm chain (default: Ethereum)
- Note token metrics (market cap, volume)

## Step 2: Query Smart Money Flows

Use Nansen MCP to:
- Get recent smart money transactions for token
- Check accumulation vs distribution ratio
- Identify top smart money wallets involved

## Step 3: Analyze Wallet Behavior

For notable wallets:
- Check their historical accuracy
- Look at position sizing
- Note entry/exit patterns

## Step 4: Synthesize Signal

Provide:
- **Direction**: Accumulation or distribution?
- **Conviction**: How many smart money wallets? What size?
- **Timing**: Recent activity or stale?
- **Caution**: Any red flags?

## Step 5: Report

Format findings as:
```
## Smart Money Analysis: [TOKEN]

**Signal**: [BULLISH/BEARISH/NEUTRAL]
**Confidence**: [HIGH/MEDIUM/LOW]

### Recent Activity
- [Notable wallet movements]

### Key Wallets
- [Top smart money players]

### Interpretation
[What this likely means]
```

## Completion

Deliver analysis to user. Offer to:
- Deep dive on specific wallets
- Track ongoing activity
- Send to Telegram via TelegramDelivery

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 5 (optional) | TelegramDelivery |
