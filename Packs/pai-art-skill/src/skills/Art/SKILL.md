---
name: Art
description: Visual content generation with Excalidraw hand-drawn aesthetic. USE WHEN user wants diagrams, visualizations, comics, or editorial illustrations.
---

# Art Skill

Visual content generation system using **Excalidraw hand-drawn** aesthetic with dark-mode, tech-forward color palette.

## Output Location

```
ALL GENERATED IMAGES GO TO ~/Downloads/ FIRST
Preview in Finder/Preview before final placement
Only copy to project directories after review
```

## Workflow Routing

Route to the appropriate workflow based on the request:

  - Technical or architecture diagram -> `Workflows/TechnicalDiagrams.md`
  - Blog header or editorial illustration -> `Workflows/Essay.md`
  - Comic or sequential panels -> `Workflows/Comics.md`

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

## Image Generation

**Default model:** nano-banana-pro (Gemini 3 Pro)

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/output.png
```

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
