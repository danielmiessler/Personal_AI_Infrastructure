<!--
================================================================================
PAI CORE - SYSTEM/TOOLS.md
================================================================================

PURPOSE:
CLI utilities reference. Documents single-purpose command-line tools that don't
need separate skills. Simple utilities documented here, executed directly.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/TOOLS.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/TOOLS.md

CUSTOMIZATION:
- [ ] Add your own CLI tools
- [ ] Update paths to match your setup
- [ ] Add environment variables documentation

RELATED FILES:
- CLIFIRSTARCHITECTURE.md - CLI-first design principles
- PAISYSTEMARCHITECTURE.md - Core architecture

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# PAI Tools - CLI Utilities Reference

This file documents single-purpose CLI utilities that have been consolidated from individual skills. These are pure command-line tools that wrap APIs or external commands.

**Philosophy:** Simple utilities don't need separate skills. Document them here, execute them directly.

---

## Template: Adding a New Tool

```markdown
## ToolName.ts - Brief Description

**Location:** `${PAI_DIR}/skills/CORE/Tools/ToolName.ts`

[Description of what the tool does]

**Usage:**
\`\`\`bash
# Basic usage
bun ${PAI_DIR}/skills/CORE/Tools/ToolName.ts [args]

# With options
bun ${PAI_DIR}/skills/CORE/Tools/ToolName.ts --option value
\`\`\`

**Environment Variables:**
- `API_KEY` - Required for [service] (from `${PAI_DIR}/.env`)

**When to Use:**
- "[trigger phrase 1]"
- "[trigger phrase 2]"

**Technical Details:**
- [Implementation notes]
```

---

## Example Tools

### RemoveBg.ts - Remove Image Backgrounds

**Location:** `${PAI_DIR}/skills/CORE/Tools/RemoveBg.ts`

Remove backgrounds from images using an API service.

**Usage:**
```bash
# Remove background from single image (overwrites original)
bun ${PAI_DIR}/skills/CORE/Tools/RemoveBg.ts /path/to/image.png

# Remove background and save to different path
bun ${PAI_DIR}/skills/CORE/Tools/RemoveBg.ts /path/to/input.png /path/to/output.png
```

**Environment Variables:**
- `REMOVEBG_API_KEY` - Required for background removal

**When to Use:**
- "remove background from this image"
- "make this image transparent"

---

### GetTranscript.ts - Extract YouTube Transcripts

**Location:** `${PAI_DIR}/skills/CORE/Tools/GetTranscript.ts`

Extract transcripts from YouTube videos.

**Usage:**
```bash
# Extract transcript to stdout
bun ${PAI_DIR}/skills/CORE/Tools/GetTranscript.ts "https://www.youtube.com/watch?v=VIDEO_ID"

# Save transcript to file
bun ${PAI_DIR}/skills/CORE/Tools/GetTranscript.ts "URL" --save /path/to/transcript.txt
```

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/shorts/VIDEO_ID`

**When to Use:**
- "get the transcript from this YouTube video"
- "extract transcript from this video"

---

## Voice Server API - Generate Voice Narration

**Location:** Voice server at `${VOICE_SERVER_URL}/notify`

Send text to the voice server for TTS output.

**Usage:**
```bash
curl -X POST ${VOICE_SERVER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your text here",
    "voice_id": "[YOUR_VOICE_ID]",
    "title": "Voice Narrative"
  }'
```

**Configuration:**
- **Voice ID:** Set via `ELEVENLABS_VOICE_ID` environment variable
- **Server:** `${VOICE_SERVER_URL}` (default: `http://localhost:8888`)
- **Max Segment:** 450 characters

**When to Use:**
- "read this to me"
- "speak this"
- "narrate this"

---

## Secret Scanning - TruffleHog

**Location:** System-installed CLI tool (`brew install trufflehog`)

Scan directories for 700+ types of credentials and secrets.

**Usage:**
```bash
# Scan directory
trufflehog filesystem /path/to/directory

# Scan git repository
trufflehog git file:///path/to/repo

# Verified findings only
trufflehog filesystem /path/to/directory --only-verified
```

**When to Use:**
- "check for secrets"
- "scan for sensitive data"
- "security audit before commit"

**What It Detects:**
- API keys (OpenAI, AWS, GitHub, 700+ services)
- OAuth tokens
- Private keys (SSH, PGP, SSL/TLS)
- Database connection strings
- Cloud provider credentials

---

## Adding New Tools

When adding a new utility tool:

1. **Add tool file:** Place `.ts` or `.py` file in `${PAI_DIR}/skills/CORE/Tools/`
   - Use **Title Case** for filenames (e.g., `GetTranscript.ts`)
   - Keep the directory flat - NO subdirectories

2. **Document here:** Add section with:
   - Tool location
   - Usage examples
   - When to use triggers
   - Environment variables (if any)

3. **Test:** Verify tool works from new location

**Don't create a separate skill** if the entire functionality is just a CLI command with parameters.
