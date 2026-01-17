# Video Generation Workflow

**AI-generated video content using Google Veo models.**

---

## Purpose

Generate short-form video content for blogs, social media, product demos, and editorial illustrations.

**Use for:** B-roll footage, animated diagrams, product demos, social clips, blog headers.

---

## Models & Pricing

| Model | Cost/Second | Use Case |
|-------|-------------|----------|
| veo-3.1 | $0.40 (4K: $0.60) | Final production content |
| veo-3.1-fast | $0.15 (4K: $0.35) | Quick drafts, iterations |
| veo-3 | $0.40 | High-quality generation |
| veo-3-fast | $0.15 | Budget-conscious drafts |
| veo-2 | $0.35 | Legacy compatibility |

**Cost Examples:**
- 8s draft (veo-3.1-fast): $1.20
- 8s final (veo-3.1): $3.20
- 30s video (veo-3.1): ~$12.00

---

## Visual Aesthetic

**Style:** Same Excalidraw hand-drawn aesthetic as images - professional, conceptual, dark-mode.

### Core Rules

1. **Smooth animation** - Subtle motion, no jarring cuts
2. **Hand-drawn feel** - Lines can appear as if being drawn
3. **Dark background #0a0a0f** - Consistent with overall aesthetic
4. **Strategic color** - PAI Blue for key elements, Cyan for secondary
5. **Loopable** - Design 8s clips to loop seamlessly when possible

---

## Workflow Steps

### Step 1: Determine Video Type

| Type | Duration | Model | Notes |
|------|----------|-------|-------|
| Social clip | 8s | veo-3.1-fast | Quick, loopable |
| Blog header | 8s | veo-3.1 | Higher quality |
| B-roll | 8-16s | veo-3.1-fast | Background footage |
| Product demo | 30-60s | veo-3.1 | Needs extensions |
| Animated diagram | 8s | veo-3.1 | Technical content |

---

### Step 2: Design the Motion

**Before generating:**

1. **What moves?**
   - Identify 1-3 elements that should animate
   - Keep motion minimal and purposeful

2. **Motion type:**
   - Draw-on effect (lines appearing as if drawn)
   - Subtle float/pulse (icons gently moving)
   - Flow animation (connections/arrows moving)
   - Transition (element A transforms to B)

3. **Camera:**
   - Static (default - most professional)
   - Slow zoom (adds drama)
   - Slow pan (reveals composition)

---

### Step 3: Construct the Prompt

### Video Prompt Template

```
[MOTION TYPE] animation of [SUBJECT] on dark background.

BACKGROUND: Pure dark #0a0a0f - clean, no texture.

SUBJECT: [WHAT TO ANIMATE - the core visual concept]

MOTION:
- [Describe the primary animation]
- [Describe secondary animation if any]
- Smooth, subtle movement
- Professional quality

STYLE - EXCALIDRAW HAND-DRAWN:
- Gestural, slightly imperfect lines
- Lines appear as if being sketched
- Hand-drawn quality (NOT clean vectors)
- Organic, approachable feel

COLOR:
- Dark background #0a0a0f (MANDATORY)
- White #e5e7eb for line work
- PAI Blue #4a90d9 for key elements (15-20%)
- Cyan #22d3ee for accents (5-10%)

DURATION: Designed for 8-second loop
CAMERA: [Static/Slow zoom/Slow pan]
```

---

### Step 4: Execute Generation

**Quick draft:**
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1-fast \
  --prompt "[YOUR PROMPT]" \
  --aspect-ratio 16:9 \
  --output ~/Downloads/video.mp4
```

**Final quality:**
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "[YOUR PROMPT]" \
  --aspect-ratio 16:9 \
  --output ~/Downloads/video.mp4
```

**With audio:**
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "[YOUR PROMPT]" \
  --audio \
  --output ~/Downloads/video.mp4
```

**From existing image:**
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Animate this illustration with [MOTION DESCRIPTION]" \
  --first-frame ~/Downloads/image.png \
  --output ~/Downloads/video.mp4
```

**Cost estimation:**
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "..." \
  --duration 30 \
  --dry-run
```

---

### Step 5: Extending Videos

For videos longer than 8 seconds, use the extension feature:

```bash
# Generate 30-second video (auto-extends)
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "[YOUR PROMPT]" \
  --duration 30 \
  --output ~/Downloads/video.mp4

# Extend an existing video
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Continue the scene..." \
  --extend \
  --input-video ~/Downloads/short.mp4 \
  --duration 30 \
  --output ~/Downloads/extended.mp4
```

**Extension guidelines:**
- Each extension adds ~7 seconds
- Max ~148 seconds (20 extensions)
- Use consistent prompts for coherent extensions
- Cost increases linearly with duration

---

### Step 6: Validation

### Must Have
- [ ] Smooth, professional motion
- [ ] Dark background #0a0a0f
- [ ] Hand-drawn Excalidraw aesthetic
- [ ] Strategic color usage
- [ ] No audio unless specifically requested
- [ ] Correct duration

### Must NOT Have
- [ ] Jarring cuts or transitions
- [ ] Light/white backgrounds
- [ ] Perfect clean vectors (should look hand-drawn)
- [ ] Excessive or distracting motion
- [ ] Watermarks or text overlays

---

## Advanced Techniques

### Image-to-Video (Animation)

Use an Art-generated image as the first frame for consistent style:

1. Generate the image first:
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[IMAGE PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/frame.png
```

2. Animate it:
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Subtle animation: [DESCRIBE MOTION]" \
  --first-frame ~/Downloads/frame.png \
  --output ~/Downloads/animated.mp4
```

### First + Last Frame Control (Veo 3.1 only)

Control both start and end states:

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Smooth transition from first to last frame" \
  --first-frame ~/Downloads/start.png \
  --last-frame ~/Downloads/end.png \
  --output ~/Downloads/transition.mp4
```

### Negative Prompts

Exclude unwanted elements:

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "[YOUR PROMPT]" \
  --negative-prompt "text, watermarks, logos, light background, cartoon style" \
  --output ~/Downloads/video.mp4
```

---

## Use Case Examples

### Blog Header Animation

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1-fast \
  --prompt "Draw-on animation effect. Hand-drawn Excalidraw style on dark background #0a0a0f. Security shield icon being sketched with white lines, then filled with blue #4a90d9. Lines appear as if being drawn by hand. Subtle glow effect when complete. Static camera." \
  --aspect-ratio 16:9 \
  --output ~/Downloads/blog-header.mp4
```

### Technical Diagram Animation

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Architecture diagram animation on dark background #0a0a0f. Three boxes connected by arrows. Boxes draw themselves one by one in white #e5e7eb, then arrows animate between them with cyan #22d3ee glow. Pulsing data flow effect along arrows. Hand-drawn Excalidraw style, not perfect vectors. Static camera." \
  --aspect-ratio 16:9 \
  --output ~/Downloads/diagram.mp4
```

### Social Clip

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1-fast \
  --prompt "Loopable animation. AI brain icon gently pulsing with blue #4a90d9 glow on dark background #0a0a0f. Subtle particle effects around it. Hand-drawn Excalidraw aesthetic. Designed for seamless 8-second loop." \
  --aspect-ratio 1:1 \
  --output ~/Downloads/social.mp4
```

---

**The workflow: Design Motion -> Draft with Fast Model -> Final with Standard Model -> Validate**
