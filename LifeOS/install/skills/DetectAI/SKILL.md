---
name: DetectAI
version: 1.0.0
description: "Detects AI-generated writing two ways — a heuristic audit against a catalog of known AI writing patterns, and an empirical detection score from the Pangram API, calibrated against known-human baselines so the number means something. USE WHEN detect AI writing, is this AI, AI detection, AI detector, did an AI write this, check if this is AI generated, does this sound like AI, AI writing score, score for AI, pangram, scan for AI tells, flag AI patterns, AI-isms, how AI does this read, is this AI-detectable, compare drafts for AI-ness, human baseline. NOT FOR rewriting prose to strip AI patterns (a voice and authoring task), plagiarism detection, detecting AI-generated images/video/code, or judging whether writing is any good."
---

# DetectAI

## What It Does

Answers one question — *how much does this text read as machine-generated?* — with two independent measures:

- **Heuristic audit.** Flags known AI tells (inflated vocabulary, the "not X, it's Y" tic, recycled transitions, uniform rhythm) against a severity-tiered pattern catalog. Free, instant, and it explains *why* each flag fired.
- **Empirical score.** Runs the text through the Pangram detection model and returns a real probability — AI% / AI-assisted% / human% — plus per-segment counts. Costs money, needs an API key, and doesn't care what your word list says.

The two disagree often, and that disagreement is the useful part. Text can clear every pattern on the list and still score 100% AI, which tells you the tells are structural, not lexical.

## The Problem

"Does this sound like AI?" gets answered by vibes, and vibes are wrong in both directions. Heuristic word-lists flag legitimate writing and miss AI text that avoided the obvious words. Detector scores look authoritative but saturate — Pangram will confidently call a short *human* paragraph 100% AI. Neither measure alone is trustworthy, and a raw number with no baseline is close to meaningless.

This skill runs both, and anchors the empirical score against known-human writing so the number has something to be read against.

## Setup — Pangram API key (required for scoring)

The heuristic audit works with no setup. The empirical score needs a key.

1. Create an account or log in at [pangram.com](https://www.pangram.com/solutions/api), open the **API** tab, and generate a key.
2. Add prepaid credits (from $5, or enable auto-refill). Realtime checks bill about **$0.05 per 1,000 words**.
3. Put the key in `~/.claude/.env`:
   ```
   PANGRAM_API_KEY=your-key-here
   ```
4. Verify:
   ```bash
   bun ~/.claude/LIFEOS/TOOLS/PangramScore.ts --file <a-file-you-wrote.md>
   ```

Full setup, alternatives, and troubleshooting (402/429 handling, endpoint override, key precedence): `Setup.md`.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Detect** | "scan for AI tells", "flag AI patterns", "does this sound like AI", "audit this for AI-isms" — heuristic, no key needed | `Workflows/Detect.md` |
| **Score** | "score this for AI", "is this AI generated", "AI detection score", "pangram", "compare these drafts" — empirical, needs key | `Workflows/Score.md` |

Asked simply "is this AI?" with a key configured, run both and report them side by side — the heuristic explains, the score measures.

## Gotchas

- **Short samples are unreliable.** Detectors are weakest under ~5 sentences. Pangram leans toward decisive 100/0 calls and will flag a short human paragraph as 100% AI. Verified in testing: a plain-voice human paragraph and deliberate AI slop both scored 100% at roughly four sentences each. Score passages of a few hundred words or don't bother.
- **An absolute score without a baseline says little.** Score known-human writing in the same batch. If the human baseline also maxes out, the detector is saturating on the genre and length, not on the text. The A-vs-B comparison is the trustworthy part.
- **It measures detectability, not quality.** A low AI% means "reads human," not "reads well."
- **One detector is not ground truth.** Pangram is among the strongest available and still has real false-positive rates. Report it as a strong signal, never a verdict — and never accuse a person of AI authorship on one score.
- **Every call bills and polls.** The API is async (submit, then poll to `STAGE_SUCCESS`). Don't loop it on trivial snippets; batch comparisons run sequentially, one call each.
- **HTTP 402 means out of credits, not a bad key.** 429 means rate limited — realtime checks cap at 5 QPS. Neither is an auth failure; don't rotate the key over them.
- **Never degrade writing to beat a detector.** Injected typos, broken sentences, and "humanizer" laundering damage the prose and don't fix the underlying problem. If text must read human, the fix is a human in the loop.

## Examples

- "Scan this post for AI tells, don't change it" → **Detect**: tiered P0/P1/P2 flag report, each marked clear-problem vs judgment-call, no edits.
- "Is this AI generated?" → **Score**: single Pangram run, headline verdict plus AI/AI-assisted/human percentages, with the length caveat stated if the sample is short.
- "Which of these three drafts reads most human?" → **Score** in batch-compare mode: one call per draft, ranked table, relative comparison foregrounded over absolute numbers.
- "Did my rewrite actually help?" → **Score** before and after, with two known-human passages scored in the same batch as calibration.

## Execution Log

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"DetectAI","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```
