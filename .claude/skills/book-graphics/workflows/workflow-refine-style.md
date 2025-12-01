# Workflow: Refine Book-Style Image

**Purpose:** Adjust, refine, or improve an existing image to better match the book's clean modern minimal aesthetic while maintaining consistency.

---

## When to Use This Workflow

Use this workflow when:
- An existing image needs style adjustments
- Colors don't match the book palette
- Composition needs refinement (spacing, elements)
- Image is too cluttered or too sparse
- Style is inconsistent with other book images
- User requests specific improvements or changes

**Trigger phrases:**
- "Refine this image to match the book style"
- "Adjust the colors in this illustration"
- "Make this diagram more minimal"
- "Fix the spacing in this image"
- "Improve consistency with other book images"
- "This needs more warmth / less clutter / better hierarchy"

---

## Workflow Steps

### Step 1: Analyze Current Image

**Identify what needs refinement:**

**Style Issues:**
- [ ] Too sketchy/hand-drawn (needs to be more vector-like)
- [ ] Dark background (needs light background)
- [ ] Wrong color palette (not using book colors)
- [ ] Photorealistic elements (needs illustration style)
- [ ] Rough edges (needs clean smooth strokes)

**Composition Issues:**
- [ ] Too cluttered (too many elements)
- [ ] Insufficient spacing (needs more white space)
- [ ] Poor hierarchy (unclear focal point)
- [ ] Misaligned elements (needs grid structure)
- [ ] Wrong aspect ratio

**Color Issues:**
- [ ] Colors too harsh (needs soft palette)
- [ ] Missing warmth (needs more orange)
- [ ] Wrong blues (not using palette blues)
- [ ] Background color wrong (needs white/light grey)
- [ ] Poor color balance

**Effects Issues:**
- [ ] Shadows too harsh or missing
- [ ] Gradients too aggressive or absent
- [ ] Lack of depth
- [ ] Inconsistent stroke weights
- [ ] Missing or excessive glows

### Step 2: Determine Refinement Approach

**Choose refinement method:**

**Method A: Minor Adjustments** (small tweaks)
- Color corrections
- Spacing adjustments
- Shadow/gradient refinements
- Text/label updates
- Use image editing tools directly

**Method B: Style Transfer** (moderate changes)
- Apply book style to existing composition
- Replace colors with book palette
- Add/refine shadows and gradients
- Maintain core elements, change aesthetic
- Use AI img2img with style enforcement

**Method C: Regeneration** (major changes)
- Keep concept, regenerate with proper style
- Use original as reference only
- Build new prompt with style enforcement
- Complete regeneration with book aesthetic
- Follow generate-image workflow with constraints

### Step 3: Build Refinement Prompt

**For AI-assisted refinement (img2img):**

```markdown
REFINEMENT REQUEST: [Describe specific changes needed]

REFERENCE IMAGE: [Original image path/description]

MAINTAIN FROM ORIGINAL:
- [Element 1 to keep]
- [Element 2 to keep]
- [Core concept/composition]

STYLE CORRECTIONS NEEDED:
[Specify what needs fixing: colors, spacing, effects, etc.]

APPLY BOOK AESTHETIC:
- Vector-like, smooth, high-quality professional illustration
- Notion × Stripe Docs × Apple Keynote aesthetic
- Warm, approachable, slightly nerdy/technical vibe

COLORS (use these exact colors):
- Background: Pure white (#FFFFFF) or light grey (#F8F9FA)
- Primary accent: Warm orange (#FF6B35)
- Secondary accents: Light blue (#5AB9EA), medium blue (#3A8FCC)
- Structure: Dark grey (#4A4A4A) for text and outlines
- Neutrals: Light grey (#E0E0E0) for borders

COMPOSITION ADJUSTMENTS:
- [Specific spacing changes]
- [Element additions/removals]
- [Hierarchy improvements]
- Ensure 30-40% white space minimum

EFFECTS:
- Soft shadows: 10-12px blur, 12% opacity black
- Subtle gradients: [specify where]
- Clean strokes: 2-4px weight, 8px rounded corners
- [Any specific effect adjustments]

CRITICAL FIXES:
- [Most important change 1]
- [Most important change 2]
- [Most important change 3]

STYLE ENFORCEMENT:
- Smooth vector-like (NOT sketchy)
- Light background (NOT dark)
- Book color palette only (NOT arbitrary colors)
- Minimal and spacious (NOT cluttered)
- Professional polish (NOT rough)

NEGATIVE PROMPTS:
--no hand-drawn --no sketchy --no rough edges
--no dark background --no black background
--no photorealistic --no texture --no noise
--no neon colors --no harsh colors --no clutter
--no imperfect strokes --no wobbly lines
```

### Step 4: Execute Refinement

