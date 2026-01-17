# Image Processing Workflow

Background removal, background addition, and image optimization utilities.

## When to Use

- "remove background from image"
- "add background color to transparent image"
- "create thumbnail with brand background"
- "process image for blog header"

## Tools Available

**Location:** `~/.claude/skills/CORE/Tools/`

| Tool | Purpose |
|------|---------|
| `RemoveBg.ts` | Remove backgrounds using remove.bg API |
| `AddBg.ts` | Add solid background color to transparent images |

## Quick Usage

### Remove Background

```bash
# Single file (overwrites original)
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts image.png

# Single file with output path
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts input.png output.png

# Batch process multiple files
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts image1.png image2.png image3.png
```

### Add Background Color

```bash
# Add custom background color
bun ~/.claude/skills/CORE/Tools/AddBg.ts input.png "#FFFFFF" output.png

# Add UL brand background (sepia/cream #EAE9DF)
bun ~/.claude/skills/CORE/Tools/AddBg.ts input.png --ul-brand output.png
```

## Environment Variables

```bash
# Required for background removal
REMOVEBG_API_KEY=your_api_key_here
```

Get your API key at: https://www.remove.bg/api

## Examples

### Example 1: Remove Background from Generated Image

```bash
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts ~/Downloads/ai-generated-header.png
# Overwrites with transparent background version
```

### Example 2: Create Thumbnail with Brand Background

```bash
# First remove background
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts header.png header-transparent.png

# Then add UL brand background
bun ~/.claude/skills/CORE/Tools/AddBg.ts header-transparent.png --ul-brand header-thumb.png
```

### Example 3: Batch Remove Backgrounds

```bash
bun ~/.claude/skills/CORE/Tools/RemoveBg.ts diagram1.png diagram2.png diagram3.png
# All three files processed with transparent backgrounds
```

### Example 4: Add Dark Background for Dark Mode

```bash
bun ~/.claude/skills/CORE/Tools/AddBg.ts logo-transparent.png "#1a1a1a" logo-dark.png
```

### Example 5: Add White Background

```bash
bun ~/.claude/skills/CORE/Tools/AddBg.ts chart.png "#FFFFFF" chart-white.png
```

## Common Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| UL Brand (Sepia) | `#EAE9DF` | Thumbnails, social previews |
| White | `#FFFFFF` | Clean backgrounds |
| Black | `#000000` | Dark mode |
| Dark Gray | `#1a1a1a` | Dark mode, modern look |

## Integration with Other Workflows

**Art skill** calls these tools for:
- Background removal after image generation
- Thumbnail generation for blog headers

**Blogging workflow** uses for:
- Social preview images (Open Graph)
- Blog header processing
- Thumbnail optimization

## Requirements

### RemoveBg.ts
- `REMOVEBG_API_KEY` environment variable
- API credits (free tier: 50 images/month)

### AddBg.ts
- ImageMagick installed: `brew install imagemagick`
- No API key required

## Troubleshooting

**Missing REMOVEBG_API_KEY:**
```bash
# Add to ${PAI_DIR}/.env
echo 'REMOVEBG_API_KEY=your_key_here' >> ${PAI_DIR}/.env
```

**ImageMagick not found:**
```bash
brew install imagemagick
```

**remove.bg API error:**
- Check API key is valid
- Verify API credits remaining
- Ensure file is a supported image format (PNG, JPG, WebP)
