# WalletResearch Workflow

> **Trigger:** "lookup wallet", "who owns", "wallet history", "what does this wallet hold"
> **Input:** Wallet address (0x... or ENS)
> **Output:** Wallet profile with labels, holdings, and activity

## Step 1: Resolve Address

- Convert ENS to address if needed
- Validate address format
- Identify chain(s) with activity

## Step 2: Get Wallet Labels

Use Nansen MCP to:
- Fetch all labels for wallet
- Check entity attribution (VC, CEX, protocol, individual)
- Note any "Smart Money" designation

## Step 3: Analyze Holdings

Query current portfolio:
- Top token holdings by value
- NFT holdings if relevant
- DeFi positions (lending, LP, staking)

## Step 4: Review Activity History

Look at:
- Recent transactions (last 30 days)
- Trading patterns (frequency, size)
- Notable protocols interacted with
- Cross-chain activity

## Step 5: Build Profile

Synthesize into:
```
## Wallet Profile: [ADDRESS]

**Entity**: [Known entity or "Unknown"]
**Labels**: [Smart Money, Whale, etc.]
**Chain Activity**: [ETH, ARB, etc.]

### Holdings
| Token | Amount | Value |
|-------|--------|-------|
| ... | ... | ... |

### Activity Pattern
- [Trading style]
- [Protocols used]
- [Risk profile]

### Notable History
- [Significant transactions]
```

## Completion

Deliver profile. Offer to:
- Set up wallet monitoring
- Compare to similar wallets
- Analyze specific positions

## Skills Invoked

| Step | Skill |
|------|-------|
| N/A | Direct Nansen MCP queries |
