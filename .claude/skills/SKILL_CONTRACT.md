# Context Management Skills Contract

> **Version:** 2.0
> **Date:** 2025-12-02
> **Status:** Active Development (v2 Pipeline)

---

## What This Is

The **Context Management Skills** provide Claude Code with the ability to:
- Load relevant context from your Obsidian knowledge vault
- Ingest content via Telegram (voice, text, URLs, documents)
- Perform semantic search across your notes
- Maintain and organize your vault

These skills are part of the PAI (Personal AI Infrastructure) ecosystem.

---

## ✅ Core Guarantees

These features are stable and will always work:

### 1. obs CLI - Core Operations
```bash
obs search --tag "project/x"    # Tag-based search
obs search --text "query"       # Full-text search
obs read "note-name"            # Read note content
obs write "Title" --tag "tag"   # Create note
obs tags                        # List all tags
```

### 2. Semantic Search
```bash
obs semantic "query"            # Vector similarity search
obs embed                       # Build/update embeddings
obs embed --stats               # Check index status
```

### 3. Skills Architecture
- `skills/context/SKILL.md` - Context loading skill
- `skills/vault/SKILL.md` - Vault maintenance skill
- Workflow routing via triggers
- Tag taxonomy reference

### 4. Security Layer
- Prompt injection detection
- Command whitelist validation
- Rate limiting
- Audit logging

---

## ⚙️ Configured Functionality

These features work but require configuration:

### Telegram Ingestion (v2 Pipeline)
**Requires:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`

```bash
ingest poll                     # Fetch new messages
ingest process                  # Process queue
ingest status                   # Show stats
ingest watch                    # Daemon mode (poll + process loop)
ingest query "search"           # Search vault and archive
ingest query --type CONTRACT    # Filter by document type
ingest query --category HOME    # Filter by category
ingest query --year 2024        # Filter by year
```

#### Content Types (Layer 1)
| Type | Description | Processing |
|------|-------------|------------|
| `voice` | Voice memos | Whisper → AI title → Note |
| `audio` | Audio files (mp3, m4a) | Whisper → AI title → Note |
| `document` | PDF, DOCX | Marker extraction → Note |
| `photo` | Images | Vision AI / OCR → Note |
| `url` | Web links, YouTube | Jina AI / yt tool → Note |
| `text` | Plain text | Direct → Note |

#### Pipelines (Layer 2)
| Pipeline | Trigger | Behavior |
|----------|---------|----------|
| `default` | No command | Standard note processing |
| `archive` | `/archive` | Archive naming + Dropbox sync |
| `receipt` | `/receipt` | Receipt archive + Dropbox sync |
| `clip` | `/clip` | Quick capture |
| `note` | `/note` | Standard note |

### Semantic Embeddings
**Requires:** `OPENAI_API_KEY`

```bash
obs embed --verbose             # Build with OpenAI embeddings
obs semantic "query"            # Requires embeddings.db
```

### Share-with-Hints (v2)
**Requires:** iOS Shortcut or macOS Share action configured

#### Inline Syntax
```
#project/pai @person_name /meeting-notes
[source:voice-memo][device:iphone][user:andreas]
Content here...
```

#### Metadata Fields
| Key | Description | Example |
|-----|-------------|---------|
| `source` | Origin shortcut | `clipboard-share`, `voice-memo` |
| `device` | Source device | `iphone`, `ipad`, `mac` |
| `user` | Source user | `andreas`, `magdalena` |
| `type` | Document type | `RECEIPT`, `CONTRACT` |
| `category` | Category | `HOME`, `WORK`, `CAR` |
| `date` | Document date | `2024-06-15`, `15/06/2024` |

#### Document Date (for Historic Content)
Override the processing date with the actual document date. Works for ALL content types.

**Structured syntax:**
```
[date:2024-06-15] /archive Old contract
[date:15/06/2024] /receipt Last month's receipt
[date:2023-03-15] Meeting notes from March
```

**Dictated (voice memos):**
- "dated 15th June" / "dated June 15" → `2024-06-15`
- "from last month" → first of previous month
- "from yesterday" → yesterday's date
- "date 2024-06-15" → explicit ISO format

**What uses the document date:**
1. **Note filename**: `2024-06-15 - Meeting notes.md` (not today's date)
2. **Archive naming**: `CONTRACT - 20240615 - Old contract - WORK.pdf`
3. **Frontmatter**: `document_date: 2024-06-15`

#### Spoken Hints (Voice Memos)
For voice memos shared directly (without shortcut), spoken hints are extracted:
- "hashtag project pai" → `#project-pai`
- "at ed overy" → `@ed_overy`
- "forward slash archive" → `/archive`
- "scope private" → `~private`

