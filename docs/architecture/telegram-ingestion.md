# Telegram Ingestion Pipeline

**Document Type:** Architecture Design
**Version:** 1.0.0
**Date:** 2024-12-01
**Status:** Design Approved

---

## Executive Summary

Telegram replaces the daily note "scratchpad dump" as the primary ingestion point for all knowledge capture. Content sent to Telegram is automatically processed, enriched with tags and metadata, and written to the Obsidian vault as properly structured, searchable notes.

---

## Problem: The Scratchpad Dump

Current state: Daily notes have a "Scratchpad" section that becomes a dumping ground:

```markdown
# Scratchpad

https://x.com/DanielMiessler/status/1992435933707395365

Nano banana skill Claude Code Daniel Miessler

Boktips Chris Poplar
Pillars of the earth

**MIT giveth and MIT taketh away...** [link]
A new labor simulation tool...

[**WormGPT 4 and KawaiiGPT (3 minute read)**](link)
WormGPT 4 and KawaiiGPT are new "dark LLMs"...
```

**Problems:**
- Unstructured, hard to search
- No tags or metadata
- Mixed content types
- Items get lost/forgotten
- No enrichment or context
- Manual effort to organize later

---

## Solution: Telegram as Ingestion Queue

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TELEGRAM INGESTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUT (Multi-device)          PROCESSING              OUTPUT (Vault)   │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │     Telegram     │    │     Pipeline     │    │  Enriched Notes  │  │
│  │                  │    │                  │    │                  │  │
│  │ 🎤 Voice memo    │───▶│ 1. Transcribe    │───▶│ Proper title     │  │
│  │ 🔗 URL/Link      │    │ 2. Fetch content │    │ YAML frontmatter │  │
│  │ 💭 Quick idea    │    │ 3. Classify type │    │ Tags             │  │
│  │ 📄 Document      │    │ 4. Generate tags │    │ Summary          │  │
│  │ 📸 Screenshot    │    │ 5. Enrich        │    │ Searchable       │  │
│  │ 📰 Newsletter    │    │ 6. Write note    │    │ Linked           │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│         │                        │                        │             │
│         │                        │                        │             │
│    Immutable log            Uses existing:           Vector indexed    │
│    Multi-device             • ts (transcribe)        Semantic search   │
│    Works offline            • fabric patterns        Tag hierarchy     │
│    Interoperable            • save (to vault)                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Content Type Processing

### Voice Memos
```
Input: Audio file sent to Telegram
Pipeline:
  1. Download audio
  2. Transcribe (ts → whisper-cpp)
  3. Extract wisdom (fabric -p extract_wisdom)
  4. Generate title (LLM)
  5. Generate tags based on content
  6. Save as two notes: Raw + Wisdom
Output:
  - 2025-11-27-Product-Roadmap-Ideas-Raw.md
  - 2025-11-27-Product-Roadmap-Ideas-Wisdom.md
Tags: #type/voice-memo #source/telegram #status/processed
```

### URLs/Links
```
Input: URL pasted to Telegram
Pipeline:
  1. Fetch page content
  2. Extract main content (readability)
  3. Summarize (fabric -p summarize)
  4. Classify topic
  5. Generate tags
  6. Save with summary
Output:
  - 2025-11-27-MIT-AI-Labor-Displacement-Study.md
Tags: #type/research #source/newsletter #topic/ai #status/processed
```

### Quick Ideas/Notes
```
Input: Text message to Telegram
Pipeline:
  1. Classify type (idea, task, reference, quote)
  2. Generate title
  3. Add context tags
  4. Save note
Output:
  - 2025-11-27-Claude-Code-Nano-Banana-Skill-Idea.md
Tags: #type/idea #projects/pai #status/raw
```

