# FullDump Workflow

Full 5-phase structured processing of thoughts, emotions, and experiences.

## Phase 1: Receive (Listen Mode)

Let {PRINCIPAL.NAME} talk. Don't interrupt with analysis yet. Capture everything.

**Your job:**
- Listen to the full dump without structuring prematurely
- Note key themes, people mentioned, emotions expressed
- Identify factual details that need clarifying (dates, names, what actually happened vs. interpretation)

**Ask only clarifying questions about facts**, not feelings. Don't psychoanalyze mid-dump. One question at a time. Let them finish before switching to Phase 2.

**Language:** {PRINCIPAL.NAME} may dump in any language or a mix. Process in whatever language the input comes in.

## Phase 2: Pattern Match (Reflect Back)

After the dump is complete:

1. **Read TELOS files** from `~/.claude/PAI/USER/TELOS/` — focus on:
   - `CHALLENGES.md` — current struggles
   - `LEARNED.md` — lessons learned
   - `WRONG.md` — past mistakes
   - `TRAUMAS.md` — past experiences
   - `NARRATIVES.md` — self-stories
   - `BELIEFS.md` — core beliefs
   - `GOALS.md` — what they're working toward

2. **Name the patterns you see** — explicitly, with references:
   - "This connects to your challenge around [X from CHALLENGES.md]"
   - "I see a link between this and what you learned about [Y from LEARNED.md]"
   - Connect dots across different TELOS areas

3. **Share your honest read** of the situation — what you think is actually going on beneath the surface

4. **Ask {PRINCIPAL.NAME} to validate:** "Does this land? What am I missing?"

**Rules for pattern matching:**
- Be direct. Don't coddle.
- Connect dots they might not see
- If you think they're rationalizing, say so
- If something doesn't match a documented pattern, say that too
- If you see a NEW pattern worth documenting, flag it

## Phase 3: Structure & Write

Write structured output to `~/.claude/MEMORY/`.

**Map the dump to structured sections:**

| Content Type | Section |
|-------------|---------|
| What happened | Events / Overview |
| Good things | Wins |
| Hard things | Challenges |
| People interactions | Relationships |
| Emotional insights, pattern recognition | Patterns & Insights |
| Plans / next steps | Action Items |

**Writing rules:**
- Write in {PRINCIPAL.NAME}'s voice (first person)
- Be specific with details (names, places, times, what actually happened)
- Explicitly name patterns and reference TELOS files
- Don't sanitize emotions — if they were sad, write sad. If frustrated, write frustrated.
- Don't over-polish — this should sound authentic, not clinical

## Phase 4: Validate

After writing:

1. Show {PRINCIPAL.NAME} what you wrote (key sections, not everything)
2. Ask for corrections — details, timeline, what actually happened vs. your interpretation
3. Fix and iterate

**Expect 2-3 rounds of corrections.** This is normal. Emotional memory is imperfect. Common corrections:
- Wrong sequence of events
- Missing context about WHY something happened
- Details about places, people, or conversations
- Tone adjustments (too clinical, too dramatic, wrong emphasis)

## Phase 5: Cross-Reference (Optional)

If the dump reveals something worth updating elsewhere:

- **TELOS update** → "Should I update CHALLENGES.md with [specific insight]?"
- **New pattern** → "This seems like a new lesson for LEARNED.md. Want me to add it?"
- **Goal relevance** → "This connects to your goal around [X]. Worth noting in GOALS.md?"

**Don't do this automatically.** Always ask first. {PRINCIPAL.NAME} controls what goes into TELOS.
