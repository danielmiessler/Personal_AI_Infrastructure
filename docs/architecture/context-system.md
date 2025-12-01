# Context Management System

**Document Type:** Architecture Design
**Version:** 1.0.0
**Date:** 2024-12-01
**Status:** Design Approved

---

## Executive Summary

The Context Management System transforms Obsidian into the primary knowledge repository for PAI, replacing the original UFC (Universal File Context) concept with a CLI-first, Fabric-integrated approach. It enables multi-source content ingestion via Telegram, semantic search across the vault, and dynamic context loading when working with PAI.

---

## Design Principles

### CLI-First Architecture
Following PAI's foundational principle, all context operations are exposed via CLI tools that can be:
- Called directly from the terminal
- Invoked by PAI skills and workflows
- Composed with existing tools (`ts`, `save`, `fabric`)

### Integration Over Replacement
Rather than building from scratch, the system integrates with existing tools:
- **`ts`** - Transcription via whisper-cpp (existing)
- **`save`** - Write to Obsidian with frontmatter (existing)
- **`fabric -p`** - Content processing patterns (existing)
- **`yt`** - YouTube transcript extraction (existing)

### Tag-Based Organization (Zettelkasten-Inspired)

The system uses a Zettelkasten-inspired tag taxonomy:

**Processing Status Tags:**
| Tag | Purpose |
|-----|---------|
| `incoming` | Raw input needing processing |
| `processed` | Processed by fabric pattern |
| `main` | Main slipbox (curated knowledge) |
| `wisdom` | Extracted insights/wisdom |
| `raw` | Unprocessed content |
| `transcript` | Full transcript |

**Entity Tags:**
- **People:** `person/name_surname` (snake_case, e.g., `person/john_doe`)
- **Projects:** `project/project-name` (hierarchical, e.g., `project/my-project`)
- **Organizations:** `org/company-name`

**Content Type Tags:**
| Tag | Purpose |
|-----|---------|
| `meeting-notes` | Meeting documentation |
| `1on1` | One-on-one meetings |
| `bibliography` | Books, papers, references |
| `transcript` | Voice/video transcripts |
| `link` | Saved web links |
| `idea` | Ideas and thoughts |

**Topic Tags:** Free-form topic tags like `ai`, `devops`, `security`, etc.

**Naming Convention:**
```
YYYY-MM-DD-Title.md
YYYY-MM-DD-Title (Attendees) Suffix.md

Suffixes: -Raw, -Wisdom, -Transcript, -Minutes
```

**Note:** Create your own `skills/context/tag-taxonomy.md` to document your personal taxonomy.

---

## System Architecture

### Two-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INGESTION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STAGE 1: CAPTURE                    STAGE 2: PROCESS                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │   Telegram   │──▶│  Raw Note    │──▶│ Processed    │                 │
│  │              │   │              │   │   Note       │                 │
│  │ voice memo   │   │ #incoming    │   │ #project/x   │                 │
│  │ URL/link     │   │ #source/tg   │   │ #wisdom      │                 │
│  │ text idea    │   │ transcribed  │   │ #meeting     │                 │
│  └──────────────┘   └──────────────┘   └──────────────┘                 │
│        │                   │                   │                         │
│   immutable log      first landing        context-tagged                │
│   multi-device       in vault             searchable                    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CONTEXT LOADING (the key feature)                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  "Load context for project X"                                      │  │
│  │       ↓                                                            │  │
│  │  obs search --tag "project/x"  →  All notes tagged #project/x     │  │
│  │       ↓                                                            │  │
│  │  Returns: meeting notes, ideas, research, decisions, wisdom        │  │
│  │           all linked by the same project tag                       │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tag-Based Context Loading

**Project tags are the glue.** When working on a project:
1. All related content gets tagged `#project/project-name`
2. Context loading = `obs search --tag "project/project-name"`
3. Returns everything relevant: meetings, ideas, decisions, research

---

## Components

### 1. Skills

#### `skills/context/` - Context Loading
Load relevant context when working on tasks.

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `load-project.md` | "load context for X" | Load notes by project tag |
| `semantic-search.md` | "find notes about X" | Vector similarity search |

