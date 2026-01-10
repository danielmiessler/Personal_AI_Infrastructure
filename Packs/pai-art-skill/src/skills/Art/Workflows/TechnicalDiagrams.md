# Technical Diagram Workflow

**Clean Excalidraw-style technical diagrams with dark-mode aesthetic.**

---

## Purpose

Technical diagrams for system architectures, process flows, and presentations.

**Use for:** Architecture diagrams, process flows, pipelines, infrastructure maps, presentations.

---

## Visual Aesthetic

**Style:** Clean Excalidraw diagrams - professional, approachable, hand-drawn feel.

### Core Rules

1. **Excalidraw style** - Hand-drawn lines, slightly organic, professional
2. **Dark background #0a0a0f** - NO light backgrounds, NO grid lines
3. **Custom typography** - Specific hierarchy (see below)
4. **Strategic color** - PAI Blue #4a90d9 for key elements, Cyan #22d3ee for flows
5. **Line work dominant** - 70% of elements in white/gray, color is accent only

---

## Typography System

### TIER 1: Headers & Subtitles

**Elegant wedge-serif style (like Valkyrie):**
- High stroke contrast, refined serifs
- Header: Large, italic, white `#e5e7eb`
- Subtitle: Smaller, regular weight, muted `#9ca3af`

### TIER 2: Labels

**Geometric sans-serif (like Concourse):**
- Clean, technical, precise
- Used for box labels, node names
- Color: White `#e5e7eb`

### TIER 3: Insights

**Condensed italic sans (like Advocate):**
- Editorial feel, attention-grabbing
- Used for callouts and annotations
- Color: PAI Blue `#4a90d9` or Cyan `#22d3ee`

---

## Color Palette

```
Background   #0a0a0f    - Dark background (MANDATORY)
PAI Blue     #4a90d9    - Key components, insights (15-20%)
Cyan         #22d3ee    - Flows, connections (5-10%)
White        #e5e7eb    - Text, labels, primary structure
Line Work    #94a3b8    - Hand-drawn borders, boxes
Surface      #1a1a2e    - Card backgrounds (if needed)
```

---

## Execution Steps

1. **Understand** - Read the content, identify key components and relationships
2. **Structure** - Plan the diagram layout (boxes, arrows, hierarchy)
3. **Compose** - Design the visual with title, subtitle, and 1-3 key insights
4. **Prompt** - Construct using the template below
5. **Generate** - Execute with CLI tool
6. **Validate** - Check against validation criteria

---

## Prompt Template

```
Clean Excalidraw-style technical diagram on dark background.

BACKGROUND: Pure dark #0a0a0f - NO grid lines, NO texture, completely clean.

STYLE: Hand-drawn Excalidraw aesthetic - like a skilled architect's whiteboard sketch.

TYPOGRAPHY:
- HEADER: Elegant serif italic, large, white color, top-left position
- SUBTITLE: Same serif but regular weight, smaller, gray color, below header
- LABELS: Geometric sans-serif, white, clean and technical
- INSIGHTS: Condensed italic, PAI Blue #4a90d9, used for callouts with asterisks

DIAGRAM CONTENT:
Title: '[TITLE]' (Top left)
Subtitle: '[SUBTITLE]' (Below title)
Components: [LIST THE MAIN COMPONENTS]
Connections: [DESCRIBE THE FLOW/RELATIONSHIPS]

Include 1-3 insight callouts like "*key insight here*" in PAI Blue.

COLOR USAGE:
- White #e5e7eb for all text and primary structure
- PAI Blue #4a90d9 for key components and insights
- Cyan #22d3ee for flow arrows and connections
- Keep 70% of image in white/gray tones, color as accent

EXCALIDRAW CHARACTERISTICS:
- Slightly wobbly hand-drawn lines
- Imperfect rectangles with rounded corners
- Organic arrow curves
- Variable line weight
- Professional but approachable feel
```

---

## Intent-to-Flag Mapping

### Model Selection

| User Says | Flag | When to Use |
|-----------|------|-------------|
| "fast", "quick", "draft" | `--model nano-banana` | Faster iteration |
| (default), "best", "high quality" | `--model nano-banana-pro` | Best quality (recommended) |
| "flux", "variety" | `--model flux` | Different aesthetic |

### Size Selection

| User Says | Flag | Resolution |
|-----------|------|------------|
| "draft", "preview" | `--size 1K` | Quick iterations |
| (default), "standard" | `--size 2K` | Standard output |
| "high res", "print" | `--size 4K` | Maximum resolution |

### Aspect Ratio

| User Says | Flag | Use Case |
|-----------|------|----------|
| "wide", "slide", "presentation" | `--aspect-ratio 16:9` | Default for diagrams |
| "square" | `--aspect-ratio 1:1` | Social media |
| "ultrawide" | `--aspect-ratio 21:9` | Wide system diagrams |

---

## Generate Command

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/diagram.png
```

---

## Validation

### Must Have
- [ ] Dark background #0a0a0f (NO light backgrounds)
- [ ] Hand-drawn Excalidraw aesthetic
- [ ] Title and subtitle in top-left
- [ ] 1-3 insight callouts in PAI Blue
- [ ] Strategic color usage (70% white/gray, 30% color accents)
- [ ] Readable labels and text

### Must NOT Have
- [ ] Light/white backgrounds
- [ ] Grid lines or textures
- [ ] Perfect vector shapes
- [ ] Cartoony or clip-art style
- [ ] Over-coloring (everything blue)
- [ ] Generic AI illustration look

### If Validation Fails

| Problem | Fix |
|---------|-----|
| Light background | Add "dark background #0a0a0f" more explicitly |
| Too perfect/clean | Add "hand-drawn, slightly wobbly, Excalidraw style" |
| Wrong colors | Specify exact hex codes in prompt |
| No insights | Add "include 1-3 callouts in PAI Blue" |

---

**The workflow: Understand -> Structure -> Compose -> Prompt -> Generate -> Validate**
