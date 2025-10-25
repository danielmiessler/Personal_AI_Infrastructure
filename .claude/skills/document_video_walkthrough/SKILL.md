---
name: document_video_walkthrough
description: Convert YouTube videos into comprehensive step-by-step markdown documentation. Downloads transcripts, extracts key insights, creates detailed walkthroughs with code examples, troubleshooting tips, and quick reference guides. USE WHEN user wants to document tutorial videos, create technical guides from videos, or transform video content into written documentation.
---

# Document Video Walkthrough Skill

## When to Activate This Skill

**Primary Use Cases:**
- "Document this YouTube video"
- "Create a walkthrough from this tutorial video"
- "Convert this video to a step-by-step guide"
- "Turn this YouTube tutorial into markdown documentation"
- "Extract the steps from this video tutorial"

**The Goal:** Transform video content into comprehensive, actionable markdown documentation with step-by-step instructions.

## What This Skill Does

Automatically:
1. Fetches the video title from YouTube
2. Creates a descriptive filename from the title (kebab-case)
3. Downloads YouTube video transcripts
4. Cleans and formats the transcript
5. Uses Fabric's `document_video_walkthrough` pattern to generate:
   - Video overview and executive summary
   - Key insights and takeaways
   - Prerequisites and requirements
   - **Detailed step-by-step walkthrough** with code blocks
   - Important concepts and definitions
   - Troubleshooting tips
   - Tools and resources list
   - Advanced techniques
   - Quick reference guide
6. Saves output with a descriptive filename based on video title

## Required Tools

- `yt-dlp` - YouTube transcript downloader (already installed)
- `fabric` - Pattern processing (already configured)
- `document_video_walkthrough` pattern (already installed at `~/.config/fabric/patterns/document_video_walkthrough/`)

## Usage Instructions

When this skill is activated, follow this workflow:

### Step 1: Extract Video ID and Fetch Title

```bash
# Load VIDEO_DOCS_DIR from .env (defaults to current directory if not set)
source "${PAI_DIR}/.env" 2>/dev/null || true
VIDEO_DOCS_DIR="${VIDEO_DOCS_DIR:-.}"

# Extract video ID from URL
VIDEO_URL="[USER_PROVIDED_URL]"
VIDEO_ID=$(echo "$VIDEO_URL" | sed 's/.*v=//' | cut -d'&' -f1 | cut -d'?' -f1)

# Fetch video title
VIDEO_TITLE=$(yt-dlp --get-title "$VIDEO_URL" 2>/dev/null | head -1)

# Sanitize title to create filename (kebab-case)
FILENAME=$(echo "$VIDEO_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
OUTPUT_FILE="${VIDEO_DOCS_DIR}/${FILENAME}.md"
```

**Why this approach:**
- Uses VIDEO_DOCS_DIR from .env for consistent PKM vault location
- Uses actual video title for descriptive filenames
- Converts to kebab-case for filesystem compatibility
- Removes special characters while preserving readability
- Falls back to current directory if VIDEO_DOCS_DIR not set
- Falls back to video ID if title fetch fails

### Step 2: Download the Transcript

```bash
yt-dlp --legacy-server-connect --write-auto-sub --skip-download \
  --sub-format vtt --output "/tmp/%(id)s.%(ext)s" "VIDEO_URL"
```

**Why `--legacy-server-connect`?** Handles SSL connection issues with YouTube.

### Step 3: Process with Fabric and Insert URL

```bash
# Process transcript with Fabric
grep -v '^[0-9][0-9]:[0-9][0-9]' /tmp/VIDEO_ID.en.vtt | \
  grep -v '^WEBVTT' | grep -v '^Kind:' | grep -v '^Language:' | \
  grep -v '^$' | sed 's/<[^>]*>//g' | \
  fabric -p document_video_walkthrough > OUTPUT_FILE.md

# Replace empty source line with actual URL
sed -i '' "s|^source:.*|source: VIDEO_URL|" OUTPUT_FILE.md
```

