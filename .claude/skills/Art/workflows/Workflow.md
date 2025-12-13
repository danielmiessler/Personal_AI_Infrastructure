# UL Art Image Generation Workflow

**Single consolidated workflow for creating editorial illustrations in the Anthropic style.**

Creates **ONE ABSTRACT VISUAL METAPHOR** — flat colors, hand-drawn black linework, muted earth tones.

---

## 🚨 MANDATORY STEPS — EXECUTE IN ORDER

**CRITICAL: ALL 6 STEPS ARE MANDATORY. Execute them IN ORDER. Do NOT skip steps. Do NOT improvise your own process.**

**VIOLATION:** If you skip Step 1 (CSE) and derive concepts yourself, you are violating this workflow.

```
INPUT CONTENT
     ↓
[1] CSE: Run /cse command to extract core thesis ← MANDATORY, DO NOT SKIP
     ↓
[2] CONCEPT: Derive visual metaphor from LINE 8 of CSE output ← MANDATORY
     ↓
[3] AESTHETIC: Apply Anthropic editorial style (flat, hand-drawn, earth tones)
     ↓
[4] PROMPT: Construct with UltraThink
     ↓
[5] GENERATE: Execute CLI tool
     ↓
[6] VALIDATE: Flat? Hand-drawn? No gradients? Abstract?
```

---

## Step 1: Run 24-Item Story Explanation — MANDATORY

**Use the story-explanation skill to extract the FULL narrative arc.**

Invoke the story-explanation skill directly and request **24-item length**:

```
Use story-explanation skill with 24-item length for [URL or content]
```

This produces a 24-item numbered story explanation that captures the complete narrative journey: setup, tension, transformation, resolution.

**Why 24 items (not 8):**
- Captures the FULL story arc, not just the conclusion
- Shows transformation/process/journey
- Provides rich texture for visual metaphor derivation
- Editorial illustration should show STORY, not just endpoint

**Output:** 24-item story explanation with the complete narrative arc.

---

## Step 2: Derive Visual Concept from FULL NARRATIVE ARC — MANDATORY

**From the 24-item story explanation, use ALL items to construct a composition that captures the journey.**

**DO NOT derive concepts without running 24-item story explanation first. The concept MUST come from the FULL narrative arc (all 24 items).**

### The Key Question

Look at your 24-item story explanation and ask: **What single composition captures the TRANSFORMATION/JOURNEY/PROCESS?**

**Not just the endpoint - show the ARC:**
- What changes from beginning to end?
- What's the core tension or transformation?
- Can you show MOVEMENT or PROGRESSION?
- What visual metaphor captures the FULL story?

### Physical Conceptual Metaphors Showing JOURNEY

**CRITICAL REQUIREMENT: Concepts MUST use PHYSICAL RECOGNIZABLE objects and actions.**

The concept should be describable in ONE sentence with 2-3 PHYSICAL elements that show TRANSFORMATION:

✅ **GOOD (Physical/Recognizable):**
- "Scissors cutting through a tangled ball of yarn" (physical objects: scissors, yarn; action: cutting)
- "A robot hand and human hand pulling opposite ends of an em dash" (physical objects: hands, em dash; action: pulling)
- "Puzzle pieces being assembled by gestural hands" (physical objects: puzzle pieces, hands; action: assembling)
- "Hands reaching upward toward abstract mountains" (physical objects: hands, mountains; action: reaching)

❌ **BAD (Abstract/Geometric):**
- "A timeline: dense circles → sparse → dense again" (abstract shapes, no recognizable objects)
- "Flowing geometric transformation from chaos to order" (conceptual diagram, not physical scene)
- "Abstract shapes representing data flow" (requires explanation, not instantly readable)

### How to Derive Concept from 24 Items

