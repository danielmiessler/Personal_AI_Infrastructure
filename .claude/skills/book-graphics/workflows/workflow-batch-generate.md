# Workflow: Batch Generate Book-Style Images

**Purpose:** Generate multiple consistent book-style images efficiently with unified aesthetic across all chapters, sections, or concepts.

---

## When to Use This Workflow

Use this workflow when:
- Creating illustrations for multiple chapters simultaneously
- Generating a complete visual system for the book
- Producing series of related diagrams or frameworks
- Building visual content library with consistent style
- User requests multiple images at once

**Trigger phrases:**
- "Generate illustrations for all chapters"
- "Create diagrams for chapters 1-5"
- "Make a complete set of framework visuals"
- "Batch generate book images"
- "Create visuals for these topics: [list]"
- "Generate multiple consistent illustrations"

---

## Workflow Steps

### Step 1: Inventory and Planning

**Gather requirements:**

1. **List all images needed:**
   - Chapter 1: [Image 1 description]
   - Chapter 2: [Image 2 description]
   - Chapter 3: [Image 3 description]
   - ... etc.

2. **Categorize by type:**
   - Frameworks: _____ count
   - Process diagrams: _____ count
   - Conceptual illustrations: _____ count
   - Comparisons: _____ count

3. **Determine specifications:**
   - Common aspect ratio: [16:9 | 4:3 | 1:1]
   - Resolution: 2K minimum
   - Format: PNG with transparency
   - Naming convention: chapter-X-[name]-[type].png

4. **Estimate timeline:**
   - Number of images: _____
   - Generation time per image: ~3-5 minutes
   - Total estimated time: _____
   - Refinement buffer: +20-30%

### Step 2: Create Batch Configuration

**Prepare batch prompts file (JSON format):**

Create `batch-prompts.json`:

```json
{
  "config": {
    "aspectRatio": "16:9",
    "resolution": "2K",
    "outputDir": "./book-images",
    "styleEnforcement": "strict"
  },
  "images": [
    {
      "id": "ch1-decision-framework",
      "chapter": "Chapter 1: Decision Making",
      "type": "framework",
      "prompt": "2x2 decision framework matrix showing Impact (high/low) vs Effort (high/low) with four quadrants: Quick Wins, Strategic Projects, Fill-Ins, Time Wasters. Clean minimal boxes with labels.",
      "colors": {
        "primary": "#FF6B35",
        "secondary": "#5AB9EA",
        "emphasis": ["Quick Wins"]
      }
    },
    {
      "id": "ch2-feedback-loop",
      "chapter": "Chapter 2: Learning Systems",
      "type": "illustration",
      "prompt": "Circular feedback loop with 4 stages: Observe, Reflect, Decide, Act. Arrows connecting in clockwise direction. Central text 'Continuous Learning'. Minimal clean design.",
      "colors": {
        "primary": "#FF6B35",
        "secondary": "#3A8FCC"
      }
    },
    {
      "id": "ch3-process-flow",
      "chapter": "Chapter 3: Problem Solving",
      "type": "diagram",
      "prompt": "5-step horizontal process flow: Define Problem → Analyze → Generate Solutions → Evaluate → Implement. Connected with arrows. Steps 1 and 5 in orange, steps 2-4 in blue.",
      "colors": {
        "primary": "#FF6B35",
        "secondary": "#5AB9EA"
      }
    }
  ]
}
```

**Template fields:**
- `id`: Unique identifier for filename
- `chapter`: Chapter context
- `type`: Image type (framework, diagram, illustration, comparison)
- `prompt`: Core content description
- `colors`: Color guidance (optional, defaults to palette)

### Step 3: Set Up Style Consistency

**Create master style prompt (applied to all):**

Save as `master-style.md`:

```markdown
UNIVERSAL BOOK STYLE - Apply to ALL images:

AESTHETIC:
- Vector-like, smooth, high-quality professional illustration
- Notion × Stripe Docs × Apple Keynote × framework diagrams
- Warm, approachable, slightly nerdy/technical vibe
- Clean modern minimal throughout

COLORS (use these exact colors):
- Background: Pure white (#FFFFFF)
- Primary accent: Warm orange (#FF6B35)
- Secondary accents: Light blue (#5AB9EA), medium blue (#3A8FCC)
- Text/outlines: Dark grey (#4A4A4A), black (#000000)
- Neutrals: Light grey (#E0E0E0) for borders

COMPOSITION (every image):
- 2-5 elements maximum (minimal, not cluttered)
- 30-40% white space minimum
- Grid-based structured layout
- Clear visual hierarchy
- Generous padding (20-40px around elements)

EFFECTS (consistent across all):
- Soft shadows: 10-12px blur, 12% opacity black
- Subtle gradients: where appropriate for depth
- Clean strokes: 2-4px weight, 8px rounded corners
- Professional polish throughout

CONSISTENCY REQUIREMENTS:
- All images must look like they're from the same book
- Same level of minimalism
- Same shadow/gradient treatment
- Same color palette usage
- Same professional polish level

NEGATIVE PROMPTS (apply to all):
--no hand-drawn --no sketchy --no rough edges
--no dark background --no black background
--no photorealistic --no texture --no noise
--no neon colors --no harsh colors --no clutter
--no imperfect strokes --no wobbly lines
```

