---
name: PAI Art Skill
pack-id: danielmiessler-art-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Complete visual content system for AI-generated illustrations, diagrams, and data visualizations with consistent editorial aesthetic
type: skill
purpose-type: [creativity, productivity, automation]
platform: claude-code
dependencies: []
keywords: [art, images, illustrations, diagrams, visualizations, mermaid, technical-diagrams, stats, frameworks, editorial, visual-content, ai-generation]
---

<p align="center">
  <img src="../../icons/pai-art-skill.png" alt="PAI Art Skill" width="256">
</p>

# PAI Art Skill

> Complete visual content system for creating illustrations, diagrams, and data visualizations with consistent editorial aesthetic using AI image generation.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../../../README.md#the-journey-pai-v1x--v20)

This pack adds a complete visual content creation system to your AI infrastructure. The Art Skill provides:

- **Consistent Aesthetic**: All generated images follow a unified editorial style with defined typography and color palette
- **Multiple Workflows**: Purpose-built workflows for essays, technical diagrams, frameworks, statistics, and more
- **AI Image Generation**: TypeScript tool that interfaces with multiple AI image models (Nano Banana Pro, Flux)
- **Background Removal**: Automatic background removal for transparent PNGs

**Core principle:** Professional visual content with zero design skills required.

No more inconsistent images. No more hiring designers for simple illustrations. Your AI creates publication-ready visuals on demand.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Art Skill Definition | `src/skills/Art/SKILL.md` | Main skill entry point with routing |
| Generate Tool | `src/skills/Art/Tools/Generate.ts` | AI image generation CLI |
| Essay Workflow | `src/skills/Art/Workflows/Essay.md` | Editorial illustrations for articles |
| Visualize Workflow | `src/skills/Art/Workflows/Visualize.md` | Data visualizations and charts |
| Technical Diagrams | `src/skills/Art/Workflows/TechnicalDiagrams.md` | Architecture and process diagrams |
| Mermaid Workflow | `src/skills/Art/Workflows/Mermaid.md` | Excalidraw-style structured diagrams |
| Frameworks Workflow | `src/skills/Art/Workflows/Frameworks.md` | Mental models and 2x2 matrices |
| Stats Workflow | `src/skills/Art/Workflows/Stats.md` | Illustrated statistics cards |
| PAI Icon Workflow | `src/skills/Art/Workflows/CreatePAIPackIcon.md` | Generate PAI pack icons |

**Summary:**
- **Files created:** 9
- **Workflows included:** 7
- **Tools included:** 1
- **Dependencies:** Bun runtime, FAL_KEY environment variable

---

## The Concept and/or Problem

Visual content is essential for modern communication - blog posts need header images, presentations need diagrams, newsletters need illustrated statistics. But creating consistent, professional visuals is challenging:

**The Problems:**

1. **Inconsistent Style**: Every AI-generated image looks different. No brand cohesion.
2. **No Design System**: Random prompts produce random results. Typography varies wildly.
3. **Manual Every Time**: Each image requires crafting a new prompt from scratch.
4. **Poor Text Rendering**: AI images often have garbled or illegible text.
5. **No Specialization**: A diagram prompt differs from an illustration prompt - different requirements.

**Who Faces This:**
- Content creators who need header images for articles
- Technical writers who need architecture diagrams
- Newsletter authors who need illustrated statistics
- Presenters who need professional visuals
- Anyone who needs consistent brand imagery

**The Consequences:**
- Hours spent iterating on prompts
- Inconsistent visual identity across content
- Settling for "good enough" instead of great
- Avoiding visual content altogether
- Hiring designers for simple illustrations

## The Solution

The Art Skill provides a **complete visual content system** with:

### 1. Unified Aesthetic Framework

A defined color palette and typography system that ensures consistency:

**Color Palette (UL Editorial):**
```
Background: Light Cream #F5E6D3 or White #FFFFFF
Primary Accent: Deep Purple #4A148C (strategic, 10-20%)
Secondary Accent: Deep Teal #00796B (5-10%)
Structure: Black #000000
Text: Charcoal #2D2D2D
```