### Scope / Context Separation (v2)
**Purpose:** Separate private/personal content from work content

#### Scope Sigil
| Sigil | Meaning | Example |
|-------|---------|---------|
| `~private` | Personal/private content | `~private Save this health record` |
| `~work` | Professional content | `~work Meeting notes` |

#### Auto-detection
- Archive/receipt pipelines → auto-tagged `scope/private`
- Dictated "this is personal", "private matter" → `scope/private`
- Dictated "for work", "business related" → `scope/work`

#### Query Behavior
By default, queries **only include** notes with `scope/work` tag:
```bash
obs search --text "meeting"              # Only scope/work tagged (default)
obs search --text "invoice" --scope all  # Include everything
obs search --text "health" --scope private  # Only private + untagged
obs semantic "project" --scope work      # Semantic search work only
```

**Security Model:**
- No scope tag = treated as private (excluded from default queries)
- Must explicitly have `scope/work` to appear in context
- New ingested notes get `scope/work` by default (except archive/receipt)
- Use `--scope all` to consciously include everything

**Rationale:** Opt-in to work context is safer. Your existing vault stays private until you explicitly tag notes for work context.

### Archive Pipeline (v2)
**Requires:** `DROPBOX_ARCHIVE_PATH` (optional)

Archive naming convention:
```
{TYPE} - {YYYYMMDD} - {Description} ({Details}) - {CATEGORY}.{ext}
```

Examples:
- `INVOICE - 20251202 - Sime Darby Transport - MISC.jpg`
- `RECEIPT - 20241201 - Amazon Order - HOME.pdf`
- `CONTRACT - 20241115 - Employment Agreement (Acme Corp) - WORK.pdf`

If file already matches pattern, original name is preserved.

### URL Extraction (v2)
**Optional:** `JINA_API_KEY` for higher rate limits

URLs are fetched via Jina AI Reader (`r.jina.ai`) for clean markdown extraction.
YouTube URLs use fabric's `yt` tool for transcripts.

### Photo Processing (v2)
**Requires:** `OPENAI_API_KEY` for Vision AI

| Command | Behavior |
|---------|----------|
| `/ocr` | Tesseract OCR only |
| `/store` | Save image, no processing |
| `/describe` | Vision AI description |
| `/mermaid` | Vision AI → Mermaid diagram |
| Caption | Use caption as Vision prompt |

### Events Channel (v2)
**Optional:** `TELEGRAM_OUTBOX_ID`

Notifications with severity:
| Icon | Severity | Description |
|------|----------|-------------|
| ℹ️ | info | Informational |
| ✅ | success | Successful completion |
| ⚠️ | warning | Partial success |
| ❌ | error | Failure |

### AI Intent Parsing (v2)
**Requires:** `OPENAI_API_KEY`

When no explicit `/command` is detected, AI analyzes captions to:
- Route to appropriate pipeline (archive, receipt, clip, note)
- Extract document type and category
- Suggest tags based on content

Only applied when confidence > 80%. Lower confidence uses default pipeline.

### Dictated Pipeline Intent (v2)
**Requires:** No additional configuration

Natural language detection for archive and receipt pipelines. Say your intent and it will be detected:

| Intent | Example Phrases | Result |
|--------|-----------------|--------|
| Archive | "archive this", "file this", "save this document" | `/archive` pipeline |
| Receipt | "save this receipt", "expense", "invoice", "purchase" | `/receipt` pipeline |

**Auto-detected document types (from caption):**
- INVOICE, RECEIPT, BILL, EXPENSE (receipt pipeline)
- CONTRACT, LEASE, CERTIFICATE, DEED (archive pipeline)

**Auto-detected categories:**
- HOME, HOUSE, PROPERTY → HOME
- WORK, OFFICE, BUSINESS → WORK
- CAR, VEHICLE, AUTO → CAR
- HEALTH, MEDICAL, DOCTOR → HEALTH

Example: "Archive this lease for the house" → `/archive` + `[type:LEASE]` + `[category:HOME]`

### Document Type Detection from Content (v2)
**Requires:** `OPENAI_API_KEY` (for Vision AI)

When document type isn't specified in caption, Vision AI content analysis detects it:
- Invoice/Tax Invoice → INVOICE
- Receipt, Payment Received → RECEIPT
- Contract, Agreement → CONTRACT
- Certificate, Certification → CERTIFICATE
- Letter headers (Dear Sir/Madam) → CORRESPONDANCE
- Bill, Amount Due → BILL

Example: Photo of invoice with caption "/archive" → Vision AI sees "Tax Invoice" → `INVOICE - 20251202 - ...`

### Real-time Embedding (v2)
**Requires:** `OPENAI_API_KEY`

Notes are automatically embedded immediately after creation, making them searchable via `/query` right away. No need to run `obs embed` manually after ingesting content.

- Uses fire-and-forget pattern (non-blocking)
- Failures are logged but don't block note creation
- Check status with `obs embed --stats`

---

## 🏥 Health Check

Run this command to verify skills are configured:

```bash
bun bin/obs/self-test.ts
```

**Expected output:**
```
✅ Vault Path: /Users/yourname/Documents/vault
✅ OpenAI API Key: Set (sk-...)
✅ Embeddings DB: .../embeddings.db (XX MB)
✅ Telegram Config: Bot token set, Channel: -100...
✅ obs CLI: .../bin/obs/obs.ts
✅ ingest CLI: .../bin/ingest/ingest.ts
✅ Skills: context/ and vault/ skills found
✅ bun: /path/to/bun
✅ fabric: /path/to/fabric

📊 Results: 9 passed, 0 failed, 0 warnings
```

---

## 🔧 System Requirements

### Required
| Component | Purpose | Installation |
|-----------|---------|--------------|
| Bun | Runtime | `curl -fsSL https://bun.sh/install \| bash` |
| Claude Code | AI assistant | Anthropic CLI |
| Obsidian Vault | Knowledge store | Any directory with .md files |

### Optional (but recommended)
| Component | Purpose | Installation |
|-----------|---------|--------------|
| OpenAI API Key | Embeddings | platform.openai.com |
| Telegram Bot | Ingestion | @BotFather |
| fabric | Patterns | `go install github.com/danielmiessler/fabric@latest` |
| ripgrep | Fast search | `brew install ripgrep` |
| tesseract | Image OCR | `brew install tesseract` |
| marker | PDF extraction | `uv tool install marker-pdf` |

### Audio Transcription (Pluggable)

Voice memos require transcription. Choose **one** of these options:

| Option | Pros | Cons | Setup |
|--------|------|------|-------|
| **whisper.cpp (local)** | Private, free, fast | Requires model download (~3GB) | See below |
| **OpenAI Whisper API** | No setup, high quality | Costs money, sends audio to cloud | Set `OPENAI_API_KEY` |
| **Custom script** | Full control | You maintain it | Modify `process.ts` |

**whisper.cpp Setup (recommended):**
```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make

# Download large-v3 model (best quality)
cd models && bash download-ggml-model.sh large-v3

# Create a wrapper script ~/bin/ts
#!/bin/bash
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate auto_transcribe
python ~/Documents/src/auto_transcribe/ts.py "$1"
```

