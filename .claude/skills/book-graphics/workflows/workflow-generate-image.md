# Workflow: Generate Book-Style Image

**Purpose:** Generate a new clean, modern, minimal illustration for book content with consistent warm professional aesthetic.

---

## When to Use This Workflow

Use this workflow when:
- User requests a new illustration or diagram for the book
- User wants to visualize a concept, framework, or idea
- User says "create", "generate", "make", or "illustrate"
- User mentions specific chapter or section needing visual content
- User wants a diagram, flowchart, or framework visualization

**Trigger phrases:**
- "Create an illustration for Chapter X"
- "Generate a diagram of [concept]"
- "Make a visual for this framework"
- "Illustrate the idea of [topic]"
- "Visualize [concept] in book style"

---

## Workflow Steps

### Step 1: Understand the Content

**Gather context:**
- What concept/idea needs visualization?
- Which chapter or section is this for?
- What type of image is needed (diagram, illustration, framework)?
- What's the primary message or takeaway?
- Who is the audience?

**Ask clarifying questions if needed:**
- "What's the key point this image should communicate?"
- "Is this a process, framework, concept, or comparison?"
- "Are there specific elements that must be included?"
- "What aspect ratio works best (16:9, 4:3, 1:1)?"

### Step 2: Choose Image Type

**Determine the best visual approach:**

**Framework Diagrams** (2x2 matrices, quadrants):
- Use for: Decision frameworks, categorization, prioritization
- Structure: Grid-based with labeled quadrants
- Colors: Orange for high-priority, blue for analytical
- Example: "Impact vs Effort matrix"

**Process Diagrams** (sequential flows):
- Use for: Step-by-step processes, workflows, timelines
- Structure: Sequential boxes with connecting arrows
- Colors: Orange for start/key steps, blue for processes
- Example: "5-step decision-making process"

**Conceptual Illustrations** (abstract representations):
- Use for: Ideas, metaphors, abstract concepts
- Structure: 3-5 shapes representing the idea
- Colors: Orange for warm/human, blue for technical
- Example: "Feedback loops as circular flow"

**Comparison Diagrams** (side-by-side, before/after):
- Use for: Contrasting approaches, A vs B scenarios
- Structure: Two sections with clear separation
- Colors: Orange for one side, blue for the other
- Example: "Fixed mindset vs Growth mindset"

### Step 3: Define Composition

**Plan the visual structure:**

**Element count:** 2-5 components maximum
- List each element explicitly
- Ensure each serves a clear purpose
- Remove anything non-essential

**Layout strategy:**
- Grid-based for frameworks and structures
- Linear flow for processes and sequences
- Circular/radial for cycles and systems
- Side-by-side for comparisons

**Spacing requirements:**
- 30-40% white space minimum
- Generous padding around elements (20-40px)
- Clear separation between components
- Breathing room for clarity

### Step 4: Build the Prompt

**Use the comprehensive prompt template:**

```markdown
[Describe the content/concept to visualize]

Clean modern minimal illustration in professional warm book style.

AESTHETIC:
- Vector-like, smooth, high-quality professional illustration
- Notion × Stripe Docs × Apple Keynote aesthetic
- Warm, approachable, slightly nerdy/technical vibe
- Framework diagram clarity and systems-thinking structure

COMPOSITION:
- [Element 1: describe shape, size, position]
- [Element 2: describe shape, size, position]
- [Element 3: describe shape, size, position]
- [Add 2-5 elements total]
- Minimal composition with generous white space (30-40%)
- Grid-based structured layout
- Clear visual hierarchy with focal point on [specify]

COLORS:
- Background: Pure white (#FFFFFF)
- Primary accent: Warm orange (#FF6B35) on [specify elements]
- Secondary accent: Light blue (#5AB9EA) and medium blue (#3A8FCC) on [specify elements]
- Structure: Dark grey (#4A4A4A) for text and outlines
- Neutrals: Light grey (#E0E0E0) for borders and dividers

EFFECTS:
- Soft gradients on [specify elements]: subtle [color] to [color] transitions
- Soft shadows: 10-12px blur, 12% opacity black on all elements for depth
- Clean strokes: 2-4px weight, smooth curves, 8px rounded corners
- Subtle glow on focal point: [color] at 20% opacity, 16px blur

DIMENSIONS:
- Aspect ratio: [16:9 | 4:3 | 1:1 | 3:2]
- Minimum resolution: 2K (2048px wide)
- Format: PNG with transparency

STYLE REQUIREMENTS:
- Smooth vector-like strokes (NOT hand-drawn or sketchy)
- Clean professional edges (NOT rough or imperfect)
- Light background (NOT dark)
- Minimal elements (NOT cluttered)
- Soft gradients (NOT harsh transitions)
- Generous spacing (NOT cramped)

NEGATIVE PROMPTS:
--no hand-drawn --no sketchy --no rough edges --no Excalidraw
--no dark background --no black background
--no photorealistic --no photograph --no texture
--no neon colors --no harsh colors
--no clutter --no chaos --no excessive detail
--no imperfect strokes --no wobbly lines
```

### Step 5: Generate Using skill.ts

**Option A: Use TypeScript CLI**

```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "[prompt text]" \
  --chapter="Chapter X" \
  --type=[diagram|illustration|framework|concept] \
  --ratio=[16:9|4:3|1:1|3:2] \
  --output=/path/to/output.png
```

**Option B: Manual with AI Image Generator**

Use the prompt template from Step 4 with:
- Stable Diffusion / DALL-E / Midjourney / Gemini / etc.
- Ensure negative prompts are applied
- Set resolution to 2K minimum
- Request PNG format

