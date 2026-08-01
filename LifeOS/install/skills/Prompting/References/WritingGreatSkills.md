# Writing Great Skills — imported reference

> **Provenance:** Matt Pocock's `writing-great-skills` skill + its glossary (github.com/mattpocock/skills, MIT License, Copyright (c) 2026 Matt Pocock). Imported 2026-07-16 as a live reference after adversarial evaluation (see the pocock-suite-reanalysis work session). Content preserved faithfully with a short adaptation note; on conflict with local doctrine, `skills/Prompting/Standards.md` and the CreateSkill skill win.
>
> **Adaptation note for this system:** skills here are predominantly model-invoked with `USE WHEN` trigger descriptions; the "user-invoked" axis below maps to slash-shortcut skills (`/ic`, `/rc`, …) and `disable-model-invocation` equivalents. The two-loads framing (context load vs cognitive load) applies unchanged. His "no-op test" is the same verdict as BitterPillEngineering Question 1 — use BPE as the enforcement surface, this file as the theory.

A skill exists to wrangle determinism out of a stochastic system. **Predictability** — the agent taking the same *process* every run, not producing the same output — is the root virtue; every lever below serves it.

## Invocation — the two loads

- A **model-invoked** skill keeps a **description**, so the agent can fire it autonomously *and* other skills can reach it. It contributes to **context load** — the description sits in the window every turn.
- A **user-invoked** skill strips the description from the agent's reach: only the human typing its name can invoke it — and no other skill can. Zero context load, but it spends **cognitive load**: the human is the index that must remember it exists. Not a cost to minimize — it is the price of human agency; spend it where human judgment matters.
- Pick model-invocation only when the agent must reach the skill on its own, or another skill must. When user-invoked skills multiply past what you can remember, the cure is a **router skill**: one skill that names the others and when to reach for each.

## Information hierarchy

A skill mixes two content types — **steps** (ordered actions, each ending on a completion criterion) and **reference** (definitions, rules, facts, consulted on demand) — ranked on a ladder by how immediately the agent needs each piece:

1. **In-skill step** — the primary tier: what the agent does, in order.
2. **In-skill reference** — consulted on demand. Often a legitimately flat peer-set (every rule of a review on one rung) — a fine arrangement, not a smell.
3. **Disclosed/external reference** — pushed behind a **context pointer**, loaded only when the pointer fires.

**Progressive disclosure** is the move down the ladder so the top stays legible. The cleanest disclosure test is **branching**: inline what every branch needs; push behind a pointer what only some branches reach. A context pointer's *wording*, not its target, decides when and how reliably the agent reaches the material — a must-have target behind a weakly worded pointer is a variance bug; fix the wording first, inline only if that fails.

**Co-location** decides what sits beside a piece once placed: keep a concept's definition, rules, and caveats under one heading so reading one part brings its neighbours with it.

## Completion criteria — the two axes

Every step ends on a **completion criterion**, and it is a lever with two independent properties:

- **Clarity** (can the agent tell done from not-done?) resists **premature completion** — a vague bound ("understanding reached") lets the agent declare done early.
- **Demand** (how much it requires) sets **legwork** — "every modified model accounted for" forces thorough digging where "produce a change list" does not. Demand binds flat reference too: "every rule applied" is how a stepless skill still carries an exhaustiveness bar.

The strongest criteria are both checkable and exhaustive.

## Leading words

A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with while running the skill (*lesson*, *fog of war*, *tracer bullets*, *tight*, *red*, *relentless*). Repeated as a token, never as a sentence, it accumulates a distributed definition and anchors a whole region of behavior in the fewest tokens, by recruiting priors the model already holds. Coining your own word works only if you define it — a made-up word recruits no priors.

It serves predictability twice: in the body it anchors *execution* (same behavior every time the word appears); in the description it anchors *invocation* (shared language across prompts, docs, and code fires the skill more reliably). Hunt for restatements a leading word retires: "fast, deterministic, low-overhead" → *tight*; "a loop you believe in" → *red* (a binary observable state). Fewer tokens, and a sharper hook.

## When to split

**Granularity** is how finely you divide skills, and each cut spends one of the two loads:

- **By invocation** — split off a model-invoked skill when a distinct leading word should trigger it on its own, or another skill must reach it. You pay context load for the new always-loaded description.
- **By sequence** — split a run of steps when the steps still ahead (**post-completion steps**) tempt the agent to rush the one in front of it. Hiding only works across a real context boundary (a hand-off or a subagent dispatch); an inline call leaves the later steps in context and clears nothing.

## Pruning

- **Single source of truth:** each meaning lives in exactly one authoritative place; changing behavior is a one-place edit.
- Check every line for **relevance** (does it still bear on what the skill does?), then hunt **no-ops** sentence by sentence: does this sentence change behavior versus the model's default? When one fails, delete the whole sentence rather than trimming words from it. The verdict is model-relative — settle disagreements by running the skill, not by debate.

## Failure modes

- **Premature completion** — ending a step before it's genuinely done, attention slipping to *being done*. Defence in order: sharpen the completion criterion first (cheap, local); only if it's irreducibly fuzzy *and* you observe the rush, hide the post-completion steps by splitting.
- **Duplication** — the same meaning in more than one place. Costs maintenance and tokens, and inflates a meaning's prominence past its real rank. (The accidental inverse of a leading word, which repeats a *token*, never the meaning.)
- **Sediment** — stale layers that settle because adding feels safe and removing feels risky. The default fate of any skill without a pruning discipline.
- **Sprawl** — a skill simply too long, even when every line is live and unique. The cure is the ladder: disclose reference, split by branch or sequence.
- **No-op** — a line the model already obeys by default; you pay load to say nothing. A weak leading word (*be thorough*) is a no-op; the fix is a stronger word (*relentless*), not a different technique.
- **Negation** — steering by prohibition backfires: *don't think of an elephant* names the elephant and makes it more available. Prompt the **positive** — state the target behavior so the banned one is never spoken; keep a prohibition only as a hard guardrail you can't phrase positively, and even then pair it with what to do instead.