**What this does:**
- Removes VTT timestamps
- Removes VTT headers
- Strips HTML tags
- Pipes clean text to Fabric pattern
- Fabric generates markdown with empty `source:` field
- sed replaces empty source line with actual YouTube URL

### Step 4: Return Results to User

Present the user with:
- Location of saved file
- File size/line count
- Brief summary of what was documented
- Suggest next steps (review, edit, share)

## Complete Workflow Example

```bash
# User provides: https://www.youtube.com/watch?v=7_SL0FaY8MM
VIDEO_URL="https://www.youtube.com/watch?v=7_SL0FaY8MM"

# Step 0: Load PKM vault location from .env
source "${PAI_DIR}/.env" 2>/dev/null || true
VIDEO_DOCS_DIR="${VIDEO_DOCS_DIR:-.}"

# Step 1: Extract video ID and fetch title
VIDEO_ID=$(echo "$VIDEO_URL" | sed 's/.*v=//' | cut -d'&' -f1)
VIDEO_TITLE=$(yt-dlp --get-title "$VIDEO_URL" 2>/dev/null | head -1)

# Step 2: Create sanitized filename from title
FILENAME=$(echo "$VIDEO_TITLE" | tr '[:upper:]' '[:lower:]' | \
  sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | \
  sed 's/^-//' | sed 's/-$//')
OUTPUT="${VIDEO_DOCS_DIR}/${FILENAME}.md"

echo "📹 Video: $VIDEO_TITLE"
echo "📄 Output: $OUTPUT"
echo "📁 Vault: $VIDEO_DOCS_DIR"

# Step 3: Download transcript
yt-dlp --legacy-server-connect --write-auto-sub --skip-download \
  --sub-format vtt --output "/tmp/%(id)s.%(ext)s" "$VIDEO_URL"

# Step 4: Process with Fabric and replace URL placeholder
grep -v '^[0-9][0-9]:[0-9][0-9]' /tmp/${VIDEO_ID}.en.vtt | \
  grep -v '^WEBVTT' | grep -v '^Kind:' | grep -v '^Language:' | \
  grep -v '^$' | sed 's/<[^>]*>//g' | \
  fabric -p document_video_walkthrough > "$OUTPUT"

# Replace empty source line with actual URL
sed -i '' "s|^source:.*|source: $VIDEO_URL|" "$OUTPUT"

# Step 5: Confirm success
if [ -f "$OUTPUT" ]; then
  echo "✅ Documentation saved to PKM vault: $OUTPUT"
  echo "📊 Size: $(wc -l < "$OUTPUT") lines"
else
  echo "❌ Failed to create documentation"
fi
```

**Example Output:**
- Video: "Claude Skills Factory: Generate AI Skills at Scale"
- Vault: `/Users/edworks/code/pkm/obsidian/PandorasBox/03_RESOURCES/YouTube-Walkthroughs/`
- Filename: `claude-skills-factory-generate-ai-skills-at-scale.md`

## Output Structure

The generated markdown includes:

```markdown
# [Video Title]

## VIDEO OVERVIEW
- Presenter, topic, duration, audience

## EXECUTIVE SUMMARY
50-75 word overview

## KEY INSIGHTS
- Strategic takeaways
- Why behind techniques

## PREREQUISITES
1. Required tools
2. Setup steps

## DETAILED WALKTHROUGH
### Step 1: [Action]
- Explanation
- Code blocks
- Important notes

### Step 2: [Next Action]
...

## IMPORTANT CONCEPTS
Definitions and explanations

## TROUBLESHOOTING & TIPS
Common issues and solutions

## TOOLS & RESOURCES
Links and references

## ADVANCED TECHNIQUES
Pro tips and optimizations

## NEXT STEPS
Follow-up actions

## QUICK REFERENCE
Command cheatsheet
```

## Handling Edge Cases

**No Transcript Available:**
```bash
# Check if VTT file exists
if [ ! -f "/tmp/${VIDEO_ID}.en.vtt" ]; then
  echo "❌ No transcript available for this video"
  echo "Video may not have captions or may be region-restricted"
  exit 1
fi
```