1. **Read ALL 24 items** — Understand the complete narrative arc
2. **Identify the transformation** — What changes? What's the journey?
3. **Find a PHYSICAL metaphor that shows PROCESS** — Use recognizable objects/actions, NOT abstract shapes
4. **Apply "Instant Picture Test"** — Can you close your eyes and picture this like a photograph?
5. **Reduce to 2-3 PHYSICAL elements** — Scissors, hands, yarn, puzzle pieces, etc. (NOT circles, rectangles, flowing lines)
6. **Ensure it's immediately readable** — No explanation needed, viewer instantly gets it

**Key insight:** Use the RICHNESS of all 24 items to inform a composition that shows JOURNEY through PHYSICAL OBJECTS AND ACTIONS, not abstract geometric representations.

**MANDATORY VALIDATION before proceeding:**
- [ ] Uses recognizable physical objects (scissors, hands, yarn, etc.) ✅
- [ ] Shows clear action (cutting, pulling, assembling, reaching) ✅
- [ ] Passes "Instant Picture Test" - can picture it like a photograph ✅
- [ ] Does NOT use abstract shapes (circles, flowing lines, geometric forms) ❌
- [ ] Does NOT require explanation ("this represents...") ❌

**Output:** ONE sentence describing 2-3 PHYSICAL elements with CLEAR ACTION that capture the narrative ARC.

---

## Step 3: Apply Anthropic Editorial Aesthetic

**Convert your concept into the flat, hand-drawn style.**

### Read the Aesthetic Source

**Always read:** `${PAI_DIR}/skills/CORE/aesthetic.md`

### Core Visual Rules

