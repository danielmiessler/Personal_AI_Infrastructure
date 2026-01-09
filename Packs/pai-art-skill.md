---
name: Kai Art Skill
pack-id: danielmiessler-kai-art-skill-core-v1.1.0
version: 1.1.0
author: danielmiessler
description: Visual content generation with Excalidraw hand-drawn aesthetic - technical diagrams, comics, editorial illustrations
type: skill
purpose-type: [creativity, productivity, development]
platform: claude-code
dependencies: []
keywords: [art, visualization, diagrams, comics, excalidraw, hand-drawn, technical-diagrams, image-generation, illustrations, dark-mode]
---

<p align="center">
  <img src="icons/kai-art-skill.png" alt="Kai Art Skill" width="256">
</p>

# Kai Art Skill

> Visual content generation system with Excalidraw hand-drawn aesthetic - technical diagrams, comics, and editorial illustrations with consistent dark-mode styling

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [How PAI Packs Work](../README.md#-how-pai-packs-work)

This pack adds a complete visual content generation skill to your AI infrastructure. The Art Skill provides:

- **Technical Diagrams**: Clean Excalidraw-style architecture and process diagrams
- **Editorial Illustrations**: Header images and editorial art for blog posts
- **Comics**: Sequential panel storytelling with sophisticated editorial style
- **Consistent Aesthetic**: Dark-mode, tech-forward color palette with hand-drawn feel
- **CLI Tool**: Deterministic image generation with multiple AI model backends

**Core principle:** Consistent, professional visual content with zero manual design work.

The skill routes requests to specialized workflows that handle the prompt construction, model selection, and validation automatically.

Please follow the installation instructions below to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Art skill | `skills/Art/SKILL.md` | Routing and quick reference |
| Aesthetic config | `skills/Art/Aesthetic.md` | Style preferences and palette |
| Generate tool | `skills/Art/Tools/Generate.ts` | Multi-model image generation CLI |
| Technical diagrams | `skills/Art/Workflows/TechnicalDiagrams.md` | Architecture diagram workflow |
| Essay headers | `skills/Art/Workflows/Essay.md` | Blog header image workflow |
| Comics workflow | `skills/Art/Workflows/Comics.md` | Sequential panel generation |

**Summary:**
- **Files created:** 8+ (skill, tool, workflows)
- **Hooks registered:** 0 (skill-based, not hook-based)
- **Dependencies:** kai-core-install (required), API keys for image models

---

## The Concept and/or Problem

AI image generation is powerful but inconsistent. Each request requires:

1. **Prompt Engineering**: Figuring out what words produce the desired style
2. **Model Selection**: Choosing between Flux, DALL-E, Gemini, etc.
3. **Size/Format Decisions**: Aspect ratios, resolutions, file formats
4. **Post-Processing**: Background removal, thumbnails, optimization
5. **Style Consistency**: Making sure each image matches your brand

**The Problems:**

**Inconsistent Results:**
- Same prompt produces wildly different styles across sessions
- No visual language continuity between images
- Each request starts from scratch

**Prompt Overhead:**
- Remembering which phrases produce good results
- Re-discovering effective prompts each time
- No institutional knowledge about what works

**Technical Complexity:**
- Different models have different APIs and parameters
- Background removal requires additional tools
- Thumbnail generation needs manual intervention

**Quality Control:**
- No validation that output matches intent
- Easy to accept "good enough" when great is achievable
- No checklist for what makes an image complete

**The Result:**

Without a systematic approach, AI image generation becomes a time sink. You spend more time fighting the tools than creating content. Visual consistency across your work is impossible.

---

## The Solution

The Art Skill solves this through **workflow-based generation**. Instead of raw prompts, you describe what you need and the skill:

1. **Routes** your request to the appropriate workflow (diagrams, essays, comics)
2. **Applies** a consistent aesthetic (Excalidraw hand-drawn, dark-mode colors)
3. **Constructs** an optimized prompt using proven templates
4. **Executes** with the right model, size, and post-processing
5. **Validates** the output against quality criteria

**Architecture:**

```
User Request ("create a diagram of the auth flow")
     |
     v
[SKILL.md Routing] ─── Routes based on request type
     |
     v
[Workflow] ─── TechnicalDiagrams.md / Essay.md / Comics.md
     |          - Aesthetic guidelines
     |          - Prompt template
     |          - Validation checklist
     v
[Generate.ts CLI] ─── Deterministic image generation
     |               - Model selection
     |               - Size/aspect handling
     |               - Background removal
     |               - Thumbnail generation
     v
[Output] ─── Validated image ready for use
```

**Key Innovations:**

1. **Aesthetic as Code**: The visual style is documented in Aesthetic.md - colors, typography, composition rules. This ensures every image uses the same visual language.

2. **Workflow Templates**: Each workflow (diagrams, essays, comics) has a proven prompt structure that consistently produces quality results.

3. **Intent-to-Flag Mapping**: User intent ("make it high quality", "create a thumbnail") maps to specific CLI flags. No guessing at parameters.

4. **Validation Checklists**: Each workflow includes must-have and must-not-have criteria. Regenerate until validation passes.

5. **CLI Determinism**: The Generate.ts tool wraps multiple AI models (Flux, Gemini, GPT) behind a consistent interface. Same flags, same behavior.

---

## What Makes This Different

This sounds similar to using AI image generators directly, which also creates images from prompts. What makes this approach different?

The Art Skill treats image generation as a repeatable process, not a creative gamble. By encoding aesthetic decisions, prompt patterns, and quality criteria into structured workflows, you get consistent results without prompt engineering expertise. The skill separates WHAT you want (a technical diagram) from HOW to achieve it (specific prompts, models, and validation).

- Aesthetic consistency enforced through documented color and style guidelines
- Workflow templates eliminate prompt engineering for each request
- CLI tool provides deterministic, composable image generation
- Validation checklists ensure quality before accepting output

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with skill support)
- **Write access** to `$PAI_DIR/` (default: `~/.config/pai`)
- **API Keys in `$PAI_DIR/.env`** (at least one required):
  - `REPLICATE_API_TOKEN` - For Flux and Nano Banana models
  - `GOOGLE_API_KEY` - For Nano Banana Pro (Gemini 3) model
  - `OPENAI_API_KEY` - For GPT-image-1 model
  - `REMOVEBG_API_KEY` - For background removal feature

### Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state.

#### Step 0.1: Detect Current Configuration

```bash
# 1. Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing Skills directory
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Art" ]; then
  echo "WARNING: Art skill already exists at: $PAI_CHECK/skills/Art"
  echo "Contents:"
  ls -la "$PAI_CHECK/skills/Art" 2>/dev/null || echo "  (empty)"
else
  echo "OK: No existing Art skill (clean install)"
fi

# 3. Check for API keys
echo ""
echo "API Key Status:"
[ -n "$REPLICATE_API_TOKEN" ] && echo "  REPLICATE_API_TOKEN: Set" || echo "  REPLICATE_API_TOKEN: NOT SET"
[ -n "$GOOGLE_API_KEY" ] && echo "  GOOGLE_API_KEY: Set" || echo "  GOOGLE_API_KEY: NOT SET"
[ -n "$OPENAI_API_KEY" ] && echo "  OPENAI_API_KEY: Set" || echo "  OPENAI_API_KEY: NOT SET"
[ -n "$REMOVEBG_API_KEY" ] && echo "  REMOVEBG_API_KEY: Set" || echo "  REMOVEBG_API_KEY: NOT SET"
```

#### Step 0.2: Conflict Resolution Matrix

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No Art skill exists | Proceed with Step 1 |
| **Skill Exists** | Art skill already present | Backup existing, then replace |
| **No API Keys** | Missing all API keys | Add at least one key to .env |

#### Step 0.3: Backup Existing Configuration (If Needed)

```bash
# Create timestamped backup if Art skill exists
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Art" ]; then
  BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/skills/Art" "$BACKUP_DIR/Art"
  echo "Backed up existing Art skill to: $BACKUP_DIR/Art"
fi
```

---

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Create Art skill directories
mkdir -p "$PAI_DIR/skills/Art/Workflows"
mkdir -p "$PAI_DIR/skills/Art/Tools"

# Verify structure
echo "Created directories:"
ls -la "$PAI_DIR/skills/Art/"
```

---

### Step 2: Create SKILL.md (Routing File)

```bash
cat > "$PAI_DIR/skills/Art/SKILL.md" << 'SKILL_EOF'
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

  - Technical or architecture diagram → `Workflows/TechnicalDiagrams.md`
  - Blog header or editorial illustration → `Workflows/Essay.md`
  - Comic or sequential panels → `Workflows/Comics.md`

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
→ Invokes TECHNICALDIAGRAMS workflow
→ Creates Excalidraw-style architecture visual
→ Outputs PNG with dark background, blue accents
```

**Example 2: Blog header**
```
User: "create a header for my post about AI agents"
→ Invokes ESSAY workflow
→ Generates hand-drawn illustration
→ Saves to ~/Downloads/ for preview
```

**Example 3: Comic strip**
```
User: "create a comic showing the before/after of using AI"
→ Invokes COMICS workflow
→ Creates 3-4 panel sequential narrative
→ Editorial style, not cartoonish
```
SKILL_EOF

echo "Created SKILL.md"
```

---

### Step 3: Create Aesthetic.md (Color and Style Reference)

```bash
cat > "$PAI_DIR/skills/Art/Aesthetic.md" << 'AESTHETIC_EOF'
# Art Skill Aesthetic

**Excalidraw Hand-Drawn** - Tech-forward dark-mode aesthetic for professional visual content.

---

## Core Style

**Visual Language:** Clean Excalidraw-style diagrams and illustrations
- Hand-drawn feel with slightly imperfect lines
- Organic, approachable, but professional
- Dark mode backgrounds with bright accent colors
- Whiteboard/sketch aesthetic

**Influences:**
- Excalidraw diagrams
- Technical whiteboard sketches
- Modern dark-mode UI design
- Architectural hand-drawings

---

## Color Palette

### Primary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Background** | `#0a0a0f` | 10, 10, 15 | Primary dark background |
| **PAI Blue** | `#4a90d9` | 74, 144, 217 | Key elements, primary accents, main structures |
| **Electric Cyan** | `#22d3ee` | 34, 211, 238 | Flows, connections, secondary paths |
| **Accent Purple** | `#8b5cf6` | 139, 92, 246 | Highlights, insights, callouts (10-15% usage) |

### Text Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Text White** | `#e5e7eb` | 229, 231, 235 | Primary text, labels |
| **Text Muted** | `#9ca3af` | 156, 163, 175 | Secondary text, annotations |

### Surface Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Surface** | `#1a1a2e` | 26, 26, 46 | Cards, panels, elevated surfaces |
| **Line Work** | `#94a3b8` | 148, 163, 184 | Hand-drawn borders, sketch lines |

### Semantic Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Success** | `#22c55e` | Positive states, completion |
| **Warning** | `#f59e0b` | Caution, attention needed |
| **Error** | `#ef4444` | Errors, critical issues |

---

## Color Usage Guidelines

### Ratios

