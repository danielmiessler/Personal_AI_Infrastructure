---
name: art
description: |
  Complete visual content system for PAI.
  Tron-meets-Excalidraw aesthetic - dark backgrounds, neon accents, hand-drawn sketch style.

# Skill Triggers
triggers:
  - USE WHEN user wants to create visual content, illustrations, or diagrams
  - USE WHEN user mentions art, header images, visualizations, or any visual request
  - USE WHEN user references mermaid, flowchart, technical diagram, or infographic

# Workflow Routing
workflows:
  - USE WHEN user wants blog header or editorial illustration: workflows/workflow.md
  - USE WHEN user wants visualization or is unsure which format: workflows/visualize.md
  - USE WHEN user wants mermaid flowchart or sequence diagram: workflows/mermaid.md
  - USE WHEN user wants technical or architecture diagram: workflows/technical-diagrams.md
  - USE WHEN user wants taxonomy or classification grid: workflows/taxonomies.md
  - USE WHEN user wants timeline or chronological progression: workflows/timelines.md
  - USE WHEN user wants framework or 2x2 matrix: workflows/frameworks.md
  - USE WHEN user wants comparison or X vs Y: workflows/comparisons.md
  - USE WHEN user wants annotated screenshot: workflows/annotated-screenshots.md
  - USE WHEN user wants recipe card or step-by-step: workflows/recipe-cards.md
  - USE WHEN user wants aphorism or quote card: workflows/aphorisms.md
  - USE WHEN user wants conceptual map or territory: workflows/maps.md
  - USE WHEN user wants stat card or big number visual: workflows/stats.md
  - USE WHEN user wants comic or sequential panels: workflows/comics.md
---

# Art Skill

Complete visual content system using the **PAI Visual Aesthetic**.

---

## Core Aesthetic

**Tron-meets-Excalidraw** - Digital warmth combining:
- Hand-drawn Excalidraw-style sketch lines (NOT clean vectors)
- Dark slate backgrounds for modern contrast
- Neon orange (warmth) + cyan (tech) accents
- Subtle glows on key elements

**Full aesthetic documentation:** `${PAI_DIR}/skills/CORE/aesthetic.md`

**This is the SINGLE SOURCE OF TRUTH for all visual styling.**

---

## Workflow Routing

| Content Type | Workflow |
|--------------|----------|
| Blog headers / Editorial | `workflows/workflow.md` |
| Adaptive orchestrator | `workflows/visualize.md` |
| Flowcharts / Sequences | `workflows/mermaid.md` |
| Architecture diagrams | `workflows/technical-diagrams.md` |
| Classification grids | `workflows/taxonomies.md` |
| Chronological | `workflows/timelines.md` |
| 2x2 matrices | `workflows/frameworks.md` |
| X vs Y | `workflows/comparisons.md` |
| Screenshot markup | `workflows/annotated-screenshots.md` |
| Step-by-step | `workflows/recipe-cards.md` |
| Quote cards | `workflows/aphorisms.md` |
| Idea territories | `workflows/maps.md` |
| Big numbers | `workflows/stats.md` |
| Sequential panels | `workflows/comics.md` |

---

## Image Generation

**Default model:** nano-banana-pro (Gemini 3 Pro)

```bash
bun run ${PAI_DIR}/skills/art/tools/generate-ulart-image.ts \
  --model nano-banana-pro \
  --prompt "[PROMPT]" \
  --size 2K \
  --aspect-ratio 1:1 \
  --output /path/to/output.png
```

### Alternative Models

| Model | When to Use |
|-------|-------------|
| **flux** | Maximum quality |
| **gpt-image-1** | Different interpretation |

**API keys in:** `${PAI_DIR}/.env`
- `REPLICATE_API_TOKEN` - Flux and Nano Banana
- `OPENAI_API_KEY` - GPT-image-1
- `GOOGLE_API_KEY` - Nano Banana Pro
- `REMOVEBG_API_KEY` - Background removal

---

## Quick Decision Tree

```
What does user need?

├─ Unsure which approach? → VISUALIZE (analyzes & orchestrates)
├─ Flowchart/sequence/state diagram? → MERMAID
├─ Abstract metaphor for article? → Editorial (workflow.md)
├─ System/architecture with labels? → Technical Diagram
├─ Categories in grid? → Taxonomy
├─ Change over time? → Timeline
├─ 2x2 matrix or mental model? → Framework
├─ Side-by-side contrast? → Comparison
├─ Markup existing screenshot? → Annotated Screenshot
├─ Step-by-step process? → Recipe Card
├─ Quote as social visual? → Aphorism
├─ Idea territories as map? → Conceptual Map
├─ Single striking number? → Stat Card
└─ Multi-panel story? → Comic
```

---

**For complete visual styling rules, ALWAYS read:** `${PAI_DIR}/skills/CORE/aesthetic.md`
