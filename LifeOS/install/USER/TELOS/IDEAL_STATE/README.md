---
provenance: template
---

# Ideal State

> 🎯 SAMPLE TEMPLATES — This directory ships one template per dimension. They describe where you WANT TO BE. Run `/interview` (or talk to your DA) to replace them with your real targets. Pulse reads these files to render the life-dimension rings.

## Purpose

Ideal State is the destination. It pairs with `../CURRENT_STATE/` to define the gap your TELOS goals, problems, and strategies are working to close.

This is not a fantasy doc and not a vision-board exercise. It's a concrete description of what your life looks like when the work is paying off — specific enough that you'd recognize it if you got there.

## The seven dimensions

**Filenames are UPPERCASE and fixed.** `LIFEOS/TOOLS/UpdateLifeosState.ts` and Pulse both read these exact names. On a case-sensitive filesystem (Linux), `Health.md` will **not** be found — it must be `HEALTH.md`.

| File | What it captures |
|------|------------------|
| `HEALTH.md` | The energy level, fitness, sleep quality, and routine you'd consider "dialed in." |
| `MONEY.md` | The financial posture that would let you operate without money stress. |
| `FREEDOM.md` | The autonomy you're after — over your time, your work, and your commitments. |
| `CREATIVE.md` | What you want to be making, and the practice that sustains it. |
| `RELATIONSHIPS.md` | The kind of presence you want to have in your key relationships. |
| `RHYTHMS.md` | The weekly and daily cadence that keeps the rest of it working. |
| `INFRASTRUCTURE.md` | The tools, systems, and environment you want holding it all up. |

You don't need all seven. Any file you omit simply doesn't score, and its ring stays dark.

## How these are scored

Pulse and the statusline read `USER/TELOS/LIFEOS_STATE.json`, which `UpdateLifeosState.ts` writes from these files.

**An IDEAL_STATE file scores on articulation — how completely you've said what "good" looks like:**

```
pct = 100 − (number of `TBD` markers × 10)     # clamped to 0..100
```

Every literal `TBD` in the file costs 10 points. This is deliberate: the file is *meant* to be written with honest gaps in it, and the score tells you how much of your ideal you've actually articulated. A file with no TBDs scores 100.

**⚠️ Articulation is not attainment.** A beautifully-written ideal you are nowhere near living still scores 100. That's what `../CURRENT_STATE/` is for — when a matching CURRENT_STATE file exists, **it overrides this score** with real coverage. See that README for the `status:` contract.

## How to fill these in

**Easiest:** run `/interview` and pick the Ideal State phase. The DA will ask "if this dimension were going great in 12 months, what would be true?" for each one.

**By hand:** edit the templates in place. Be specific — vague ideals don't help the DA prioritize. "Sleeping 7+ hours, lifting 3x/week, no afternoon crash" beats "in shape." Leave `TBD` wherever you genuinely don't know yet; an honest gap is more useful than an invented target, and the score will reflect it.

## Privacy

Same as the rest of `TELOS/` — never leaves your machine, stripped from public LifeOS releases.
