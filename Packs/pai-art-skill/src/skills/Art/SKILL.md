---
name: Art
description: Visual content generation with Excalidraw hand-drawn aesthetic. USE WHEN user wants diagrams, visualizations, comics, editorial illustrations, or AI-generated videos.
---

# Art Skill

Visual content generation system using **Excalidraw hand-drawn** aesthetic with dark-mode, tech-forward color palette. Supports both **image** and **video** generation.

## Output Location

```
ALL GENERATED CONTENT GOES TO ~/Downloads/ FIRST
Preview in Finder/Preview before final placement
Only copy to project directories after review
```

## Workflow Routing

Route to the appropriate workflow based on the request:

**Images:**
  - Technical or architecture diagram -> `Workflows/TechnicalDiagrams.md`
  - Blog header or editorial illustration -> `Workflows/Essay.md`
  - Comic or sequential panels -> `Workflows/Comics.md`

**Videos:**
  - Any video content request -> `Workflows/Video.md`
  - Animated diagrams, B-roll, social clips, product demos

---

## Core Aesthetic

**Excalidraw Hand-Drawn** - Clean, approachable technical illustrations with:
- Slightly wobbly hand-drawn lines (NOT perfect vectors)
- Simple shapes with organic imperfections
- Consistent hand-lettered typography style
- Dark mode backgrounds with bright accents

**Full aesthetic documentation:** `$PAI_DIR/skills/Art/Aesthetic.md`

---

## Color System

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0a0a0f` | Primary dark background |
| PAI Blue | `#4a90d9` | Key elements, primary accents |
| Electric Cyan | `#22d3ee` | Flows, connections, secondary |
| Accent Purple | `#8b5cf6` | Highlights, callouts (10-15%) |
| Text White | `#e5e7eb` | Primary text, labels |
| Surface | `#1a1a2e` | Cards, panels |
| Line Work | `#94a3b8` | Hand-drawn borders |

---

## Content Generation

### Image Generation

**Default model:** nano-banana-pro (Gemini 3 Pro)

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/output.png
```

### Video Generation

**Default model:** veo-3.1-fast (quick drafts) or veo-3.1 (production)

```bash
# Quick 8-second draft
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1-fast \
  --prompt "[PROMPT]" \
  --aspect-ratio 16:9 \
  --output ~/Downloads/output.mp4

# Production quality with audio
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "[PROMPT]" \
  --audio \
  --output ~/Downloads/output.mp4

# Animate an existing image
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Animate this with subtle motion..." \
  --first-frame ~/Downloads/image.png \
  --output ~/Downloads/animated.mp4
```

**Video Pricing:**
- veo-3.1-fast: $0.15/s ($1.20 for 8s)
- veo-3.1: $0.40/s ($3.20 for 8s)

**API keys in:** `$PAI_DIR/.env` (single source of truth for all authentication)

---

## Examples

**Example 1: Technical diagram**
```
User: "create a diagram showing the auth flow"
-> Invokes TECHNICALDIAGRAMS workflow
-> Creates Excalidraw-style architecture visual
-> Outputs PNG with dark background, blue accents
```

**Example 2: Blog header**
```
User: "create a header for my post about AI agents"
-> Invokes ESSAY workflow
-> Generates hand-drawn illustration
-> Saves to ~/Downloads/ for preview
```

**Example 3: Comic strip**
```
User: "create a comic showing the before/after of using AI"
-> Invokes COMICS workflow
-> Creates 3-4 panel sequential narrative
-> Editorial style, not cartoonish
```

**Example 4: Animated diagram**
```
User: "create an animated diagram of the deployment pipeline"
-> Invokes VIDEO workflow
-> Generates 8-second animation with draw-on effect
-> Outputs MP4 with dark background, blue accents
```

**Example 5: Blog header video**
```
User: "animate the blog header image I just created"
-> Invokes VIDEO workflow with --first-frame
-> Adds subtle motion to existing image
-> Saves to ~/Downloads/ for preview
```
