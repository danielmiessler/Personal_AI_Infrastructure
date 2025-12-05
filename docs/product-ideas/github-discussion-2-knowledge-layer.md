# 🧠 Knowledge Layer: Context Management Skill for PAI

> Implementing the first layer of [Life OS](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157) — your second brain with PAI

## TL;DR

A **Context Management Skill** for PAI that provides a complete pipeline for capturing, processing, and retrieving personal context. This implements the **Knowledge Layer** from the [Life OS](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157).

**Core value:** Solve the "cold start" problem by giving PAI immediate access to your personal knowledge base, maintained through continuous capture from any device.

---

## 📦 The Skill

This is a **PAI Skill** — a self-contained capability that extends PAI's abilities. Following PAI's skill architecture:

```yaml
---
name: context
description: |
  Knowledge Management - Capture and retrieve from Obsidian vault.

  INGEST: "ingest to knowledge base", "capture this", "save note", pipe content.
  SEARCH: "find notes about X", "what do I know about Y", discovery phase.
  LOAD: "load context for X", "get notes about Y", injection phase.

  Two-phase retrieval: SEARCH (discovery) → LOAD (injection)
---
```

### Skill Commands

| CLI | Purpose | Key Features |
|-----|---------|--------------|
| `ingest` | Capture + Retrieval | Telegram bot, voice transcription, document extraction, **two-phase retrieval** |
| `obs` | Legacy vault ops | Tag search, semantic search, note reading |

**Primary retrieval:** `ingest search` (discovery) → `ingest load` (injection)

```bash
# Phase 1: SEARCH (Discovery) - find relevant notes
ingest search "project planning"
ingest search --tag project/pai --person ed_overy

# Phase 2: LOAD (Injection) - output full content
ingest load "2025-01-15-Planning"
ingest load --tag project/pai --limit 5
```

Both follow **CLI-First**, **Deterministic Code First**, **Prompts Wrap Code** — TypeScript/Bun, zero Python.

### 4-Layer Test Pyramid

The skill includes a **comprehensive test framework** — essential for reliable AI pipelines:

| Layer | Command | What It Tests |
|-------|---------|---------------|
| **1. Unit** | `ingest test run` | `processMessage()` with captured fixtures |
| **2. Integration** | `ingest test integration` | Full Telegram → vault pipeline |
| **3. CLI** | `ingest test cli` | `obs search`, `ingest direct` commands |
| **4. Acceptance** | `ingest test acceptance` | End-to-end workflows via `claude -p` |

**Why this matters:** AI pipelines are non-deterministic by nature. The test framework captures real Telegram messages as fixtures, validates frontmatter/tags/content, and tracks test history for quality trending.