- **Background**: 40-50% of image (dark backdrop)
- **Line Work**: 30-40% (hand-drawn elements in slate/white)
- **PAI Blue**: 15-20% (key components, primary accents)
- **Electric Cyan**: 5-10% (flows, connections)
- **Accent Purple**: 5-10% (highlights, callouts)

### Rules

1. **Dark dominates** - Background and line work make up majority
2. **Blue for structure** - Main components, boxes, important elements
3. **Cyan for flow** - Arrows, connections, data movement
4. **Purple sparingly** - Only for insights, callouts, emphasis
5. **White text always** - Never use dark text on dark background

---

## Typography

### Tier 1: Headers (Valkyrie-style)
- Elegant serif with wedge-shaped serifs
- High stroke contrast
- Use for: Titles, section headers
- Color: White `#e5e7eb`

### Tier 2: Labels (Concourse-style)
- Geometric sans-serif
- Clean, technical, precise
- Use for: Box labels, node names, technical identifiers
- Color: White `#e5e7eb`

### Tier 3: Insights (Advocate-style)
- Condensed italic sans-serif
- Editorial, attention-grabbing
- Use for: Callouts, annotations, key insights
- Color: PAI Blue `#4a90d9` or Electric Cyan `#22d3ee`

---

## Excalidraw Characteristics

### Line Quality
- **Slightly wobbly** - Not perfectly straight
- **Variable weight** - Thicker for emphasis, thinner for details
- **Organic joints** - Imperfect connections between shapes
- **Sketch quality** - Like someone drew it quickly but skillfully

### Shapes
- **Rounded corners** - Soft, not sharp
- **Imperfect rectangles** - Slightly uneven sides
- **Hand-drawn circles** - Not perfect ovals
- **Organic arrows** - Curved, not ruler-straight

### Overall Feel
- Would you believe someone drew this on a whiteboard?
- Professional but approachable
- Technical but not cold
- Modern dark-mode aesthetic

---

## Emotional Registers

Use these to guide the tone of illustrations:

| Register | When to Use | Visual Treatment |
|----------|-------------|------------------|
| **Technical** | Architecture, systems, processes | Clean lines, structured layout |
| **Discovery** | Breakthroughs, new ideas | Light, open composition |
| **Warning** | Security, risks, caution | More contrast, warning colors |
| **Progress** | Before/after, improvements | Flow from left to right |
| **Complexity** | Many components, systems | Organized chaos, clear hierarchy |
| **Simplicity** | Single concepts, focus | Minimal elements, breathing space |

---

## Validation Checklist

Before accepting any generated image:

### Must Have
- [ ] Dark background (`#0a0a0f` or similar)
- [ ] Hand-drawn Excalidraw aesthetic
- [ ] PAI Blue (`#4a90d9`) for key elements
- [ ] White text (`#e5e7eb`) for labels
- [ ] Professional quality
- [ ] Readable at intended size

### Must NOT Have
- [ ] Light/white backgrounds
- [ ] Perfect vector shapes
- [ ] Generic AI illustration style
- [ ] Neon or garish colors
- [ ] Gradients or shadows (keep flat)
- [ ] Too many colors competing
AESTHETIC_EOF

echo "Created Aesthetic.md"
```

---

### Step 4: Create TechnicalDiagrams.md Workflow

```bash
cat > "$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md" << 'TECHDIAGRAM_EOF'
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

**The workflow: Understand → Structure → Compose → Prompt → Generate → Validate**
TECHDIAGRAM_EOF

echo "Created TechnicalDiagrams.md"
```

---

### Step 5: Create Essay.md Workflow

```bash
cat > "$PAI_DIR/skills/Art/Workflows/Essay.md" << 'ESSAY_EOF'
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

**The workflow: Understand → Design → Prompt → Generate → Validate**
ESSAY_EOF

echo "Created Essay.md"
```

---

### Step 6: Create Comics.md Workflow

```bash
cat > "$PAI_DIR/skills/Art/Workflows/Comics.md" << 'COMICS_EOF'
# Editorial Comics Workflow

**Sequential panel storytelling with sophisticated hand-drawn aesthetic.**

---

## Purpose

Editorial comics use sequential panels to explain concepts, tell stories, or illustrate scenarios.

**Use for:**
- Explaining complex concepts through narrative
- Before/during/after sequences
- Illustrated thought experiments
- Multi-step processes shown visually
- Scenario storytelling

---

## Visual Aesthetic

**Style:** Sophisticated sequential art - New Yorker style, NOT cartoonish.

### Core Characteristics

1. **Multi-panel** - 3-4 panels telling sequential story
2. **Editorial style** - Sophisticated, not cutesy
3. **Planeform figures** - Angular, architectural character design
4. **Hand-drawn** - Imperfect linework, gestural quality
5. **Narrative flow** - Panels build to make a point
6. **Minimal dialogue** - Visual storytelling prioritized

---

## Color System

```
Background   #0a0a0f    - Overall dark canvas
Panel BG     #1a1a2e    - Individual panel backgrounds
Line Work    #e5e7eb    - All linework, character outlines
PAI Blue     #4a90d9    - Main character accent
Cyan         #22d3ee    - Secondary character accent
Text         #e5e7eb    - Dialogue, captions
```

### Color Strategy

- Dark overall canvas with slightly lighter panel backgrounds
- Characters primarily white linework
- PAI Blue accent on protagonist
- Cyan on secondary character if needed
- Minimal color - mostly linework

---

## Workflow Steps

### Step 1: Define Comic Narrative

**Plan the story:**

