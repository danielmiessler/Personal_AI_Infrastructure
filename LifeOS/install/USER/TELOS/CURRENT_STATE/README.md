---
provenance: template
---

# Current State

> 🎯 SAMPLE TEMPLATES — This directory ships one template per dimension. They describe where you ARE right now. Run `/interview` (or talk to your DA) to replace them with your real state. Pulse reads the `status:` rows to compute coverage.

## Purpose

Current State is the honest baseline. The DA can't help you move from A to B if it doesn't know what A is. This directory holds your snapshot of *where you actually are right now*.

It pairs with `../IDEAL_STATE/` (where you want to be). The gap between the two is what your TELOS goals, problems, and strategies are trying to close.

## The seven dimensions

**Filenames are UPPERCASE and fixed**, and they mirror `../IDEAL_STATE/` exactly. `LIFEOS/TOOLS/UpdateLifeosState.ts` and Pulse both read these exact names. On a case-sensitive filesystem (Linux), `Health.md` will **not** be found — it must be `HEALTH.md`.

| File | What it captures |
|------|------------------|
| `HEALTH.md` | Sleep, fitness, energy, recurring issues, medications, current routine. |
| `MONEY.md` | Income, runway, fixed costs, savings posture, money stress level. |
| `FREEDOM.md` | How much control you actually have over your time and commitments. |
| `CREATIVE.md` | What you're actually making right now, and what's lapsed. |
| `RELATIONSHIPS.md` | Key relationships and how they're currently going. |
| `RHYTHMS.md` | Your real weekly cadence, not the one you intend. |
| `INFRASTRUCTURE.md` | The state of the tools, systems, and environment you depend on. |

## How these are scored

**A CURRENT_STATE file scores on coverage — how much of your ideal you are actually living:**

```
pct = (have + 0.5 × partial) / (have + partial + missing) × 100
```

You express this with `status:` rows, one per item you want counted:

```markdown
- Sleep: status: have
- Movement: status: partial
- Nutrition: status: missing
```

Three values only: `have`, `partial`, `missing`. The parser counts literal `status: <value>` occurrences, so the surrounding prose is yours to write freely.

**⚠️ This score OVERRIDES the matching IDEAL_STATE file.** That is the whole point.

An IDEAL_STATE file scores on *articulation* (`100 − TBD × 10`), which means a beautifully-written ideal you are nowhere near living still scores 100. Without a CURRENT_STATE file, your dashboard will flatter you. **Writing this file is what makes the number honest.**

The gap between the two files is the real signal. A dimension at 95% ideal-articulation and 30% current-coverage is telling you something true and useful. Don't close that gap by editing prose — close it by changing your life, or by admitting the ideal was wrong.

## How to fill these in

**Easiest:** run `/interview` and pick the Current State phase. It walks each dimension.

**By hand:** edit the templates in place. Be honest rather than generous — an inflated baseline produces a dashboard that congratulates you while nothing improves.

## Privacy

Same as the rest of `TELOS/` — never leaves your machine, stripped from public LifeOS releases.