### Step 4: Execute Batch Generation

**Option A: Using skill.ts CLI**

```bash
# Run batch generation with JSON config
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts batch \
  --prompts=./batch-prompts.json \
  --master-style=./master-style.md \
  --output=./book-images \
  --parallel=3
```

**Option B: Sequential Manual Generation**

For each image in batch:

```bash
# Generate each image
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "[prompt from batch config]" \
  --chapter="[chapter]" \
  --type=[type] \
  --ratio=16:9 \
  --output=./book-images/[id].png
```

**Option C: Parallel with Script**

Create `generate-batch.sh`:

```bash
#!/bin/bash

# Load batch config
BATCH_FILE="./batch-prompts.json"
OUTPUT_DIR="./book-images"
MASTER_STYLE="./master-style.md"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Read style once
STYLE_CONTENT=$(cat "$MASTER_STYLE")

# Parse JSON and generate (pseudo-code)
# In practice, use jq or node script to parse JSON

# Example for each entry:
# bun run skill.ts generate "$PROMPT" \
#   --chapter="$CHAPTER" \
#   --type="$TYPE" \
#   --ratio=16:9 \
#   --output="$OUTPUT_DIR/$ID.png"
```

### Step 5: Quality Control Check

**After generation, validate consistency:**

**Create visual grid for review:**
- Display all generated images in grid layout
- 3-4 images per row
- View at consistent size
- Review side-by-side

**Consistency checklist (across all images):**

**Style Uniformity:**
- [ ] All have vector-like clean aesthetic
- [ ] All use light backgrounds (white/light grey)
- [ ] All use same color palette
- [ ] All have similar level of polish
- [ ] None are sketchy or hand-drawn

**Composition Uniformity:**
- [ ] All have minimal elements (2-5)
- [ ] All have generous white space (30-40%)
- [ ] All have similar composition density
- [ ] All have clear hierarchy
- [ ] All are grid-aligned

