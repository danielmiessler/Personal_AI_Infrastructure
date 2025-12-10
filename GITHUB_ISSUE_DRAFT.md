# GitHub Issue Draft: Context Management Skill Proposal

**Target Repository:** danielmiessler/Personal_AI_Infrastructure
**Issue Type:** Feature Proposal / RFC

---

## Title

**[RFC] Context Management Skill: Obsidian + Telegram Ingestion Pipeline**

---

## Body

### Summary

I'd like to propose a **Context Management Skill** for PAI that provides a complete pipeline for capturing, processing, and retrieving personal context from an Obsidian vault. This includes:

1. **`obs` CLI** - Search, read, write, and semantic search across vault notes
2. **`ingest` CLI** - Multi-device capture via Telegram as an immutable ingestion log
3. **Skill definitions** - PAI skill files for context loading and vault management

### Motivation

One of PAI's core values is "context is everything." Currently, there's no standardized way to:

- Capture thoughts/content from any device (mobile, desktop, watch)
- Process voice memos, documents, photos, and links automatically
- Search personal notes semantically during Claude Code sessions
- Load project-specific context on demand

This skill addresses the "cold start" problem - giving PAI immediate access to your personal knowledge base.

### Design Principles

Following PAI's architecture:

1. **CLI-First** - All functionality exposed via `obs` and `ingest` commands
2. **Deterministic Code First** - TypeScript/Bun for processing, not LLM-dependent
3. **Prompts Wrap Code** - Skill definitions guide PAI to use the CLI tools
4. **Pluggable Components** - Transcription, OCR, Vision API all swappable

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPTURE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  iOS/macOS Share Menu → Telegram Bot ← Direct Messages         │
│  Voice Memos, Screenshots, Links, Documents, Text              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ingest poll    → Fetch from Telegram                          │
│  ingest process → Transcribe, OCR, Extract, Tag                │
│  ingest status  → View processing state                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VAULT LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Obsidian Vault (Markdown + Frontmatter)                       │
│  - Raw notes: source/telegram, incoming                         │
│  - Processed notes: fabric patterns applied                     │
│  - Embeddings: semantic search via text-embedding-3-large       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RETRIEVAL LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  obs search    → Tag/text search                                │
│  obs semantic  → Vector similarity search                       │
│  obs context   → Load project context                           │
│  obs read      → Read specific note                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features Implemented

#### 1. Share-with-Hints Workflow
Inline hints for tagging at capture time:
```
#project/my-project @teammate /meeting-notes
Discussion about the architecture decisions
```

Extracts:
- Tags: `project/my-project`
- People: `teammate`
- Commands: `meeting-notes`
- Clean content: "Discussion about the architecture decisions"

#### 2. Multi-Modal Processing
- **Voice/Audio**: whisper.cpp (local) or OpenAI Whisper API
- **Documents**: marker for PDF/DOCX extraction (see future improvements below)
- **Photos**: Vision API (GPT-4o) with prompt-based analysis
- **URLs**: Content extraction, YouTube transcript support
- **Text**: Direct capture with hint parsing

**Future: Enhanced Document Processing**

Current PDF/DOCX extraction via `marker` works but has limitations with complex layouts, tables, and figures. Considering more sophisticated approaches:

- **LlamaParse** - Specialized document parsing with structure preservation
- **Mistral/DeepSeek Document** - LLM-based document understanding
- **Multi-modal LLM pipeline** - Send document pages as images to GPT-4o/Claude for high-fidelity extraction
- **Hybrid approach** - OCR + layout detection + LLM for semantic understanding

The goal is a pipeline that produces high-definition Markdown representations preserving:
- Tables with proper formatting
- Figures with captions and descriptions
- Code blocks with syntax
- Document structure (headers, sections, footnotes)
- Cross-references and citations

#### 3. State Tracking
SQLite-based processing state:
- Idempotent reprocessing (skip completed)
- Retry failed messages
- Processing statistics

#### 4. Security Layer
- Prompt injection detection
- Command whitelist validation
- Rate limiting
- Audit logging

#### 5. iOS/macOS Integration
iOS Shortcuts and macOS Quick Actions for:
- Share text with tags
- Share voice memos
- Screenshot analysis with Vision AI
- Quick capture widget

#### 6. Obsidian Vault Management (`obs` CLI)

Full-featured CLI for interacting with Markdown/Obsidian vaults:

**Search Commands:**
```bash
# Tag-based search
obs search --tag "project/my-project"
obs search --tag "meeting-notes" --tag "q4-2024"

# Full-text search
obs search --text "architecture decision"

# Combined tag + text
obs search --tag "project/api" --text "authentication"

# Recent notes
obs search --tag "incoming" --recent 10
```

**Read/Write Operations:**
```bash
# Read note by title (fuzzy match)
obs read "Weekly Planning Notes"

# Write new note with tags
obs write "Meeting Summary" \
  --tag "meeting-notes" \
  --tag "project/api" \
  --content "Discussion points..."

# Pipe content from stdin
echo "Quick thought" | obs write "Idea" --tag "incoming"
```

**Semantic Search (Vector Embeddings):**
```bash
# Build/update embeddings index
obs embed --verbose

# Check embedding statistics
obs embed --stats
# Output: 1,247 notes indexed, 8,432 chunks, last updated 2h ago

# Semantic similarity search
obs semantic "distributed systems architecture patterns"

# Limit results
obs semantic "meeting about API redesign" --limit 5
```

**Context Loading:**
```bash
# Load all context for a project
obs context my-project
# Returns: All notes tagged project/my-project

# View incoming/unprocessed items
obs incoming
```

**Tag Management:**
```bash
# List all tags
obs tags

# Tags with usage counts
obs tags --counts
# Output: incoming (523), meeting-notes (187), project/api (45)...
```

#### 7. Semantic Search Architecture

The embedding system uses a chunked approach for better retrieval:

```
┌─────────────────────────────────────────────────────────────┐
│                    EMBEDDING PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│  1. Parse vault notes (Markdown + frontmatter)              │
│  2. Chunk content (512 tokens, 50 token overlap)            │
│  3. Generate embeddings (text-embedding-3-large, 3072 dim)  │
│  4. Store in SQLite (note_id, chunk_id, vector, metadata)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RETRIEVAL PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│  1. Embed query text                                         │
│  2. Cosine similarity search across all chunks               │
│  3. Dedupe by note (return best chunk per note)              │
│  4. Return top-k notes with relevance scores                 │
└─────────────────────────────────────────────────────────────┘
```

**Storage Format (SQLite):**
```sql
CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY,
  note_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,  -- Float32Array as binary
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(note_path, chunk_index)
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

**Why SQLite over Vector DBs:**
- Zero external dependencies (Bun has built-in SQLite)
- Portable single-file database
- Fast enough for personal vaults (tested with 5,000+ notes)
- Easy backup/sync with vault
- Can migrate to Chroma/Qdrant if needed later

#### 8. Note Format (Zettelkasten-style)

Notes follow a consistent format for reliable parsing:

```markdown
---
generation_date: 2024-12-01 14:30
tags:
  - incoming
  - project/my-project
  - meeting-notes
  - teammate
source: telegram
---

# Meeting: API Architecture Discussion

Content here...
```

**Frontmatter Fields:**
- `generation_date`: When the note was created
- `tags`: Hierarchical tags (project/x, source/y, people)
- `source`: Origin (telegram, manual, import)
- `processed`: Whether fabric patterns have been applied

**Filename Convention:**
```
YYYY-MM-DD-Title Slug Here-Source-Type.md

Examples:
2024-12-01-API Architecture Meeting-Telegram-Raw.md
2024-12-01-Weekly Planning Notes-Manual-Wisdom.md
```

### File Structure

```
bin/
├── obs/
│   ├── obs.ts           # Main CLI entry
│   └── lib/
│       ├── search.ts    # Tag/text search
│       ├── semantic.ts  # Vector embeddings
│       └── vault.ts     # Read/write operations
└── ingest/
    ├── ingest.ts        # Main CLI entry
    └── lib/
        ├── telegram.ts  # Telegram Bot API
        ├── process.ts   # Content processing pipeline
        ├── profiles.ts  # Output profiles (zettelkasten, etc.)
        ├── state.ts     # SQLite state tracking
        └── security.ts  # Security checks

skills/
└── context/
    ├── SKILL.md         # Skill definition
    └── workflows/
        ├── load-project.md
        ├── search-notes.md
        └── process-incoming.md