**Option A: Manual Editing (Minor Adjustments)**

Using image editing software (Figma, Sketch, Illustrator, Photoshop):

1. **Color corrections:**
   - Replace colors with exact hex codes from palette
   - Use color replacement or adjustment layers
   - Ensure consistency with style reference

2. **Spacing adjustments:**
   - Increase padding around elements
   - Add more white space
   - Align to grid (8px or 16px)

3. **Effects refinements:**
   - Add/adjust soft shadows (10-12px blur, 12% opacity)
   - Apply subtle gradients where needed
   - Ensure consistent stroke weights (2-4px)

4. **Element refinements:**
   - Round corners to 8px radius
   - Smooth any rough edges
   - Adjust hierarchy through size/color

**Option B: AI-Assisted (img2img)**

```bash
# Using skill.ts refine function
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts refine \
  /path/to/original-image.png \
  "Make colors match book palette (orange #FF6B35, blue #5AB9EA), increase white space, add soft shadows" \
  --maintain-style
```

Or manually with AI image generator:
- Upload original image
- Apply refinement prompt from Step 3
- Use img2img with moderate denoising (0.4-0.6)
- Set style weight high for enforcement

**Option C: Complete Regeneration**

```bash
# When changes are too extensive, regenerate
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "[Original concept] with refinements: [specific changes]" \
  --chapter="[Chapter]" \
  --type=[diagram|illustration|framework] \
  --ratio=[aspect-ratio] \
  --output=/path/to/refined-image.png
```

### Step 5: Compare and Validate

**Side-by-side comparison:**

Create comparison view:
- Original image (left)
- Refined image (right)
- Style reference sample (for comparison)

**Validate improvements:**

**Style Checklist:**
- [ ] More vector-like and professional
- [ ] Light background (white or light grey)
- [ ] Book color palette used
- [ ] Warm professional aesthetic achieved
- [ ] Matches Notion × Stripe × Keynote style

**Composition Checklist:**
- [ ] Less cluttered (2-5 elements)
- [ ] More white space (30-40%+)
- [ ] Better hierarchy
- [ ] Grid-aligned
- [ ] Clear focal point

