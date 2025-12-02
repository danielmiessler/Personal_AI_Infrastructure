# Ingest Pipeline v2 - Multi-Pipeline Routing & Archive Support

**Document Type:** Architecture Decision Record (ADR)
**Version:** 0.1.0
**Date:** 2025-12-02
**Status:** Draft - In Development
**Author:** Andreas Åström

---

## Executive Summary

Extend the Telegram ingestion pipeline to support multiple processing pipelines, archive document management with Dropbox sync, source metadata tracking for multi-device/multi-user scenarios, and AI-based content routing.

---

## Problem Statement

### Current Limitations

1. **Single Pipeline**: All content goes through the same zettelkasten workflow, regardless of intent
2. **No Archive Support**: Receipts, contracts, and documents can't be archived with proper naming conventions
3. **No Source Tracking**: Can't identify which device, user, or shortcut sent the content
4. **Manual Classification**: User must always specify `/command` for routing
5. **Poor Document Formatting**: docx and complex documents don't produce clean markdown
6. **No External Sync**: Documents stay in Obsidian vault only

### User Stories

1. **As a user**, I want to send a receipt photo and have it automatically archived to Dropbox with my naming convention
2. **As a user**, I want my wife to use the same pipeline with her content tracked separately
3. **As a user**, I want clipboard content to be formatted as clean markdown, not raw dumps
4. **As a user**, I want the system to intelligently route content without explicit commands
5. **As a user**, I want documents that are already named correctly to keep their names

---

## Solution Architecture

### Two-Layer Processing Model

The ingest pipeline uses a **two-layer architecture**:

1. **Layer 1: Content Type Processing** (existing) - Determines HOW to extract raw content
2. **Layer 2: Pipeline Routing** (new) - Determines WHERE content goes and WHAT additional processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INGEST PIPELINE v2                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: CONTENT TYPE EXTRACTION (existing - unchanged)                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  voice/audio  → whisper-cpp transcription                              │ │
│  │  document     → marker (PDF) / pandoc (docx, rtf, html)                │ │
│  │  photo        → OCR (tesseract) or Vision API (gpt-4o)                 │ │
│  │  url          → Jina AI Reader / yt (YouTube)                          │ │
│  │  text         → pass-through                                            │ │
│  │                                                                          │ │
│  │  OUTPUT: Raw extracted content (transcript, text, description)          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  LAYER 2: PIPELINE ROUTING (new)                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Check: /command → [metadata] → natural language intent → default      │ │
│  │                                                                          │ │
│  │  /note     → Zettelkasten (frontmatter + tags)                         │ │
│  │  /clip     → Markdown cleanup + structure                              │ │
│  │  /archive  → Archive naming + Dropbox sync                             │ │
│  │  /receipt  → Extract vendor/amount + archive + sync                    │ │
│  │  (default) → AI intent detection OR zettelkasten                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  OUTPUT                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ├── Obsidian Vault (all pipelines)                                    │ │
│  │  ├── Dropbox Sync (archive/receipt only)                               │ │
│  │  └── Events Channel (JSON notification with metadata)                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Content Type Detection (Existing)

| Content Type | Detection | Processing | Output |
|--------------|-----------|------------|--------|
| `voice` | `message.voice` exists | whisper-cpp transcription | Transcript text |
| `audio` | `message.audio` exists | whisper-cpp transcription | Transcript text |
| `document` | `message.document` exists | marker/pandoc extraction | Extracted text |
| `photo` | `message.photo` exists | OCR or Vision API | Description/text |
| `url` | URL pattern in text | **Jina AI** / yt (YouTube) | Clean markdown |
| `text` | Default | Pass-through | Raw text |

**Enhancement:** URL processing upgraded from basic fetch to **Jina AI Reader** for cleaner LLM-friendly output.

### Layer 2: Pipeline Routing (New)