```
COMIC CONCEPT: [What you're illustrating]
PANELS: [3 or 4]

NARRATIVE ARC:
Panel 1: [Setup - initial state]
Panel 2: [Action/Complication - what changes]
Panel 3: [Escalation or Result]
Panel 4: [Punchline/Insight] (if 4 panels)

DIALOGUE (Minimal):
Panel 1: "[Optional text]"
Panel 2: "[Optional text]"
Panel 3: "[Optional text]"
Panel 4: "[Punchline]"

CHARACTERS:
- [Character 1]: [Description, PAI Blue accent]
- [Character 2]: [Description, Cyan accent if needed]
```

---

### Step 2: Design Panel Layout

**Panel arrangement options:**
- Horizontal strip (3-4 panels left to right)
- Vertical strip (3-4 panels top to bottom)
- Grid (2x2 for 4 panels)

**Panel sizing:**
- Equal sized panels (classic)
- Final panel larger (punchline emphasis)

---

### Step 3: Construct Prompt

### Prompt Template

```
Hand-drawn editorial comic strip on dark background.

STYLE: New Yorker cartoon, editorial sophistication, NOT cartoonish.

BACKGROUND: Dark #0a0a0f canvas with #1a1a2e panel backgrounds.

COMIC STRUCTURE: [3-panel / 4-panel] [horizontal / vertical / grid]

PANEL LAYOUT:
- [Number] panels arranged [direction]
- Hand-drawn panel borders (slightly wobbly)
- Panel sizes: [Equal / Varied]

CHARACTER DESIGN - PLANEFORM AESTHETIC:
- Angular planes (like architectural paper models)
- Adult proportions (1:7 head-to-body), elongated
- Faces are minimal geometric blocks
- Emotion through GESTURE and SILHOUETTE
- NOT cute, NOT cartoonish
- Hand-drawn gestural quality with angular construction

COMIC NARRATIVE: "[Overall concept]"

PANEL 1 - [SETUP]:
Scene: [What's happening]
Characters: [Who, doing what]
Dialogue: "[Text]" or no text

PANEL 2 - [COMPLICATION]:
Scene: [What changes]
Characters: [Actions]
Dialogue: "[Text]" or no text

PANEL 3 - [RESULT]:
Scene: [Outcome]
Characters: [Final states]
Dialogue: "[Text]" or no text

PANEL 4 - [PUNCHLINE] (if 4 panels):
Scene: [Revelation]
Characters: [Conclusion]
Dialogue: "[Insight text]"

COLOR USAGE:
- White #e5e7eb for linework and character outlines
- PAI Blue #4a90d9 accent on main character
- Cyan #22d3ee accent on secondary character
- Dark backgrounds throughout

CRITICAL:
- Sophisticated editorial style (NOT cutesy)
- Clear narrative flow across panels
- Character consistency throughout
- Visual storytelling prioritized
- Professional quality
```

---

### Step 4: Determine Aspect Ratio

| Layout | Aspect Ratio |
|--------|--------------|
| 3-panel horizontal | 16:9 or 21:9 |
| 4-panel horizontal | 21:9 |
| 3-panel vertical | 9:16 |
| 4-panel grid (2x2) | 1:1 |

---

### Step 5: Execute Generation

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "[YOUR PROMPT]" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/comic.png
```

---

### Step 6: Validation

### Must Have
- [ ] Clear panel structure
- [ ] Sophisticated editorial aesthetic (NOT cartoonish)
- [ ] Narrative flow across panels
- [ ] Character consistency
- [ ] Hand-drawn quality
- [ ] Dark backgrounds
- [ ] Planeform character design (angular, adult proportions)

### Must NOT Have
- [ ] Cartoonish or cutesy style
- [ ] Round forms on figures (should be angular)
- [ ] Big heads, stubby proportions
- [ ] Detailed cute faces
- [ ] Light backgrounds
- [ ] Busy complex backgrounds
- [ ] Generic AI illustration style

### Character Validation
- [ ] Angular construction (NOT round)
- [ ] Adult proportions 1:7 (NOT stubby 1:3)
- [ ] Minimal geometric faces
- [ ] Emotion through gesture
- [ ] Consistent across panels

---

## Example Narratives

### Example 1: "Before/After AI" (3 panels)
- Panel 1: Person struggling with manual task
- Panel 2: AI assistant appears
- Panel 3: Task completed, person relieved

### Example 2: "Security Theater" (4 panels)
- Panel 1: Fancy lock on flimsy door
- Panel 2: Simple lock on solid door
- Panel 3: Intruder easily bypasses fancy setup
- Panel 4: Stopped by simple solid approach

---

**The workflow: Define → Design → Prompt → Generate → Validate**
COMICS_EOF

echo "Created Comics.md"
```

---

### Step 7: Create Generate.ts Tool

