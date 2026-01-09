# jai-trading-analysis Installation

## Prerequisites

- Bun runtime (v1.0+)
- jai-finance-core installed (sibling directory)
- API keys configured (see jai-finance-core/INSTALL.md)

## Installation Steps

### 1. Install jai-finance-core First

```bash
cd ~/src/pai/Personal_AI_Infrastructure/Packs/jai-finance-core
bun install
bun run build
```

### 2. Install jai-trading-analysis

```bash
cd ~/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis
bun install
```

### 3. Build the Package

```bash
bun run build
```

### 4. Link the CLI (Optional)

To use `jsa` command globally:

```bash
# Option 1: Add to PATH
echo 'export PATH="$HOME/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis/src/cli:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Create symlink
ln -sf ~/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis/src/cli/jsa.ts ~/bin/jsa
```

### 5. Configure Portfolio (Optional)

```bash
cat > ~/.config/jai/positions.json << 'EOF'
{
  "version": 1,
  "lastUpdated": "2024-01-15T00:00:00Z",
  "cashBalance": 5000.00,
  "positions": [
    {
      "ticker": "AAPL",
      "shares": 100,
      "avgCostBasis": 150.00,
      "totalCost": 15000.00,
      "openedAt": "2024-01-15",
      "sector": "Technology",
      "taxLots": [
        {
          "id": "lot-1",
          "shares": 100,
          "costBasis": 150.00,
          "purchaseDate": "2024-01-15"
        }
      ]
    }
  ]
}
EOF
```

### 6. Configure Watchlist (Optional)

```bash
cat > ~/.config/jai/watchlist.json << 'EOF'
{
  "watchlist": ["NVDA", "MSFT", "GOOGL"]
}
EOF
```

## Verification

```bash
source ~/.config/jai/load-secrets.sh
bun run verify
```

See VERIFY.md for detailed verification steps.

## Usage

### CLI Commands

```bash
# Load secrets first
source ~/.config/jai/load-secrets.sh

# Analyze stocks
jsa analyze AAPL
jsa analyze AAPL NVDA --detailed

# Analyze as existing position
jsa analyze AAPL --position

# Screen for opportunities
jsa screen growth
jsa screen value

# Portfolio overview
jsa portfolio

# Morning brief
jsa brief
```

### As Library

```typescript
import {
  AnalysisPipeline,
  RealDataProvider,
  runTechnicalAnalysis,
  analyzeInsiderTransactions
} from 'jai-trading-analysis';
```
