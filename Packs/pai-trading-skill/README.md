---
name: PAI Trading Skill
pack-id: davdunc-pai-trading-skill-v1.0.0
version: 1.0.0
author: davdunc
description: SMB Capital-style intraday trading workflow — broker CSV ingestion, trade journaling, playbook management, daily/weekly review with reflection questions. Built on tradekit CLI.
type: feature
purpose-type: [productivity, trading, discipline]
platform: claude-code
dependencies:
  - pai-core-install (required) — CORE skill provides routing and identity
  - tradekit CLI (recommended) — Pre-market scanning, analysis, levels
  - Bun runtime (required) — TypeScript tool execution
keywords: [trading, intraday, journal, playbook, review, SMB Capital, DAS Trader, broker CSV, candlestick charts]
---

# PAI Trading Skill (pai-trading-skill)

> SMB Capital-style intraday trading discipline: morning prep, broker CSV ingestion, playbook-graded trade logging, session reviews with reflection questions, and weekly pattern analysis.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`.

---

## What This Pack Provides

**Daily Workflow**
- **MorningPrep** — Pre-market scan via tradekit, game plan with 2-4 stocks in play
- **TradeSetup** — Evaluate trade ideas against playbook criteria, calculate position size
- **IngestTrades** — Parse broker CSV exports (DAS Trader format) into structured YAML logs
- **SessionReview** — End-of-day stats, best/worst analysis, SMB reflection questions
- **WeeklyReview** — Weekly pattern analysis, improvement goal setting

**Playbook System**
- 5 pre-built SMB Capital setups: ORB, VWAP Reclaim, First Pullback, Red to Green, Breakdown Short
- Add/edit/view playbooks through natural language
- Grade each trade against playbook criteria (A/B/C/F)

**Risk Management**
- Configurable account size, daily loss limits, position limits
- Position sizing calculator with R:R validation
- Behavioral rules (no revenge trading, honor stops, etc.)
- Scale-out plan at 1R/2R/3R

**Tools**
- `TradeLogger.ts` — Ingest broker CSVs, compute stats, generate reviews
- `ChartGen.ts` — Interactive candlestick charts via TradingView lightweight-charts

---

## Architecture

```
~/.claude/skills/Trading/
├── SKILL.md                  # Skill routing and description
├── Data/
│   ├── Playbooks.yaml        # 5 SMB-style setups
│   ├── RiskRules.yaml        # Account/risk configuration
│   └── TradeLog/             # Daily YAML trade logs
│       ├── 2026-02-10.yaml
│       ├── review-2026-02-10.yaml
│       └── charts/           # Generated HTML charts
├── Tools/
│   ├── TradeLogger.ts        # Ingestion + stats CLI
│   └── ChartGen.ts           # Chart generation CLI
├── Templates/
│   ├── GamePlan.hbs          # Morning game plan
│   ├── TradeEntry.hbs        # Single trade card
│   ├── SessionReview.hbs     # EOD review
│   └── CandleChart.hbs       # HTML chart template
└── Workflows/
    ├── MorningPrep.md        # Pre-market → game plan
    ├── TradeSetup.md         # Evaluate setup vs playbook
    ├── IngestTrades.md       # Parse broker CSVs
    ├── SessionReview.md      # EOD review + reflections
    ├── WeeklyReview.md       # Weekly pattern analysis
    └── Playbooks.md          # Manage playbook library
```

## Data Flow

```
Broker Platform (DAS Trader)
  ↓ CSV export
Trade_Review/YYYY/MM/YYYY-MM-DD/
  ├── trades-YYYY-MM-DD.csv     (per-fill execution data)
  ├── positions-YYYY-MM-DD.csv  (realized P&L summary)
  └── *.jpg                     (chart screenshots)
  ↓ TradeLogger.ts ingest
Data/TradeLog/YYYY-MM-DD.yaml   (structured round-trip trades)
  ↓ TradeLogger.ts review
SessionReview + WeeklyReview     (stats, patterns, reflections)
```

---

## Quick Start

After installation:

| Command | What it does |
|---------|-------------|
| "morning prep" | Run pre-market scan, build game plan |
| "ingest trades" | Parse today's broker CSVs |
| "session review" | EOD stats + SMB reflection questions |
| "weekly review" | Aggregate weekly patterns + goals |
| "playbook" | View/add/edit trading setups |
| "trade setup TICKER" | Evaluate a specific trade idea |

---

## v2 Roadmap

Not in scope for v1, planned for future releases:

- **Falcon cluster** — Real-time data from Raspberry Pi microservices
- **sangre-signal** — Claude AI stock risk analysis (EN/ES)
- **mcp_etrade** — E\*TRADE broker execution via MCP
- **IB headless gateway** — Interactive Brokers on Pi
- **Massive MCP** — Direct market data feed
- **Notion sync** — Trade journal published to Notion
- **colosseum** — Multi-agent playbook backtesting
- **falcon-messenger** — Alerts to Bluesky + Discord