```bash
cat > "$PAI_DIR/skills/Art/Tools/Generate.ts" << 'GENERATE_EOF'
#!/usr/bin/env bun

/**
 * generate - Image Generation CLI
 *
 * Generate images using Flux 1.1 Pro, Nano Banana, Nano Banana Pro, or GPT-image-1.
 * Follows deterministic, composable CLI design.
 *
 * Usage:
 *   bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --output /tmp/image.png
 */

import Replicate from "replicate";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { writeFile, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  // Load from canonical location: $PAI_DIR/.env (single source of truth)
  // Falls back to legacy locations for backwards compatibility
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'), // Legacy location
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break; // Stop after first successful load
    } catch {
      // Continue to next path
    }
  }
}

// ============================================================================
// Types
// ============================================================================

type Model = "flux" | "nano-banana" | "nano-banana-pro" | "gpt-image-1";
type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
type OpenAISize = "1024x1024" | "1536x1024" | "1024x1536";
type GeminiSize = "1K" | "2K" | "4K";
type Size = ReplicateSize | OpenAISize | GeminiSize;

interface CLIArgs {
  model: Model;
  prompt: string;
  size: Size;
  output: string;
  creativeVariations?: number;
  aspectRatio?: ReplicateSize;
  transparent?: boolean;
  referenceImages?: string[]; // Multiple reference images (up to 14 total)
  removeBg?: boolean;
  addBg?: string;
  thumbnail?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: "nano-banana-pro" as Model,
  size: "2K" as Size,
  output: `${process.env.HOME}/Downloads/art-output.png`,
};

const REPLICATE_SIZES: ReplicateSize[] = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "21:9"];
const OPENAI_SIZES: OpenAISize[] = ["1024x1024", "1536x1024", "1024x1536"];
const GEMINI_SIZES: GeminiSize[] = ["1K", "2K", "4K"];
const GEMINI_ASPECT_RATIOS: ReplicateSize[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// ============================================================================
// Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "CLIError";
  }
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }
  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
  console.error(`Unknown error:`, error);
  process.exit(1);
}

// ============================================================================
// Help
// ============================================================================

// PAI directory for documentation paths
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;

function showHelp(): void {
  console.log(`
generate - Image Generation CLI

Generate images using Flux, Nano Banana, Nano Banana Pro, or GPT-image-1.

USAGE:
  bun run Generate.ts --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --model <model>      Model: flux, nano-banana, nano-banana-pro, gpt-image-1
  --prompt <text>      Image generation prompt

OPTIONS:
  --size <size>              Image size (default: 2K for Gemini, 16:9 for others)
                             Replicate: 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                             OpenAI: 1024x1024, 1536x1024, 1024x1536
                             Gemini: 1K, 2K, 4K
  --aspect-ratio <ratio>     Aspect ratio for Gemini (default: 16:9)
  --output <path>            Output path (default: ~/Downloads/art-output.png)
  --reference-image <path>   Reference image for style/character consistency (nano-banana-pro only)
                             Can specify MULTIPLE times for improved consistency
                             API Limits: Up to 5 human refs, 6 object refs, 14 total max
  --transparent              Add transparency instructions to prompt
  --remove-bg                Remove background using remove.bg API
  --add-bg <hex>             Add background color (e.g., "#0a0a0f")
  --thumbnail                Create both transparent + thumbnail versions
  --creative-variations <n>  Generate N variations (1-10)
  --help, -h                 Show this help

EXAMPLES:
  # Technical diagram (recommended)
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 16:9

  # Blog header with thumbnail
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 1:1 --thumbnail

  # Quick draft
  bun run Generate.ts --model nano-banana --prompt "..." --size 16:9

  # MULTIPLE reference images for character consistency (nano-banana-pro only)
  bun run Generate.ts --model nano-banana-pro --prompt "Person from references at a party..." \\
    --reference-image face1.jpg --reference-image face2.jpg --reference-image face3.jpg \\
    --size 2K --aspect-ratio 16:9

MULTI-REFERENCE LIMITS (Gemini API):
  - Up to 5 human reference images for character consistency
  - Up to 6 object reference images
  - Maximum 14 total reference images per request

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux, nano-banana
  GOOGLE_API_KEY       Required for nano-banana-pro
  OPENAI_API_KEY       Required for gpt-image-1
  REMOVEBG_API_KEY     Required for --remove-bg

MORE INFO:
  Documentation: \${PAI_DIR}/skills/Art/README.md
  Source: \${PAI_DIR}/skills/Art/Tools/Generate.ts