#### `skills/vault/` - Vault Maintenance
Organize and maintain the knowledge vault.

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `process-daily-notes.md` | "process daily notes" | Extract scratch pad items |
| `tag-untagged.md` | "tag untagged notes" | AI-assisted tagging |
| `capture-session.md` | "save this conversation" | Capture Claude sessions |

### 2. CLI Tools

#### `obs` - Obsidian Vault Operations

```bash
# Search
obs search --tag "project/my-project"     # Find by tag
obs search --text "kubernetes"            # Full-text search
obs search --tag "meeting-notes" --recent 10  # Recent meeting notes
obs semantic "deployment strategies"      # Vector similarity search

# Read/Write
obs read "2024-12-01-Meeting-Notes"       # Read note content
obs write "Title" --tags "project/x,idea" # Create note

# Index
obs embed                                 # Build vector index
obs embed --stats                         # Show index statistics

# Maintenance
obs tags                                  # List all tags in vault
obs tags --counts                         # Tags with usage counts
```

**Implementation:** TypeScript/Bun, uses grep for search, sqlite-vec for embeddings.

#### `ingest` - Telegram Ingestion Pipeline

```bash
ingest poll                               # Fetch unprocessed messages
ingest process                            # Run processing pipeline
ingest status                             # Show queue status
ingest retry <message-id>                 # Retry failed message
```

**Pipeline:**
1. Poll Telegram Bot API for new messages
2. Download media/content
3. Transcribe audio (via `ts`)
4. Process with fabric pattern (e.g., `extract_wisdom`)
5. Generate title (via LLM)
6. Save to vault (via `save`)
7. Mark Telegram message as processed (✅ reaction)

### 3. Semantic Search

**Storage:** `~/Documents/andreas_brain/_meta/embeddings.db` (sqlite-vec)

**Embeddings:** Local sentence-transformers (e.g., all-MiniLM-L6-v2)

**Operations:**
- `obs embed` - Full index rebuild
- `obs embed --incremental` - Update changed notes only
- `obs semantic "query"` - Return top N similar notes

---

## Photo Processing Options

When sharing photos to Telegram, you can control how they're processed using the caption:

### Processing Modes

| Share Method | Processing | Output |
|--------------|------------|--------|
| Photo only (no caption) | Pass-through | Raw note with image link |
| Photo + text caption | Vision AI analysis | Note with AI description using caption as prompt |
| Photo + `/ocr` | Tesseract OCR | Note with extracted text only |
| Photo + `/describe` | Vision AI description | Detailed image description |
| Photo + `/mermaid` | Vision AI → Mermaid | Note with generated diagram code |
| Photo + `/store` | No processing | Just copy image to vault |

### Examples

```bash
# Just share a photo → stored as raw note with image embedded
[photo]

# Share with analysis prompt (caption becomes the prompt)
[photo] + "What architecture pattern is shown here?"

# Share whiteboard with extraction request
[photo] + "Extract the flowchart and create a mermaid diagram"

# Explicit commands
[photo] + "/ocr"                    # Just OCR, no AI
[photo] + "/describe"               # General description
[photo] + "/mermaid"                # Extract diagram
[photo] + "/store"                  # Just save, no processing
```

### Requirements

- **Vision AI**: `OPENAI_API_KEY` (for GPT-4 Vision) or `GOOGLE_API_KEY` (for Gemini)
- **OCR only**: `tesseract` installed locally (`brew install tesseract`)

### Image Storage

Photos are stored in `${OBSIDIAN_VAULT_PATH}/attachments/` and linked from the note:
```markdown
---
tags: [incoming, source/telegram, photo]
---

![Screenshot](attachments/2024-12-01-screenshot-001.png)

**Analysis:** This shows a microservices architecture with...
```

---

## Share-with-Hints Workflow

The pipeline supports **inline metadata hints** when sharing content to Telegram, enabling tight integration with iOS Shortcuts and macOS Share menu.

### Supported Hint Formats

| Format | Example | Result |
|--------|---------|--------|
| `#tag` | `#meeting-notes` | Adds tag: `meeting-notes` |
| `#project/name` | `#project/pai` | Adds tag: `project/pai` |
| `@person` | `@ed_overy` | Adds tag: `ed_overy` |
| `/command` | `/transcript` | Routes to content type |

### Example Message

