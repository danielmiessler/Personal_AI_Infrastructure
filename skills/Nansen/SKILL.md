---
name: Nansen
description: Smart money blockchain analytics via Nansen API. USE WHEN analyzing whale wallets OR tracking token flows OR identifying smart money movements OR researching DeFi positions OR finding alpha signals.
---

# Nansen

On-chain intelligence for crypto research. Provides smart money tracking, wallet labels, token flow analysis, and DeFi position insights across 25+ chains.

**Prerequisite:** Nansen MCP server configured in settings.json with valid `NANSEN_API_KEY`.

## Capabilities (via MCP)

The Nansen MCP provides these tool categories:

| Category | What It Does |
|----------|--------------|
| **Smart Money** | Track labeled wallets (VCs, whales, funds, DEX traders) |
| **Token Flows** | See where tokens are moving (exchanges, protocols, wallets) |
| **Wallet Labels** | Identify wallet ownership and entity attribution |
| **DEX Analytics** | PnL tracking, trade history, position analysis |
| **Multi-Chain** | ETH, SOL, BTC, ARB, Base, Polygon, and 20+ more |

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **SmartMoneyAnalysis** | "who's buying X" OR "whale activity" OR "smart money" | `Workflows/SmartMoneyAnalysis.md` |
| **WalletResearch** | "lookup wallet" OR "who owns" OR "wallet history" | `Workflows/WalletResearch.md` |
| **TokenFlowTracking** | "token flows" OR "where is X going" OR "exchange flows" | `Workflows/TokenFlowTracking.md` |

## Key Concepts

### Smart Money Labels

Nansen categorizes wallets into labels:
- **Smart Money**: Historically profitable traders
- **VC Funds**: Known venture capital wallets
- **Whale**: Large holders (varies by token)
- **DEX Trader**: Active decentralized exchange users
- **CEX**: Centralized exchange hot/cold wallets
- **Bridge**: Cross-chain bridge contracts

### Signal Interpretation

| Signal | Bullish | Bearish |
|--------|---------|---------|
| Smart Money accumulating | Strong buy pressure | - |
| Exchange inflows | - | Potential sell pressure |
| Exchange outflows | Accumulation/holding | - |
| Whale transfers to DEX | - | Potential dump |
| VC wallet activity | Follow the money | Distribution phase |

## Examples

**Example 1: Smart money check**
```
User: "Is smart money buying $ARB?"
-> Query Nansen for ARB token smart money flows
-> Check recent accumulation vs distribution
-> Report notable wallet movements
```

**Example 2: Wallet lookup**
```
User: "Who owns 0x1234...?"
-> Query Nansen wallet labels
-> Return entity attribution if known
-> Show historical activity summary
```

**Example 3: Exchange flow analysis**
```
User: "Are whales moving ETH to exchanges?"
-> Query exchange inflow/outflow data
-> Identify large transfers
-> Assess market sentiment signal
```

## CLI Tools

```bash
# No CLI tools - uses MCP server directly
# Nansen MCP tools are invoked by Claude automatically
```

## Related Skills

- **DeepResearch** - Can use Nansen data as part of broader research
- **TelegramDelivery** - Send Nansen analysis reports to Telegram

## Configuration

Ensure your API key is set in `settings.json`:

```json
{
  "env": {
    "NANSEN_API_KEY": "your-api-key-here"
  }
}
```

Get your API key at: https://app.nansen.ai/settings/api
