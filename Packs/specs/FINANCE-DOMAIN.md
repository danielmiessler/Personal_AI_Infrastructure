# Finance Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 7 (Personal Skills)

---

## Overview

The Finance Domain provides personal finance education, investment analysis workflows, and multi-agent collaboration for financial decision-making. Unlike infrastructure domains (Secrets, Network, CI/CD), this is a **knowledge-skill domain** that provides workflows and educational content rather than vendor abstraction.

### Goals
- Consolidate 14 existing finance skills into a cohesive pack structure
- Provide comprehensive investment analysis workflows
- Enable multi-agent financial discussions (standup mode)
- Support CLI tools for data fetching and portfolio tracking
- Maintain educational knowledge bases for personal finance

### Non-Goals
- Vendor abstraction (no adapter layer needed)
- External API abstraction (data sources used directly)
- Automated trading execution (analysis only, human oversight required)
- Real-time data feeds (uses free-tier APIs)

### Design Decisions

**Why Not Use Core → Adapter → Skill Pattern?**

The finance domain differs fundamentally from infrastructure domains:

1. **No vendor portability needed** - There's no "swap yfinance for Bloomberg" use case
2. **Knowledge-focused** - Most skills are educational frameworks and methodologies
3. **Single user** - This is Joey's personal finance system, not multi-tenant
4. **Direct API usage** - Data sources (yfinance, SEC EDGAR) are used directly in tools

The simpler **Skill Pack** pattern is more appropriate: a single pack containing related skills, tools, and knowledge bases.

**Why One Pack vs Multiple?**

Options considered:
1. `joey-finance` - Single monolithic pack (all 14 skills)
2. Separate packs: `joey-personal-finance`, `joey-investment-analysis`
3. Skill-per-pack: 14 individual packs

**Chosen: Hybrid approach**

- `joey-finance-core` - Shared tools, agents, and types
- `joey-finance-skill` - All 14 skills unified with orchestration

This mirrors how the Finance skill already orchestrates sub-skills. The orchestrator pattern is proven and avoids dependency complexity.

---

## Pack Structure

```
joey-finance-core/           # Shared tools, data fetching, types
joey-finance-skill/          # All 14 skills unified
```

**Note**: This domain does NOT use the adapter pattern. Data sources are accessed directly via tools in the core pack.

---

## joey-finance-core

### Purpose
Provides shared utilities for financial data fetching, portfolio tracking, and common types used across all finance skills.

### Directory Structure

```
joey-finance-core/
├── README.md
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── types/
│   │   ├── index.ts
│   │   ├── Stock.ts                # Stock/ticker types
│   │   ├── Portfolio.ts            # Portfolio types
│   │   ├── Analysis.ts             # Analysis result types
│   │   └── Score.ts                # Scoring system types
│   ├── data/
│   │   ├── YFinanceClient.ts       # Yahoo Finance wrapper
│   │   ├── SECClient.ts            # SEC EDGAR API
│   │   ├── FREDClient.ts           # Economic data
│   │   └── CoinGeckoClient.ts      # Crypto data
│   ├── tools/
│   │   ├── DataFetch.ts            # Unified data fetching
│   │   ├── Portfolio.ts            # Portfolio tracking
│   │   ├── Backtest.ts             # Strategy backtesting
│   │   ├── Watchlist.ts            # Watchlist management
│   │   ├── StockScorecard.ts       # Stock scoring
│   │   └── DecisionJournal.ts      # Trading decisions log
│   ├── agents/                     # Agent persona definitions
│   │   ├── index.ts
│   │   ├── investment/             # Investment analysis agents
│   │   │   ├── Quentin.ts          # Quantitative analyst
│   │   │   ├── Warren.ts           # Fundamental analyst
│   │   │   ├── Sage.ts             # Sentiment analyst
│   │   │   ├── Marcus.ts           # Macro strategist
│   │   │   ├── Prudence.ts         # Risk manager
│   │   │   ├── Nova.ts             # AI trading strategist
│   │   │   └── Satoshi.ts          # Crypto analyst
│   │   └── personal/               # Personal finance agents
│   │       ├── Taxley.ts           # Tax strategist
│   │       ├── Reginald.ts         # Real estate analyst
│   │       ├── Penelope.ts         # Personal finance advisor
│   │       ├── Victor.ts           # Retirement planner
│   │       └── Estelle.ts          # Estate planner
│   └── utils/
│       ├── formatters.ts           # Number/currency formatting
│       ├── calculations.ts         # Financial calculations
│       └── indicators.ts           # Technical indicators
└── tests/
    ├── DataFetch.test.ts
    ├── Portfolio.test.ts
    └── fixtures.ts
```