### Step 6: Quality Check

**Review against style reference checklist:**

**Style Consistency:**
- [ ] Clean vector-like (not hand-drawn)
- [ ] Warm professional feel
- [ ] Light background (white or light grey)
- [ ] Uses defined color palette
- [ ] Matches Notion × Stripe × Keynote aesthetic

**Composition:**
- [ ] 2-5 elements (not cluttered)
- [ ] 30-40% white space
- [ ] Clear hierarchy
- [ ] Grid-aligned
- [ ] Obvious focal point

**Colors:**
- [ ] Warm orange primary accent
- [ ] Blues as secondary
- [ ] White/light grey background
- [ ] Black/dark grey text
- [ ] Follows color system

**Effects:**
- [ ] Soft shadows (10-15% opacity)
- [ ] Subtle gradients
- [ ] Clean strokes
- [ ] High resolution (2K+)
- [ ] Professional polish

**Violations to catch:**
- [ ] NO hand-drawn or sketchy
- [ ] NO dark backgrounds
- [ ] NO photorealistic
- [ ] NO clutter
- [ ] NO harsh colors

### Step 7: Iterate if Needed

**If image doesn't match style:**

1. **Identify the issue:**
   - Too sketchy/hand-drawn → Add stronger negative prompts
   - Wrong colors → Specify hex codes explicitly
   - Too cluttered → Reduce elements, increase spacing
   - Dark background → Emphasize white/light background requirement
   - Lacks warmth → Increase orange accent prominence

2. **Refine the prompt:**
   - Add more specific color hex codes
   - Strengthen negative prompts
   - Be more explicit about composition
   - Reference style guide sections directly

3. **Regenerate:**
   - Use refined prompt
   - Consider different generator if style consistently off
   - Iterate maximum 2-3 times before reassessing approach

### Step 8: Save and Document

**File naming convention:**
```
chapter-X-[concept-name]-[type].png

Examples:
- chapter-3-decision-framework-diagram.png
- chapter-1-feedback-loops-illustration.png
- chapter-5-impact-effort-matrix-framework.png
```

**Documentation:**
- Save original prompt used
- Note any iterations or refinements
- Record which generator/model was used
- Document aspect ratio and resolution
- Add to chapter assets list

---

## Sample Commands

### Example 1: Decision Framework
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "2x2 decision framework showing Impact (high/low) vs Effort (high/low) matrix with four quadrants: Quick Wins (high impact, low effort), Strategic Projects (high impact, high effort), Fill-Ins (low impact, low effort), and Time Wasters (low impact, high effort). Clean boxes with labels." \
  --chapter="Chapter 3: Decision Making" \
  --type=framework \
  --ratio=4:3 \
  --output=./chapter-3-impact-effort-matrix.png
```

### Example 2: Process Flow
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "5-step process flow from left to right: 1) Identify Problem (orange), 2) Gather Information (blue), 3) Analyze Options (blue), 4) Make Decision (orange), 5) Review Outcome (blue). Connected with arrows." \
  --chapter="Chapter 2: Problem Solving" \
  --type=diagram \
  --ratio=16:9 \
  --output=./chapter-2-problem-solving-process.png
```

### Example 3: Conceptual Illustration
```bash
bun run ${PAI_DIR}/.claude/skills/book-graphics/skill.ts generate \
  "Feedback loop concept with central circle labeled 'Action' and three smaller circles orbiting: 'Observe', 'Reflect', 'Adjust'. Curved arrows showing circular flow. Minimal and clean." \
  --chapter="Chapter 4: Learning Systems" \
  --type=illustration \
  --ratio=1:1 \
  --output=./chapter-4-feedback-loops.png
```

---

## Expected Output

**Successful generation produces:**

1. **High-quality image file:**
   - 2K+ resolution PNG
   - Clean vector-like aesthetic
   - Warm professional style
   - Consistent with book visual identity

2. **Prompt documentation:**
   - Full prompt text saved
   - Generation parameters recorded
   - Any refinements noted

3. **Ready for book:**
   - Proper aspect ratio
   - Transparent or white background
   - Matches surrounding images stylistically
   - Communicates concept clearly

**Quality indicators:**
- Immediate visual clarity (concept understood in 2-3 seconds)
- Professional polish (ready for publication)
- Style consistency (feels like same book as other images)
- Warm approachable aesthetic (not cold or corporate)
- Technical clarity (diagrams are accurate and structured)

---

## Troubleshooting

**Problem: Image is too sketchy/hand-drawn**
- Solution: Strengthen negative prompts, emphasize "vector-like smooth professional"

**Problem: Dark background instead of light**
- Solution: Explicitly state "pure white background (#FFFFFF)" multiple times

**Problem: Wrong colors used**
- Solution: Use exact hex codes, list all colors explicitly, add negative prompts for unwanted colors

**Problem: Too cluttered or complex**
- Solution: Reduce elements to 2-5 maximum, specify "minimal composition", increase white space requirement

**Problem: Lacks warmth/feels cold**
- Solution: Increase orange accent prominence, add "warm approachable professional" descriptors

**Problem: Photorealistic or too textured**
- Solution: Add stronger negatives: "--no photorealistic --no photograph --no texture --no noise"

---

## Related Workflows

- **Refine style:** `workflow-refine-style.md` - Adjust existing image
- **Batch generate:** `workflow-batch-generate.md` - Create multiple images
- **Style reference:** `${PAI_DIR}/.claude/skills/book-graphics/style-reference.md` - Complete style guide

---

**This workflow ensures every book image has consistent clean modern minimal aesthetic with warm professional polish.**
