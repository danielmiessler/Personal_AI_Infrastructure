# QueryMarket

## Ideal State

The answer resolves the requested cybersecurity-market question with the fewest sufficient live calls, preserves provider metadata, and makes it impossible to confuse observed records with computed analysis.

## Deterministic Tool Contract

- Confirm that `signal-mcp` is configured and authenticated. If interactive OAuth is incomplete, stop honestly before querying; provide the relevant setup command and do not claim success.

- For unfamiliar category or geography filters, discover valid values with `list_categories` and/or `list_countries`.

- Check `get_data_status` so coverage and freshness are known before interpreting results.

- Choose the smallest set of calls that can answer the request. Inspect each tool's live schema before calling it and never infer argument names from memory or examples.

- Preserve returned freshness, quota, and request metadata. Distinguish source records from heuristics, forecasts, scores, and other analytical outputs.

- Load `../References/ToolCatalog.md` when tool or tier selection is needed. Prefer MCP; use its documented REST fallback only when `ROS_API_KEY` exists.

## Required Output

- **Scope:** entities, taxonomy, geography, and time window used.

- **Observed:** facts present in provider records.

- **Analytical:** heuristics, forecasts, scores, comparisons, and interpretations, clearly labeled.

- **Freshness:** provider status and relevant response freshness metadata.

- **Caveats:** missing, undisclosed, ambiguous, or access-limited data; never fill gaps by implication.

- **Tools:** tool names used, plus quota information when returned.

The deliverable fails if OAuth was not completed, live schemas were guessed, evidence and analysis are blended, or freshness/quota metadata is silently dropped.

