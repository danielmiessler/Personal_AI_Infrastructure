# YouTube Thumbnail Design Specifications

**Analysis Date**: 2025-12-21
**Canvas Size**: 1280 x 720 pixels (standard YouTube thumbnail)
**Aspect Ratio**: 16:9

---

## GLOBAL DESIGN SYSTEM

### Border System
| Property | Value |
|----------|-------|
| Color | `#4A90D9` (Medium Blue) |
| Thickness | 6px |
| Corner Radius | 12px |
| Style | Solid, consistent across all thumbnails |

### Background System
| Property | Value |
|----------|-------|
| Primary Background | `#1A2744` (Deep Navy Blue) |
| Secondary/Overlay | `#243654` (Lighter Navy) |
| Gradient Direction | None (solid with overlaid elements) |

### Logo ("TI:" Mark)
| Property | Value |
|----------|-------|
| Symbol | Stylized "TI:" ligature |
| Color | `#1A2744` (Dark Navy, matching background) |
| Width | ~45px |
| Height | ~50px |
| Position | Top-right corner |
| Offset from right edge | 24px |
| Offset from top edge | 20px |

---

## TYPOGRAPHY SYSTEM

### Font Family Analysis
The thumbnails use a **sans-serif font family** with these characteristics:
- **Primary Font**: Appears to be **Inter**, **Montserrat**, or similar geometric sans-serif
- **Characteristics**: Clean, modern, high x-height, excellent legibility at small sizes
- **Weight Range**: Regular (400) to Bold (700) to Extra Bold (800)

### Typography Hierarchy

#### Line 1 - Series/Category Label
| Property | Value |
|----------|-------|
| Color | `#FFFFFF` (White) |
| Font Weight | Bold (700) |
| Font Size | 32-36px |
| Letter Spacing | 0.05em (expanded) |
| Text Transform | UPPERCASE |
| Position Y | 28px from top (inside border) |
| Position X | 28px from left edge |

#### Line 2 - Primary Title (EMPHASIS LINE)
| Property | Value |
|----------|-------|
| Color | `#6B8DD6` (Periwinkle Blue) or `#F5A623` (Orange accent) |
| Font Weight | Extra Bold (800) |
| Font Size | 56-64px |
| Letter Spacing | 0.02em |
| Text Transform | UPPERCASE |
| Position Y | 68px from top |
| Position X | 28px from left edge |
| Special Effects | Sometimes has highlight box behind text |

#### Line 3 - Secondary Title
| Property | Value |
|----------|-------|
| Color | `#FFFFFF` (White) or `#6B8DD6` (Periwinkle) |
| Font Weight | Bold (700) |
| Font Size | 48-56px |
| Letter Spacing | 0.02em |
| Text Transform | UPPERCASE or Title Case |
| Position Y | 130px from top |
| Position X | 28px from left edge |

#### Line 4 - Version/Date Label
| Property | Value |
|----------|-------|
| Color | `#C084FC` (Purple/Violet) |
| Font Weight | Medium (500) |
| Font Size | 24-28px |
| Letter Spacing | 0.03em |
| Text Transform | Title Case with parentheses |
| Position Y | 185px from top |
| Position X | 28px from left edge |

---

## INDIVIDUAL THUMBNAIL SPECIFICATIONS

---

### Main1.png - "Personal AI Infrastructure v2"

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "A DEEPDIVE ON MY" | `#FFFFFF` | 28px | Bold |
| 1b | "CLAUDE CODE" (badge) | `#FFFFFF` on `#D97706` bg | 18px | Bold |
| 2 | "PERSONAL AI" | `#6B8DD6` | 56px | Extra Bold |
| 3 | "INFRASTRUCTURE" | `#6B8DD6` | 56px | Extra Bold |
| 4 | "v2 (December 2025)" | `#C084FC` | 24px | Medium |

#### Claude Code Badge
| Property | Value |
|----------|-------|
| Background | `#D97706` (Orange/Amber) |
| Text Color | `#FFFFFF` |
| Padding | 4px 8px |
| Border Radius | 4px |
| Position | Inline after "MY" |

#### Background Art
- **Type**: Technical diagram/flowchart
- **Coverage**: ~60% of frame (left and center)
- **Opacity**: 30-40% overlay
- **Content**: PAI Infrastructure architecture diagram
- **Blend**: Darkened to not compete with text

