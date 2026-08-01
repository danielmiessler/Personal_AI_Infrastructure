# Setup — Pangram API Key

The **Detect** workflow (heuristic pattern audit) needs nothing. The **Score** workflow calls the Pangram AI-detection API and needs a key.

## 1. Get a key

Pangram is self-serve. Create an account or log in at `https://www.pangram.com/solutions/api`, open the **API** tab, and generate a key.

## 2. Add credits

Pangram bills prepaid credits. Purchases start at $5, and auto-refill keeps a balance topped up. Published rates:

| Mode | Rate | Limit |
|------|------|-------|
| Realtime checks (what this skill uses) | $0.05 / 1,000 words | 5 QPS |
| Bulk document scans | $0.04 / 1,000 words | 1,000 billable units |

A typical blog post runs a few cents. Batch comparisons multiply by the number of samples.

## 3. Store the key

The tool reads `PANGRAM_API_KEY` from the process environment first, then falls back to `~/.claude/.env`. Either works; the env file is the durable option.

**Option A — `~/.claude/.env` (recommended):**

```bash
echo 'PANGRAM_API_KEY=your-key-here' >> ~/.claude/.env
```

Unquoted or quoted both parse; surrounding quotes are stripped.

**Option B — shell environment:**

```bash
export PANGRAM_API_KEY=your-key-here
```

Never put the key in a URL, a committed file, a skill body, or a command that lands in shell history you sync. It belongs in the env file or the process environment and nowhere else.

## 4. Verify

Score a few hundred words you wrote yourself. Anything shorter is not a meaningful test of the setup *or* of the text.

```bash
bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts --file ~/some-writing-of-yours.md
```

Expected output shape:

```
Headline:   ...
Verdict:    ...
AI:         12.4%
AI-assisted:0.0%
Human:      87.6%
Segments:   0 AI / 0 assisted / 7 human

→ Lower AI% = reads more human.
```

Missing key exits 1 with `No PANGRAM_API_KEY found. Add it to ~/.claude/.env, then re-run.`

## The tool

`~/.claude/LIFEOS/TOOLS/PangramScore.ts` — shared, not skill-local, because more than this skill consumes it.

| Invocation | Effect |
|------------|--------|
| `bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts "text"` | Score inline text |
| `bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts --file path.md` | Score a file |
| `echo "text" \| bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts` | Score stdin — best for long passages |
| add `--json` | Raw API response for parsing |

It submits to `https://text.external-api.pangram.com/task` with an `x-api-key` header, then polls the task until `STAGE_SUCCESS` or `STAGE_FAILED` (60s ceiling). Override the endpoint with `PANGRAM_API_URL` if Pangram moves it.

Every run appends a record to `LIFEOS/MEMORY/OBSERVABILITY/pangram-runs.jsonl` — timestamp, a SHA-256 of the normalized text, character count, and the AI fraction. That is what makes "the detector actually ran on this text" a checkable claim rather than an assertion.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No PANGRAM_API_KEY found` | Key absent from both env and `~/.claude/.env` | Step 3 |
| HTTP 402 | Out of prepaid credits | Top up; this is not an auth failure — do not rotate the key |
| HTTP 429 | Rate limited (realtime caps at 5 QPS) | Space the calls out; run batches sequentially, never in parallel |
| HTTP 401 / 403 | Key wrong, revoked, or malformed | Regenerate in the API tab; check for a stray newline or quote in `.env` |
| `Pangram task did not complete: stage="…"`, exit 1 | The task never reached `STAGE_SUCCESS` within 60s | Re-run. This is the tool failing closed on purpose: an incomplete task yields no score and no run record, so it can never be mistaken for a measurement |
| 100% AI on text you know a human wrote | Sample too short — the documented failure mode | Score a few hundred words, and calibrate against a known-human baseline |

Rate limits and credit costs come from Pangram's published API page and can change. Treat the numbers above as last-verified, not permanent.
