# CLI Reference

Complete reference for the `ingest` and `obs` command-line tools.

## ingest CLI - Content Capture

The `ingest` CLI captures content into your Obsidian vault via Telegram.

### Commands

#### `ingest watch`

Run the daemon that polls Telegram for new messages.

```bash
ingest watch                    # Default: 30s interval
ingest watch --interval 10      # Poll every 10 seconds
ingest watch --verbose          # Show processing details
```

This is typically run as a background service (LaunchAgent on macOS, systemd on Linux).

#### `ingest poll`

Process pending messages once and exit.

```bash
ingest poll                     # Process all pending
ingest poll --limit 5           # Process max 5 messages
```

Useful for testing or manual runs.

#### `ingest direct`

Send content directly to your vault (via Telegram).

```bash
# Text note
ingest direct --text "Meeting notes from standup" --caption "#meeting ~work"

# From clipboard (macOS)
pbpaste | ingest direct --caption "#clipboard"

# File upload
ingest direct --file document.pdf --caption "#project/pai /attach"

# Dry run (show what would happen)
ingest direct --text "Test" --dry-run
```

**Options:**
| Flag | Description |
|------|-------------|
| `--text <text>` | Text content to ingest |
| `--file <path>` | File to upload |
| `--caption <text>` | Caption with tags and hints |
| `--dry-run` | Show what would happen without sending |

#### `ingest config`

Show current configuration.

```bash
ingest config                   # Show all config
ingest config --check           # Validate configuration
```

#### `ingest process`

Process a specific Telegram message by ID.

```bash
ingest process 12345            # Process message ID 12345
```

### Caption Syntax

Captions support special syntax for tags, people, metadata, and commands:

```
#tag              → Tag the note
#project/name     → Hierarchical tag
@person           → Person mention (becomes tag)
~private          → Privacy scope
~work             → Work scope
[key:value]       → Metadata (device, source, etc.)
/command          → Processing command
```

**Examples:**

```bash
# Simple note with tags
--caption "#meeting #project/pai"

# Voice memo with scope
--caption "~private #health"

# Document with archive command
--caption "/archive #finance"

# Full metadata (from iOS Shortcut)
--caption "[source:clipboard][device:iphone] #ideas"
```

### Processing Commands

| Command | Effect |
|---------|--------|
| `/archive` | Archive with standardized naming + Dropbox sync |
| `/attach` | Store with original filename in attachments/ |
| `/ocr` | Extract text from image using Tesseract |
| `/describe` | Generate Vision AI description |
| `/mermaid` | Extract Mermaid diagram from screenshot |
| `/store` | Save image without AI processing |
| `/wisdom` | Run Fabric `extract_wisdom` pattern |
| `/summarize` | Run Fabric `summarize` pattern |
| `/meeting-notes` | Run Fabric `meeting_minutes` pattern |

---

## obs CLI - Content Query

The `obs` CLI searches and retrieves content from your vault.

### Commands

#### `obs search`

Full-text and tag-based search.

```bash
# Text search
obs search --text "kubernetes deployment"

# Tag search
obs search --tag project/pai

# Combined
obs search --text "API" --tag project/pai

# Recent notes only
obs search --tag meeting --recent 7

# Limit results
obs search --text "ideas" --limit 10
```

**Options:**
| Flag | Description |
|------|-------------|
| `--text <query>` | Full-text search |
| `--tag <tag>` | Filter by tag |
| `--recent <days>` | Only notes from last N days |
| `--limit <n>` | Max results (default: 20) |
| `--scope <work\|private\|all>` | Privacy filter (default: work) |
| `--format <table\|json\|list>` | Output format |

#### `obs semantic`

Semantic (meaning-based) search using embeddings.

```bash
# Natural language query
obs semantic "best practices for API authentication"

# With filters
obs semantic "deployment strategies" --tag project/pai --limit 5

# Show similarity scores
obs semantic "machine learning" --verbose
```

**Options:**
| Flag | Description |
|------|-------------|
| `--limit <n>` | Max results (default: 10) |
| `--tag <tag>` | Filter by tag |
| `--threshold <0-1>` | Min similarity score |
| `--format <table\|json>` | Output format |

#### `obs context`

Combined search optimized for loading context.

```bash
# Find and prepare context
obs context "kubernetes" --tag project/devops

# Show what would be loaded
obs context "meeting notes" --recent 7
```

#### `obs read`

Load full content of a note.

```bash
# By name (partial match)
obs read "2024-12-08-Meeting"

# By exact path
obs read "/path/to/note.md"
```

#### `obs tags`

List all tags in your vault.

```bash
obs tags                        # All tags
obs tags --limit 50             # Top 50 tags
obs tags --format json          # JSON output
```

#### `obs embed`

Manage vector embeddings for semantic search.

```bash
# Embed all notes (first time)
obs embed

# Incremental update (new/changed only)
obs embed --incremental

# Check status
obs embed --status

# Re-embed specific note
obs embed --note "2024-12-08-Meeting-Notes.md"
```

### Output Formats

Both CLIs support multiple output formats:

```bash
# Table (default) - human readable
obs search --tag meeting --format table

# JSON - for scripting
obs search --tag meeting --format json

# List - compact
obs search --tag meeting --format list
```

### Environment Variables

Both CLIs read configuration from environment:

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `TELEGRAM_BOT_TOKEN` | For ingest | Telegram bot token |
| `TELEGRAM_CHANNEL_ID` | For ingest | Telegram channel ID |
| `OPENAI_API_KEY` | For semantic | OpenAI API key for embeddings |
| `FABRIC_PATH` | Optional | Path to Fabric patterns |

Configuration is typically stored in `~/.config/fabric/.env`.