See [Test Framework](#test-framework) section for details on test specs, categories, and validation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPTURE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  iOS/macOS Share Menu → Telegram Bot ← Direct Messages          │
│  Voice Memos, Screenshots, Links, Documents, Text               │
│  Unix-style: pbpaste | ingest direct --tags "project/pai"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ingest poll     → Fetch from Telegram                          │
│  ingest process  → Transcribe, OCR, Extract, Tag, Route         │
│  ingest watch    → Daemon mode (continuous)                     │
│  ingest direct   → Unix-style stdin (no Telegram)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VAULT LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Obsidian Vault (Markdown + Frontmatter)                        │
│  - Raw notes: source/telegram, incoming                         │
│  - Processed notes: fabric patterns applied                     │
│  - Embeddings: semantic search via text-embedding-3-large       │
│  - Archive: Dropbox sync for receipts/contracts                 │
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
│  ingest search → Two-phase: discovery → injection               │
│  ingest query  → Natural language vault + archive query         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Multi-Modal Ingestion

| Input | Processing | Output |
|-------|------------|--------|
| Voice memo | whisper.cpp (local) or OpenAI | Transcript note |
| Photo | GPT-5 Vision (describe, OCR, mermaid, store) | Analysis note |
| Document | marker PDF/DOCX extraction | Extracted note |
| URL | Jina AI Reader | Article note |
| YouTube | yt transcript extraction | Video note |
| Text | Direct capture with hint parsing | Quick note |

### 2. Inline Hints at Capture Time

Tag, categorize, and route content as you capture:

```
#project/pai @john_doe /summarize ~private [source:ios-shortcut][device:iphone]
My meeting notes from today...
```

| Syntax | Purpose | Example |
|--------|---------|---------|
| `#tag` | Tags | `#project/pai`, `#meeting-notes` |
| `@person` | People | `@john_doe`, `@sarah` |
| `/command` | Processing | `/summarize`, `/archive`, `/wisdom` |
| `~scope` | Privacy | `~private`, `~work` |
| `[key:value]` | Metadata | `[source:ios]`, `[device:mac]` |

### 3. Dictated Intent & AI Routing

**The interesting part:** You don't need rigid syntax. Speak naturally and the AI interprets intent.

**Voice memo workflow:**
1. Start recording on iPhone
2. Say: *"Scope private. This is a doctor's appointment reminder for next Tuesday..."*
3. AI detects "scope private" → tags as `scope/private`
4. Natural language like "this is personal" also triggers private scope

**Wispr Flow + Clipboard workflow:**
1. Copy something interesting on iPhone (article, code, screenshot)
2. Open Wispr Flow, dictate: *"This is for project PAI, tag it as research, it's about embeddings"*
3. Send clipboard + dictated caption to Telegram
4. AI parses intent: `#project/pai`, `#research`, routes appropriately

**Caption analysis on photos/documents:**
```
[Photo of receipt]
Caption: "Archive this, it's a home insurance receipt from June"

→ AI detects: /archive intent, category HOME, type RECEIPT, date June
→ Routes to archive pipeline with structured naming
```

**Why this matters:** Capture happens in context — walking, driving, in meetings. You can't always type `#project/pai /summarize`. Speaking naturally and letting AI interpret intent removes friction from capture.

**Fuzzy Tag Matching:**

When you dictate, Whisper doesn't always get it right. The system fuzzy-matches against your existing vault tags:

| Transcribed | Matched To | How |
|-------------|------------|-----|
| "ProjectPie" | `project/pai` | Phonetic similarity |
| "johndoe_about" | `john_doe` | Levenshtein distance |
| "meeting notes" | `meeting-notes` | Normalized match |

- 70% similarity threshold
- Phonetic normalization (removes vowels, normalizes consonants)
- Unmatched tags kept but flagged for review

---

### 4. Context Separation (Privacy)

The `~private` and `~work` sigils enable context separation:

- `~private` marks personal content (health, finance, journal)
- Default queries exclude private content (`--scope work`)
- Explicit `--scope all` or `--scope private` for retrieval
- Archive/receipt pipelines auto-tag as private
- Natural language detection: "this is personal" → private scope

### 5. iOS/macOS Shortcuts Integration

Native integration with Apple's Shortcuts app and Share Panel:

| Method | What It Does |
|--------|--------------|
| **Clipboard Shortcut** | One tap → clipboard + metadata caption → Telegram (can dictate to extend caption) |
| **iOS Share Panel** | Voice memos, photos, documents → Share → PAI → Telegram |
| **macOS Quick Actions** | Right-click any file → ingest |

**Source tracking:** Shortcuts inject `[source:ios-shortcut][device:iphone]` metadata automatically in the caption, so you know where each capture came from.

#### 📸 Capture Flows

**Flow 1: Clipboard Shortcut (fastest)**
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  📋 Copy text   │  →   │  📲 Swipe down  │  →   │  💬 Telegram    │  →   │  📓 Obsidian    │
│  on iPhone      │      │  Tap shortcut   │      │  PAI Inbox      │      │  Markdown note  │
│                 │      │  (one tap)      │      │  + metadata     │      │  searchable     │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

**Flow 2: Voice Memo via Share Panel**
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  🎙️ Voice Memo  │  →   │  📤 Share →     │  →   │  💬 Telegram    │  →   │  📓 Obsidian    │
│  Record on      │      │  Telegram →     │      │  PAI Inbox +    │      │  Transcript.md  │
│  iPhone         │      │  Select channel │      │  optional caption│      │  with tags      │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

**Flow 3: Document Archive via Share Panel**
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  📄 Document    │  →   │  📤 Share →     │  →   │  💬 Telegram    │  →   │  📦 Dropbox     │
│  PDF, receipt,  │      │  Telegram →     │      │  PAI Inbox +    │      │  Original file  │
│  contract       │      │  PAI Inbox      │      │  dictate caption │      │  + naming       │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
                                                                                    ↓
                                                                           ┌─────────────────┐
                                                                           │  📓 Obsidian    │
                                                                           │  Metadata.md    │
                                                                           │  for search     │
                                                                           └─────────────────┘
```

**Flow 4: Photo with AI Prompt**
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  📸 Photo       │  →   │  📤 Share →     │  →   │  💬 Telegram    │  →   │  📓 Obsidian    │
│  Whiteboard,    │      │  Telegram →     │      │  PAI Inbox +    │      │  AI output.md   │
│  diagram, doc   │      │  PAI Inbox      │      │  "/mermaid" etc │      │  (mermaid, etc) │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

*(Add screenshots showing: Control Center shortcut, Telegram share dialog, PAI Inbox with processed message)*

### 6. Archive Pipeline

```
/archive [type:CONTRACT][category:WORK] Employment agreement dated 15th June
```

- **Structured naming:** `TYPE - YYYYMMDD - Description - CATEGORY.ext`
- **Auto-sync to Dropbox:** `_archive/` folder
- **Vision AI type detection:** Photos analyzed for document type
- **Date parsing:** "dated 15th June" → filename includes date
- **Searchable:** Markdown metadata enables semantic search across receipts, invoices, contracts

### 7. Semantic Search

```bash
# Build embeddings
obs embed --verbose

# Search by meaning
obs semantic "distributed systems architecture patterns"

# Stats
obs embed --stats
# Output: 1,247 notes indexed, 8,432 chunks, last updated 2h ago
```

- OpenAI embeddings (`text-embedding-3-small` or `large`)
- SQLite storage (zero dependencies, portable)
- Real-time embedding on note creation
- Chunked approach (512 tokens, 50 overlap) for better retrieval
- Tested with 5,000+ notes

### 8. Two-Phase Context Retrieval

Discovery phase (see what matches) → Injection phase (load full content):

```bash
# Phase 1: SEARCH (Discovery)
ingest search "project planning"                    # Semantic search
ingest search --tag project/pai                     # Tag filter
ingest search --person ed_overy                     # Person filter
ingest search "architecture" --tag project/pai      # Combined
ingest search "meeting notes" --scope all           # Include private

# Phase 2: LOAD (Injection)
ingest load "2025-01-15-Planning"                   # Load by name
ingest load --tag project/pai --limit 5             # Load matching
ingest load --tag incoming --json                   # JSON output
```

**Scope options:** `work` (default), `private`, `all`

---

## CLI Reference

### `ingest` — Capture Pipeline

```bash
# Telegram polling
ingest poll --verbose                   # Check for new messages
ingest process --verbose                # Process pending
ingest watch --interval 30              # Daemon mode

# Direct ingest (Unix-style, no Telegram)
pbpaste | ingest direct                 # From clipboard
echo "Quick note" | ingest direct       # From stdin
ingest direct document.pdf              # From file
ingest direct --text "Note" --tags "project/pai,meeting"
ingest direct receipt.pdf --scope private --pipeline archive

# Status
ingest status                           # Queue status
ingest retry --failed --now             # Retry with cached content

# Context retrieval
ingest search "API architecture"        # Discovery phase
ingest load --tag project/pai           # Injection phase
ingest query "what did I discuss with Ed about payments?"
```

### `obs` — Vault Operations

```bash
# Search
obs search --tag "project/pai"          # Tag search
obs search --text "kubernetes"          # Text search
obs search --tag meeting --scope all    # Include private

# Semantic
obs semantic "deployment strategies"    # Vector search
obs semantic "API design" --scope private

# Context loading
obs context pai                         # Load project context
obs context eea24 --recent 10          # Recent notes only

# Read/Write
obs read "Weekly Planning Notes"
obs write "Meeting Summary" --tags "meeting,project/api"

# Incoming
obs incoming --recent 20                # Unprocessed notes

# Embeddings
obs embed --verbose                     # Build/update
obs embed --stats                       # Statistics
```

---

## Test Framework

A comprehensive **4-layer test pyramid** ensures quality and enables safe iteration:

### Test Pyramid

| Layer | Duration | What It Tests | Command |
|-------|----------|---------------|---------|
| **1. Unit** | ~4 min | `processMessage()` with fixtures | `ingest test run` |
| **2. Integration** | ~2 min | Full Telegram → vault pipeline | `ingest test integration` |
| **3. CLI** | ~3 min | `obs` search/semantic, `ingest direct` | `ingest test cli` |
| **4. Acceptance** | ~8 min | End-to-end via `claude -p` | `ingest test acceptance` |

### Unified Test Runs

```bash
# Run ALL layers (recommended for pre-release)
bun run ingest.ts test all

# Output:
# ════════════════════════════════════════════════════════════
# COMBINED TEST SUMMARY
# ════════════════════════════════════════════════════════════
#  Layer         Status   Passed  Failed   Total   Time
# ────────────────────────────────────────────────────────────
#  ✓ unit         run        30       0      30    45.2s
#  ✓ integration  run        15       0      15    62.1s
#  ✓ cli          run        12       0      12    38.1s
#  ✓ acceptance   run         8       0       8    48.3s
# ────────────────────────────────────────────────────────────
#  ✓ TOTAL                   65       0      65   193.7s
# ════════════════════════════════════════════════════════════
```

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| `scope` | TEST-SCOPE-* | Context separation (`~private`, `~work` sigils) |
| `date` | TEST-DATE-* | Document date hints and filename dating |
| `archive` | TEST-ARC-* | Archive/receipt pipeline with Dropbox |
| `regression` | TEST-REG-* | Core functionality (text, URL, voice, photo) |
| `tag-matching` | TEST-TAG-* | Inline hint parsing |

### Test Spec Structure

```typescript
{
  id: "TEST-SCOPE-001",
  name: "Explicit ~private sigil",
  category: "scope",
  fixture: "scope/TEST-SCOPE-001.json",
  input: {
    type: "text",
    description: "Text message with explicit ~private sigil",
    example: "~private My personal journal entry",
  },
  expected: {
    pipeline: "default",
    tags: ["scope/private"],
    excludeTags: ["scope/work"],
    frontmatter: { scope: "private" },
    verboseOutput: ["Extracted scope hint: private"],
  },
}
```

### Validation Checks

Tests can validate:

- **Pipeline**: `expected.pipeline` (default, archive, receipt, note)
- **Tags**: `expected.tags`, `expected.excludeTags`
- **Frontmatter**: `expected.frontmatter` (key-value pairs)
- **Content**: `expected.content.contains`, `expected.content.notContains`
- **Verbose Output**: `expected.verboseOutput` (console log strings)
- **Dropbox Sync**: `expected.dropboxSync`
- **Semantic**: LLM-as-judge validation for complex outputs

### Test History & Quality Tracking

```bash
# View test history
ingest test history
ingest test history --layer unit

# Cumulative view (latest per layer)
ingest test history --cumulative

# Test runs list
ingest test runs
```

Results tracked in `test/output/test-history.json` for quality trending over time.

---

## Implementation Details

### File Structure

```
bin/
├── obs/
│   ├── obs.ts           # Main CLI (~440 lines)
│   └── lib/
│       ├── search.ts    # Tag/text search
│       ├── embed.ts     # Embeddings & semantic search
│       ├── read.ts      # Note reading
│       ├── write.ts     # Note writing
│       └── tags.ts      # Tag listing
└── ingest/
    ├── ingest.ts        # Main CLI (~2,700 lines)
    ├── lib/
    │   ├── telegram.ts  # Bot API, content classification
    │   ├── process.ts   # Processing pipeline (~2,000 lines)
    │   ├── profiles.ts  # Output profiles (zettelkasten, simple)
    │   ├── state.ts     # SQLite state tracking
    │   ├── security.ts  # Prompt injection detection
    │   └── tag-matcher.ts # Transcribed hint matching
    └── test/
        ├── fixtures/    # 70+ test fixtures
        ├── specs/       # Test specifications
        └── framework/   # 4-layer test infrastructure (~6,400 lines)
```

### Dependencies

| Dependency | Purpose |
|------------|---------|
| **Bun** | Runtime (built-in SQLite, fast startup) |
| **whisper.cpp** | Local voice transcription |
| **marker-pdf** | PDF/DOCX extraction |
| **tesseract** | OCR |
| **OpenAI** | Embeddings, Vision AI |
| **Jina AI Reader** | URL content extraction |

### Design Decisions

**Why Telegram for capture?**
- Works on every device
- Bot API is excellent for files
- iOS Shortcuts integration
- Transport-agnostic architecture (can add email, Signal later)

**Why SQLite for embeddings?**
- Zero dependencies
- Portable single-file
- Fast enough for personal vaults
- Easy backup/sync
- Migration path to vector DBs if needed

**Why Obsidian/Markdown?**
- Open format, no lock-in
- Works with existing PKM workflows
- Easy to inspect and edit
- Plays well with Fabric patterns

---

## How This Fits Life OS

This is the **Knowledge Layer** — one of four in the [Life OS vision](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157):

| Layer | This Skill Provides |
|-------|---------------------|
| 🧠 **Knowledge** | ✅ Full implementation — capture, process, store, retrieve |

The same **Capture → Process → Store → Retrieve** pattern applies to the other layers:

| Layer | Capture | Process | Store | Retrieve |
|-------|---------|---------|-------|----------|
| **Knowledge** | Notes, voice, docs | Transcribe, tag, embed | Vault | "What do I know?" |
| **Attention** | All messages | AI triage | Inbox | "What needs me?" |
| **Commitment** | Calendar, tasks | Promise detection | Obligations | "What do I owe?" |
| **Awareness** | Sensors, APIs | Predictions | State | "What's happening?" |

---

## Status & Questions

**Status:** Feature-complete, tested, working in private fork.

**Questions for the community:**

1. **Interest?** Would this be useful as a contributed skill?
2. **Sharing approach?** Full code PR, architecture docs, or specs-as-portable-artifacts?
3. **What would you add?** Different capture sources? Processing patterns?
4. **Test framework?** Is the 4-layer pyramid useful for other skills?

---

## Related

- **[Life OS Vision](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157)** — The bigger picture this fits into

---

*@mellanon | December 2025*

*Branch: `feature/context-management` (private fork)*