`);
  process.exit(0);
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULTS.model,
    size: DEFAULTS.size,
    output: DEFAULTS.output,
  };

  // Collect reference images into array
  const referenceImages: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith("--")) {
      throw new CLIError(`Invalid flag: ${flag}`);
    }

    const key = flag.slice(2);

    // Boolean flags
    if (key === "transparent") { parsed.transparent = true; continue; }
    if (key === "remove-bg") { parsed.removeBg = true; continue; }
    if (key === "thumbnail") { parsed.thumbnail = true; parsed.removeBg = true; continue; }

    // Flags with values
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for: ${flag}`);
    }

    switch (key) {
      case "model":
        if (!["flux", "nano-banana", "nano-banana-pro", "gpt-image-1"].includes(value)) {
          throw new CLIError(`Invalid model: ${value}`);
        }
        parsed.model = value as Model;
        i++;
        break;
      case "prompt":
        parsed.prompt = value;
        i++;
        break;
      case "size":
        parsed.size = value as Size;
        i++;
        break;
      case "aspect-ratio":
        parsed.aspectRatio = value as ReplicateSize;
        i++;
        break;
      case "output":
        parsed.output = value;
        i++;
        break;
      case "reference-image":
        // Collect multiple reference images into array
        referenceImages.push(value);
        i++;
        break;
      case "creative-variations":
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 1 || n > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}`);
        }
        parsed.creativeVariations = n;
        i++;
        break;
      case "add-bg":
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          throw new CLIError(`Invalid hex color: ${value}`);
        }
        parsed.addBg = value;
        i++;
        break;
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  // Assign collected reference images if any
  if (referenceImages.length > 0) {
    parsed.referenceImages = referenceImages;
  }

  if (!parsed.prompt) throw new CLIError("Missing: --prompt");
  if (!parsed.model) throw new CLIError("Missing: --model");

  if (parsed.referenceImages && parsed.referenceImages.length > 0 && parsed.model !== "nano-banana-pro") {
    throw new CLIError("--reference-image only works with nano-banana-pro");
  }

  // Validate reference image count (API limits: 5 human, 6 object, 14 total max)
  if (parsed.referenceImages && parsed.referenceImages.length > 14) {
    throw new CLIError(`Too many reference images: ${parsed.referenceImages.length}. Maximum is 14 total`);
  }

  // Validate size for model
  if (parsed.model === "gpt-image-1" && !OPENAI_SIZES.includes(parsed.size as OpenAISize)) {
    throw new CLIError(`Invalid size for gpt-image-1: ${parsed.size}`);
  } else if (parsed.model === "nano-banana-pro") {
    if (!GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
      throw new CLIError(`Invalid size for nano-banana-pro: ${parsed.size}`);
    }
    if (!parsed.aspectRatio) parsed.aspectRatio = "16:9";
  } else if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
    throw new CLIError(`Invalid size: ${parsed.size}`);
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Background Operations
// ============================================================================

async function addBackgroundColor(inputPath: string, outputPath: string, hexColor: string): Promise<void> {
  console.log(`Adding background ${hexColor}...`);
  const command = `magick "${inputPath}" -background "${hexColor}" -flatten "${outputPath}"`;
  try {
    await execAsync(command);
    console.log(`Thumbnail saved: ${outputPath}`);
  } catch (error) {
    throw new CLIError(`Failed to add background: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function removeBackground(imagePath: string): Promise<void> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) throw new CLIError("Missing: REMOVEBG_API_KEY");

  console.log("Removing background...");

  const imageBuffer = await readFile(imagePath);
  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer]), "image.png");
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`remove.bg error: ${response.status} - ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(imagePath, resultBuffer);
  console.log("Background removed");
}

// ============================================================================
// Image Generation
// ============================================================================

async function generateWithFlux(prompt: string, size: ReplicateSize, output: string): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new CLIError("Missing: REPLICATE_API_TOKEN");

  const replicate = new Replicate({ auth: token });
  console.log("Generating with Flux 1.1 Pro...");

  const result = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
      output_quality: 95,
      prompt_upsampling: false,
    },
  });

  await writeFile(output, result);
  console.log(`Saved: ${output}`);
}

async function generateWithNanoBanana(prompt: string, size: ReplicateSize, output: string): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new CLIError("Missing: REPLICATE_API_TOKEN");

  const replicate = new Replicate({ auth: token });
  console.log("Generating with Nano Banana...");

  const result = await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
    },
  });

  await writeFile(output, result);
  console.log(`Saved: ${output}`);
}

async function generateWithNanoBananaPro(
  prompt: string,
  size: GeminiSize,
  aspectRatio: ReplicateSize,
  output: string,
  referenceImages?: string[]
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new CLIError("Missing: GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });

  if (referenceImages && referenceImages.length > 0) {
    console.log(`Generating with Nano Banana Pro at ${size} ${aspectRatio} with ${referenceImages.length} reference image(s)...`);
  } else {
    console.log(`Generating with Nano Banana Pro at ${size} ${aspectRatio}...`);
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add all reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    for (const referenceImage of referenceImages) {
      const imageBuffer = await readFile(referenceImage);
      const imageBase64 = imageBuffer.toString("base64");
      const ext = extname(referenceImage).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };
      const mimeType = mimeMap[ext];
      if (!mimeType) throw new CLIError(`Unsupported format: ${ext}`);
      parts.push({ inlineData: { mimeType, data: imageBase64 } });
    }
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio, imageSize: size },
    },
  });

  let imageData: string | undefined;
  if (response.candidates && response.candidates.length > 0) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageData) throw new CLIError("No image returned from Gemini");

  await writeFile(output, Buffer.from(imageData, "base64"));
  console.log(`Saved: ${output}`);
}

async function generateWithGPTImage(prompt: string, size: OpenAISize, output: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new CLIError("Missing: OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey });
  console.log("Generating with GPT-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    n: 1,
  });

  const imageData = response.data[0].b64_json;
  if (!imageData) throw new CLIError("No image returned from OpenAI");

  await writeFile(output, Buffer.from(imageData, "base64"));
  console.log(`Saved: ${output}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

    let finalPrompt = args.prompt;
    if (args.transparent) {
      finalPrompt = "CRITICAL: Transparent background (PNG with alpha). " + finalPrompt;
    }

    // Handle variations
    if (args.creativeVariations && args.creativeVariations > 1) {
      console.log(`Generating ${args.creativeVariations} variations...`);
      const basePath = args.output.replace(/\.png$/, "");

      for (let i = 1; i <= args.creativeVariations; i++) {
        const varOutput = `${basePath}-v${i}.png`;
        console.log(`Variation ${i}/${args.creativeVariations}`);

        if (args.model === "flux") {
          await generateWithFlux(finalPrompt, args.size as ReplicateSize, varOutput);
        } else if (args.model === "nano-banana") {
          await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, varOutput);
        } else if (args.model === "nano-banana-pro") {
          await generateWithNanoBananaPro(finalPrompt, args.size as GeminiSize, args.aspectRatio!, varOutput, args.referenceImages);
        } else if (args.model === "gpt-image-1") {
          await generateWithGPTImage(finalPrompt, args.size as OpenAISize, varOutput);
        }
      }
      console.log(`Generated ${args.creativeVariations} variations`);
      return;
    }

    // Single image generation
    if (args.model === "flux") {
      await generateWithFlux(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana") {
      await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana-pro") {
      await generateWithNanoBananaPro(finalPrompt, args.size as GeminiSize, args.aspectRatio!, args.output, args.referenceImages);
    } else if (args.model === "gpt-image-1") {
      await generateWithGPTImage(finalPrompt, args.size as OpenAISize, args.output);
    }

    // Post-processing
    if (args.removeBg) {
      await removeBackground(args.output);
    }

    if (args.addBg && !args.thumbnail) {
      const tempPath = args.output.replace(/\.png$/, "-temp.png");
      await addBackgroundColor(args.output, tempPath, args.addBg);
      const { rename } = await import("node:fs/promises");
      await rename(tempPath, args.output);
    }

    if (args.thumbnail) {
      const thumbPath = args.output.replace(/\.png$/, "-thumb.png");
      const THUMB_BG = "#0a0a0f"; // Dark background for thumbnails
      await addBackgroundColor(args.output, thumbPath, THUMB_BG);
      console.log(`\nCreated both versions:`);
      console.log(`  Transparent: ${args.output}`);
      console.log(`  Thumbnail:   ${thumbPath}`);
    }
  } catch (error) {
    handleError(error);
  }
}