#### Headshot
| Property | Value |
|----------|-------|
| Width | ~35% of canvas (448px) |
| Height | ~85% of canvas (612px) |
| Position X | Right edge, ~40px from border |
| Position Y | Vertically centered, slight bottom crop |
| Edge Treatment | Soft fade on left edge into background |

---

### Main2.png - "Building Your Own KAI"

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "BUILDING YOUR OWN" | `#FFFFFF` | 32px | Bold |
| 1b | "\"KAI\"" | `#C084FC` | 32px | Bold |
| 2 | "PERSONAL AI" | `#6B8DD6` | 52px | Extra Bold |
| 3 | "ASSISTANT" | `#FFFFFF` | 52px | Extra Bold |

#### Background Art
- **Type**: Dual panel - circular diagram (left) + code terminal (right)
- **Coverage**: ~55% of frame
- **Left Panel**: KAI MIC circular architecture diagram
- **Right Panel**: Claude Code terminal window with dark theme
- **Opacity**: 60-70% visible

#### Headshot
| Property | Value |
|----------|-------|
| Width | ~40% of canvas (512px) |
| Height | ~90% of canvas (648px) |
| Position X | Right-aligned, overlapping background art |
| Position Y | Bottom-aligned with slight crop |
| Edge Treatment | Hard edge, no fade |

---

### Main3.png - "Custom Agent Voices"

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "PERSONAL AI INFRASTRUCTURE" | `#FFFFFF` | 24px | Bold |
| 2 | "USING CUSTOM AGENT VOICES" | `#F5A623` (Orange) | 40px | Extra Bold |

#### Special Elements
- **ElevenLabs Logo**: White logo, positioned left side, ~80px wide
- **Agent Names**: "KAI", "DESIGNER", "PENTESTER", "ENGINEER", "RESEARCHER"
  - Color: `#90EE90` (Light Green)
  - Size: 28-36px graduated
  - Stacked vertically with speaking head icons

#### Claude Code Badge (Bottom Right)
| Property | Value |
|----------|-------|
| Position | Bottom-right, 24px from edges |
| Style | Orange badge with white text |

#### Background
- **Color**: `#1E3A5F` (Slightly brighter navy)
- **Art**: Code snippets with blur effect
- **Coverage**: Full background with overlays

#### Headshot
| Property | Value |
|----------|-------|
| Width | ~38% of canvas |
| Height | ~80% of canvas |
| Position X | Right third |
| Position Y | Centered |
| Edge Treatment | Soft left fade |

---

### Main4.png - "Ghostty Panes" (Variant A)

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "AN IDEA VIDEO HERE" | `#FFFFFF` | 28px | Bold |
| 1b | "!!!" | `#EF4444` (Red) | 28px | Bold |
| 2 | "GHOSTTY" | `#3B82F6` (Bright Blue) | 56px | Extra Bold |
| 2b | "PANES" | `#1A2744` (Dark Navy) | 56px | Extra Bold |

#### Background Art
- **Type**: Terminal/code editor screenshot
- **Content**: Ghostty terminal with multiple panes
- **Coverage**: ~50% center-left
- **Opacity**: 40-50%

#### Headshot
| Property | Value |
|----------|-------|
| Width | ~35% of canvas |
| Height | ~85% of canvas |
| Position X | Center-right |
| Position Y | Bottom-aligned |
| Edge Treatment | Natural edges, no fade |

---

### Main5.png - "Context Engineering Series"

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "CONTEXT ENGINEERING SERIES" | `#FFFFFF` | 24px | Bold |
| 2 | "DYNAMIC CONTEXT LOADING" | `#F5A623` (Orange) | 36px | Extra Bold |
| 3 | "KAI" | `#C084FC` (Purple) | 72px | Extra Bold |

#### Special Elements
- **Claude Code Badge**: Below KAI text, orange background
- **Anime Character**: Blue-haired figure facing right
  - Width: ~30% of canvas
  - Position: Left-center
  - Style: Cyberpunk/futuristic aesthetic

#### Background Art
- **Type**: Code/terminal with gradient overlay
- **Coverage**: Full background
- **Primary Color**: Purple-blue gradient tint

#### Headshot
| Property | Value |
|----------|-------|
| Width | ~38% of canvas |
| Height | ~85% of canvas |
| Position X | Right edge |
| Position Y | Vertically centered |
| Edge Treatment | Hard edge |

---

### Main6.png - "Ghostty Panes" (Variant B)

*Identical to Main4.png - appears to be same thumbnail or minor variant*

---

### Main7.png - "Conversation with Marcus Hutchins"

