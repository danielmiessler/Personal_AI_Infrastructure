# jai-finance-core

Core services for the JAI Investment System.

## Overview

This pack provides foundational services for portfolio management:

- **Data Module** - Market data fetching (Finnhub, Yahoo Finance) with caching
- **Portfolio Module** - Position tracking, tax lot management, portfolio state
- **Execution Module** - Trade execution via Alpaca (paper and live)
- **Notifications Module** - Discord webhook notifications with interactive buttons
- **Config Module** - Investment policy parsing and validation

## Installation

```bash
cd jai-finance-core
bun install
```

## Configuration

Set environment variables or create `~/.jai/.env`:

```bash
FINNHUB_API_KEY=your_key_here
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_BRIEFS=https://discord.com/api/webhooks/...
```

## Usage

```typescript
import {
  FinnhubClient,
  YahooClient,
  DataCache,
  PositionManager,
  PortfolioStateManager,
  AlpacaClient,
  DiscordNotifier,
  PolicyLoader,
} from 'jai-finance-core';

// Data fetching
const finnhub = new FinnhubClient({ apiKey: process.env.FINNHUB_API_KEY });
const quote = await finnhub.getQuote('AAPL');

// Portfolio management
const positions = new PositionManager('~/.jai');
positions.addPosition('AAPL', 10, 150.00);

// Trade execution
const alpaca = new AlpacaClient({ apiKey: '...', secretKey: '...', paperMode: true });
await alpaca.submitOrder({ ticker: 'AAPL', side: 'buy', quantity: 10, type: 'market' });

// Notifications
const discord = new DiscordNotifier({ webhooks: { alerts: '...' } });
await discord.sendAlert({ content: 'Buy signal!', embeds: [...] });

// Policy
const policy = new PolicyLoader('~/.jai/policy.yaml');
const rule = policy.getRule('E1');
```

## Testing

```bash
bun test
bun run typecheck
```

## Dependencies

- None (this is the foundation pack)

## Exports

| Export | Description |
|--------|-------------|
| `FinnhubClient` | Finnhub API client with rate limiting |
| `YahooClient` | Yahoo Finance data client |
| `SECClient` | SEC EDGAR filings client |
| `DataCache` | Memory + disk caching with TTL |
| `PositionManager` | Position and tax lot tracking |
| `PortfolioStateManager` | Real-time portfolio state |
| `AlpacaClient` | Alpaca trading client |
| `DiscordNotifier` | Discord webhook notifications |
| `PolicyLoader` | Investment policy parser |
