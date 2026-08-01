# Score — Empirical AI-Detection (Pangram)

Run text through the Pangram detection model and report a real probability. This is the measurement half of the skill: `Detect` guesses from a pattern catalog, `Score` asks a trained detector.

Requires `PANGRAM_API_KEY`. If it isn't configured, say so and point at `Setup.md` rather than falling back to a heuristic guess and presenting it as a score.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Score in DetectAI to measure AI-detectability with Pangram"}' \
  > /dev/null 2>&1 &
```

Running **Score** in **DetectAI**...

## The Tool

Already built and shared — do not rebuild it or reimplement the API call inline.

```
~/.claude/LIFEOS/TOOLS/PangramScore.ts
```

| User intent | Invocation |
|-------------|------------|
| Score text pasted into the conversation | `bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts "text"` |
| Score a file | `bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts --file path.md` |
| Score a long passage (safest — no shell quoting to mangle) | `echo "text" \| bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts` |
| Need the raw numbers to build a table | add `--json` |

Output: headline verdict, `AI%` / `AI-assisted%` / `Human%`, segment counts. **Lower AI% = reads more human.**

Calls bill against prepaid credits (about $0.05 per 1,000 words) and poll an async task. Run them sequentially — the realtime endpoint caps at 5 QPS and parallel batches trip 429.

## Modes

### Single score

One passage, one call. Report the AI% plainly, with the verdict and segment counts. If the sample is under ~5 sentences, state that the number is unreliable at that length before reporting it — not after.

### Batch compare

Several samples, ranked. The point is the relative ordering, not any single number:

```
| Sample  | AI%  | Verdict      |
|---------|------|--------------|
| draft-C |  12% | Likely human |
| draft-A |  64% | Mixed        |
| draft-B | 100% | AI generated |
```

### Calibrated baseline (the honest mode)

A bare AI% has nothing to be read against. Score 2-3 passages of writing known to be human — ideally by the same author, in the same genre and length — in the same batch as the text under test.

Read the result as a gap, not an absolute:

- Baseline low, test high → the gap is real signal.
- Baseline also high → the detector is saturating on the genre and length. The test score means very little, and reporting it as a finding would be wrong.

Use this mode whenever the answer will inform a decision about a person's writing, and whenever someone asks whether a rewrite actually helped.

## Reporting Contract

Every report states, alongside the number:

- The sample length, and the short-sample caveat if it applies.
- Whether a human baseline was scored, and what it came out at.
- That this is one detector with real false-positive rates — a strong signal, not a verdict.

Never present a Pangram score as proof that a named person used AI. The false-positive rate is real, the failure mode is accusing a human, and no number in this workflow justifies that claim.

## Verification

Each **completed** run appends to `LIFEOS/MEMORY/OBSERVABILITY/pangram-runs.jsonl` with a SHA-256 of the normalized text. A claim that the detector ran on a specific piece of text is checkable against that record — which is the difference between "scored" and "said it scored."

A task that never reaches `STAGE_SUCCESS` writes no record and exits non-zero, so a stalled request can never masquerade as a measurement. If the tool exits 1, there is no score — re-run rather than reporting anything.