**Color Checklist:**
- [ ] Orange (#FF6B35) as primary accent
- [ ] Blues (#5AB9EA, #3A8FCC) as secondary
- [ ] Proper neutrals (#4A4A4A, #E0E0E0)
- [ ] White/light background
- [ ] Color harmony achieved

**Effects Checklist:**
- [ ] Soft shadows added/refined
- [ ] Subtle gradients where appropriate
- [ ] Clean smooth strokes
- [ ] Professional polish
- [ ] Consistent with other book images

### Step 6: Iterate if Needed

**If refinement insufficient:**

1. **Assess the gap:**
   - What's still not matching the style?
   - Is it a color, composition, or effect issue?
   - How far off from the target aesthetic?

2. **Adjust approach:**
   - **Still too different?** → Use Method C (regenerate)
   - **Close but needs tweaks?** → Iterate with Method A or B
   - **Specific element issue?** → Focus refinement on that element

3. **Refine the refinement prompt:**
   - Be more specific about exact changes
   - Add stronger negative prompts
   - Reference style guide sections explicitly
   - Use exact hex codes for colors

4. **Apply and revalidate:**
   - Maximum 2-3 refinement iterations
   - If still not working, regenerate from scratch
   - Document what approach worked

### Step 7: Consistency Check

**Compare with other book images:**

Place refined image alongside 3-5 other book images:

**Visual consistency check:**
- [ ] Color palette matches across all images
- [ ] Similar level of minimalism
- [ ] Consistent shadow/gradient treatment
- [ ] Same professional polish level
- [ ] Uniform spacing and composition style
- [ ] All feel like they're from the same book

**If inconsistencies found:**
- Adjust refined image to match majority style
- Or consider updating other images to match new direction
- Ensure style guide is being followed consistently

### Step 8: Document and Save

**File management:**

```
Naming convention:
[original-name]-refined-v[version].png

Examples:
- chapter-3-framework-refined-v1.png
- chapter-1-illustration-refined-v2.png
- decision-matrix-refined-final.png
```

**Documentation:**
- Save original image for reference
- Document what was changed and why
- Record refinement prompt used
- Note which method worked best
- Update asset list with new version

**Archive:**
- Keep original in `/originals/` folder
- Save refinement notes in `/refinements/` folder
- Store final version in chapter assets

---

## Common Refinement Scenarios

### Scenario 1: Colors Don't Match Palette

**Problem:** Image uses random colors instead of book palette

**Solution:**
1. Identify all colors in image
2. Map to nearest book palette colors:
   - Any warm color → Warm orange (#FF6B35)
   - Any cool color → Light/medium blue (#5AB9EA, #3A8FCC)
   - Any dark text → Black or dark grey (#000000, #4A4A4A)
   - Background → White (#FFFFFF)
3. Replace colors systematically
4. Ensure contrast still works

**Refinement prompt:**
```
Replace all colors with book palette:
- Warm accents: #FF6B35 (warm orange)
- Cool accents: #5AB9EA (light blue), #3A8FCC (medium blue)
- Text/outlines: #4A4A4A (dark grey)
- Background: #FFFFFF (pure white)
Maintain composition and elements, only change colors.
```

### Scenario 2: Too Cluttered

**Problem:** Too many elements, insufficient white space

**Solution:**
1. Identify essential elements (2-5 max)
2. Remove decorative or redundant items
3. Increase spacing between remaining elements
4. Expand margins and padding
5. Ensure 30-40% white space minimum

**Refinement prompt:**
```
Simplify to 2-5 essential elements only.
Remove decorative items, excessive detail, redundant elements.
Increase spacing: 40px between elements, 30-40% white space.
Clean minimal composition with generous breathing room.
```

### Scenario 3: Wrong Aesthetic (Too Sketchy)

**Problem:** Hand-drawn/sketchy style instead of vector-like clean

**Solution:**
1. Regenerate with strong style enforcement
2. Emphasize "vector-like smooth professional"
3. Add aggressive negative prompts
4. Reference Notion/Stripe/Keynote aesthetics explicitly

**Refinement prompt:**
```
Transform to clean vector-like professional style.
Smooth Bézier curves, perfect circles, clean edges.
NO sketchy, NO hand-drawn, NO rough strokes, NO imperfections.
Professional polish like Notion illustrations.
High-quality vector aesthetic throughout.
```

### Scenario 4: Dark Background

**Problem:** Dark background instead of light

**Solution:**
1. Invert background to white
2. Adjust element colors for contrast
3. Ensure text remains readable
4. Update shadows for light background

**Refinement prompt:**
```
Change background to pure white (#FFFFFF).
Adjust all elements for proper contrast on light background.
Text: dark grey or black (#4A4A4A, #000000)
Shadows: subtle (10-15% opacity black)
Maintain composition, invert color scheme for light background.
```

### Scenario 5: Insufficient Depth

**Problem:** Flat appearance, no shadows or gradients

**Solution:**
1. Add soft shadows to all elements
2. Apply subtle gradients on primary shapes
3. Create visual hierarchy through depth
4. Ensure effects are consistent

**Refinement prompt:**
```
Add depth with soft shadows and subtle gradients.
Shadows: 10-12px blur, 12% opacity black on all elements
Gradients: soft transitions on primary shapes (orange/blue)
Create hierarchy: stronger shadows on focal points
Professional depth without being excessive.
```

---

## Sample Commands

### Example 1: Color Correction
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts refine \
  ./chapter-2-original.png \
  "Replace colors with book palette: orange #FF6B35 for warm accents, blue #5AB9EA for cool accents, white #FFFFFF background" \
  --maintain-style
```

### Example 2: Spacing Improvements
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts refine \
  ./chapter-4-diagram.png \
  "Increase white space to 40%, add 30px padding around elements, reduce to 4 key components only" \
  --maintain-style
```

### Example 3: Style Transform
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts refine \
  ./chapter-1-sketch.png \
  "Transform from sketchy to clean vector-like professional style, smooth all edges, apply Notion aesthetic" \
  --maintain-style
```

---

## Expected Output

**Successful refinement produces:**

1. **Improved image:**
   - Better matches book aesthetic
   - Addresses identified issues
   - Maintains original concept
   - Consistent with other images

2. **Documentation:**
   - Refinement notes recorded
   - Changes documented
   - Before/after comparison saved

3. **Validation:**
   - Passes style checklist
   - Consistent with book images
   - Ready for publication

**Quality indicators:**
- Seamlessly fits with other book images
- Professional polish maintained
- Original concept preserved
- Style violations corrected

---

## Troubleshooting

**Problem: Refinement changes too much**
- Solution: Lower denoising strength, be more specific about what to keep

**Problem: Colors still don't match**
- Solution: Use exact hex codes multiple times in prompt, manual editing may be needed

**Problem: Lost important elements**
- Solution: Explicitly list elements to maintain, reduce scope of changes

**Problem: Style still inconsistent**
- Solution: Consider full regeneration (Method C) instead of refinement

---

## Related Workflows

- **Generate new image:** `workflow-generate-image.md` - Create from scratch
- **Batch generation:** `workflow-batch-generate.md` - Multiple images
- **Style guide:** `${PAI_DIR}/.claude/skills/book-graphics/style-reference.md` - Complete reference

---

**This workflow ensures existing images can be refined to match the book's clean modern minimal aesthetic with warm professional consistency.**
