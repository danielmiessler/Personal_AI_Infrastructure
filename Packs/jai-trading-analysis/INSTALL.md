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

To use `jai` command globally:

```bash
# Option 1: Add to PATH
echo 'export PATH="$HOME/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis/dist:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Create symlink
ln -sf ~/src/pai/Personal_AI_Infrastructure/Packs/jai-trading-analysis/dist/jai.js ~/bin/jai
```

### 5. Configure Portfolio (Optional)

```bash
cat > ~/.config/jai/positions.json << 'EOF'
{
  "positions": [
    {
      "ticker": "AAPL",
      "shares": 100,
      "costBasis": 150.00,
      "dateAcquired": "2024-01-15"
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
jai analyze AAPL
jai analyze AAPL NVDA --detailed

# Analyze as existing position
jai analyze AAPL --position

# Screen for opportunities
jai screen growth
jai screen value

# Portfolio overview
jai portfolio

# Morning brief
jai brief
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