```
#project/pai @ed_overy /meeting-notes
Notes from our weekly sync about the ingest pipeline
```

**Results in:**
- Tags: `project/pai`, `ed_overy`, `meeting-notes`, `incoming`, `source/telegram`
- Content: "Notes from our weekly sync about the ingest pipeline"
- Content type: Routed as meeting notes

### iOS Shortcut Integration

Create a Shortcut that:
1. Takes input (text, URL, file, voice memo)
2. Adds prefix with project/tags
3. Sends to Telegram channel via Telegram API or share

### macOS Quick Actions

Create Automator/Shortcuts action that:
1. Gets selected content from any app
2. Prompts for project/tags (optional)
3. Sends to Telegram channel

---

## Telegram as Immutable Log

Telegram serves as the ingestion queue and audit trail:

```
┌─────────────────────────────────────────────────────────────┐
│                 TELEGRAM (Immutable Log)                     │
├─────────────────────────────────────────────────────────────┤
│  Private Channel with Bot                                    │
│                                                              │
│  Content Types:                                              │
│  ├── Voice messages     → ts → fabric → save                │
│  ├── Audio files        → ts → fabric → save                │
│  ├── Documents          → extract → fabric → save           │
│  ├── URLs/Links         → fetch → fabric → save             │
│  ├── Text messages      → fabric → save                     │
│  └── Images             → describe → save                   │
│                                                              │
│  Message State (via reactions):                              │
│  ├── (none)    → Pending                                    │
│  ├── ⏳        → Processing                                 │
│  ├── ✅        → Processed successfully                     │
│  └── ❌        → Failed (check logs)                        │
│                                                              │
│  Benefits:                                                   │
│  - Immutable audit trail                                    │
│  - Multi-device input (iOS, Mac, web)                       │
│  - Interoperable with many services                         │
│  - Built-in media handling                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Paths

| Component | Path | Configured Via |
|-----------|------|----------------|
| Obsidian Vault | `~/Documents/vault` | `OBSIDIAN_VAULT_PATH` |
| Vector Index | `${vault}/_meta/embeddings.db` | `CONTEXT_EMBEDDINGS_DB` |
| PAI Directory | `${PAI_DIR}` | `PAI_DIR` env var |
| Fabric Config | `~/.config/fabric/` | Built-in |
| obs CLI | `${PAI_DIR}/bin/obs/` | Installed to `~/.local/bin` |

---

## Integration with Existing Tools

### `ts` (Transcription)
```bash
# Transcribe audio to text (requires whisper-cpp or similar)
ts audio.m4a  # → stdout: transcription text
```

### `save` (Write to Obsidian)
```bash
# From fabric ecosystem - saves to Obsidian with frontmatter
echo "content" | save "My Title" -t tag1 -t tag2
# → Creates ${OBSIDIAN_VAULT_PATH}/YYYY-MM-DD-My Title.md
```

### Fabric Patterns
```bash
# Process content with fabric patterns
cat content.txt | fabric -p extract_wisdom --stream
cat transcript.txt | fabric -p summarize --stream