### Documents
```
Input: PDF/DOCX sent to Telegram
Pipeline:
  1. Download document
  2. Extract text (pandoc)
  3. Summarize (fabric)
  4. Generate tags
  5. Save with summary + link to original
Output:
  - 2025-11-27-Quarterly-Report-Summary.md
Tags: #type/document #source/telegram
```

### Screenshots/Images
```
Input: Image sent to Telegram
Pipeline:
  1. Download image
  2. OCR if text-heavy (tesseract)
  3. Describe content (vision model)
  4. Generate tags
  5. Save with description + embedded image
Output:
  - 2025-11-27-Architecture-Diagram-Screenshot.md
Tags: #type/image #source/telegram
```

---

## Telegram Setup

### Create Private Bot

1. Message @BotFather on Telegram
2. `/newbot` → Follow prompts
3. Save bot token

### Create Private Channel

1. Create new Telegram channel (private)
2. Add your bot as admin
3. Get channel ID

### Configuration

Add to `~/.config/fabric/.env`:

```bash
# Telegram Ingestion
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=your_channel_id

# Optional: Separate channels per content type
TELEGRAM_VOICE_CHANNEL_ID=voice_memos_channel
TELEGRAM_RESEARCH_CHANNEL_ID=research_channel
```

---

## Pipeline Architecture

### `ingest` CLI

```bash
# Poll for new messages
ingest poll

# Process all pending messages
ingest process

# Process specific message
ingest process --message-id 12345

# Check queue status
ingest status

# Retry failed messages
ingest retry --failed
```

### Processing Flow

```typescript
// Simplified pipeline flow
async function processMessage(message: TelegramMessage) {
  // 1. Identify content type
  const contentType = classifyContent(message);

  // 2. Download/extract content
  const content = await extractContent(message, contentType);

  // 3. Process based on type
  let processed;
  switch (contentType) {
    case 'voice':
      processed = await processVoiceMemo(content);
      break;
    case 'url':
      processed = await processUrl(content);
      break;
    case 'text':
      processed = await processText(content);
      break;
    // ... etc
  }

  // 4. Generate tags
  const tags = await generateTags(processed);

  // 5. Write to vault
  await writeToVault(processed, tags);

  // 6. Mark as processed
  await markProcessed(message.id);
}
```

### Integration with Existing Tools

The pipeline leverages existing tools:

```bash
# Transcription (existing)
ts audio.m4a

# Content processing (existing fabric patterns)
fabric -p extract_wisdom
fabric -p summarize
fabric -p extract_article_wisdom

# Save to vault (existing)
save "Note Title" -t tag1 -t tag2

# YouTube (existing)
yt "https://youtube.com/..."
```

---

## Processing Profiles

The pipeline supports **customizable processing profiles** to accommodate different note-taking workflows:

### Built-in Profiles

| Profile | Description | Output |
|---------|-------------|--------|
| `zettelkasten` | Paired Raw+Wisdom files with backlinks | Two files per input |
| `simple` | Single processed output | One file per input |

### Profile Configuration

Profiles control:
- **Tag taxonomy**: Status tags, prefixes, person name format
- **File naming**: Suffixes (-Raw, -Wisdom), source in filename
- **Processing**: Fabric patterns, paired vs single output
- **Auto-tagging**: Project keywords, person detection

**Example profile** (`~/.config/pai/profiles/default.json`):
```json
{
  "name": "zettelkasten",
  "description": "Paired Raw+Wisdom workflow",
  "tags": {
    "status": {
      "incoming": "incoming",
      "raw": "raw",
      "processed": "fabric-extraction",
      "wisdom": "wisdom"
    },
    "sourcePrefix": "source",
    "projectPrefix": "project",
    "personFormat": "snake_case"
  },
  "naming": {
    "dateFormat": "%Y-%m-%d",
    "suffixes": {
      "raw": "-Raw",
      "wisdom": "-Wisdom"
    },
    "includeSource": true
  },
  "processing": {
    "pairedOutput": true,
    "patterns": {
      "voice": ["extract_wisdom"],
      "url": ["extract_article_wisdom"]
    },
    "addBacklinks": true
  }
}
```

