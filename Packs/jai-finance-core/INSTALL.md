# jai-finance-core Installation

## Prerequisites

- Bun runtime (v1.0+)
- API keys for data providers

## Installation Steps

### 1. Install Dependencies

```bash
cd ~/src/pai/Personal_AI_Infrastructure/Packs/jai-finance-core
bun install
```

### 2. Configure API Keys

Create the secrets loader:

```bash
mkdir -p ~/.config/jai
cat > ~/.config/jai/load-secrets.sh << 'EOF'
#!/bin/bash
# Load API keys from macOS Keychain

export FINNHUB_API_KEY=$(security find-generic-password -a "$USER" -s "finnhub-api-key" -w 2>/dev/null)
export ALPACA_API_KEY=$(security find-generic-password -a "$USER" -s "alpaca-api-key" -w 2>/dev/null)
export ALPACA_SECRET_KEY=$(security find-generic-password -a "$USER" -s "alpaca-secret-key" -w 2>/dev/null)
export DISCORD_WEBHOOK_URL=$(security find-generic-password -a "$USER" -s "discord-webhook-jai" -w 2>/dev/null)
EOF
chmod +x ~/.config/jai/load-secrets.sh
```

### 3. Store API Keys in Keychain

```bash
# Finnhub (required for market data)
security add-generic-password -a "$USER" -s "finnhub-api-key" -w "YOUR_FINNHUB_KEY"

# Alpaca (required for trading)
security add-generic-password -a "$USER" -s "alpaca-api-key" -w "YOUR_ALPACA_KEY"
security add-generic-password -a "$USER" -s "alpaca-secret-key" -w "YOUR_ALPACA_SECRET"

# Discord (optional, for notifications)
security add-generic-password -a "$USER" -s "discord-webhook-jai" -w "YOUR_WEBHOOK_URL"
```

### 4. Create Default Policy

```bash
cat > ~/.config/jai/policy.yaml << 'EOF'
meta:
  name: "Default Investment Policy"
  version: "1.0.0"
  last_review: "2026-01-09"

objectives:
  primary: "Capital preservation with growth"
  target_return: 0.12

constraints:
  max_single_position: 0.15
  max_sector_concentration: 0.30
  cash_reserve: 0.05

rules:
  entry:
    - id: E1
      name: "Quality Gate"
      rule: "F-Score >= 6"
  exit:
    - id: X1
      name: "Stop Loss"
      rule: "Sell if down 8%"
EOF
```

### 5. Build the Package

```bash
bun run build
```

## Verification

Run the verification script:

```bash
# From the pack directory
bun run verify

# Or manually
bun test
```

See VERIFY.md for detailed verification steps.

## Usage

This is a core package - it's used as a dependency by jai-trading-analysis.

```typescript
import {
  FinnhubProvider,
  YahooProvider,
  PortfolioManager,
  AlpacaExecutor,
  PolicyLoader,
  DiscordNotifier
} from 'jai-finance-core';
```