The ingest pipeline calls `ts <audio_file>` for transcription. Ensure this command is available in your PATH or configure an alternative.

---

## 🛡️ Security Considerations

### What's Protected
- Content is sanitized for prompt injection patterns
- Commands are validated against a whitelist
- Rate limiting prevents abuse
- All processing is logged to audit trail

### What You Control
- Your vault path and contents
- API keys (never committed)
- Telegram channel access (private channel recommended)
- Sender allowlist (optional)

### Security Patterns Blocked
- "Ignore previous instructions"
- System prompt injections ([INST], <<SYS>>, etc.)
- Jailbreak attempts (DAN mode, etc.)
- Data exfiltration patterns

---

## 📁 Required Configuration

Add to `~/.claude/.env` or `~/.config/fabric/.env`:

```bash
# Required for vault operations
OBSIDIAN_VAULT_PATH=~/Documents/my_vault

# Required for semantic search and AI features
OPENAI_API_KEY=sk-...

# Optional: Telegram ingestion
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=-100your_channel_id

# Optional: Events channel for notifications
TELEGRAM_OUTBOX_ID=-100your_outbox_id

# Optional: Jina AI for URL extraction (higher rate limits)
JINA_API_KEY=jina_...

# Optional: Archive pipeline with Dropbox sync
DROPBOX_ARCHIVE_PATH=~/Dropbox/document/_archive

# Optional: Processing profile
INGEST_PROFILE=zettelkasten  # or "simple"
```

---

## 🚫 What These Skills Are NOT

- **Not a backup solution** - Vault should be backed up separately
- **Not enterprise-ready** - Personal use only
- **Not real-time** - Ingestion requires polling
- **Not a replacement for Obsidian** - Supplements Obsidian, doesn't replace it
- **Not synced** - Your vault, your machine

---

## 📊 Directory Structure

```
Personal_AI_Infrastructure/
├── .claude/
│   └── skills/
│       ├── SKILL_CONTRACT.md    # This file
│       ├── context/
│       │   ├── SKILL.md         # Context skill definition
│       │   ├── tag-taxonomy.md  # Tag reference
│       │   └── workflows/       # Workflow definitions
│       └── vault/
│           ├── SKILL.md         # Vault skill definition
│           └── workflows/       # Workflow definitions
├── bin/
│   ├── obs/
│   │   ├── obs.ts              # Main CLI
│   │   ├── self-test.ts        # Health check
│   │   └── lib/                # Implementation
│   └── ingest/
│       ├── ingest.ts           # Ingestion CLI
│       └── lib/                # Implementation
└── docs/
    └── architecture/
        ├── context-system.md    # Architecture doc
        ├── test-scripts.md      # Test cases
        └── telegram-ingestion.md
```

---

## 🤝 Contributing

1. **Report issues** - Open GitHub issues for bugs
2. **Share customizations** - PRs welcome for generic improvements
3. **Never commit secrets** - Use .env files, check .gitignore
4. **Sanitize before sharing** - Remove personal data from examples

---

## 🔄 Upgrade Path

When upgrading from upstream:

```bash
git fetch upstream
git merge upstream/main
bun bin/obs/self-test.ts  # Verify still works
```

**Protected files (don't overwrite):**
- `~/.claude/.env` (your config)
- `skills/context/tag-taxonomy.md` (your taxonomy)
- Vault contents

---

## 📖 Related Documentation

- [Context System Architecture](../../docs/architecture/context-system.md)
- [Telegram Ingestion v1](../../docs/architecture/telegram-ingestion.md)
- [Ingest Pipeline v2 ADR](../../docs/architecture/ingest-pipeline-v2.md)
- [Test Scripts](../../docs/architecture/test-scripts.md)
- [PAI Contract](../../PAI_CONTRACT.md)

---

**Remember:** Start simple. Build what you need. Your vault, your rules.