### Type Definitions

```typescript
// src/types/Stock.ts

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  eps?: number;
  dividend?: number;
  lastUpdated: Date;
}

export interface Financials {
  revenue: number;
  revenueGrowth: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  eps: number;
  epsGrowth: number;
  fcf: number;
  fcfYield: number;
  roe: number;
  roic: number;
  debtToEquity: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
}
```

```typescript
// src/types/Portfolio.ts

export interface Position {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  weight: number;
  sector?: string;
}

export interface Portfolio {
  positions: Position[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cash: number;
  lastUpdated: Date;
}
```

```typescript
// src/types/Score.ts

export interface AnalysisScore {
  overall: number;        // 0-100
  fundamental: number;    // 0-35
  valuation: number;      // 0-15
  technical: number;      // 0-15
  sentiment: number;      // 0-15
  risk: number;           // 0-20 (starts at 20, deductions)
}

export type Rating = 'STRONG_BUY' | 'BUY' | 'WATCH' | 'HOLD' | 'AVOID';

export interface AnalysisResult {
  symbol: string;
  score: AnalysisScore;
  rating: Rating;
  tenBaggerPotential: boolean;
  thesis: string;
  bullCase: string[];
  bearCase: string[];
  catalysts: Array<{ date: string; event: string }>;
  entryZone: { low: number; high: number };
  stopLoss: number;
  generatedAt: Date;
  dataSources: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### Agent Definitions

```typescript
// src/agents/investment/Quentin.ts

export const Quentin: AgentProfile = {
  name: 'Quentin',
  role: 'Quantitative Analyst',
  emoji: '📊',
  domain: 'investment',
  expertise: [
    'Technical analysis',
    'Backtesting',
    'Statistical patterns',
    'Options analytics',
    'Algorithmic strategies'
  ],
  perspective: `
    Approaches markets through data and statistics. Skeptical of narratives
    without quantitative support. Focuses on risk-adjusted returns, not
    absolute returns. Believes price action contains information that
    fundamentals miss.
  `,
  biases: [
    'May dismiss qualitative factors',
    'Over-reliance on historical patterns',
    'Skeptical of disruptive innovation'
  ],
  triggers: [
    'technical analysis',
    'backtest',
    'RSI',
    'MACD',
    'moving average',
    'options',
    'volatility'
  ]
};
```

### Data Sources (Free Tier)

| Source | Client | Data Type | Rate Limit |
|--------|--------|-----------|------------|
| Yahoo Finance | YFinanceClient | Quotes, financials, options | Unlimited |
| SEC EDGAR | SECClient | 10-K, 10-Q, 8-K filings | Unlimited |
| FRED | FREDClient | Economic indicators | 120/min |
| CoinGecko | CoinGeckoClient | Crypto prices, market data | 10-50/min |
| Finnhub | (optional) | Real-time, news | 60/min |

---

## joey-finance-skill

### Purpose
Provides all 14 finance skills as a unified skill pack with intelligent routing and orchestration.

### Directory Structure

```
joey-finance-skill/
├── README.md
├── SKILL.md                        # Main skill definition (orchestrator)
├── VERIFY.md
├── package.json
├── Skills/                         # Sub-skill definitions
│   ├── PersonalFinance/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── budgeting.md
│   │       ├── debt-payoff.md
│   │       └── emergency-fund.md
│   ├── EstatePlanning/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── wills.md
│   │       ├── trusts.md
│   │       └── beneficiaries.md
│   ├── RetirementPlanning/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── accounts.md
│   │       ├── social-security.md
│   │       └── fire.md
│   ├── RealEstateInvesting/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── metrics.md
│   │       └── reits.md
│   ├── TaxStrategy/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── tax-loss-harvesting.md
│   │       └── asset-location.md
│   ├── FundamentalAnalysis/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── valuation.md
│   │       └── moat.md
│   ├── QuantAnalysis/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── indicators.md
│   │       └── strategies.md
│   ├── MacroStrategy/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── cycles.md
│   │       └── sectors.md
│   ├── CryptoAnalysis/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── on-chain.md
│   │       └── correlations.md
│   ├── SentimentAnalysis/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── sources.md
│   │       └── contrarian.md
│   ├── DeepStockAnalysis/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       └── scoring-system.md
│   ├── AITrading/
│   │   ├── SKILL.md
│   │   └── knowledge/
│   │       ├── prompts.md
│   │       └── rag.md
│   └── RiskManagement/
│       ├── SKILL.md
│       └── knowledge/
│           ├── position-sizing.md
│           └── hedging.md
├── Workflows/                      # Orchestrated workflows
│   ├── StockAnalysis.md            # Comprehensive stock analysis
│   ├── PortfolioReview.md          # Portfolio health check
│   ├── InvestmentDecision.md       # Buy/sell decision framework
│   ├── FinancialStandup.md         # Multi-agent discussion
│   ├── QuarterlyReview.md          # Periodic checkup
│   └── CompanyResearch.md          # Deep dive research
└── Templates/
    ├── stock-report.md
    ├── portfolio-scorecard.md
    └── decision-journal-entry.md