**Typography System (3-Tier):**
- **Tier 1 (Headers)**: Valkyrie-style elegant wedge-serif italic
- **Tier 2 (Labels)**: Concourse-style geometric sans-serif
- **Tier 3 (Insights)**: Advocate-style condensed italic for callouts

### 2. Purpose-Built Workflows

Seven specialized workflows for different visual needs:

| Workflow | Output Type | Use Case |
|----------|-------------|----------|
| Essay | Editorial illustration | Blog header images |
| Visualize | Data visualization | Charts, graphs, infographics |
| Technical Diagrams | Architecture diagrams | System designs, process flows |
| Mermaid | Structured diagrams | Flowcharts, sequence diagrams |
| Frameworks | Mental models | 2x2 matrices, Venn diagrams |
| Stats | Stat cards | "78% of developers..." visuals |
| PAI Icon | Pack icons | 256x256 transparent PNGs |

### 3. Story-Driven Generation

Most workflows use the `/cse` (Create Story Explanation) pattern:
1. Analyze input content to extract key concepts
2. Determine visual structure based on content analysis
3. Construct optimized prompt using workflow guidelines
4. Generate with appropriate model and settings
5. Validate against workflow criteria

### 4. Generation Tool

TypeScript CLI that handles:
- Model selection (nano-banana-pro for text, flux for variety)
- Size selection (1K/2K/4K resolution)
- Aspect ratio (1:1, 16:9, 9:16, 21:9)
- Background removal for transparency
- Thumbnail generation for web use

## What Makes This Different

This sounds similar to DALL-E or Midjourney which also do AI image generation. What makes this approach different?

The Art Skill is not just image generation - it's a complete visual content SYSTEM with defined aesthetics, specialized workflows, and consistent output. Raw AI models produce random results; this skill produces brand-consistent visuals through structured workflows that ensure typography, color, composition, and style match your editorial identity every time.

- Unified color palette ensures visual brand consistency
- Three-tier typography system for professional text rendering
- Seven specialized workflows for different content types
- Story-driven prompting extracts concepts from content automatically

---

## Architecture

```
Art Skill Architecture
======================

         User Request
              |
              v
    +-------------------+
    |    SKILL.md       |  <-- Routing layer
    |  (Skill Router)   |      Matches intent to workflow
    +-------------------+
              |
              v
    +-------------------+
    |    Workflows/     |  <-- Workflow layer
    | - Essay.md        |      Specialized visual recipes
    | - Visualize.md    |
    | - Mermaid.md      |
    | - TechnicalDiag.. |
    | - Frameworks.md   |
    | - Stats.md        |
    | - CreatePAI...    |
    +-------------------+
              |
              v
    +-------------------+
    |    Generate.ts    |  <-- Tool layer
    |  (CLI Tool)       |      Interfaces with AI models
    +-------------------+
              |
              v
    +-------------------+
    |   FAL AI API      |  <-- External service
    |  (Image Models)   |
    +-------------------+
              |
              v
         Output PNG
```

**Layer Responsibilities:**

1. **SKILL.md**: Routes user intent to appropriate workflow
2. **Workflows/**: Contains specialized prompting recipes and validation criteria
3. **Generate.ts**: CLI tool that constructs API calls and handles output
4. **FAL AI**: External image generation service

**Data Flow:**
```
Intent -> Routing -> Workflow Selection -> CSE Analysis ->
Prompt Construction -> Model Selection -> Generation ->
Validation -> Output
```

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of PAI (Personal AI Infrastructure)
- **Typography inspiration**: Matthew Butterick's Practical Typography
- **Color system**: UL (Unsupervised Learning) editorial guidelines
- **Aesthetic reference**: Excalidraw for hand-drawn technical diagrams

## Related Work

*None specified.*

## Works Well With

- **pai-core-install**: Required base system
- **CORE skill**: Uses `/cse` command for story extraction
- **Blogging skill**: Header image generation for articles

## Recommended

*None specified.*

## Relationships

### Parent Of
*None specified.*

### Child Of
- pai-core-install (requires base PAI infrastructure)

### Sibling Of
*None specified.*

### Part Of Collection
- PAI Skills Collection

## Changelog

### 2.3.0 - 2026-01-14
- Initial PAI Pack release
- Seven specialized workflows included
- TypeScript generation tool
- Complete documentation for all workflows