1. **Background:** Single flat muted earth tone — NO gradients
2. **Linework:** Hand-drawn black ink — imperfect, gestural, variable weight
3. **Style:** Saul Steinberg / New Yorker / risograph aesthetic
4. **Composition:** Objects fill 40-60% of frame, 30-40% negative space
5. **Elements:** 2-3 abstract elements maximum
6. **{{{assistantName}}} Signature:** Small charcoal (#2D2D2D) bottom right

### Color System

**Background:** WHITE #FFFFFF for generation → remove.bg creates TRANSPARENCY

**Primary:** Black linework (#000000) — DOMINANT, carries composition

**Accents (SPARINGLY):**
| Color | Hex | Usage |
|-------|-----|-------|
| Deep Purple | #4A148C | Brand accent - REQUIRED but subtle |
| Deep Teal | #00796B | Secondary accent option |

### Map Your Concept

```
CONCEPT: [Your concept from Step 2]
BACKGROUND: [Pick one color from palette]
ELEMENTS: [2-3 abstract shapes/objects]
LINEWORK: Hand-drawn black, imperfect, gestural
```

**Output:** Your concept translated into the Anthropic aesthetic.

---

## Step 3.5: MANDATORY VALIDATION CHECKPOINT

**STOP. Before constructing the prompt, validate your concept:**

Run through this checklist. If ANY check fails, go back to Step 2 and redesign the concept.

✅ **Physical Object Check:**
- [ ] My concept uses recognizable physical objects (scissors, hands, yarn, puzzle pieces, mountains, etc.)
- [ ] I am NOT using abstract shapes (circles, rectangles, geometric forms, flowing lines)

✅ **Instant Picture Test:**
- [ ] I can close my eyes and picture this scene like a photograph
- [ ] Someone else could draw this from my one-sentence description without further explanation

✅ **Action Check:**
- [ ] My concept shows a clear physical action (cutting, pulling, assembling, reaching, untangling)
- [ ] The action is visible and dynamic

✅ **Readability Check:**
- [ ] The metaphor is immediately readable without explanation
- [ ] I don't need to say "this represents..." to explain what it means

**If all checks pass:** Proceed to Step 4
**If any check fails:** Return to Step 2 and find a PHYSICAL metaphor

---

## Step 4: Construct the Prompt Using UltraThink

**Use UltraThink (extended thinking) to construct the final prompt.**

### Prompt Template

```
Editorial conceptual illustration in Saul Steinberg / New Yorker style.

WHITE BACKGROUND (#FFFFFF) for transparency removal.

STYLE: Hand-drawn black ink linework with these characteristics:
- Variable stroke weight (thicker where pressure would be)
- Imperfect, slightly wobbly lines (human quality)
- Gestural brush strokes, NOT smooth vectors
- Risograph / editorial aesthetic

COMPOSITION (2-3 elements only):
[Describe your abstract metaphor with specific elements]
Elements drawn with bold BLACK LINEWORK as primary.
Purple (#4A148C) as small ACCENT details only.
[Optional secondary accent color] as subtle accent.

COLORS:
- BLACK is the PRIMARY color for all linework and main shapes
- Deep Purple #4A148C as small ACCENT only (hints, not dominant)
- [Secondary accent] sparingly

The image should be predominantly BLACK LINEWORK with color used sparingly as accents.

COMPOSITION: Full-bleed edge-to-edge. NO whitespace or margins.
Elements extend to or bleed off all edges. 100% frame fill.

CRITICAL REQUIREMENTS:
- FLAT colors only — NO gradients, NO shading
- NO shadows of any kind
- Lines must look hand-drawn, NOT perfect vectors
- Color is ACCENT only, black linework dominates

Sign "{{{assistantName}}}" as a tiny artist signature in charcoal (#2D2D2D) bottom right corner.
NO other text anywhere.
```

**IMPORTANT:** Always use `--remove-bg` flag to create transparency.

### Prompt Quality Check

Before generating, verify:
- [ ] ONE composition, not multiple panels
- [ ] 2-3 elements maximum
- [ ] Background color specified with hex
- [ ] "Hand-drawn", "imperfect", "gestural" explicitly stated
- [ ] "NO gradients" explicitly stated
- [ ] "Saul Steinberg" or "New Yorker" style reference
- [ ] SPECIFIC to this content (couldn't be about something else)

**Output:** A complete prompt ready for generation.

---

## Step 5: Execute the Generation

### Default Model: nano-banana-pro

```bash
bun run ${PAI_DIR}/skills/art/tools/generate-ulart-image.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 1:1 \
  --output /path/to/output.png
```

### Alternative Models

| Model | Command | When to Use |
|-------|---------|-------------|
| **flux** | `--model flux --size 1:1` | Maximum quality |
| **gpt-image-1** | `--model gpt-image-1 --size 1024x1024` | Different interpretation |

### Immediately Open

```bash
open /path/to/output.png
```

---

## Step 6: Validation (MANDATORY - DO NOT SKIP)

**🚨 CRITICAL: This step is MANDATORY. You MUST validate the image and regenerate if validation fails. DO NOT declare completion without passing validation.**

### Validation Procedure

1. **Open the generated image** for visual inspection:
```bash
open /path/to/generated-image.png
```

2. **Check ALL criteria below** - If ANY fail, you MUST regenerate

3. **Do NOT proceed** to next steps until validation passes

### Must Have (ALL REQUIRED)
- [ ] **Flat background** — Single solid color, zero gradients
- [ ] **Hand-drawn quality** — Lines are imperfect, variable weight
- [ ] **Black linework** — Not colored lines, not smooth vectors
- [ ] **Abstract metaphor** — Conceptual, not literal
- [ ] **Full-bleed composition** — NO whitespace or margins, elements fill 100% of frame edge-to-edge
- [ ] **Square aspect ratio** — 1:1 format (NOT 16:9 rectangle)
- [ ] **Elements extend to edges** — Composition bleeds off all sides (NOT centered with margins)
- [ ] **Muted earth tone** — Cream/terracotta/sage/peach background (if not transparent)
- [ ] **🎨 COLOR PRESENCE (CRITICAL)** — Purple (#4A148C) and/or Teal (#00796B) MUST be visible and noticeable
  - NOT microscopic hints - should be immediately apparent
  - If you need to zoom in to see color, it's TOO SUBTLE
  - Color should be visible at normal viewing distance
  - Balance: accent, not dominant, but definitely present

### Must NOT Have (ALL FORBIDDEN)
- [ ] Any gradients anywhere
- [ ] Shadows or glows
- [ ] 3D rendering or depth
- [ ] Glossy/shiny surfaces
- [ ] Smooth perfect vector lines
- [ ] Saturated or cool colors
- [ ] Photorealistic elements
- [ ] Too little color (all black with microscopic purple)

### If Validation Fails - REGENERATION REQUIRED

**DO NOT SKIP THIS STEP. If validation fails, you MUST regenerate.**

Common failures and fixes:

| Problem | Fix |
|---------|-----|
| **Not enough color** | Strengthen color requirement: "Deep Purple #4A148C must be VISIBLE and NOTICEABLE - not microscopic. Use on at least 5-10% of main elements. Should be immediately visible when viewing image." |
| Has gradients | Add "FLAT colors only, absolutely NO gradients" more emphatically |
| Lines too smooth | Emphasize "imperfect wobbly hand-drawn brush strokes" |
| Too shiny/glossy | Add "matte, flat, risograph aesthetic" |
| Too detailed | Simplify concept, "minimal abstract" |
| Wrong colors | Specify exact hex codes, "muted earth tones only" |
| Looks like AI art | Reference "Saul Steinberg", "Matisse cutouts", "risograph" |

**Regeneration Process:**
1. Identify which validation criteria failed
2. Update prompt with specific fixes from table above
3. Regenerate using same command with adjusted prompt
4. Open new image and re-validate
5. Repeat until ALL validation criteria pass
6. Only then proceed to completion

**CRITICAL: You are NOT done until validation passes. Declaring completion without validation is a failure.**

---

## Quick Reference

### The Key Insight

**24-ITEM STORY → NARRATIVE ARC → VISUAL JOURNEY → FLAT HAND-DRAWN EDITORIAL**

1. Run 24-item story explanation to get FULL narrative arc
2. Use ALL 24 items to understand transformation/journey/process
3. Find ONE visual metaphor that shows the ARC (not just endpoint)
4. Reduce to 2-3 abstract elements that show MOVEMENT/CHANGE
5. Generate with flat background + hand-drawn black linework

Bad: "Detailed illustration of a complex scene with multiple characters"
Good: "Timeline showing dense circles → sparse → dense again with arrows" (shows journey)
Good: "Scissors mid-cut through tangled yarn ball" (shows process)

### Models

| Model | Command | Best For |
|-------|---------|----------|
| **nano-banana-pro** (DEFAULT) | `--model nano-banana-pro --size 2K --aspect-ratio 1:1` | High quality, good adherence |
| **flux** | `--model flux --size 1:1` | Maximum quality, slower |
| **gpt-image-1** | `--model gpt-image-1 --size 1024x1024` | Minimalism, alternative |

### The Anthropic Look Checklist

Before submitting any image:
- ✅ Flat solid background (cream/terracotta/sage/peach or transparent)
- ✅ Black hand-drawn linework (imperfect, gestural)
- ✅ Abstract conceptual metaphor
- ✅ Full-bleed edge-to-edge composition (NO whitespace or margins)
- ✅ Square 1:1 aspect ratio (NOT 16:9)
- ✅ Elements extend to or bleed off all edges (100% frame fill)
- ✅ 2-3 elements maximum
- ✅ No gradients, shadows, or shine
- ✅ {{{assistantName}}} signature bottom right
- ✅ **COLOR VISIBLE** - Purple and/or Teal must be noticeable (not microscopic)

---

**The workflow: CSE → Concept → Flat Editorial Prompt → Generate → VALIDATE (MANDATORY) → Regenerate if needed → Complete**
