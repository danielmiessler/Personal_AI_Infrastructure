# Amber · Search (Resurface)

Find ideas already caught in Amber. Resurface is the other half of preservation — an idea never dug back out is a write-only archive.

## Input

A query (topic, phrase, partial words), optionally scoped by recency, source, content_kind, or routed-status.

## Steps

1. **Recall from the ledger.** `hindsight_recall` with the query, filtered to `cat:amber`. Amber captures are tagged `source:amber_capture`; promoted rows may also carry `cat:knowledge`.

2. **Apply requested filters** over the recalled set:
   - recency — "last week", "since May", a date — bound the `captured_at` window.
   - `source:{id}` — a specific input.
   - `content_kind:{kind}` — articles vs videos vs notes.
   - routed status — `routed:true` (already fanned out) vs unrouted (still in the triage queue).

3. **Rank** by relevance × recency; newest first on ties.

4. **Present** each result compactly:
   - title (or first line of content) · `content_kind` · `captured_at` (relative) · `source` · routed marker (`→ routed` / `· unrouted`) · the capture URL or a snippet.

5. **Offer the next step** when useful: route an unrouted hit (→ Route workflow), or promote a strong recurring idea into a curated Knowledge entry.

## Output

A ranked, reverse-chron list. If nothing matches: state so plainly and suggest a broader query — never fabricate a result.
