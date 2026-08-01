---
provenance: template
---

> 📝 SAMPLE TEMPLATE — Replace with your own data via /interview or by editing this file directly. Real Pulse content lives here once you've run the Health interview.

# Health

Personal health data and tracking. This directory is private by default and is not included in public LifeOS releases.

---

## What Lives Here

This is where your DA stores everything it needs to reason about your health: metrics, fitness routine, nutrition pattern, medications, providers, and conditions. Pulse renders these files in the Health tab. The DA reads them when you ask questions like "what should I focus on this quarter" or "summarize my last lab panel."

The files in this directory follow a flat layout — one Markdown file per topic — so the DA can scan them quickly and so a human editing by hand never has to navigate folders.

---

## File Layout

| File | Purpose |
|------|---------|
| `HEALTH.md` | Top-level overview (age, height, weight, current focus, quick reference) |
| `METRICS.md` | Lab values, biomarkers, vitals, daily activity numbers, trends |
| `FITNESS.md` | Exercise routine, weight history, fitness goals |
| `NUTRITION.md` | Diet pattern, meal prep approach, nutritional priorities |
| `MEDICATIONS.md` | Prescriptions, daily supplements, as-needed items, past medications |
| `PROVIDERS.md` | Primary care, specialists, testing services, pending referrals |
| `CONDITIONS.md` | Active conditions, allergies, medical history |

You can also drop dated lab result files directly in this directory — for example `lab_results_2026-01.md` — and the DA will pick them up automatically.

---

## How to Populate

You have three options, in increasing order of effort:

1. **Run the Health interview** — `Skill("Interview")` walks you through every field conversationally and writes the answers back into these files. Easiest path.
2. **Edit these files directly** — replace the sample values with your real data. The structure of each file is the structure your DA expects.
3. **Paste a lab PDF** — drop a lab result file (PDF or Markdown) in this directory and ask your DA to extract the values into `METRICS.md` and `CONDITIONS.md`.

---

## Privacy

This directory is in a private zone. LifeOS release tooling refuses to publish anything under `USER/HEALTH/`. Treat the contents as you would your medical chart.

---

## Sample Snippet

A real `METRICS.md` row looks like:

```markdown
| HDL-Cholesterol | 50 mg/dL (sample) | In range | Above 40 mg/dL |
```

The number is a placeholder. Your real numbers will come from your real labs.

---

*This is a sample template. Run /interview or edit the files directly to replace placeholder content with your own data.*