| Pipeline | Trigger | Processing | Vault Output | External Sync |
|----------|---------|------------|--------------|---------------|
| `/note` | Explicit command | Current zettelkasten | `inbox/` | None |
| `/clip` | Explicit or URL content | Markdown cleanup, AI structure | `inbox/` | None |
| `/archive` | Explicit or document type | Preserve/generate name, extract | `archive/` | Dropbox `_archive/` |
| `/receipt` | Explicit or receipt-like image | OCR, extract vendor/date/amount | `archive/receipts/` | Dropbox `_archive/` |
| (default) | No command | AI classification → route | Based on classification | Based on classification |

---

## Metadata Schema

### Source Metadata Format

Extend inline hints with `[key:value]` syntax:

```
/receipt [source:photo-capture][device:iphone][user:andreas] #expense

<photo attached>
```

### Supported Metadata Fields

| Field | Example | Purpose |
|-------|---------|---------|
| `source` | `clipboard-share`, `photo-capture`, `voice-memo` | Which iOS shortcut sent it |
| `device` | `iphone`, `ipad`, `mac` | Origin device |
| `user` | `andreas`, `magdalena` | Family member (multi-user) |
| `type` | `RECEIPT`, `CONTRACT`, `CORRESPONDANCE` | Document type for archive naming |
| `category` | `HOME`, `WORK`, `CAR` | Archive category |
| `processor` | `pandoc`, `marker`, `llamaparse` | Override document processor |

### Frontmatter Output

```yaml
---
generation_date: 2025-12-02 16:33
tags:
  - incoming
  - source/telegram
  - archive
source: telegram
source_shortcut: photo-capture
source_device: iphone
source_user: andreas
original_filename: receipt.jpg
---
```

---

## Archive Naming Convention

### Pattern

```
{TYPE} - {YYYYMMDD} - {Description} ({Details}) - {CATEGORY}.{ext}
```

### Examples

| Input | Generated Name |
|-------|----------------|
| Receipt photo with Vision AI extraction | `RECEIPT - 20251202 - Bunnings (Plumbing supplies, $45.99) - HOME.pdf` |
| Contract document | `CONTRACT - 20251202 - Employment Agreement (Andreas Astrom) - WORK.pdf` |
| Already-named file: `CONTRACT - 20240208 - Lease.pdf` | **Preserved as-is** |

### Smart Name Detection

```typescript
const ARCHIVE_NAME_PATTERN = /^(CONTRACT|RECEIPT|CORRESPONDANCE|DOCUMENT|REPORT)\s*-\s*\d{8}\s*-/i;

function shouldPreserveName(filename: string): boolean {
  return ARCHIVE_NAME_PATTERN.test(filename);
}
```

If the incoming file already matches the naming convention, **preserve it unchanged**.

---

## Document Processing Tiers

### Processor Selection

| Tier | Processor | When Used | Quality | Cost |
|------|-----------|-----------|---------|------|
| 1 | Pandoc | Default for simple docs | Basic | Free |
| 2 | marker | PDFs with complex layouts | Good | Free |
| 3 | LlamaParse | `[processor:llamaparse]` or complex docs | Excellent | Paid |
| 4 | Mistral/DeepSeek | Future: `[processor:mistral]` | TBD | Paid |

### Structured Markdown Output

All document processors should produce clean markdown with:

```markdown
# Document Title

## Section 1

Properly formatted paragraphs with **bold** and *italic*.

- Bullet points
- Preserved correctly

### Subsection

> Blockquotes for callouts

| Table | Headers |
|-------|---------|
| Data  | Values  |
```

---

## URL Content Extraction

### Current Limitation

The existing URL processing uses basic `fetch` with regex HTML parsing:
- Poor extraction of main content
- Includes navigation, ads, footers
- No clean markdown output
- Fails on JavaScript-heavy sites

### Solution: Jina AI Reader