# Common patterns for context management:
# - extract_wisdom: Extract key insights
# - summarize: Summarize content
# - extract_article_wisdom: Process web articles
```

---

## LLM-Based Tag Extraction

The ingestion pipeline uses **non-deterministic (LLM) tag extraction** with the taxonomy as a guide:

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                   LLM TAG EXTRACTION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Content + Taxonomy Guide → LLM → Extracted Tags                │
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│  │   Content    │    │    Taxonomy     │    │   Output     │   │
│  │              │───▶│    (guide)      │───▶│              │   │
│  │ "Meeting     │    │                 │    │ meeting-notes│   │
│  │  with John   │    │ People format:  │    │ john_doe     │   │
│  │  about data  │    │ firstname_last  │    │ project/data │   │
│  │  platform"   │    │                 │    │ incoming     │   │
│  └──────────────┘    │ Project format: │    └──────────────┘   │
│                      │ project/name    │                        │
│                      └─────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Taxonomy as Prompt Guide

The tag taxonomy (`skills/context/tag-taxonomy.md`) provides:
1. **Categories** - What types of tags exist (status, people, projects, topics)
2. **Formats** - How to format each type (`firstname_lastname`, `project/name`)
3. **Examples** - Few-shot examples for the LLM
4. **Processing flow** - Status tag progression

### Why Non-Deterministic?

- **Flexibility**: LLM can understand context ("John" in meeting → `john_doe`)
- **Discovery**: Can identify new people/projects not in keyword list
- **Nuance**: Understands "data platform architecture" → `project/data-platform` + `enterprise-architecture`

### Available LLMs for Tagging

The pipeline can use any configured LLM via fabric:

| Provider | API Key | Best For |
|----------|---------|----------|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | Nuanced understanding, long content |
| OpenAI (GPT-4) | `OPENAI_API_KEY` | Fast, reliable |
| Gemini | `GEMINI_API_KEY` | Cost-effective, good for bulk |

Configure in profile or use fabric default:
```json
{
  "processing": {
    "tagExtractionModel": "anthropic",  // or "openai", "gemini"
    "fabricDefaultModel": true  // use fabric's configured default
  }
}
```

---

## Smart URL Handling

URLs in content require intelligent handling:

### Decision Matrix

| Scenario | Action | Example |
|----------|--------|---------|
| Message is ONLY a URL | **Fetch content** | `https://article.com/ai-news` |
| URL with "summarize", "read" | **Fetch content** | `"Summarize https://..."` |
| URL embedded in notes | **Preserve as link** | `"Meeting notes... see https://..."` |
| Newsletter paragraph + URL | **Fetch if main topic** | `"**AI News (3 min)** https://..."` |
| Reference/citation URL | **Preserve as link** | `"Source: https://..."` |

### URL Processing Flow

```
Message → Contains URL? → Classify Intent → Route
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    Main Content        Embedded Link      Explicit Request
    (fetch + process)   (preserve as-is)   (fetch based on verb)
```

### Integration with brightdata Skill

For difficult URLs, the ingest pipeline can leverage the 4-tier progressive scraping:

1. **Tier 1**: WebFetch (simple sites)
2. **Tier 2**: Curl with Chrome headers (basic bot detection)
3. **Tier 3**: Browser Automation (JavaScript-heavy)
4. **Tier 4**: Bright Data (CAPTCHA, advanced bot detection)

Configure in profile:
```json
{
  "processing": {
    "urlFetchStrategy": "progressive",  // or "simple", "always-brightdata"
    "fetchUrls": true,
    "preserveEmbeddedUrls": true
  }
}
```

---

## Content Type Intelligence

The pipeline is **content-aware**, handling different input types:

### Supported Content Types

| Type | Detection | Processing | Output |
|------|-----------|------------|--------|
| Voice memo | Audio file | `ts` transcription | Transcript note |
| Photo/Screenshot | Image file | OCR (tesseract) | Image note with text |
| Whiteboard | Image + OCR text | OCR + describe | Meeting note |
| Document (PDF/DOCX) | File type | `marker` extraction | Document note |
| MS Teams transcript | DOCX with format | `marker` + attendee parse | Meeting note |
| YouTube URL | URL pattern | `yt` command | Video transcript |
| Article URL | URL pattern | Fetch + summarize | Article note |
| Newsletter paragraph | Text + URL pattern | Fetch if main topic | Research note |
| Plain text | No media/URL | Direct save | Quick note |
| Video link | Video URL pattern | Fetch metadata | Link note |

### Processing Order

```
1. Detect content type (deterministic: file type, URL patterns)
2. Extract raw content (ts, marker, fetch, OCR)
3. Apply fabric patterns (extract_wisdom, summarize)
4. Generate tags via LLM (using taxonomy as guide)
5. Save to vault with frontmatter
```

---

## Task Management Integration (Future: Jira)

Context loading integrates with task management systems:

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT + TASKS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Jira (Tasks)              Obsidian (Context)                   │
│  ┌──────────────┐          ┌──────────────────┐                 │
│  │ PROJ-123     │◀────────▶│ project/proj     │                 │
│  │ Task: Fix X  │  sync    │ meeting notes    │                 │
│  │              │          │ research         │                 │
│  │ Status: Todo │          │ decisions        │                 │
│  └──────────────┘          └──────────────────┘                 │
│                                                                  │
│  Bi-directional:                                                │
│  • Jira → Vault: Task creates/updates note                      │
│  • Vault → Jira: Meeting action items create tasks              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Use Cases