**SSL/Connection Issues:**
- Use `--legacy-server-connect` flag
- Try alternative subtitle formats: `--sub-format srt`
- Check network connectivity

**Non-English Videos:**
```bash
# Specify language code
yt-dlp --write-auto-sub --sub-lang es --skip-download ...
```

## Where to Save Output

Default location: Current working directory

Recommended locations:
- `~/Documents/video-walkthroughs/`
- `~/Downloads/`
- Project-specific directories

**For PAI integration:**
```bash
# Save to PAI documentation
OUTPUT_DIR="${PAI_DIR}/documentation/video-walkthroughs"
mkdir -p "$OUTPUT_DIR"
# Save file to $OUTPUT_DIR/${VIDEO_ID}_walkthrough.md
```

## Example Invocations

**User Request 1:**
> "Document this YouTube video: https://youtube.com/watch?v=ABC123"

**Your Response:**
1. Extract video ID: `ABC123`
2. Download transcript
3. Process with Fabric
4. Save to `ABC123_walkthrough.md`
5. Report success with file location

**User Request 2:**
> "Create a step-by-step guide from this tutorial"

**Your Response:**
1. Ask for YouTube URL if not provided
2. Follow workflow above
3. Emphasize the "DETAILED WALKTHROUGH" section in output

## Integration with PAI Commands

This skill can be wrapped in a PAI command for easier access:

**Create:** `${PAI_DIR}/commands/youtube-to-doc.md`

```markdown
#!/usr/bin/env bun
/**
 * # YouTube to Documentation
 * ## Purpose
 * Convert YouTube videos to comprehensive markdown walkthroughs
 */

import { $ } from 'bun';

const videoUrl = process.argv[2];
if (!videoUrl) {
  console.error('Usage: youtube-to-doc.md <youtube-url>');
  process.exit(1);
}

const videoId = videoUrl.match(/v=([^&]+)/)?.[1];
const outputFile = `${videoId}_walkthrough.md`;

// Download and process
await $`yt-dlp --legacy-server-connect --write-auto-sub --skip-download \
  --sub-format vtt --output /tmp/%(id)s.%(ext)s ${videoUrl}`;

await $`grep -v '^[0-9][0-9]:[0-9][0-9]' /tmp/${videoId}.en.vtt | \
  grep -v '^WEBVTT' | grep -v '^Kind:' | grep -v '^Language:' | \
  grep -v '^$' | sed 's/<[^>]*>//g' | \
  fabric -p document_video_walkthrough > ${outputFile}`;

console.log(`✅ Documentation saved to: ${outputFile}`);
```

## Best Practices

1. **Always validate the video URL** before processing
2. **Check transcript availability** before running Fabric
3. **Clean up temp files** after processing
4. **Preview output** before saving to final location
5. **Handle errors gracefully** with user-friendly messages

## Pattern Customization

To modify the output format, edit:
```
~/.config/fabric/patterns/document_video_walkthrough/system.md
```

Common customizations:
- Add timestamps to walkthrough steps
- Include screenshot placeholders
- Adjust section ordering
- Change output verbosity

## Performance Notes

- Average processing time: 30-60 seconds
- Transcript download: 5-15 seconds
- Fabric processing: 20-45 seconds (varies by video length)
- Supports videos up to 2 hours (typical transcript limit)

## Success Response Format

When complete, report to user:

```
✅ Video documentation complete!

📄 File: 7_SL0FaY8MM_walkthrough.md
📊 Size: 342 lines
🎯 Video: "Claude Skills Factory: Generate AI Skills at Scale"

Sections included:
✓ Executive summary
✓ Key insights (17)
✓ Prerequisites (8)
✓ Detailed walkthrough (12 steps)
✓ Troubleshooting tips
✓ Quick reference

➡️ Next: Review the file and customize as needed
```

---

This skill is now available in PAI and ready to invoke!
