---
name: book-graphics
description: Generate consistent, clean, modern, minimal re-illustration style images for a book. All images have high-detail, high-quality, warm aesthetic with a slightly nerdy/framework/systems-thinking vibe. USE WHEN user mentions "illustration", "diagram", "framework visual", "book image", "visualize this", or "make this aesthetic".

# Skill Triggers
triggers:
  - USE WHEN user wants to create book illustrations or diagrams
  - USE WHEN user mentions "illustration", "diagram", "framework visual", or "book image"
  - USE WHEN user says "visualize this" or "make this aesthetic"
  - USE WHEN user needs consistent visual style across multiple images
  - USE WHEN user wants clean, modern, minimal graphics with warm tones

# Workflow Routing
workflows:
  - USE WHEN user wants to generate a new image: workflows/workflow-generate-image.md
  - USE WHEN user wants to refine or adjust existing style: workflows/workflow-refine-style.md
  - USE WHEN user wants to create multiple images with consistent style: workflows/workflow-batch-generate.md
---

# Book Graphics Skill

Generate consistent, clean, modern, minimal illustrations for book content with a warm, professional aesthetic.

---

## Core Aesthetic

**Clean Modern Minimal** - Professional warmth combining:
- Vector-like, high-detail illustrations (NOT hand-drawn sketchy)
- Soft gradients and subtle shadows
- Warm color palette: oranges, blues (light + dark), white, black, greys
- Nerdy/framework/systems-thinking visual identity
- Notion × Stripe Docs × Apple Keynote × framework diagrams aesthetic

**Full style documentation:** `${PAI_DIR}/.claude/skills/book-graphics/style-reference.md`

**This is the SINGLE SOURCE OF TRUTH for all book graphics styling.**

---

## Visual Identity

### What We Want
- **Clean vector-like aesthetic** - Smooth, professional, high-quality
- **Warm tones** - Oranges, soft blues, comfortable gradients
- **Minimal compositions** - No clutter, generous white space
- **Technical clarity** - Framework diagrams, structured visuals
- **Consistent style** - Every image should feel like the same book

### Reference Styles
- **Notion** - Clean, minimal, warm illustrations
- **Stripe Docs** - Professional technical diagrams
- **Apple Keynote** - Soft gradients, clean shadows
- **Framework diagrams** - Structured, systems-thinking visuals

### What to AVOID
- Hand-drawn sketchy styles
- Photorealistic images
- Noisy textures or excessive detail
- Cluttered compositions
- Neon or harsh colors
- Dark backgrounds (prefer light/white backgrounds)

---

## Color Palette

### Backgrounds
```
White           #FFFFFF   (primary - clean and open)
Light Grey      #F8F9FA   (subtle variation)
Soft Beige      #FAFAF8   (warm alternative)
```

### Primary Colors
```
Warm Orange     #FF6B35   (primary accent - warmth and energy)
Soft Orange     #FF8C61   (lighter variation)
Deep Orange     #E85D30   (darker variation)
```

### Secondary Colors
```
Light Blue      #5AB9EA   (friendly, approachable)
Medium Blue     #3A8FCC   (professional, trustworthy)
Dark Blue       #2E5F8A   (depth, sophistication)
Navy Blue       #1E3A5F   (text, strong accents)
```

### Neutrals
```
Pure Black      #000000   (text, outlines)
Dark Grey       #4A4A4A   (secondary text)
Medium Grey     #9B9B9B   (subtle elements)
Light Grey      #E0E0E0   (borders, dividers)
```

---

## Workflow Routing

| Content Type | Workflow |
|--------------|----------|
| New illustration or diagram | `workflows/workflow-generate-image.md` |
| Refine existing style | `workflows/workflow-refine-style.md` |
| Batch multiple images | `workflows/workflow-batch-generate.md` |

---

## Image Generation

**Implementation:** `${PAI_DIR}/.claude/skills/book-graphics/skill.ts`

### Core Functions

```typescript
// Generate a new book-style image
generateImage({
  prompt: string,           // What to illustrate
  chapter: string,          // Chapter context
  imageType: string,        // "diagram" | "illustration" | "framework"
  aspectRatio: string       // "16:9" | "4:3" | "1:1" | "3:2"
})

// Refine an existing image
refineImage({
  originalImage: string,    // Path to original
  refinements: string,      // What to adjust
  maintainStyle: boolean    // Keep book aesthetic
})

// Generate multiple images
batchGenerate({
  prompts: Array<{
    prompt: string,
    chapter: string,
    imageType: string
  }>,
  aspectRatio: string
})
```

---

## Usage Examples

### Generate Chapter Illustration
```
"Create an illustration for Chapter 3 about decision-making frameworks"
→ Generates clean, minimal diagram with warm colors showing decision tree
```

### Create Framework Diagram
```
"Make a 2x2 framework diagram showing impact vs effort"
→ Generates professional matrix with soft gradients and clean labels
```

### Visualize Concept
```
"Visualize the concept of feedback loops in the book style"
→ Creates clean circular diagram with arrows and warm color accents
```

### Batch Generation
```
"Generate illustrations for all 5 chapters about: [topics]"
→ Creates consistent series of images with unified aesthetic
```

---

## Style Consistency Rules

1. **Color Harmony** - Always use colors from defined palette
2. **Soft Gradients** - Subtle transitions, never harsh
3. **Clean Strokes** - Smooth vectors, no rough edges
4. **Minimal Elements** - 2-5 key components per image
5. **Generous Spacing** - 30-40% white space minimum
6. **Soft Shadows** - Depth through subtle shadows (opacity 10-20%)
7. **Technical Clarity** - Diagrams must be immediately understandable
8. **Warm Professional** - Balance warmth with professionalism

---

## Quick Decision Tree

```
What does user need?

├─ Single new illustration? → workflow-generate-image.md
├─ Adjust existing style? → workflow-refine-style.md
├─ Multiple consistent images? → workflow-batch-generate.md
└─ Understand the aesthetic? → style-reference.md
```

---

## Technical Details

### Recommended Specifications
- **Resolution:** 2K minimum (2048px wide)
- **Format:** PNG with transparency support
- **Aspect Ratios:** 16:9 (diagrams), 4:3 (illustrations), 1:1 (icons)
- **Color Space:** sRGB
- **Quality:** Maximum detail, clean edges

### Style Enforcement
All generations automatically include:
- Color palette constraints
- Negative prompts (no sketchy, no photorealistic, no clutter)
- Composition guidelines (minimal, spacious)
- Consistency markers (book style, warm professional)

---

## When This Skill Activates

The skill should automatically activate when user says:
- "Create an illustration for the book"
- "Generate a diagram for Chapter X"
- "Make a framework visual"
- "Visualize this concept in book style"
- "Create book graphics for..."
- "I need a clean, professional diagram"
- Any mention of "book image", "book illustration", "book aesthetic"

---

**For complete style guidelines:** `read ${PAI_DIR}/.claude/skills/book-graphics/style-reference.md`

**For implementation details:** `read ${PAI_DIR}/.claude/skills/book-graphics/skill.ts`