### Select Profile

```bash
# Via environment
export INGEST_PROFILE=simple
ingest process

# Via config
# Add to ~/.config/fabric/.env:
INGEST_PROFILE=zettelkasten
```

---

## Tag Generation

Tags are generated based on the active profile's taxonomy:

### Processing Status Tags
| Stage | Default Tag | Purpose |
|-------|-------------|---------|
| Ingested | `incoming` | New content |
| Raw | `raw` | Unprocessed transcript |
| Processed | `fabric-extraction` | After fabric pattern |
| Wisdom | `wisdom` | Wisdom extraction |
| Reviewed | `main` | User-reviewed |

### Source Tags
Format: `{sourcePrefix}/{source}` (e.g., `source/telegram`)

### Entity Tags
- **People**: Detected names, formatted per profile (snake_case, kebab-case)
- **Projects**: `{projectPrefix}/{name}` based on keyword detection

### Auto-Detection

The pipeline can detect:
- **Known people**: From profile's `knownPeople` list
- **Projects**: Via `projectKeywords` mapping
- **Content type**: Meeting, call, idea, research

---

## Migration Strategy

### Phase 1: Process Existing Scratchpads
Use `vault/workflows/process-daily-notes.md` to:
1. Extract items from existing scratchpads
2. Process through pipeline
3. Create enriched notes
4. Replace scratchpad items with links

### Phase 2: Switch to Telegram
1. Set up Telegram bot and channel
2. Start sending new content to Telegram
3. Stop using daily note scratchpad
4. Let pipeline handle all ingestion

### Phase 3: Retire Scratchpad Workflow
Once all existing scratchpads processed and habit changed:
- Daily notes only for tasks and journal
- All capture goes through Telegram
- `process-daily-notes` becomes archive tool only

---

## Scheduling

### LaunchAgent (macOS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pai.telegram-ingest</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/username/.local/bin/ingest</string>
        <string>process</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer> <!-- Every 5 minutes -->
    <key>StandardOutPath</key>
    <string>/tmp/telegram-ingest.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/telegram-ingest-error.log</string>
</dict>
</plist>
```

### Manual Processing

```bash
# Process now
ingest process

# Watch mode (for development)
ingest watch
```

---

## Error Handling

### Message States

| State | Reaction | Meaning |
|-------|----------|---------|
| Pending | (none) | Not yet processed |
| Processing | ⏳ | Currently being processed |
| Success | ✅ | Processed successfully |
| Failed | ❌ | Processing failed |
| Skipped | ⏭️ | Intentionally skipped |

### Retry Logic

```bash
# Retry all failed
ingest retry --failed

# Retry specific message
ingest retry --message-id 12345

# View failed messages
ingest status --failed
```

### Error Logging

All errors logged to:
- `/tmp/telegram-ingest-error.log` (LaunchAgent)
- `~/.local/share/pai/ingest.log` (persistent)

---

## Benefits Over Scratchpad

| Aspect | Scratchpad (Old) | Telegram Pipeline (New) |
|--------|------------------|-------------------------|
| Structure | None | Proper notes with frontmatter |
| Tags | Manual | Automatic |
| Searchable | Text only | Semantic + tags |
| Multi-device | Mac only | iOS, Mac, web, anywhere |
| Offline | N/A | Works offline, syncs later |
| Voice memos | Copy from Voice Memos app | Direct to Telegram |
| URLs | Paste, forget | Auto-fetch, summarize |
| Audit trail | None | Immutable message log |

---

## Related Documentation

- [Context System Architecture](./context-system.md)
- [Semantic Search](./semantic-search.md)
- [Contributing to Upstream](./CONTRIBUTING.md)

---

**Document Version:** 1.0.0
**Last Updated:** 2024-12-01
**Status:** ✅ Design Approved
