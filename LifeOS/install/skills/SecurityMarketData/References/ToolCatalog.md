# Tool Catalog

Tool names and availability can change. Discover live schemas through MCP; this catalog intentionally contains no argument schemas.

## Free

| Tool | Tier | Purpose |
|---|---|---|
| `search_companies` | Free | Search cybersecurity companies. |
| `enrich_company` | Free | Retrieve an enriched company record. |
| `get_market_overview` | Free | Summarize the cybersecurity market. |
| `get_category_momentum` | Free | Retrieve category momentum metrics. |
| `get_investor_centrality` | Free | Measure investor network centrality. |
| `get_investor_tiers` | Free | Retrieve investor tier classifications. |
| `get_data_status` | Free | Check dataset status, coverage, and freshness. |
| `list_categories` | Free | List supported taxonomy categories. |
| `list_countries` | Free | List supported country filters. |
| `get_entity_transitions` | Free | Retrieve entity lifecycle transitions. |
| `get_company_ipo` | Free | Retrieve company IPO information. |
| `get_company_public_lifecycle` | Free | Retrieve public-company lifecycle events. |

## Pro

| Tool | Tier | Purpose |
|---|---|---|
| `search_investors` | Pro | Search investors. |
| `get_investor_portfolio` | Pro | Retrieve an investor's portfolio. |
| `get_funding_rounds` | Pro | Retrieve funding-round records. |
| `get_ma_activity` | Pro | Retrieve merger and acquisition activity. |
| `find_connections` | Pro | Find relationships between market entities. |
| `suggest_acquirers` | Pro | Generate analytical acquirer suggestions. |
| `search_growth_signals` | Pro | Search company growth signals. |
| `get_funding_timeseries` | Pro | Retrieve funding over time. |
| `compare_periods` | Pro | Compare market periods. |
| `forecast_funding` | Pro | Generate an analytical funding forecast. |
| `get_valuation_trends` | Pro | Retrieve valuation trends. |
| `get_round_velocity` | Pro | Measure funding-round velocity. |
| `category_consolidation_signals` | Pro | Retrieve analytical category-consolidation signals. |
| `get_acquirer_empire` | Pro | Map an acquirer's portfolio of acquisitions. |
| `find_similar_companies` | Pro | Find comparable cybersecurity companies. |
| `get_cross_border_flows` | Pro | Retrieve cross-border capital or deal flows. |
| `get_company_partnerships` | Pro | Retrieve company partnerships. |
| `compare_partnership_overlap` | Pro | Compare partnership overlap. |
| `find_partnership_cohort` | Pro | Find companies sharing partnership patterns. |
| `get_company_layoffs` | Pro | Retrieve company layoff records. |
| `get_company_shutdown` | Pro | Retrieve company shutdown records. |

## Enterprise

| Tool | Tier | Purpose |
|---|---|---|
| `reconcile_companies` | Enterprise | Reconcile company identities and records. |

## Methodology

The dataset curates global cybersecurity funding, M&A, layoffs, shutdowns, and public-company lifecycle events from press releases, SEC filings, company announcements, and verified reporting. It does not use paywalled databases or aggregators.

Its proprietary taxonomy separates category domains from product categories and supplements them with metadata tags.

## REST Fallback

- Base: `https://signal.returnonsecurity.com`
- Surface: 18 read-only `GET /api/v2/*` endpoints
- Authentication: HTTP Bearer authentication sourced from the ROS_API_KEY environment variable.
- Metadata: preserve `X-Data-Freshness`, quota, and request-ID headers
- Access: Pro/Team add-on or Enterprise

Use REST only when `ROS_API_KEY` exists. Do not scrape when MCP or REST is available, and never expose the key.

## Sources

- https://mcp.returnonsecurity.com/
- https://mcp.returnonsecurity.com/mcp
- https://docs.returnonsecurity.com/
- https://docs.returnonsecurity.com/reference/
- https://www.returnonsecurity.com/data-methodology
- https://signal.returnonsecurity.com/
