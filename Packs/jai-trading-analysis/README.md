# jai-trading-analysis

Trading analysis, screening, timing, and automation for the JAI Investment System.

## Overview

This pack provides the intelligence layer for investment decisions:

- **Analysis Module** - Multi-stage fundamental analysis pipeline
- **Technical Module** - Timing signals using moving averages, RSI, MACD
- **Insider Module** - Context-aware insider transaction analysis
- **Screening Module** - Stock discovery (growth, value, sector screening)
- **Council Module** - Multi-agent decision support
- **Automation Module** - Market monitoring, scheduled jobs, morning briefs
- **CLI** - Command-line interface for all operations

## Installation

```bash
cd jai-trading-analysis
bun install
```

## CLI Usage

### Analysis Commands

```bash
# Basic analysis
jai analyze AAPL              # Full analysis with timing signals
jai analyze AAPL NVDA TSLA    # Batch analysis

# Position mode (for stocks you own)
jai analyze AAPL --position   # Analyzes as existing holding

# Detailed output
jai analyze AAPL --detailed   # Shows all technical indicators

# Skip timing (faster, fundamental only)
jai analyze AAPL --no-timing  # Skip technical analysis

# JSON output (for automation)
jai analyze AAPL --json       # Machine-readable output
```

### Other Commands

```bash
# Portfolio
jai portfolio                 # Current positions
jai brief                     # Morning brief

# Screening
jai screen growth             # Find growth stocks
jai screen value              # Find value stocks

# Trading
jai buy AAPL 1000            # Buy $1000 of AAPL
jai sell AAPL 10             # Sell 10 shares

# Watchlist
jai watchlist                 # View watchlist
jai watchlist add AAPL        # Add to watchlist

# Council
jai council AAPL              # Council review
```

## Analysis Pipeline

### Fundamental Analysis Stages

1. **Dealbreakers** - 11 hard-fail checks:
   - SEC Investigation
   - Recent Restatement
   - Auditor Change
   - Significant Dilution (>20%)
   - Going Concern Warning
   - Major Impairment
   - Dividend Cut
   - Debt Covenant Violation
   - Insider Dumping
   - Revenue Cliff (>30% decline)
   - Negative FCF Trend

2. **Yellow Flags** - Weighted warning signals
3. **Positive Factors** - Catalyst and moat scoring
4. **F-Score** - Piotroski financial health (0-9)

### Technical Analysis (NEW)

The technical module calculates:

| Indicator | Description |
|-----------|-------------|
| SMA (20/50/200) | Simple Moving Averages |
| EMA (12/26) | Exponential Moving Averages |
| RSI (14) | Relative Strength Index |
| MACD | Moving Average Convergence Divergence |
| Trend | STRONG_UP, UP, SIDEWAYS, DOWN, STRONG_DOWN |
| Support/Resistance | Key price levels |
| Golden/Death Cross | MA crossover signals |

### Insider Analysis (NEW)

Enhanced insider transaction analysis with:

- **Role Detection** - CEO, CFO, Director, VP, etc.
- **Significance Scoring** - HIGH, MEDIUM, LOW, NOISE
- **10b5-1 Detection** - Filters out planned sales
- **Sentiment Analysis** - BULLISH, BEARISH, NEUTRAL, MIXED

## Verdicts

### Fundamental Verdicts

| Verdict | Meaning |
|---------|---------|
| BUY | Strong fundamentals, quality stock |
| MODERATE_RISK | Acceptable with caution |
| HIGH_RISK | Proceed only with conviction |
| AVOID | Dealbreaker triggered - do not buy |

### Timing Actions (NEW)

| Action | When It Appears | What To Do |
|--------|-----------------|------------|
| **BUY_NOW** | Good fundamentals + oversold + uptrend | Enter position |
| **ACCUMULATE** | Good fundamentals + developing setup | Build position gradually |
| **WAIT_TO_BUY** | Good fundamentals but wrong timing | Set price alert, wait |
| **HOLD** | Existing position in favorable trend | Maintain position |
| **REDUCE** | Position with deteriorating technicals | Trim exposure |
| **SELL_NOW** | Bad fundamentals or broken trend | Exit position |

### Position Mode vs New Buy Mode

The `--position` flag changes how timing signals are generated:

**Without `--position`** (new buy):
- Looks for optimal entry points
- More likely to say WAIT_TO_BUY
- Calculates suggested entry price

**With `--position`** (existing holding):
- Focuses on hold vs sell decisions
- More patient with trending positions
- Only says SELL_NOW on broken trends + bad fundamentals

## Technical Indicator Details

### Trend Determination

Trend is calculated from price position relative to moving averages:

```
STRONG_UP:   Price > 20 SMA > 50 SMA > 200 SMA
UP:          Price above 50 SMA, majority bullish signals
SIDEWAYS:    Mixed signals, no clear direction
DOWN:        Price below 50 SMA, majority bearish signals
STRONG_DOWN: Price < 20 SMA < 50 SMA < 200 SMA
```

### RSI Interpretation

```
< 30:  Oversold (potential buy signal)
30-50: Bearish momentum
50-70: Bullish momentum
> 70:  Overbought (potential sell signal)
```

### MACD Signals

- **Bullish**: MACD line crosses above signal line
- **Bearish**: MACD line crosses below signal line
- **Histogram**: Positive = bullish momentum, Negative = bearish

## Insider Transaction Context

Not all insider transactions are equal:

| Transaction Type | Significance |
|------------------|--------------|
| CEO/CFO Purchase | **HIGH** - Very bullish signal |
| Director Purchase | MEDIUM - Positive signal |
| Any Purchase | Generally bullish (insiders use own money) |
| 10b5-1 Sale | LOW - Pre-planned, often noise |
| Executive Discretionary Sale | MEDIUM-HIGH - Worth investigating |
| Small VP Sale | LOW - Usually personal reasons |

## Data Sanity Checks

The system includes sanity checks for implausible data:

- Revenue changes > ±500% flagged for manual review
- Triggers "DATA QUALITY WARNING" instead of auto-failing
- Prevents false dealbreakers from bad API data

## Configuration

| File | Purpose |
|------|---------|
| `~/.config/jai/policy.yaml` | Investment rules and constraints |
| `~/.config/jai/positions.json` | Portfolio positions |
| `~/.config/jai/watchlist.json` | Stocks to monitor |
| `~/.config/jai/load-secrets.sh` | API key loader |

### Required Environment Variables

```bash
source ~/.config/jai/load-secrets.sh  # Loads from Keychain

# Or set manually:
export FINNHUB_API_KEY=xxx
export ALPACA_API_KEY=xxx
export ALPACA_SECRET_KEY=xxx
```

## Dependencies

- `jai-finance-core` - Data providers (Finnhub, Yahoo), portfolio, execution

## Testing

```bash
bun test           # Run all tests
bun run typecheck  # Type checking
```

## Module Structure

```
src/
├── analysis/
│   ├── dealbreaker.ts    # 11 hard-fail checks
│   ├── yellowflag.ts     # Warning signals
│   ├── positivefactor.ts # Positive catalysts
│   ├── fscore.ts         # Piotroski F-Score
│   ├── technical.ts      # Technical indicators & timing
│   ├── insider.ts        # Enhanced insider analysis
│   ├── pipeline.ts       # Orchestrates all stages
│   ├── data-provider.ts  # Fetches data from APIs
│   └── types.ts          # Type definitions
├── cli/
│   ├── jai.ts            # Main CLI entry point
│   ├── format.ts         # Output formatting
│   └── commands/         # Command implementations
└── index.ts              # Package exports
```
