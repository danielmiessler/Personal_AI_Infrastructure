# Context Skill Concepts

Core concepts behind the Context Management Skill.

## The Single Front Door: Telegram as Immutable Log

The Context skill uses Telegram as a **single capture point** for all knowledge ingestion. This design has several benefits:

### Why Telegram?

1. **Immutable Log**: Every piece of content you capture is permanently stored in your Telegram channel, creating an automatic backup and audit trail
2. **Multi-Device**: Capture from any device (phone, tablet, desktop) without additional setup
3. **Multi-Modal**: Voice memos, photos, documents, URLs, and text all flow through the same channel
4. **Offline-First**: Telegram queues messages when offline; the daemon processes when available
5. **Timestamp Authority**: Telegram's timestamps are authoritative for when content was captured

### The Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPTURE SOURCES                           │
├─────────────────────────────────────────────────────────────┤
│  📱 iPhone        🎙️ Voice Memo      📸 Photo              │
│  💻 Mac Clipboard 📄 Document        🔗 URL                 │
│  ⌨️ CLI Direct    📝 Text Note       🗣️ Dictation          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               TELEGRAM CHANNEL (Immutable Log)               │
│  • Permanent record of all captures                          │
│  • Timestamps, metadata preserved                            │
│  • Accessible from any device                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   INGEST DAEMON (watch)                      │
│  • Polls channel for new messages                            │
│  • Transcribes voice → text                                  │
│  • Extracts text from documents                              │
│  • Processes with AI (Vision, Wisdom extraction)             │
│  • Generates embeddings for semantic search                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   OBSIDIAN VAULT                             │
│  • Markdown notes with YAML frontmatter                      │
│  • Tags, metadata, timestamps preserved                      │
│  • Searchable via obs CLI or Obsidian                        │
└─────────────────────────────────────────────────────────────┘
```

### Direct Capture (Bypass Telegram)

For testing or quick captures, use `ingest direct`:

```bash
# Send text directly to vault (still goes through Telegram for the log)
ingest direct --text "Quick note about meeting" --caption "#meeting ~work"

# Pipe from clipboard
pbpaste | ingest direct --caption "#clipboard"
```

---

## Tag-Based Knowledge Structure

Tags are the primary way to organize and retrieve knowledge in your vault.

### Tag Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `#topic` | General topic | `#kubernetes`, `#cooking` |
| `#project/name` | Project-specific | `#project/pai`, `#project/website` |
| `#type/name` | Content type | `#type/meeting`, `#type/article` |
| `@person` | People mentioned | `@john`, `@sarah` |
| `~scope` | Privacy scope | `~work`, `~private` |

### Hierarchical Tags

Use `/` to create tag hierarchies:

```
#project/pai/ingest     # Specific feature of a project
#health/blood-pressure  # Health subcategory
#work/meetings/1on1     # Nested categorization
```

### Loading Context by Tag

When you ask Claude "What do we know about project X?", the Context skill:

1. Searches for `#project/x` tagged notes
2. Shows you an index (titles, dates, snippets)
3. Lets you select which notes to load into context
4. Loads full content only for selected notes

This **two-phase workflow** prevents context overload and gives you control.

### Scope Tags for Privacy

Use `~private` and `~work` to separate personal and professional content:

```bash
# Personal note (excluded from work searches by default)
ingest direct --text "Blood pressure: 120/80" --caption "~private #health"

# Work note (default scope)
ingest direct --text "Q1 roadmap discussion" --caption "~work #meeting"
```

---

## Embeddings and Semantic Search

The Context skill uses vector embeddings for semantic (meaning-based) search.

### How It Works

1. **On Ingest**: Each note is automatically embedded (vectorized) after processing
2. **Stored Locally**: Embeddings are stored in a SQLite database alongside your vault
3. **Query Time**: Your search query is embedded and compared against all note vectors
4. **Ranked Results**: Notes are returned by semantic similarity, not just keyword match

### Initial Vectorization

For an **existing vault**, you need to generate embeddings for all notes once:

```bash
# First time: embed all notes
obs embed

# Check embedding status
obs embed --status

# Subsequent updates (only new/changed notes)
obs embed --incremental
```

### Embedding Model

By default, uses OpenAI's `text-embedding-3-small` model. Requires `OPENAI_API_KEY` in your environment.

### When to Use Semantic vs Keyword Search

| Use Case | Command | Example |
|----------|---------|---------|
| Know exact terms | `obs search --text` | `obs search --text "API key rotation"` |
| Know the tag | `obs search --tag` | `obs search --tag project/pai` |
| Conceptual query | `obs semantic` | `obs semantic "authentication best practices"` |
| Combined | `obs context` | `obs context "API security" --tag project/pai` |

---

## Processing Pipelines

Content flows through different pipelines based on type and hints:

### Default Pipeline

Most content goes through the default pipeline:
1. Extract/transcribe content
2. Parse tags and metadata from caption
3. Generate AI title
4. Run Fabric pattern (if requested)
5. Save to vault
6. Generate embeddings

### Archive Pipeline

For documents you want to archive with standardized naming:

```bash
# Triggered by /archive command or archive-named files
ingest direct --file receipt.pdf --caption "/archive #finance"

# Or send a pre-named file to Telegram:
# "RECEIPT - 20241208 - Amazon Order - HOME.pdf"
```

Archive pipeline:
1. Preserves original file
2. Syncs to Dropbox (if configured)
3. Creates markdown note with link
4. Uses standardized naming: `TYPE - DATE - Description - CATEGORY.ext`

### Attach Pipeline

For documents to keep with original filename:

```bash
ingest direct --file diagram.png --caption "/attach #project/pai"
```

Copies file to vault's `attachments/` folder with original name.
