# TokenFlowTracking Workflow

> **Trigger:** "token flows", "where is X going", "exchange flows", "inflows outflows"
> **Input:** Token symbol/address, optional timeframe
> **Output:** Flow analysis showing movement patterns

## Step 1: Identify Token & Timeframe

- Resolve token symbol to address
- Set timeframe (default: 7 days)
- Note relevant exchanges and protocols

## Step 2: Query Exchange Flows

Use Nansen MCP to:
- Get CEX inflows (deposits)
- Get CEX outflows (withdrawals)
- Calculate net flow
- Identify top exchanges by volume

## Step 3: Analyze Non-Exchange Flows

Track movements to/from:
- DeFi protocols (Aave, Compound, Uniswap)
- Bridge contracts
- Whale wallets
- Smart contracts

## Step 4: Identify Large Movements

Flag transactions that are:
- Top 10 by size in timeframe
- From/to labeled wallets
- Unusual patterns (first-time transfers, round numbers)

## Step 5: Interpret Signals

| Flow Pattern | Interpretation |
|--------------|----------------|
| Net CEX inflow | Potential selling pressure |
| Net CEX outflow | Accumulation, bullish |
| Bridge outflows | Migration to other chain |
| DeFi deposits | Yield seeking, holding |
| Whale to DEX | Potential OTC or swap |

## Step 6: Report

Format as:
```
## Token Flow Analysis: [TOKEN]

**Period**: [Timeframe]
**Net Exchange Flow**: [+/-X tokens]

### Exchange Activity
| Exchange | Inflow | Outflow | Net |
|----------|--------|---------|-----|
| ... | ... | ... | ... |

### Notable Movements
- [Large transfers with context]

### Signal
[Bullish/Bearish/Neutral interpretation]
```

## Completion

Deliver analysis. Offer to:
- Track specific wallet flows
- Set up flow alerts
- Compare to historical patterns

## Skills Invoked

| Step | Skill |
|------|-------|
| Report delivery | TelegramDelivery (optional) |