**Color Uniformity:**
- [ ] Orange (#FF6B35) used consistently as primary
- [ ] Blues (#5AB9EA, #3A8FCC) used consistently as secondary
- [ ] Text colors consistent (#4A4A4A, #000000)
- [ ] Background colors consistent (white/light grey)
- [ ] Color balance similar across images

**Effects Uniformity:**
- [ ] Shadows have same weight (10-12px blur, 12% opacity)
- [ ] Gradients similarly subtle
- [ ] Stroke weights consistent (2-4px)
- [ ] Rounded corners consistent (8px)
- [ ] Overall depth similar

**Visual Harmony:**
- [ ] All images feel like same book
- [ ] Could be placed adjacent without jarring transitions
- [ ] Same professional warmth throughout
- [ ] Similar technical clarity level
- [ ] Unified visual language

### Step 6: Identify and Refine Outliers

**Detect inconsistencies:**

1. **Compare each image against the group:**
   - Does it stand out negatively?
   - Is the style noticeably different?
   - Are colors off?
   - Is composition inconsistent?

2. **Categorize outliers:**
   - **Style outliers:** Different aesthetic (sketchy, photorealistic, etc.)
   - **Color outliers:** Wrong palette or color balance
   - **Composition outliers:** Too cluttered, too sparse, poor spacing
   - **Quality outliers:** Lower resolution, poor polish

3. **Prioritize refinements:**
   - Critical (breaks consistency): Regenerate
   - Major (noticeable difference): Refine with img2img
   - Minor (slight variation): Manual adjustments or acceptable

**Refine outliers:**

For each outlier:

```bash
# Use refine workflow
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts refine \
  ./book-images/[outlier-id].png \
  "Match consistency with other book images: [specific adjustments]" \
  --maintain-style
```

Or regenerate if too far off:

```bash
# Regenerate with stronger style enforcement
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "[prompt]" \
  --chapter="[chapter]" \
  --type=[type] \
  --ratio=16:9 \
  --output=./book-images/[id]-v2.png
```

### Step 7: Final Consistency Pass

**Create final comparison sheet:**

1. **Export all images to grid:**
   - 4 columns × n rows
   - Same size thumbnails
   - Chapter labels below each

2. **Validate final set:**
   - View zoomed out (overall consistency)
   - View zoomed in (detail quality)
   - Check color harmony across all
   - Verify technical quality

3. **Make final adjustments:**
   - Batch color correction if needed
   - Uniform shadow/gradient adjustments
   - Consistent labeling and typography
   - Resolution and format verification

### Step 8: Document and Organize

**File organization:**

```
book-images/
├── chapter-01/
│   ├── chapter-1-decision-framework-diagram.png
│   └── chapter-1-decision-framework-diagram-prompt.txt
├── chapter-02/
│   ├── chapter-2-feedback-loop-illustration.png
│   └── chapter-2-feedback-loop-illustration-prompt.txt
├── chapter-03/
│   ├── chapter-3-process-flow-diagram.png
│   └── chapter-3-process-flow-diagram-prompt.txt
├── batch-prompts.json
├── master-style.md
└── generation-log.md
```

**Create generation log:**

`generation-log.md`:

```markdown
# Book Graphics Batch Generation Log

**Date:** 2025-11-30
**Total Images:** 15
**Style:** Clean Modern Minimal Book Aesthetic

## Generation Summary

- Total generated: 15
- Refined: 3
- Regenerated: 1
- Final approved: 15

## Image Inventory

| ID | Chapter | Type | Status | Notes |
|----|---------|------|--------|-------|
| ch1-framework | Chapter 1 | Framework | ✅ Approved | Generated v1 |
| ch2-loop | Chapter 2 | Illustration | ✅ Approved | Refined colors v2 |
| ch3-process | Chapter 3 | Diagram | ✅ Approved | Generated v1 |
| ... | ... | ... | ... | ... |

## Consistency Notes

- All images use warm orange (#FF6B35) primary accent
- All have 30-40% white space
- Shadow treatment consistent (12px blur, 12% opacity)
- Professional polish level uniform

## Generation Settings

- Aspect Ratio: 16:9
- Resolution: 2K (2048px wide)
- Format: PNG with transparency
- Model: [Model used]
- Style enforcement: Strict

## Issues Encountered

1. Chapter 2 initially too sketchy → refined to vector style
2. Chapter 5 colors too harsh → regenerated with palette
3. Minor shadow adjustments on Chapters 3, 7, 9

## Lessons Learned

- Stronger negative prompts needed for consistency
- Master style prompt effective for uniformity
- Review in grid format essential for consistency check
```

**Save prompts for each image:**

For each image, save corresponding prompt as `.txt` file:

```
chapter-1-decision-framework-diagram-prompt.txt
chapter-2-feedback-loop-illustration-prompt.txt
etc.
```

---

## Batch Generation Strategies

### Strategy A: Sequential (Safest)

**Approach:**
- Generate one image at a time
- Review and approve before next
- Adjust approach based on each result
- Build consistency iteratively

**Pros:**
- Can catch style drift early
- Adjust prompts between generations
- Lower risk of batch failures

**Cons:**
- Slower overall
- More manual oversight required

**Best for:**
- First batch generation
- Complex or varied image types
- When style is still being refined

### Strategy B: Small Batches (Balanced)

**Approach:**
- Generate 3-5 images at once
- Review batch for consistency
- Refine entire batch before next
- Iterate in groups

**Pros:**
- Faster than sequential
- Still allows for adjustment
- Manageable review process

**Cons:**
- Some wasted generations if style off
- Requires batch refinement capability

**Best for:**
- Moderate image counts (10-30)
- Established style with minor variations
- Balanced speed and quality needs

### Strategy C: Full Parallel (Fastest)

**Approach:**
- Generate all images simultaneously
- Review entire set afterward
- Batch refine all outliers
- One major consistency pass

**Pros:**
- Fastest completion
- Efficient use of resources
- Good for urgent deadlines

**Cons:**
- Higher risk of inconsistencies
- More refinement work potentially
- Requires robust style enforcement

**Best for:**
- Large image counts (30+)
- Well-established style with strong prompts
- When speed is critical

---

## Sample Batch Configurations

### Example 1: Complete Book (12 Chapters)

```json
{
  "config": {
    "aspectRatio": "4:3",
    "resolution": "2K",
    "outputDir": "./book-images",
    "styleEnforcement": "strict",
    "batchSize": 3
  },
  "images": [
    {
      "id": "ch1-intro-framework",
      "chapter": "Chapter 1: Introduction",
      "type": "framework",
      "prompt": "Simple 2x2 matrix introducing book structure..."
    },
    {
      "id": "ch2-concepts-map",
      "chapter": "Chapter 2: Core Concepts",
      "type": "illustration",
      "prompt": "Conceptual map showing relationships between 5 key ideas..."
    }
    // ... 10 more chapters
  ]
}
```

### Example 2: Framework Series (5 Related Diagrams)

```json
{
  "config": {
    "aspectRatio": "16:9",
    "resolution": "2K",
    "outputDir": "./frameworks",
    "styleEnforcement": "strict",
    "consistency": "maximum"
  },
  "images": [
    {
      "id": "framework-decision-making",
      "chapter": "Decision Making Framework",
      "type": "framework",
      "prompt": "2x2 matrix: Impact vs Effort decision framework..."
    },
    {
      "id": "framework-prioritization",
      "chapter": "Prioritization Framework",
      "type": "framework",
      "prompt": "2x2 matrix: Urgency vs Importance prioritization..."
    },
    {
      "id": "framework-evaluation",
      "chapter": "Evaluation Framework",
      "type": "framework",
      "prompt": "2x2 matrix: Quality vs Speed evaluation..."
    },
    {
      "id": "framework-risk",
      "chapter": "Risk Assessment Framework",
      "type": "framework",
      "prompt": "2x2 matrix: Likelihood vs Impact risk assessment..."
    },
    {
      "id": "framework-growth",
      "chapter": "Growth Framework",
      "type": "framework",
      "prompt": "2x2 matrix: Skill vs Challenge growth zone..."
    }
  ]
}
```

### Example 3: Process Diagrams (3-5 Steps Each)

```json
{
  "config": {
    "aspectRatio": "16:9",
    "resolution": "2K",
    "outputDir": "./processes",
    "styleEnforcement": "strict"
  },
  "images": [
    {
      "id": "process-problem-solving",
      "chapter": "Problem Solving Process",
      "type": "diagram",
      "prompt": "5 sequential steps: Define → Analyze → Generate → Evaluate → Implement"
    },
    {
      "id": "process-learning",
      "chapter": "Learning Process",
      "type": "diagram",
      "prompt": "4 sequential steps: Experience → Reflect → Conceptualize → Experiment"
    },
    {
      "id": "process-decision",
      "chapter": "Decision Process",
      "type": "diagram",
      "prompt": "3 sequential steps: Gather Info → Analyze Options → Choose & Act"
    }
  ]
}
```

---

## Batch Commands

### Full Batch Generation
```bash
# Generate all images from config
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts batch \
  --prompts=./batch-prompts.json \
  --master-style=./master-style.md \
  --output=./book-images \
  --parallel=3 \
  --aspect-ratio=16:9
```

### Small Batch (3-5 at a time)
```bash
# Generate first batch
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts batch \
  --prompts=./batch-prompts.json \
  --master-style=./master-style.md \
  --output=./book-images \
  --start=1 \
  --end=5

# Review, then continue
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts batch \
  --prompts=./batch-prompts.json \
  --master-style=./master-style.md \
  --output=./book-images \
  --start=6 \
  --end=10
```

### Regenerate Specific Images
```bash
# Regenerate outliers only
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts batch \
  --prompts=./batch-prompts.json \
  --master-style=./master-style.md \
  --output=./book-images \
  --ids=ch2-loop,ch5-comparison,ch9-framework
```

---

## Expected Output

**Successful batch generation produces:**

1. **Complete image set:**
   - All images generated
   - Consistent style throughout
   - High quality (2K+ resolution)
   - Proper file naming

2. **Documentation:**
   - Generation log
   - Prompt files for each image
   - Consistency notes
   - Configuration files

3. **Organized structure:**
   - Images sorted by chapter
   - Prompts saved alongside
   - Master style document
   - Batch configuration

**Quality indicators:**
- All images look like they're from the same book
- Can be placed side-by-side without jarring differences
- Consistent warm professional aesthetic throughout
- Uniform technical quality and polish
- Ready for publication without further editing

---

## Troubleshooting

**Problem: Style drift across batch**
- Solution: Use stronger master style prompt, generate in smaller batches, review more frequently

**Problem: Some images don't match palette**
- Solution: Add explicit color hex codes to each prompt, use batch color correction tool

**Problem: Inconsistent composition density**
- Solution: Standardize element counts in prompts (e.g., all diagrams have 4 steps), enforce spacing rules

**Problem: Batch taking too long**
- Solution: Increase parallelization, use faster model, or accept longer timeline for quality

**Problem: Too many outliers to refine**
- Solution: Stop batch, refine master style, regenerate entire batch with improved prompts

---

## Related Workflows

- **Single generation:** `workflow-generate-image.md` - Create one image
- **Refinement:** `workflow-refine-style.md` - Adjust existing images
- **Style guide:** `${PAI_DIR}/.claude/skills/book-graphics/style-reference.md` - Complete reference

---

**This workflow ensures efficient generation of multiple book graphics with consistent clean modern minimal aesthetic and warm professional polish across the entire set.**
