# Teach Workflow

Run an interactive, voice-narrated tutorial on the current topic. The session is a dialogue the learner drives by answering; it is done when the ideas have been talked through, not when the material has been printed.

## Step 0 — Sufficiency Check

Default topic = whatever this conversation has been working on or asking about. An explicit argument ("/teach-me OAuth refresh tokens") overrides it.

- Clear topic → announce it and start.
- Several live candidate topics → ask one question: "Teach you X, or Y?"
- Fresh session, no topic, no argument → ask what to teach. Never invent a topic.

## Ideal State

A finished session looks like this, in any order the dialogue takes:

- The learner heard the actual content spoken aloud — the teaching itself, not status narration about teaching.
- Every concept got a visual: an ASCII diagram carrying real structure (flow, hierarchy, comparison, timeline), not decoration.
- The learner answered a question on every beat, got a genuine response to THEIR answer (confirm, sharpen, or correct — quoting their words, never a canned "correct!"), and the next beat built on it.
- Misconceptions surfaced by wrong answers were re-taught from a different angle before moving on.
- A short quiz (2-3 questions) tested the whole arc near the end, each answer responded to individually.
- The session closed with a spoken recap and one final ASCII map of everything covered.
- The learner ended it satisfied — "got it", "stop", or the quiz went clean.

## Constraints

- 3-5 concepts per session. More material than that → say so and offer a part two.
- Beats stay small: one idea, one diagram, one question. A beat needing two diagrams is two beats.
- Difficulty tracks the learner's answers — strong answers earn depth and edge cases, misses earn simpler framing. Never grade on a curve of politeness; a wrong answer gets named wrong, kindly.
- The learner's terminal renders monospace: diagrams fit 80 columns, ~20 lines max, in code fences.

## Tool Contract — Speaking a Beat

At the start of every tutorial turn, POST the beat's narration to the voice endpoint (fire-and-forget):

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "NARRATION"}' \
  > /dev/null 2>&1 &
```

`NARRATION` rules:
- The actual teaching for THIS beat in conversational spoken English, 1-3 sentences, ≲350 characters.
- Plain speech only: no markdown, code, symbols, or ASCII — TTS reads them literally.
- One curl per turn. Never batch several beats into one message or one turn into several curls.
- When responding to a learner's answer, the narration IS the response to their answer ("Right — and here's the part most people miss...").
- Non-200 or refused: continue text-only for the rest of the session, note it once.

## Output-Format Contract — the Beat

Every tutorial turn renders, in order:

1. The narration curl (fired first, silently).
2. A short prose version of the teaching point (2-3 sentences — the readable twin of what was spoken, not a transcript).
3. The ASCII diagram in a code fence.
4. Exactly one question to the learner — comprehension check, prediction ("what happens if..."), or quiz item.
5. **End the turn.** The question is the last substantive content; the learner's answer drives the next beat. In LifeOS-formatted environments the `🗣️` closer carries the question so it is spoken too; never restate the narration there.

## Quiz Protocol

- Fires near the end of the arc, or immediately on "quiz me".
- 2-3 questions, one per turn, drawn from the beats actually taught — application over recall where possible ("given X, what breaks?").
- Each answer gets an individual verdict and a one-line why. Two misses on the same concept → re-teach that beat differently before the next question.
- After the last answer: spoken recap + final ASCII map of the full arc + honest read on what stuck and what to revisit.

## End Conditions

Stop immediately and recap when the learner says stop/done/got it; finish normally after the quiz; offer part two if concepts were deferred at Step 0.