```

### Main SKILL.md (Orchestrator)

```yaml
---
name: Finance
description: Comprehensive financial analysis and personal finance orchestrator. USE WHEN user asks about stocks, investments, portfolio, taxes, real estate, retirement, budgeting, crypto, trading strategies, financial planning, or any money-related topic.
---

# Finance Skill

Your complete financial team in one skill. Orchestrates specialized analysis
and coordinates multi-agent discussions for comprehensive investment decisions.

## Sub-Skill Routing

Based on user query, route to the appropriate sub-skill:

| Domain | Sub-Skill | Keywords |
|--------|-----------|----------|
| Personal Finance | PersonalFinance | budget, savings, debt, emergency fund |
| Estate | EstatePlanning | will, trust, beneficiary, estate |
| Retirement | RetirementPlanning | 401k, IRA, Social Security, FIRE |
| Real Estate | RealEstateInvesting | property, REIT, rental, mortgage |
| Tax | TaxStrategy | tax, harvest, capital gains, Roth |
| Fundamentals | FundamentalAnalysis | valuation, DCF, moat, earnings |
| Technicals | QuantAnalysis | RSI, MACD, backtest, options |
| Macro | MacroStrategy | economy, Fed, sector, cycle |
| Crypto | CryptoAnalysis | Bitcoin, on-chain, DeFi |
| Sentiment | SentimentAnalysis | news, Reddit, sentiment |
| Deep Dive | DeepStockAnalysis | deep analysis, 10-bagger |
| AI | AITrading | AI trading, LLM, RAG |
| Risk | RiskManagement | position size, hedge, VaR |

## Orchestrated Workflows

| Workflow | Trigger | Sub-Skills Used |
|----------|---------|-----------------|
| StockAnalysis | "analyze [TICKER]" | Fundamental, Quant, Sentiment, Macro, Risk |
| PortfolioReview | "review portfolio" | Risk, Tax, all analysis skills |
| InvestmentDecision | "should I buy/sell" | All relevant + Risk |
| FinancialStandup | "financial standup" | Multi-agent with all personas |
| QuarterlyReview | "quarterly review" | All personal finance skills |
| CompanyResearch | "find companies in [sector]" | Macro, Fundamental, Research |

## Multi-Agent Mode

When user requests a "standup" or "team discussion", activate agent personas:

### Investment Team
- Quentin (📊) - Quantitative analysis
- Warren (💼) - Fundamental analysis
- Sage (📰) - Sentiment analysis
- Marcus (🌍) - Macro strategy
- Prudence (🛡️) - Risk management
- Nova (🤖) - AI/automation
- Satoshi (₿) - Crypto analysis

### Personal Finance Team
- Taxley (🧾) - Tax strategy
- Reginald (🏠) - Real estate
- Penelope (💰) - Personal finance
- Victor (🎯) - Retirement
- Estelle (📜) - Estate planning

## CLI Tools

```bash
# Fetch stock data
bun run --cwd joey-finance-core src/tools/DataFetch.ts AAPL

# Portfolio tracking
bun run --cwd joey-finance-core src/tools/Portfolio.ts --summary

# Stock scorecard
bun run --cwd joey-finance-core src/tools/StockScorecard.ts NVDA

# Backtest strategy
bun run --cwd joey-finance-core src/tools/Backtest.ts --strategy momentum --ticker SPY
```

## Important Disclaimer

