---
name: SecurityMarketData
version: 1.0.0
description: Query curated cybersecurity market and company intelligence. USE WHEN security market data OR cybersecurity funding OR cyber M&A OR security-company/investor research OR market maps OR deal activity OR Return on Security OR The Signal. NOT FOR vulnerability research, security news, or investment advice.
---

# SecurityMarketData

Query Return on Security's Signal data through its live MCP interface, with evidence, freshness, and analytical boundaries intact.

## Customization

Before executing, check `~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/SecurityMarketData/`. If present, load enabled preferences and configuration; otherwise use these defaults.

## Voice Notification

When executing **QueryMarket**, run:

```bash
curl -s -X POST http://localhost:31337/notify -H 'Content-Type: application/json' -d '{"message":"Running the QueryMarket workflow in the SecurityMarketData skill to query cybersecurity market data"}' > /dev/null 2>&1 &
```

Output: Running the **QueryMarket** workflow in the **SecurityMarketData** skill to query cybersecurity market data...

## Workflow Routing

| Workflow | Trigger | File |
|---|---|---|
| **QueryMarket** | Any supported market, company, investor, funding, M&A, or lifecycle query | `Workflows/QueryMarket.md` |

Load `References/ToolCatalog.md` only when selecting tools, confirming tiers, or using the REST fallback. Do not preload it for routing.

## Setup and Diagnostics

Prefer Streamable HTTP MCP. For Hermes:

```bash
hermes mcp add signal-mcp --url https://mcp.returnonsecurity.com/mcp
hermes mcp list
```

OAuth 2.1 authorization is interactive. It cannot be bypassed, automated away, or claimed complete before the user finishes it.

Optional vendor examples:

```bash
claude mcp add signal-mcp https://mcp.returnonsecurity.com/mcp
claude mcp list
codex mcp add signal-mcp https://mcp.returnonsecurity.com/mcp
codex mcp login signal-mcp
```

## Examples

- **Funding trend:** “Show quarterly funding trends for cloud security and distinguish observed rounds from forecasts.”

- **Company enrichment:** “Enrich this security company and report its category, funding, investors, lifecycle, and data freshness.”

- **Category M&A:** “Map identity-security M&A activity, acquirers, and observed consolidation signals for the last three years.”

## Gotchas

- Prefer Streamable HTTP MCP with OAuth 2.1. Tokens last 24 hours; never report authentication as complete until the interactive OAuth flow succeeds.

- Free access provides 180 calls/day and 12 tools; Pro adds 21 tools; Enterprise adds one. Preserve and report returned quota information.

- Discover live schemas and never guess arguments. For unfamiliar filters, begin with `list_categories` and/or `list_countries`; check `get_data_status` before substantive queries.

- Preserve and report freshness. Never imply values the data does not disclose.

- The proprietary taxonomy has two layers: category domains and product categories, with metadata tags. Do not flatten them into an invented taxonomy.

- Separate observed records from heuristics and forecasts. Explicitly label `suggest_acquirers`, `forecast_funding`, `exit_score`, and consolidation or growth scores as analytical outputs rather than observed facts.

- Do not scrape when MCP or REST is available. Use REST only when `ROS_API_KEY` exists; never request or expose its value.
