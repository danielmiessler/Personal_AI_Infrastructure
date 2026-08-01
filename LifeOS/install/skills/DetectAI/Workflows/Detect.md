# Detect — Heuristic AI-Pattern Audit

Flag the AI tells in a piece of text and explain each one. No edits, no API calls, no cost.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Detect in DetectAI to audit text for AI writing patterns"}' \
  > /dev/null 2>&1 &
```

Running **Detect** in **DetectAI**...

## Reference

Read `~/.claude/LIFEOS/DOCUMENTATION/Writing/AIWritingPatterns.md` before auditing. It holds the severity tiers (P0/P1/P2), the full word-replacement tables, the pattern categories, and the context tolerance matrix. Auditing from memory produces a shallower, less consistent report than auditing against the catalog.

## Ideal State

A finished audit is one where:

- Every flag quotes the offending text, so the writer can find it.
- Every flag names its pattern category and severity tier.
- Every flag is marked **clear problem** or **judgment call**. Some AI-associated patterns are effective writing, and a report that demands all of them be fixed is worse than useless — it trains the writer to ignore the tool.
- The context profile is stated up front (blog, LinkedIn, newsletter, documentation, fiction). Tolerance differs by venue; the same em-dash density that's fine in an essay is a flag in a LinkedIn post.
- Nothing is rewritten. This workflow reports.

## Output Format

```
**Profile:** [detected profile] | **Severity pass:** [P0+P1 / full]

**P0 — Credibility killers:**
- "[offending text]" — [category] — MUST FIX

**P1 — Obvious AI smell:**
- "[offending text]" — [category] — [clear problem / judgment call]

**P2 — Stylistic polish:**
- "[offending text]" — [category] — [clear problem / fine in context]

**Assessment:**
[clean / minor issues / needs rewrite] — [one or two sentences on which flags are real vs intentional]
```

## Recommending a Rewrite

When the text has 5+ flagged vocabulary hits across multiple categories, 3+ distinct pattern categories triggered, and uniform sentence and paragraph length, say so — patching a text in that state produces cleaner AI writing, not human writing. The honest recommendation is to state the core point in one sentence and rebuild.

## Pairing With Score

The heuristic explains, the empirical measures. Text that clears this audit but still scores 100% AI in `Score` has structural tells the word list cannot see — uniform rhythm, uniform paragraph length, absent specificity. That gap is the most informative result this skill produces, so run both when a key is configured.