main();
GENERATE_EOF

echo "Created Generate.ts"
```

---

### Step 8: Set Up Environment Variables

Create or update your `.env` file with API keys:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Create .env if it doesn't exist
if [ ! -f "$PAI_DIR/.env" ]; then
  cat > "$PAI_DIR/.env" << 'ENV_EOF'
# Art Skill API Keys
# Uncomment and fill in the keys you have

# For Flux and Nano Banana models (Replicate)
# REPLICATE_API_TOKEN=r8_your_token_here

# For Nano Banana Pro (Gemini 3)
# GOOGLE_API_KEY=your_google_api_key_here

# For GPT-image-1 (OpenAI)
# OPENAI_API_KEY=sk-your_openai_key_here

# For background removal
# REMOVEBG_API_KEY=your_removebg_key_here
ENV_EOF
  echo "Created $PAI_DIR/.env - Please add your API keys"
else
  echo ".env already exists at $PAI_DIR/.env"
fi
```

---

### Step 9: Verify Installation

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Verifying Art Skill installation..."
echo ""

# Check files
echo "Files:"
[ -f "$PAI_DIR/skills/Art/SKILL.md" ] && echo "  [OK] SKILL.md" || echo "  [MISSING] SKILL.md"
[ -f "$PAI_DIR/skills/Art/Aesthetic.md" ] && echo "  [OK] Aesthetic.md" || echo "  [MISSING] Aesthetic.md"
[ -f "$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md" ] && echo "  [OK] TechnicalDiagrams.md" || echo "  [MISSING] TechnicalDiagrams.md"
[ -f "$PAI_DIR/skills/Art/Workflows/Essay.md" ] && echo "  [OK] Essay.md" || echo "  [MISSING] Essay.md"
[ -f "$PAI_DIR/skills/Art/Workflows/Comics.md" ] && echo "  [OK] Comics.md" || echo "  [MISSING] Comics.md"
[ -f "$PAI_DIR/skills/Art/Tools/Generate.ts" ] && echo "  [OK] Generate.ts" || echo "  [MISSING] Generate.ts"

echo ""
echo "API Keys (check $PAI_DIR/.env):"
[ -n "$REPLICATE_API_TOKEN" ] && echo "  [OK] REPLICATE_API_TOKEN" || echo "  [--] REPLICATE_API_TOKEN (optional)"
[ -n "$GOOGLE_API_KEY" ] && echo "  [OK] GOOGLE_API_KEY" || echo "  [--] GOOGLE_API_KEY (optional)"
[ -n "$OPENAI_API_KEY" ] && echo "  [OK] OPENAI_API_KEY" || echo "  [--] OPENAI_API_KEY (optional)"
[ -n "$REMOVEBG_API_KEY" ] && echo "  [OK] REMOVEBG_API_KEY" || echo "  [--] REMOVEBG_API_KEY (optional)"

echo ""
echo "Test CLI tool:"
bun run "$PAI_DIR/skills/Art/Tools/Generate.ts" --help | head -5

echo ""
echo "Installation complete!"
```

---

## Invocation Scenarios

The Art Skill activates based on user requests:

| User Request | Workflow | Output |
|--------------|----------|--------|
| "create a diagram of the auth flow" | TechnicalDiagrams | Architecture diagram PNG |
| "make a technical diagram showing X" | TechnicalDiagrams | Process flow PNG |
| "create a header for my blog post about Y" | Essay | Editorial illustration PNG |
| "illustrate the concept of Z" | Essay | Conceptual illustration PNG |
| "make a comic showing before/after" | Comics | 3-4 panel comic strip PNG |
| "create a visual explanation of W" | Comics | Sequential narrative PNG |

---

## Example Usage

### Example 1: Technical Diagram

```bash
# User: "create a diagram showing how authentication works"

# Skill routes to TechnicalDiagrams workflow, which constructs prompt:
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Clean Excalidraw-style technical diagram on dark background #0a0a0f. Title: 'Authentication Flow'. Shows: User -> Login Form -> Auth Service -> Token -> Protected Resource. Hand-drawn style, PAI Blue #4a90d9 for key components, Cyan #22d3ee for arrows. Include insight callout '*tokens expire after 24h*' in blue." \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/auth-diagram.png
```

### Example 2: Blog Header

```bash
# User: "create a header image for my post about AI agents"

bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Hand-drawn Excalidraw-style illustration on dark background #0a0a0f. Subject: Multiple AI agents working together, represented as geometric angular figures collaborating. Style: gestural hand-drawn lines, professional editorial quality. Colors: White #e5e7eb linework, PAI Blue #4a90d9 accents, Cyan #22d3ee for connections. Subjects fill the frame, minimalist composition." \
  --size 2K \
  --aspect-ratio 1:1 \
  --thumbnail \
  --output ~/Downloads/ai-agents-header.png
