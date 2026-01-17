---
name: Kai Art Skill
pack-id: danielmiessler-pai-art-skill-core-v1.2.0
version: 1.2.0
author: danielmiessler
description: Visual content generation with Excalidraw hand-drawn aesthetic - images, videos, technical diagrams, comics, editorial illustrations
type: skill
purpose-type: [creativity, productivity, development]
platform: claude-code
dependencies: []
keywords: [art, visualization, diagrams, comics, excalidraw, hand-drawn, technical-diagrams, image-generation, video-generation, illustrations, dark-mode, veo, animated]
---

<p align="center">
  <img src="../icons/pai-art-skill.png" alt="PAI Art Skill" width="256">
</p>

# PAI Art Skill

> Visual content generation system with Excalidraw hand-drawn aesthetic - images, videos, technical diagrams, comics, and editorial illustrations with consistent dark-mode styling

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Art skill | `src/skills/Art/SKILL.md` | Routing and quick reference |
| Aesthetic config | `src/skills/Art/Aesthetic.md` | Style preferences and palette |
| Generate tool | `src/skills/Art/Tools/Generate.ts` | Multi-model image + video generation CLI |
| Technical diagrams | `src/skills/Art/Workflows/TechnicalDiagrams.md` | Architecture diagram workflow |
| Essay headers | `src/skills/Art/Workflows/Essay.md` | Blog header image workflow |
| Comics workflow | `src/skills/Art/Workflows/Comics.md` | Sequential panel generation |
| Video workflow | `src/skills/Art/Workflows/Video.md` | AI video generation workflow |

## The Problem

AI image generation is powerful but inconsistent. Each request requires:

1. **Prompt Engineering**: Figuring out what words produce the desired style
2. **Model Selection**: Choosing between Flux, DALL-E, Gemini, etc.
3. **Size/Format Decisions**: Aspect ratios, resolutions, file formats
4. **Post-Processing**: Background removal, thumbnails, optimization
5. **Style Consistency**: Making sure each image matches your brand

**The Problems:**

- **Inconsistent Results**: Same prompt produces wildly different styles across sessions
- **Prompt Overhead**: Re-discovering effective prompts each time
- **Technical Complexity**: Different models have different APIs and parameters
- **Quality Control**: No validation that output matches intent

## The Solution

The Art Skill solves this through **workflow-based generation**:

```
User Request ("create a diagram of the auth flow")
     |
     v
[SKILL.md Routing] --- Routes based on request type
     |
     v
[Workflow] --- TechnicalDiagrams.md / Essay.md / Comics.md
     |          - Aesthetic guidelines
     |          - Prompt template
     |          - Validation checklist
     v
[Generate.ts CLI] --- Deterministic image generation
     |               - Model selection
     |               - Size/aspect handling
     |               - Background removal
     |               - Thumbnail generation
     v
[Output] --- Validated image ready for use
```

**Key Innovations:**

1. **Aesthetic as Code**: Visual style documented in Aesthetic.md
2. **Workflow Templates**: Proven prompt structures that consistently produce quality
3. **Intent-to-Flag Mapping**: User intent maps to specific CLI flags
4. **Validation Checklists**: Must-have and must-not-have criteria
5. **CLI Determinism**: Same flags, same behavior across models

## Invocation Scenarios

| User Request | Workflow | Output |
|--------------|----------|--------|
| "create a diagram of the auth flow" | TechnicalDiagrams | Architecture diagram PNG |
| "create a header for my blog post about Y" | Essay | Editorial illustration PNG |
| "make a comic showing before/after" | Comics | 3-4 panel comic strip PNG |
| "create an animated diagram of the pipeline" | Video | 8-second animation MP4 |
| "animate this header image" | Video (with --first-frame) | Animated illustration MP4 |

## Example Usage

### Technical Diagram

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Clean Excalidraw-style technical diagram..." \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/auth-diagram.png
```

### Blog Header with Thumbnail

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Hand-drawn Excalidraw-style illustration..." \
  --size 2K \
  --aspect-ratio 1:1 \
  --thumbnail \
  --output ~/Downloads/header.png
```

### Video Generation (Quick Draft)

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1-fast \
  --prompt "Draw-on animation of architecture diagram..." \
  --aspect-ratio 16:9 \
  --output ~/Downloads/animated.mp4
```

### Video from Image (Animate Existing)

```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model veo-3.1 \
  --prompt "Subtle animation with elements pulsing..." \
  --first-frame ~/Downloads/header.png \
  --output ~/Downloads/animated.mp4
```

## Changelog

### 1.2.0 - 2026-01-16
- **Video generation**: Added Google Veo model support (veo-3.1, veo-3.1-fast, veo-3, veo-2)
- **Video workflow**: New `Workflows/Video.md` for animated diagrams, B-roll, and social clips
- **Image-to-video**: Animate existing images using `--first-frame`
- **Video extension**: Generate videos up to ~148 seconds with automatic extension
- **Audio support**: Optional AI-generated audio with `--audio` flag
- **Cost estimation**: `--dry-run` flag for video cost estimation before generation
- **New CLI flags**: `--duration`, `--first-frame`, `--last-frame`, `--negative-prompt`, `--resolution`, `--extend`, `--input-video`

### 1.1.0 - 2025-12-29
- **Multiple reference images**: Support up to 14 reference images for improved character/style consistency
- Added `PAI_DIR` constant to fix help text paths

### 1.0.0 - 2025-12-29
- Initial release
- Three workflows: TechnicalDiagrams, Essay, Comics
- Excalidraw hand-drawn aesthetic with dark-mode colors
- Generate.ts CLI with multi-model support