1. **Context-switch to project**: `obs context my-project` + `jira tasks my-project`
2. **Weekly summary**: Recent notes + Jira completed tasks
3. **Meeting to tasks**: Extract action items → Create Jira issues
4. **Task context**: View Jira task → Load related vault notes

### CLI vs MCP

- **CLI preferred** for token efficiency (less overhead)
- **MCP available** for real-time tool calling in conversations
- Both approaches supported

---

## Migration from UFC

The original UFC (Universal File Context) concept used:
- `${PAI_DIR}/context/` directory with subdirectories
- Static markdown files for context

The new system replaces this with:
- Obsidian vault as dynamic context store
- Tag-based organization instead of directory hierarchy
- Semantic search for flexible context retrieval
- Telegram for immutable ingestion log

**Migration path:** Existing UFC files can be imported to Obsidian with appropriate tags.

---

## Implementation Order

1. ✅ Create feature branch `feature/context-system`
2. ✅ Create design documentation
3. Create `skills/context/` with SKILL.md and workflows
4. Create `skills/vault/` with SKILL.md and workflows
5. Build `obs` CLI (search, read, write, semantic, embed)
6. Build `ingest` CLI (Telegram integration)
7. Add semantic search (sqlite-vec embeddings)

---

## Installation & Setup

### Prerequisites

```bash
# Required
bun --version          # Bun runtime (https://bun.sh)
# OpenAI API key for embeddings

# Optional but recommended
rg --version           # ripgrep for fast search (fallback: grep)
```

### Install obs CLI

```bash
cd bin/obs
./install.sh
```

This will:
1. Create `~/.local/bin/obs` wrapper
2. Install launchd job for automatic embedding updates (macOS)

Verify installation:
```bash
obs --help
obs config
```

### Configuration

All settings in `~/.config/fabric/.env`:

```bash
# Required
OBSIDIAN_VAULT_PATH=~/Documents/my_vault   # Your Obsidian vault
OPENAI_API_KEY=sk-...                       # For semantic embeddings

# Optional
CONTEXT_EMBEDDINGS_DB=${OBSIDIAN_VAULT_PATH}/_meta/embeddings.db
DAILY_NOTE_FORMAT=%Y-%m-%d
SCRATCH_PAD_HEADER="# Scratchpad"
```

### Automatic Embedding Updates

The install script sets up a launchd job to auto-update embeddings every 30 minutes.

**macOS (launchd):**
```bash
# Check status
launchctl list | grep obs-embed

# Manual trigger
launchctl start com.pai.obs-embed

# View logs
tail -f /tmp/obs-embed.log

# Uninstall
launchctl unload ~/Library/LaunchAgents/com.pai.obs-embed.plist
```

**Linux (systemd) - Manual setup:**
```bash
# Create ~/.config/systemd/user/obs-embed.service
[Unit]
Description=PAI Obsidian Embedding Updates

[Service]
Type=oneshot
ExecStart=/usr/bin/bun run /path/to/obs/obs.ts embed
Environment=HOME=%h

[Install]
WantedBy=default.target

# Create timer ~/.config/systemd/user/obs-embed.timer
[Unit]
Description=Run obs embed every 30 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=30min

[Install]
WantedBy=timers.target

# Enable
systemctl --user enable obs-embed.timer
systemctl --user start obs-embed.timer
```

### Build Initial Embeddings

After installation, build the initial embedding index:

```bash
obs embed --verbose    # First run: indexes all notes
obs embed --stats      # Check index status
```

The index auto-updates for modified/new notes. Force full rebuild with:
```bash
obs embed --force --verbose
```

---

## Related Documentation

- [Telegram Ingestion Pipeline](./telegram-ingestion.md)
- [Semantic Search Architecture](./semantic-search.md)
- [Vault Management Guide](./vault-management.md)

---

## ADR References

- ADR-001: CLI-First Context Management
- ADR-002: Telegram as Immutable Ingestion Log
- ADR-003: Obsidian as Universal File Context

---

**Document Version:** 1.0.0
**Last Updated:** 2024-12-01
**Status:** ✅ Design Approved - Ready for Implementation