docs/architecture/
├── context-system.md    # Full architecture docs
└── test-scripts.md      # Comprehensive test cases
```

### Dependencies

- **Runtime**: Bun (for built-in SQLite, fast startup)
- **Transcription**: whisper.cpp with ggml models (local) or OpenAI API
- **Document Extraction**: marker-pdf
- **OCR**: tesseract
- **Embeddings**: OpenAI text-embedding-3-large (3072 dim, configurable)
- **Vision**: OpenAI GPT-4o

### Configuration

Environment variables are stored in `~/.claude/.env` (see PAI How-To guide for setup):

```bash
# Required
OBSIDIAN_VAULT_PATH=~/Documents/vault
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_CHANNEL_ID=<your-channel-id>

# Optional: Embedding model (defaults to large for better semantic understanding)
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  # or text-embedding-3-small
```

The `.claude/.env` file is automatically loaded by Claude Code and the CLI tools.

### Additional Considerations

#### Skill Sharing: Specifications as the Portable Artifact

Rather than sharing complete implementations, skills could be shared as:
- Architecture documents (like `context-system.md`)
- Test scripts as executable specifications
- Skill contracts defining capabilities and interfaces

Since everyone using PAI has an AI assistant capable of code generation, the AI can:
- Read the specification
- Generate the implementation tailored to the user's environment
- Adapt to local tooling preferences (e.g., different transcription engines)
- Run the test scripts to validate the implementation

This approach:
- Avoids "copy-paste code that doesn't quite fit"
- Allows customization without forking
- Makes specifications the portable artifact
- Leverages the AI to bridge spec → implementation

A skill registry could be a collection of specification documents rather than code repositories.

#### Vault Path Convention
Current approach is flexible via `OBSIDIAN_VAULT_PATH`. A standard location (e.g., `~/.pai/vault`) could simplify setup while remaining overridable.

#### Embedding Storage
SQLite works well for personal vaults (tested with 5,000+ notes). For larger deployments, the architecture supports migration to vector DBs (Chroma, Qdrant) if needed.

#### Capture Alternatives
Telegram provides excellent multi-device capture with bot API. The architecture is transport-agnostic - alternatives (Signal, iMessage, email) could be added as additional ingestion sources.

#### Privacy
All processing is local by default (whisper.cpp, tesseract). Cloud APIs (OpenAI for embeddings/vision) are opt-in and require explicit API key configuration.

### Development Methodology

This skill was built using a structured approach that could serve as a template for future skill development:

#### 1. Architecture-First Design
Before writing code, created `docs/architecture/context-system.md`:
- System overview and design principles
- Component diagrams (capture → ingest → vault → retrieval)
- Data flow and state management
- Security considerations
- Integration points

#### 2. Test Scripts as Specification
Created `docs/architecture/test-scripts.md` with comprehensive test cases organized by phase:
- **Phase 1-3**: CLI foundation tests (obs search, read, write, embed, semantic)
- **Phase 4**: End-to-end integration tests
- **Phase 5**: iOS/macOS integration tests
- **Phase 6**: PAI context integration tests
- **Phase 7**: Future integrations (Jira)

Each test case includes:
```
#### TEST-XXX-001: Test Name
# Setup: What to prepare
# Test: Commands to run
# Expected: What should happen
# Verify: How to confirm success
```

#### 3. Skill Contract (Self-Test)
Created `.claude/skills/SKILL_CONTRACT.md` documenting:
- Skill capabilities and limitations
- Environment requirements
- Dependency setup (whisper.cpp, tesseract, marker, etc.)
- Configuration instructions
- Troubleshooting guide

#### 4. Collaborative Test Execution
Tests were run interactively with the user:
- User sends test content (voice memos, photos, text) to Telegram
- Claude runs `ingest process --verbose` and reports results
- User validates output files in vault
- Issues identified and fixed in real-time
- State tracking verified via `ingest status`

This approach ensures:
- **Specification before implementation** - Tests define expected behavior
- **Incremental validation** - Each phase builds on previous
- **User involvement** - Real-world testing, not just unit tests
- **Documentation as artifact** - Architecture docs remain valuable

#### 5. Scaffolding Files Created
```
docs/architecture/
├── context-system.md      # Full architecture specification
└── test-scripts.md        # Comprehensive test cases (7 phases)

.claude/skills/
└── SKILL_CONTRACT.md      # Skill self-documentation & setup guide
```

This methodology could be formalized as a "Skill Development Template" for the PAI community.

### Related

- Builds on Daniel's thinking about context management and the Zettelkasten workflow
- Complements existing fabric patterns for content processing
- Could integrate with future Jira/GitHub skills for work context

---

**Author:** [Your GitHub Handle]
**Date:** 2024-12-01
**Branch:** `feature/context-management` (on fork)