This skill provides analysis tools and educational information only.
It does NOT provide financial, tax, or legal advice.
All investment decisions should be made in consultation with qualified professionals.
Past performance does not guarantee future results.
You could lose money investing.
```

---

## Migration Plan

### Phase 1: Core Pack (joey-finance-core)

1. Create package structure
2. Copy existing tools from `Finance/tools/`:
   - DataFetch.ts
   - Portfolio.ts
   - Backtest.ts
   - Watchlist.ts
   - StockScorecard.ts
   - DecisionJournal.ts
3. Create type definitions
4. Copy agent definitions from `Finance/agents/`
5. Add data source clients
6. Write tests
7. Verify with VERIFY.md

### Phase 2: Skill Pack (joey-finance-skill)

1. Create package structure
2. Create main SKILL.md (orchestrator)
3. Copy each sub-skill's SKILL.md to `Skills/{Name}/SKILL.md`
4. Extract knowledge content to `knowledge/` directories
5. Create orchestrated workflows
6. Create output templates
7. Write integration tests
8. Verify with VERIFY.md

### Phase 3: Integration

1. Update providers.yaml to reference new packs
2. Test all skill triggers work
3. Test multi-agent standup mode
4. Test CLI tools
5. Document migration from old skills
6. Clean up old skill directories

---

## File Mapping

| Old Location | New Location |
|--------------|--------------|
| `Finance/SKILL.md` | `joey-finance-skill/SKILL.md` |
| `Finance/tools/*.ts` | `joey-finance-core/src/tools/*.ts` |
| `Finance/agents/*.md` | `joey-finance-core/src/agents/*.ts` |
| `Finance/workflows/*.md` | `joey-finance-skill/Workflows/*.md` |
| `PersonalFinance/SKILL.md` | `joey-finance-skill/Skills/PersonalFinance/SKILL.md` |
| `EstatePlanning/SKILL.md` | `joey-finance-skill/Skills/EstatePlanning/SKILL.md` |
| ... (13 more) | ... |

---

## Implementation Checklist

### Phase 7.1: joey-finance-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define type interfaces in src/types/
- [ ] Migrate tools from Finance/tools/
- [ ] Create data source clients (YFinance, SEC, FRED, CoinGecko)
- [ ] Migrate agent definitions from Finance/agents/
- [ ] Create utility functions (formatters, calculations, indicators)
- [ ] Write unit tests
- [ ] Create VERIFY.md

### Phase 7.2: joey-finance-skill
- [ ] Create package structure
- [ ] Create main SKILL.md (orchestrator)
- [ ] Create Skills/ directory structure (14 sub-skills)
- [ ] Migrate each SKILL.md content
- [ ] Extract knowledge to knowledge/ directories
- [ ] Create Workflows/ from Finance/workflows/
- [ ] Create Templates/
- [ ] Write integration tests
- [ ] Create VERIFY.md

### Phase 7.3: Integration Testing
- [ ] Test skill triggers for each sub-skill
- [ ] Test orchestrated workflows
- [ ] Test multi-agent standup mode
- [ ] Test CLI tools
- [ ] Verify data fetching works
- [ ] Document usage examples

### Phase 7.4: Cleanup
- [ ] Update SESSION-CONTEXT.md
- [ ] Update SKILL-CATALOG.md
- [ ] Remove old skill directories
- [ ] Update any references in other packs

---

## Data Sources

### Free Tier APIs Used

| Source | Purpose | Authentication |
|--------|---------|----------------|
| Yahoo Finance (yfinance) | Quotes, fundamentals, options | None |
| SEC EDGAR | Company filings | None |
| FRED | Economic indicators | API key (free) |
| CoinGecko | Crypto data | None (rate limited) |
| Finnhub | Real-time news (optional) | API key (free tier) |
| OpenInsider | Insider transactions | None (web scraping) |

### API Key Storage

If API keys are needed, use the standard PAI auth pattern:

```yaml
# providers.yaml
domains:
  finance:
    data_sources:
      fred:
        auth:
          type: keychain
          service: fred-api-key
      finnhub:
        auth:
          type: keychain
          service: finnhub-api-key
```

---

## Security Considerations

1. **No Account Access**: Tools analyze data but never execute trades
2. **No Credential Storage**: API keys use keychain, not inline
3. **Disclaimer Required**: All outputs include investment disclaimer
4. **Audit Logging**: Track all analysis requests
5. **No PII in Logs**: Portfolio data stays local

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Domain template
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference for API key handling

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
- Designed hybrid core + skill pack structure
- Mapped all 14 existing skills
- Defined migration plan
