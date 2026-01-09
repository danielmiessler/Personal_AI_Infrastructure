# Editorial Illustration Workflow

**Hand-drawn Excalidraw-style illustrations for blog headers and editorial content.**

---

## Purpose

Header images and editorial illustrations that visually represent content concepts.

**Use for:** Blog headers, article illustrations, concept visualizations, editorial art.

---

## Visual Aesthetic

**Style:** Excalidraw hand-drawn sketch - professional, conceptual, dark-mode.

### Core Rules

1. **Excalidraw technique** - Hand-drawn gestural quality, not clean vectors
2. **Dark background #0a0a0f** - Consistent with overall aesthetic
3. **Conceptual subjects** - Draw what the content is ABOUT
4. **Strategic color** - PAI Blue for key elements, Cyan for secondary
5. **Minimalist composition** - Few elements, each intentional

---

## Workflow Steps

### Step 1: Understand the Content

**Before doing anything:**
1. Read the full content (blog post, essay, article)
2. Identify the core concept or argument
3. Extract key metaphors, imagery, or concrete elements
4. Determine what should be visualized

**Output:** Clear understanding of what to illustrate.

---

### Step 2: Design Composition

**Determine what to draw:**

1. **What is the content ABOUT?**
   - Not surface-level - the actual core concept
   - What visual would represent THAT?

2. **What are concrete elements?**
   - Nouns, objects, metaphors from the content
   - These should appear in the illustration

3. **What is the emotional register?**
   - Technical, hopeful, warning, discovery, etc.
   - This affects line quality and composition

4. **Composition approach:**
   - Centered, minimalist, breathing space
   - Subjects should fill the frame
   - NOT cluttered, NOT busy

**Output:** A clear composition design.

---

### Step 3: Construct the Prompt

### Prompt Template

```
Hand-drawn Excalidraw-style editorial illustration on dark background.

BACKGROUND: Pure dark #0a0a0f - clean, no texture.

SUBJECT: [WHAT TO DRAW - the core visual concept]

STYLE - EXCALIDRAW HAND-DRAWN:
- Gestural, slightly imperfect lines
- Variable line weight
- Hand-drawn quality (NOT clean vectors)
- Organic, approachable feel
- Sketch-like but professional

COMPOSITION:
- Subjects FILL THE FRAME (not small with empty space)
- Minimalist - few elements, each intentional
- Clean, uncluttered
- Professional editorial quality

COLOR:
- Dark background #0a0a0f (MANDATORY)
- White #e5e7eb for line work and structure
- PAI Blue #4a90d9 for key elements (15-20%)
- Cyan #22d3ee for secondary accents (5-10%)
- Accent Purple #8b5cf6 sparingly for highlights

EMOTIONAL REGISTER: [TECHNICAL/DISCOVERY/WARNING/PROGRESS/etc.]

CRITICAL:
- NO light backgrounds
- Subjects must be LARGE and fill the frame
- Hand-drawn Excalidraw aesthetic
- Professional quality suitable for publication
```

---

### Step 4: Execute Generation

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 1:1 \
  --output ~/Downloads/header.png
```

**For blog headers that need thumbnails:**

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 1:1 \
  --thumbnail \
  --output ~/Downloads/header.png
```

This creates BOTH:
- `header.png` - With transparent background (for inline display)
- `header-thumb.png` - With solid background (for social previews)

---

### Step 5: Validation

### Must Have
- [ ] Dark background #0a0a0f
- [ ] Hand-drawn Excalidraw aesthetic
- [ ] Subject matches content concept
- [ ] Subjects LARGE and fill the frame
- [ ] Professional editorial quality
- [ ] Strategic color usage

### Must NOT Have
- [ ] Light/white backgrounds
- [ ] Perfect clean vectors
- [ ] Generic AI illustration style
- [ ] Too small subjects with lots of empty space
- [ ] Busy, cluttered composition
- [ ] Cartoony or clip-art style

### If Validation Fails

| Problem | Fix |
|---------|-----|
| Subjects too small | Add "LARGE SUBJECTS that FILL THE FRAME" |
| Light background | Emphasize "dark background #0a0a0f" |
| Too perfect | Add "hand-drawn Excalidraw style, slightly imperfect" |
| Doesn't match content | Re-read content, identify better visual metaphor |

---

## Aspect Ratio Guide

| Use Case | Aspect Ratio | Notes |
|----------|--------------|-------|
| Blog header (square) | 1:1 | Default for most posts |
| Wide banner | 16:9 | For wide layouts |
| Social preview | 1:1 or 16:9 | Platform dependent |

---

**The workflow: Understand -> Design -> Prompt -> Generate -> Validate**