```

### Example 3: Editorial Comic

```bash
# User: "create a comic showing the difference between manual and automated testing"

bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Hand-drawn editorial comic strip, 3 panels horizontal, dark background. Panel 1: Developer manually clicking through app, exhausted (PAI Blue accent). Panel 2: Same developer writing test script, focused. Panel 3: Tests running automatically while developer relaxes. Planeform character design - angular, adult proportions, minimal faces. New Yorker sophistication, NOT cartoonish." \
  --size 2K \
  --aspect-ratio 21:9 \
  --output ~/Downloads/testing-comic.png
```

---

## Configuration

### Environment Variables

```bash
# Required (at least one)
export REPLICATE_API_TOKEN="r8_..."    # For Flux, Nano Banana
export GOOGLE_API_KEY="..."             # For Nano Banana Pro (recommended)
export OPENAI_API_KEY="sk-..."          # For GPT-image-1

# Optional
export REMOVEBG_API_KEY="..."           # For background removal
export PAI_DIR="$HOME/.config/pai"      # Custom PAI directory
```

---

## Customization

### Recommended Customization

**Personalize Your Aesthetic Through AI Conversation**

The single most valuable customization for this pack is to have an extended conversation with your AI about your personal aesthetic preferences, then capture that in `Aesthetic.md`. This transforms the Art Skill from a generic tool into one that produces images reflecting YOUR unique visual taste.

**What to Customize:** `$PAI_DIR/skills/Art/Aesthetic.md`

**Why:** The default Aesthetic.md contains a generic Excalidraw-style dark-mode palette. By investing 15-30 minutes in an aesthetic exploration conversation, every image generated will feel like YOUR work, not generic AI output. This is the difference between "usable" and "perfectly on-brand."

**Process:**

1. **Start the Aesthetic Exploration Conversation**

   Tell your AI something like:
   ```
   I want to define my personal aesthetic for the Art Skill. Let's have a conversation
   where you ask me questions about my visual preferences, and we'll capture the
   result in Aesthetic.md.
   ```

2. **Answer Questions About Your Preferences**

   Your AI will ask about:
   - Color preferences (warm vs cool, muted vs vibrant, specific colors you love/hate)
   - Line quality (precise vs gestural, thick vs thin, confident vs sketchy)
   - Composition style (minimal vs detailed, symmetric vs organic, structured vs chaotic)
   - Influences and inspiration (artists, design movements, specific images you love)
   - Emotional tone (technical, whimsical, serious, playful, elegant, raw)
   - Typography preferences (serif vs sans, heavy vs light, classic vs modern)
   - Specific use cases (blog headers, diagrams, social media, presentations)

3. **Iterate with Visual Examples**

   As you discuss, your AI can generate test images:
   ```
   Generate a sample header image using what we've discussed so far
   ```
   Use these to refine the aesthetic definition. "More like this, less like that."

4. **Capture the Final Aesthetic**

   Once you're satisfied, ask:
   ```
   Now update my Aesthetic.md with everything we've defined
   ```
   Your AI will rewrite Aesthetic.md with your personalized color palette, style guidelines, and validation criteria.

**Expected Outcome:** After this process, running `create a header image for my post about X` will produce images that feel unmistakably YOURS—matching your brand, preferences, and visual language.

---

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| **Custom Color Palette** | `Aesthetic.md` | Change hex codes to match your brand colors |
| **Custom Prompt Templates** | `Workflows/*.md` | Create prompt patterns for your specific use cases |
| **Additional Workflows** | `Workflows/` | Add workflows for content types you create frequently (infographics, presentations, etc.) |
| **Model Preference** | `SKILL.md` | Change default model if you prefer different generation characteristics |
| **Validation Criteria** | `Aesthetic.md` | Add specific must-have/must-not-have rules for your brand |

**Example: Brand Color Customization**

Edit `Aesthetic.md` to replace the default palette:

```markdown
## Color Palette

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Background** | `#1a1a2e` | Your brand's dark background |
| **Primary** | `#ff6b35` | Your brand's accent color |
| **Secondary** | `#4ecdc4` | Your brand's secondary color |
```

**Example: Adding a Custom Workflow**

Create `$PAI_DIR/skills/Art/Workflows/Infographics.md` for a specific content type you create often:

```markdown
# Infographic Workflow

[Your custom workflow for infographic-style visuals with your specific
prompt templates, validation criteria, and generation settings]
```

Then add a routing entry in `SKILL.md`:
```markdown
  - Infographic or data visualization → `Workflows/Infographics.md`
```

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Aesthetic inspiration**: Excalidraw, modern dark-mode design systems
- **AI models**: Replicate (Flux, Nano Banana), Google (Gemini), OpenAI (GPT-image)

---

## Related Work

*None specified - maintainer to provide if applicable.*

---

## Works Well With

*None specified - maintainer to provide if applicable.*

---

## Changelog

### 1.1.0 - 2025-12-29
- **Multiple reference images**: Support up to 14 reference images for improved character/style consistency
  - `--reference-image` flag can now be specified multiple times
  - API limits: 5 human refs, 6 object refs, 14 total max
  - Significantly improves likeness consistency across generated images
- Added `PAI_DIR` constant to fix help text paths

### 1.0.0 - 2025-12-29
- Initial release
- Three workflows: TechnicalDiagrams, Essay, Comics
- Excalidraw hand-drawn aesthetic with dark-mode colors
- Generate.ts CLI with multi-model support
- Sample Aesthetic.md with blue/black color scheme