#### Text Content & Styling
| Line | Text | Color | Size | Weight |
|------|------|-------|------|--------|
| 1 | "A CONVERSATION WITH" | `#FFFFFF` | 28px | Bold |
| 2 | "MARCUS HUTCHINS" | `#C084FC` (Purple) | 48px | Extra Bold |
| 3 | "ON" | `#FFFFFF` | 24px | Bold |
| 3b | "AI" | `#3B82F6` (Blue) | 36px | Extra Bold |
| 3c | "HYPE VS REALITY" | `#FFFFFF` | 36px | Extra Bold |

#### Layout (DUAL HEADSHOT)
This is a conversation/interview format with two people:

| Element | Left Person | Right Person |
|---------|------------|--------------|
| Width | 45% of canvas | 45% of canvas |
| Position | Bottom-left | Bottom-right |
| Name Label | "[Host Name]" | "[Guest Name]" |
| Label Style | White text, small (~14px) |

#### Background
- **Color**: Solid `#1A2744` navy
- **No additional art** - cleaner interview format

---

## COLOR PALETTE SUMMARY

| Name | Hex | Usage |
|------|-----|-------|
| Deep Navy | `#1A2744` | Primary background |
| Border Blue | `#4A90D9` | Frame border |
| Periwinkle | `#6B8DD6` | Primary emphasis text |
| White | `#FFFFFF` | Standard text, high contrast |
| Purple/Violet | `#C084FC` | Accent text, names |
| Orange/Amber | `#F5A623` | Highlight text, badges |
| Badge Orange | `#D97706` | Badge backgrounds |
| Bright Blue | `#3B82F6` | Accent text |
| Red Alert | `#EF4444` | Exclamation marks |
| Light Green | `#90EE90` | Agent names list |

---

## LAYOUT GRID SYSTEM

### Safe Zones
| Zone | Measurement |
|------|-------------|
| Border Inset | 6px all sides |
| Content Padding | 28px from border |
| Text Block Width | ~55% of canvas (left side) |
| Headshot Zone | ~40% of canvas (right side) |

### Vertical Rhythm
| Element | Y Position |
|---------|------------|
| Top Border | 0px |
| Line 1 Start | 34px |
| Line 2 Start | 74px |
| Line 3 Start | 134px |
| Line 4 Start | 190px |
| Logo Top | 20px |
| Headshot Top | Variable (centered or top-aligned) |

### Z-Index Layering
1. **Background Color** (bottom)
2. **Background Art/Screenshots** (30-60% opacity)
3. **Headshot Image**
4. **Text Content**
5. **Badges/Special Elements**
6. **Border Frame**
7. **TI: Logo** (top)

---

## HEADSHOT SPECIFICATIONS

### Standard Solo Thumbnail
| Property | Value |
|----------|-------|
| Subject Position | Right 40% of frame |
| Vertical Alignment | Centered or bottom-heavy |
| Scale | Head occupies ~20-25% of frame height |
| Background Removal | Clean cutout, no background |
| Edge Treatment | Soft fade left (optional) or hard edge |
| Lighting | Bright, well-lit face |
| Expression | Neutral to friendly |

### Interview/Dual Format
| Property | Value |
|----------|-------|
| Layout | 50/50 split |
| Subject Scale | Smaller to fit both |
| Name Labels | Bottom of each frame |
| Frame Treatment | Visible frame borders between subjects |

---

## RECREATION CHECKLIST

To recreate these thumbnails exactly:

1. [ ] Create 1280x720 canvas
2. [ ] Fill with `#1A2744` background
3. [ ] Add 6px `#4A90D9` border with 12px radius
4. [ ] Position TI: logo at top-right (24px, 20px offset)
5. [ ] Add background art at 30-50% opacity
6. [ ] Place headshot on right side (35-40% width)
7. [ ] Apply soft fade to headshot left edge if needed
8. [ ] Add text lines following typography hierarchy
9. [ ] Apply color accents per specific thumbnail
10. [ ] Add badges/special elements as needed

---

## FONT RECOMMENDATIONS

Based on letterform analysis, recommended fonts:

1. **Primary**: Inter (most likely match)
2. **Alternative 1**: Montserrat
3. **Alternative 2**: Poppins
4. **Alternative 3**: Work Sans

All should be used in:
- Regular (400) for body
- Bold (700) for standard headers
- Extra Bold (800) for primary emphasis

---

*Document generated by Designer Agent for exact thumbnail recreation*