Use [Jina AI Reader](https://jina.ai/reader/) for URL content extraction:

```typescript
async function fetchUrlContent(url: string): Promise<string> {
  // Check for YouTube first (existing yt tool)
  if (isYouTubeUrl(url)) {
    return fetchYouTubeTranscript(url);
  }

  // Use Jina AI Reader for all other URLs
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const response = await fetch(jinaUrl, {
    headers: {
      "Authorization": `Bearer ${process.env.JINA_API_KEY}`,  // Optional for higher limits
      "Accept": "text/markdown",
    },
  });

  return response.text();
}
```

### Jina Output Benefits

| Feature | Basic Fetch | Jina AI |
|---------|-------------|---------|
| Main content extraction | ❌ Includes noise | ✅ Clean |
| Markdown formatting | ❌ Raw HTML | ✅ Proper markdown |
| Image handling | ❌ Lost | ✅ Preserved with URLs |
| JavaScript pages | ❌ Fails | ✅ Renders first |
| Rate limits | N/A | 20 req/min free |

### Configuration

```typescript
interface UrlConfig {
  jinaApiKey?: string;       // Optional: for higher rate limits
  fallbackToFetch: boolean;  // If Jina fails, try basic fetch
  cacheEnabled: boolean;     // Cache fetched content
  cacheTtl: number;          // Cache TTL in seconds (3600 = 1 hour)
}
```

### Self-Test Check

```typescript
✅ Jina AI: Accessible (optional API key: ${JINA_API_KEY ? "set" : "using free tier"})
```

---

## AI-Based Default Routing

When no `/command` is provided, use AI classification:

### Classification Prompt

```typescript
const CLASSIFICATION_PROMPT = `
Classify this content for routing. Return ONE of:
- note: General notes, ideas, text content
- clip: Web articles, newsletters, clipboard with formatting
- archive: Documents, contracts, official papers
- receipt: Receipt images, invoices, expense documents

Content type: {contentType}
Filename: {filename}
Caption: {caption}
Content preview: {preview}

Classification:
`;
```

### Classification Examples

| Input | Classification | Reason |
|-------|---------------|--------|
| Photo of receipt | `receipt` | Image with price, vendor visible |
| PDF named "Invoice_2025.pdf" | `receipt` | Filename suggests invoice |
| URL to article | `clip` | Web content needing formatting |
| Text about project idea | `note` | General thought capture |
| PDF named "CONTRACT - ..." | `archive` | Already follows archive naming |

---

## Natural Language Intent Parsing

### The Problem

Users may dictate instructions via Wispr Flow or type natural language captions like:
- "Archive this receipt from Bunnings for home expenses"
- "Save this contract for work"
- "This is an article about AI I want to read later"

The system should understand intent without requiring structured `/commands`.

### Solution: LLM Intent Extraction

When no explicit `/command` is detected, use LLM to extract:
1. **Pipeline** - Which pipeline to route to
2. **Metadata** - Vendor, category, type, etc.
3. **Tags** - Suggested tags based on content

### Intent Extraction Prompt

```typescript
const INTENT_EXTRACTION_PROMPT = `
Analyze this message and extract the user's intent for document processing.

Message: "{caption}"
Content type: {contentType}
Filename: {filename}

Return JSON with:
{
  "pipeline": "note" | "clip" | "archive" | "receipt",
  "confidence": 0.0-1.0,
  "metadata": {
    "type": "RECEIPT" | "CONTRACT" | "DOCUMENT" | null,
    "category": "HOME" | "WORK" | "CAR" | null,
    "vendor": "string or null",
    "amount": "number or null"
  },
  "suggestedTags": ["tag1", "tag2"],
  "reasoning": "brief explanation"
}
`;
```

### Intent Examples

| Caption | Extracted Intent |
|---------|------------------|
| "Archive this receipt from Bunnings for home expenses" | `{ pipeline: "receipt", metadata: { vendor: "Bunnings", category: "HOME" } }` |
| "Contract for the house renovation" | `{ pipeline: "archive", metadata: { type: "CONTRACT", category: "HOME" } }` |
| "Interesting article about AI agents" | `{ pipeline: "clip", suggestedTags: ["ai", "interesting-reads"] }` |
| "Quick note about project idea" | `{ pipeline: "note", suggestedTags: ["idea"] }` |

### Confidence Threshold

- **High confidence (>0.8)**: Route automatically
- **Low confidence (<0.8)**: Use default zettelkasten pipeline, log for review

---

## Newsletter/Scratchpad Content Formatting

### The Problem

Scratchpad content is often messy:
- Bold titles with embedded links
- Mixed formatting (markdown + HTML)
- Newsletter snippets with tracking URLs
- Multiple links per item

### Example Input (from Daily Note Scratchpad)

```markdown
**Launching new stuff requires social dandelions who spread ideas everywhere**
Social dandelions are people who naturally share cool things they find...
[ACTION DIGEST ARTICLE](https://www.actiondigest.com/p/...) | [HN DISCUSSION](https://news.ycombinator.com/...)

[**WormGPT 4 and KawaiiGPT (3 minute read)**](https://tracking.tldrnewsletter.com/...)
WormGPT 4 and KawaiiGPT are new "dark LLMs" that empower less-skilled cybercriminals...
```

### Expected Output (Standalone Note)

**Filename:** `2025-12-02-Social-Dandelions-for-Launching-Products.md`

```markdown
---
generation_date: 2025-12-02 16:45
tags:
  - incoming
  - source/telegram
  - interesting-reads
  - marketing
source: telegram
source_shortcut: clipboard-share
---

# Social Dandelions: The Key to Launching New Products

Social dandelions are people who naturally share cool things they find.
They're not influencers, just enthusiastic spreaders who help ideas go viral
through genuine excitement.

## Key Points

- Social dandelions spread ideas organically
- They're not influencers but genuine enthusiasts
- Essential for viral product launches

## Sources

- [Action Digest Article](https://www.actiondigest.com/p/to-launch-something-new-you-need-social-dandelions)
- [Hacker News Discussion](https://news.ycombinator.com/item?id=45982818)
```

### Formatting Pipeline

1. **Detect content structure** - Newsletter snippet, article, link dump
2. **Extract title** - From bold text, first line, or AI generation
3. **Clean URLs** - Remove tracking parameters
4. **Structure content** - Headers, bullet points, source links
5. **Generate tags** - Based on content analysis
6. **Create standalone note** - Not appended to daily note

### Output Format

Every processed item creates a **standalone markdown file**:

```
{YYYY-MM-DD}-{Title}-Telegram-Raw.md
```

**NOT** appended to daily notes. Each item = one note file.

---

## Dropbox Sync

### Configuration

```typescript
interface ArchiveConfig {
  dropboxPath: string;  // "/Users/andreas/Dropbox/document/_archive"
  syncEnabled: boolean;
  preserveOriginal: boolean;  // Keep in vault too
}
```

### Sync Flow

```
1. Process document/receipt
2. Generate/preserve filename
3. Save to Obsidian vault (archive/ or archive/receipts/)
4. Copy to Dropbox path
5. Send notification with both paths
```

### Events Channel Payload

```json
{
  "event_type": "pai.ingest",
  "status": "completed",
  "content_type": "receipt",
  "pipeline": "receipt",
  "title": "RECEIPT - 20251202 - Bunnings (Plumbing, $45.99) - HOME",
  "source_metadata": {
    "shortcut": "photo-capture",
    "device": "iphone",
    "user": "andreas"
  },
  "output_paths": {
    "vault": "/path/to/vault/archive/receipts/RECEIPT-20251202-Bunnings.md",
    "dropbox": "/Users/andreas/Dropbox/document/_archive/RECEIPT - 20251202 - Bunnings (Plumbing, $45.99) - HOME.pdf"
  }
}
```

---

## iOS Shortcut Enhancement

### Current Shortcut (Clipboard → Telegram)

```
1. Get clipboard
2. Make HTML from Rich Text
3. Save to Shortcuts folder
4. POST to Telegram sendDocument
```

### Enhanced Shortcut

```
1. Get clipboard
2. Make HTML from Rich Text
3. Save to Shortcuts folder
4. Build caption with metadata:
   "/clip [source:clipboard-share][device:iphone][user:andreas]"
5. POST to Telegram sendDocument with caption
```

### Receipt Capture Shortcut (New)

```
1. Take photo or select from library
2. Build caption:
   "/receipt [source:photo-capture][device:iphone][user:andreas] #expense"
3. POST to Telegram sendPhoto with caption
```

---

## Tag Taxonomy Extensions

### New Tags for Archive

| Tag | Purpose |
|-----|---------|
| `archive` | Archived document |
| `receipt` | Receipt/invoice |
| `contract` | Contract document |
| `correspondance` | Letters, emails |
| `source/dropbox` | Synced to Dropbox |

### New Source Tags

| Tag | Purpose |
|-----|---------|
| `source/clipboard-share` | iOS clipboard shortcut |
| `source/photo-capture` | iOS photo shortcut |
| `source/voice-memo` | Voice memo shortcut |
| `user/andreas` | User attribution |
| `user/magdalena` | User attribution |
| `device/iphone` | Device source |
| `device/mac` | Device source |

---

## Implementation Phases

### Phase 1: Metadata Parsing + URL Enhancement (This PR)
- [ ] Extend `extractInlineHints()` for `[key:value]` syntax
- [ ] Add `SourceMetadata` interface
- [ ] Include in frontmatter and Events payload
- [ ] Replace basic fetch with Jina AI Reader for URL extraction
- [ ] Add `JINA_API_KEY` to config (optional for higher limits)

### Phase 2: Archive Pipeline
- [ ] Add `/archive` command routing
- [ ] Implement archive naming convention
- [ ] Smart name preservation for already-formatted files
- [ ] Dropbox sync

### Phase 3: Receipt Pipeline
- [ ] Add `/receipt` command routing
- [ ] Vision API receipt extraction (vendor, date, amount)
- [ ] Receipt-specific markdown template
- [ ] Dropbox sync with naming

### Phase 4: Document Processing
- [ ] Investigate docx processing failure
- [ ] Add `[processor:X]` selection
- [ ] Improve markdown output quality

### Phase 5: AI Default Routing
- [ ] Implement classification prompt
- [ ] Route to appropriate pipeline
- [ ] Fallback to current behavior

---

## Testing

### Unit Test Cases

**File:** `bin/ingest/lib/process.test.ts`

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Parse metadata | `"[source:test][device:mac]"` | `metadata: { source: "test", device: "mac" }` |
| Parse mixed hints | `"/clip [source:x] #tag @person"` | `commands: ["clip"], metadata: { source: "x" }, tags: ["tag"], people: ["person"]` |
| Preserve archive name | `"CONTRACT - 20240208 - Test.pdf"` | Filename unchanged |
| Generate archive name | `"invoice.pdf" + caption "Receipt from Bunnings"` | `"RECEIPT - 20251202 - Bunnings (...) - GENERAL.pdf"` |
| Extract receipt data | Receipt image | `{ vendor: "X", amount: 45.99, date: "2025-12-02" }` |
| AI intent - receipt | `"archive this receipt from Bunnings"` | `{ pipeline: "receipt", metadata: { vendor: "Bunnings" } }` |
| AI intent - article | `"interesting article about AI"` | `{ pipeline: "clip", suggestedTags: ["ai"] }` |
| Newsletter cleanup | Bold title + tracking URLs | Clean markdown with proper headers |
| Jina URL fetch | `https://example.com/article` | Clean markdown via r.jina.ai |
| Jina fallback | URL when Jina fails | Falls back to basic fetch |
| YouTube URL | `https://youtube.com/watch?v=xxx` | Uses yt tool, not Jina |

### Integration Test Cases

**File:** `bin/ingest/lib/integration.test.ts`

| Test Case | Description |
|-----------|-------------|
| Voice → Note | Audio file → transcription → zettelkasten note with frontmatter |
| Document → Archive | docx with caption → extraction → archive with Dropbox sync |
| Photo → Receipt | Receipt photo → Vision API → archive naming → Dropbox sync |
| Clipboard → Clip | HTML file → markdown cleanup → structured note |
| Text → AI Route | Plain text no command → AI classification → appropriate pipeline |

### Self-Test Updates

**File:** `bin/obs/self-test.ts`

Add checks for:

```typescript
// New checks for ingest pipeline v2
✅ Archive path: /Users/andreas/Dropbox/document/_archive
✅ Dropbox sync: Directory writable
✅ Vision API: OPENAI_API_KEY set (for receipt OCR)
✅ Jina AI: Accessible (JINA_API_KEY optional - using free tier if not set)
✅ Pipeline routes: /note, /clip, /archive, /receipt configured
✅ Metadata parsing: [key:value] regex valid
```

### Manual Test Script

```bash
# Test 1: Metadata parsing
# Send to Telegram: "[source:test][device:mac] Test message"
# Verify: frontmatter contains source_shortcut, source_device

# Test 2: Archive with existing name
# Send: "CONTRACT - 20251202 - Test Agreement.pdf" (no caption)
# Verify: Dropbox file keeps original name

# Test 3: Archive with auto-naming
# Send: "invoice.pdf" + caption "Receipt from Bunnings for plumbing $45"
# Verify: Dropbox file named "RECEIPT - 20251202 - Bunnings (Plumbing, $45) - GENERAL.pdf"

# Test 4: Newsletter clip
# Copy newsletter snippet → use clipboard shortcut
# Verify: Creates standalone note with clean formatting

# Test 5: AI routing
# Send: "This is an interesting article about AI agents" (no /command)
# Verify: Routed to /clip pipeline, tagged with ai

# Test 6: URL via Jina
# Send: "https://example.com/some-article"
# Verify: Content extracted via Jina (clean markdown, no HTML noise)

# Test 7: YouTube URL (not Jina)
# Send: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
# Verify: Uses yt tool for transcript, not Jina
```

### Test Data

Store test fixtures in `bin/ingest/fixtures/`:

```
fixtures/
├── audio/
│   └── test-voice-memo.m4a
├── documents/
│   ├── CONTRACT - 20240208 - Test.pdf  (pre-named)
│   └── random-invoice.pdf
├── images/
│   └── sample-receipt.jpg
└── text/
    ├── newsletter-snippet.html
    └── plain-idea.txt
```

---

## Related Documents

- [Telegram Ingestion v1](./telegram-ingestion.md)
- [Context System Architecture](./context-system.md)
- [Tag Taxonomy](../../.claude/skills/context/tag-taxonomy.md)

---

## iOS Shortcut Configuration

### Required Shortcuts

Create these iOS Shortcuts for full pipeline integration:

#### 1. PAI Clipboard Share
**Purpose:** Share text/URLs from any app to PAI inbox
**Trigger:** Share Sheet

```
Shortcut Actions:
1. Receive [Text, URLs] from Share Sheet
2. Ask for Input (optional): "Add hints? #tag @person /command [source:X]"
3. Set Variable "caption" = (input from step 2) + "\n" + (input from step 1)
4. Get Contents of URL:
   - URL: https://api.telegram.org/bot{BOT_TOKEN}/sendMessage
   - Method: POST
   - Headers: Content-Type: application/json
   - Body: {"chat_id": "{CHANNEL_ID}", "text": "${caption}"}
5. Show Notification: "Sent to PAI"
```

#### 2. PAI Document Archive
**Purpose:** Archive documents to Dropbox via PAI
**Trigger:** Share Sheet (Files)

```
Shortcut Actions:
1. Receive [Files] from Share Sheet
2. Get Name of (file)
3. Ask for Input: "Document type? CONTRACT/RECEIPT/DOCUMENT"
4. Ask for Input: "Category? HOME/WORK/CAR/MISC"
5. Set Variable "caption" = "/archive [type:" + (step 3) + "][category:" + (step 4) + "][device:iphone][source:document-share]"
6. Get Contents of URL:
   - URL: https://api.telegram.org/bot{BOT_TOKEN}/sendDocument
   - Method: POST
   - Body (form):
     - chat_id: {CHANNEL_ID}
     - document: (file from step 1)
     - caption: ${caption}
7. Show Notification: "Document sent to PAI Archive"
```

#### 3. PAI Voice Capture
**Purpose:** Quick voice memo capture
**Trigger:** Home Screen Widget

```
Shortcut Actions:
1. Record Audio
2. Ask for Input (optional): "Add hints? #tag @person"
3. Set Variable "caption" = "[source:voice-capture][device:iphone]" + (step 2)
4. Get Contents of URL:
   - URL: https://api.telegram.org/bot{BOT_TOKEN}/sendVoice
   - Method: POST
   - Body (form):
     - chat_id: {CHANNEL_ID}
     - voice: (audio from step 1)
     - caption: ${caption}
5. Show Notification: "Voice memo sent to PAI"
```

#### 4. PAI Photo/Receipt Capture
**Purpose:** Capture receipts and photos with analysis
**Trigger:** Share Sheet (Photos) or Widget

```
Shortcut Actions:
1. If (from Share Sheet): Receive [Images]
   Else: Take Photo
2. Ask for Input: "What is this? (or leave blank for auto-describe)"
3. If (input contains "receipt"):
   Set Variable "command" = "/receipt [device:iphone][source:photo-capture]"
   Else: Set Variable "command" = "[device:iphone][source:photo-capture]"
4. Set Variable "caption" = (command) + " " + (step 2)
5. Get Contents of URL:
   - URL: https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto
   - Method: POST
   - Body (form):
     - chat_id: {CHANNEL_ID}
     - photo: (image)
     - caption: ${caption}
6. Show Notification: "Photo sent to PAI"
```

### Configuration Variables

Store these in Shortcut Settings or as Text files in iCloud:

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot API token | `123456:ABC-DEF...` |
| `CHANNEL_ID` | Telegram Channel ID | `-1001234567890` |
| `USER` | Your identifier | `andreas` |

### Testing the Shortcuts

After setup, test each shortcut:

1. **Clipboard Share**: Select text in Safari → Share → "PAI Clipboard Share"
2. **Document Archive**: Files app → Share PDF → "PAI Document Archive"
3. **Voice Capture**: Widget tap → Speak → Auto-send
4. **Photo/Receipt**: Take photo → Share → "PAI Photo/Receipt Capture"

Verify in Telegram channel that messages appear with correct metadata.

---

## High-Level Acceptance Tests

### The Full Loop: Ingest → Store → Retrieve

The system has two directions:
1. **Ingest**: Telegram → Processing → Vault/Dropbox (what we've built)
2. **Retrieve**: Query → Context Skill → Vault/Dropbox → Response (enables the AI assistant)

### Acceptance Test Matrix

| Test ID | Description | Ingest | Store | Retrieve | Status |
|---------|-------------|--------|-------|----------|--------|
| ACC-001 | Voice memo → Vault → Context search | ✓ | ✓ | ✓ | Pending |
| ACC-002 | PDF document → Archive → Search by type | ✓ | ✓ | ✓ | Pending |
| ACC-003 | Receipt photo → Dropbox → Query expenses | ✓ | ✓ | ✓ | Pending |
| ACC-004 | URL clip → Vault → Semantic search | ✓ | ✓ | ✓ | Pending |
| ACC-005 | Newsletter → Note → Project context | ✓ | ✓ | ✓ | Pending |
| ACC-006 | Contract → Archive → Find by category | ✓ | ✓ | ✓ | Pending |

### ACC-001: Voice Memo End-to-End

```
SCENARIO: Voice memo about project meeting
GIVEN: User records voice memo "Meeting with John about the data platform migration"
WHEN: Processed through ingest pipeline
THEN:
  - Transcript in vault with tags: meeting-notes, john_doe, project/data-platform
  - Wisdom note created with key points extracted

AND WHEN: User asks PAI "What did I discuss with John recently?"
THEN:
  - Context skill finds note via person tag search
  - Returns summary of meeting content
```

### ACC-002: Document Archive Search

```
SCENARIO: Find archived contracts
GIVEN: User has archived several contracts via /archive pipeline
WHEN: User asks "Find my employment contract"
THEN:
  - Context skill searches vault/archive/ for document_type: CONTRACT
  - Also checks Dropbox archive for matching files
  - Returns contract title, date, and location
```

### ACC-003: Receipt Expense Query

```
SCENARIO: Query expenses by category
GIVEN: User has archived receipts via /receipt pipeline
WHEN: User asks "How much did I spend at Bunnings this year?"
THEN:
  - Context skill searches for receipts with vendor: Bunnings
  - Aggregates amounts from frontmatter
  - Returns total and list of receipts
```

### ACC-004: Project Context Loading

```
SCENARIO: Load context for a project
GIVEN: User has ingested various content tagged with project/pai
WHEN: User says "Load context for the PAI project"
THEN:
  - Context skill finds all notes with project/pai tag
  - Groups by content type (meetings, clips, voice memos)
  - Provides summary of recent activity
  - Offers to dive deeper into specific notes
```

### Telegram Query Interface (Future)

Enable querying PAI via Telegram (not just ingesting):

```
User sends: "/query What contracts do I have from 2024?"

PAI responds:
📋 Found 3 contracts from 2024:

1. CONTRACT - 20240208 - Employment Agreement (Andreas Astrom) - WORK.pdf
   📍 Dropbox: document/_archive/

2. CONTRACT - 20240315 - Lease Agreement - HOME.pdf
   📍 Dropbox: document/_archive/

3. CONTRACT - 20240901 - Consulting Agreement - WORK.pdf
   📍 Vault: archive/

Would you like me to summarize any of these?
```

### Archive Search Capability

To enable searching archived documents in Dropbox:

```typescript
interface ArchiveSearchResult {
  filename: string;
  path: string;
  type: string;        // CONTRACT, RECEIPT, DOCUMENT
  date: string;        // Extracted from filename
  category: string;    // HOME, WORK, etc.
  description: string; // Extracted from filename
}

async function searchArchive(query: {
  type?: string;
  category?: string;
  dateRange?: { from: Date; to: Date };
  textSearch?: string;
}): Promise<ArchiveSearchResult[]> {
  // 1. List files in Dropbox archive path
  // 2. Parse filenames using ARCHIVE_NAME_PATTERN
  // 3. Filter by query parameters
  // 4. Return matching results
}
```

### Content Type Validation Checklist

| Content Type | Ingest | Parse | Frontmatter | Fabric | Archive | Search |
|--------------|--------|-------|-------------|--------|---------|--------|
| Voice memo (.ogg) | ✓ | whisper | ✓ | extract_wisdom | N/A | ✓ |
| Audio file (.m4a, .mp3) | ✓ | whisper | ✓ | extract_wisdom | N/A | ✓ |
| Photo (no caption) | ✓ | Vision AI | ✓ | N/A | N/A | ✓ |
| Photo (with prompt) | ✓ | Vision AI | ✓ | N/A | N/A | ✓ |
| Receipt photo | ✓ | Vision AI | ✓ | N/A | ✓ Dropbox | ✓ |
| PDF document | ✓ | marker | ✓ | summarize | Optional | ✓ |
| DOCX document | ✓ | marker/pandoc | ✓ | summarize | Optional | ✓ |
| URL (article) | ✓ | Jina AI | ✓ | extract_article | N/A | ✓ |
| URL (YouTube) | ✓ | yt tool | ✓ | extract_wisdom | N/A | ✓ |
| Text message | ✓ | pass-through | ✓ | Optional | N/A | ✓ |
| Newsletter clip | ✓ | cleanup | ✓ | N/A | N/A | ✓ |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-12-02 | Initial draft |
| 0.1.1 | 2025-12-02 | Added Jina AI Reader for URL extraction |
| 0.2.0 | 2025-12-02 | Phase 1+2 implemented, added iOS shortcuts and acceptance tests |

---

**Document Status:** In Progress - Phase 2 Complete
**Next Step:** Implement Phase 3 (AI Intent Parsing) + Create iOS Shortcuts for Testing
