---
name: Teach
version: 1.1.0
description: Interactive voice-narrated tutorial on whatever the current conversation is about — teaches the topic beat by beat with ASCII diagrams in the terminal while speaking the actual lesson content aloud, asking one question per beat and quizzing until the ideas land. USE WHEN teach me, /teach-me, tutorial, teach me this, walk me through this interactively, explain this like a lesson, learn mode, quiz me, help me actually understand what we just did. NOT FOR plain written explanations with no dialogue (just answer directly), authored/published content, or discovery interviews that shape a half-formed idea (use grill-me).
---

# Teach

Turns the current conversation topic into a live, spoken, Socratic tutorial. Each teaching beat is narrated aloud through the voice system, drawn as ASCII in the terminal, and ends with one question to the learner. The session is a dialogue: answer, response, next beat, quiz, recap.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Starting a tutorial on TOPIC"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **Teach** workflow in the **Teach** skill to tutor TOPIC...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Teach** | "teach me", "/teach-me", "tutorial", "quiz me" | `Workflows/Teach.md` |

## Gotchas

- **The completion hook already speaks the `🗣️` closer line.** Never repeat the beat's narration in the closer or the learner hears it twice. The intended shape: the narration curl speaks the teaching, the closer carries the question — two distinct voice moments per turn.
- **Spoken text goes to TTS raw.** No markdown, no ASCII art, no code, no symbols in the curl `message` — they get read aloud literally. Write narration as plain spoken English and spell out anything a voice would say differently ("H T T P" reads better than "HTTP" for some engines; when unsure, rephrase).
- **One narration curl per turn, ≲350 characters.** Multiple rapid POSTs queue and overlap into noise, and long messages become a synthesized wall. If a beat needs more speech than that, the beat is too big — split it.
- **A beat ends at its question. Stop the turn there.** Answering your own question and continuing turns the tutorial back into a lecture — the failure mode this skill exists to prevent.
- **Voice endpoint down (non-200 or connection refused): keep teaching, silently text-only.** Note it once at session start; do not retry every beat.

## Examples

**Example 1: Teach the thing we just built**
```
User: "teach me" (after a session debugging DNS records)
→ Invokes Teach workflow
→ Names the topic, speaks a spoken intro, draws a concept map of 3-5 ideas
→ Beat 1: speaks how DNS resolution flows, draws the resolver chain in ASCII, asks "which server actually holds the answer?"
→ User answers; skill responds to the answer, corrects or confirms, moves to beat 2
→ Ends with a 2-3 question quiz and a recap diagram
```

**Example 2: Explicit topic override**
```
User: "/teach-me OAuth refresh tokens"
→ Teaches the named topic instead of the conversation default
→ Same beat/question/quiz loop
```

**Example 3: Quiz-only**
```
User: "quiz me on what we just covered"
→ Skips the lesson beats, runs the quiz protocol directly on the session's material
```
