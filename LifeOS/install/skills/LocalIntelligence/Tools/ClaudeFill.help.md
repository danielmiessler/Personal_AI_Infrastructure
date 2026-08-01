# ClaudeFill.ts

AI gap-filler for digest sections the deterministic fetchers couldn't populate. Not a CLI — imported by `Refresh.ts` when it runs with `--fill`.

## What it does

- Finds every section with `source_status != "ok"` or zero items.
- Spawns ONE `claude --print` subprocess (default model `sonnet`) with `WebSearch,WebFetch` enabled and asks for real, sourced items for all empty sections in a single pass.
- Runs deterministic validation on the output (required fields, `https?://` URL shape, item cap) — invalid items are dropped, never persisted.
- Returns a new digest; fetcher sections that already had items are never overwritten.

## Billing / safety

Mirrors `LIFEOS/TOOLS/Inference.ts`: strips `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` (subscription OAuth billing), unsets `CLAUDECODE` (nested-session guard). Timeout defaults to 8 minutes.

## Failure mode

Any subprocess or parse error returns the original digest untouched with the error recorded in `meta.errors` — the fill can only add, never blank.
