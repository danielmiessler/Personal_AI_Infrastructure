# Capture Tips & Techniques

Advanced techniques for capturing content efficiently.

## Caption System

Every Telegram message can have a **caption** that controls how content is processed.

### Caption Syntax

```
#tag @person ~scope [metadata] /command free-text
```

| Element | Pattern | Purpose | Example |
|---------|---------|---------|---------|
| Tag | `#word` | Categorize note | `#meeting #project/pai` |
| Hierarchical tag | `#a/b/c` | Nested category | `#work/meetings/1on1` |
| Person | `@name` | Tag a person | `@john @sarah` |
| Scope | `~word` | Privacy level | `~private`, `~work` |
| Metadata | `[key:value]` | Source tracking | `[device:iphone]` |
| Command | `/word` | Processing instruction | `/archive`, `/wisdom` |

### Examples

```
# Simple voice memo
#standup ~work

# Photo of whiteboard
#meeting /describe @product-team

# PDF receipt for archiving
/archive #finance ~private

# URL to extract wisdom from
/wisdom #reading

# Voice note with full context
#project/pai @ed discussion about context retrieval ~work
```

---

## Voice Capture Techniques

### Telegram Voice Messages

The simplest voice capture:
1. Open Telegram → Your PAI channel
2. Hold microphone button → Record
3. Optionally add caption before sending

The daemon will:
1. Download the voice file
2. Transcribe using Whisper
3. Process with your caption tags
4. Generate AI title
5. Save to vault

### Dictated Captions (WisprFlow)

For hands-free capture with tags, use [WisprFlow](https://www.wispr.flow/) or similar dictation:

1. Start dictation (WisprFlow, macOS Dictation, etc.)
2. Speak naturally: "hashtag meeting at john discussing Q1 roadmap scope work"
3. WisprFlow types: `#meeting @john discussing Q1 roadmap ~work`
4. Send to Telegram

WisprFlow learns to convert spoken patterns:
- "hashtag" → `#`
- "at" (for person) → `@`
- "scope private" → `~private`
- "forward slash archive" → `/archive`

### Spoken Hints in Audio

**No caption? Speak hints at the start of your recording.**

The ingest daemon extracts hints from the first ~30 seconds of transcribed audio:

```
"Hashtag project PAI, at Ed Overy, meeting notes.
Today we discussed the context retrieval feature..."
```

Recognized spoken patterns:
- "hashtag [word]" → `#word` tag
- "at [name]" → `@name` person tag
- "scope private/work" → `~private/~work`
- "forward slash [command]" → `/command`

These are **fuzzy matched** against your vault's existing tags for correction:
- "hashtag project pie" → `#project/pai` (if tag exists)
- "at Ed O'very" → `@ed_overy` (if person tag exists)

---

## Smart Processing Features

### AI Title Generation

All notes get AI-generated titles based on content:
- Voice: Based on transcript summary
- Photo: Based on Vision AI description
- Text: Based on content

### Automatic Tag Suggestions

When processing, the AI suggests relevant tags based on content. These are added alongside your explicit tags.

### Document Type Detection

For the archive pipeline, document types are auto-detected:
- `RECEIPT` - Purchase receipts, invoices
- `CONTRACT` - Legal agreements
- `CERTIFICATE` - Certificates, diplomas
- `INVOICE` - Bills, invoices
- `DOCUMENT` - General documents

### Vision AI for Photos

Photos without captions get automatic description:
```
**Analysis:** This image shows a whiteboard with a system architecture
diagram. There are three main components connected by arrows...
```

Add `/describe` for explicit description, or `/ocr` for text extraction.

### Pre-Named Archives

Files with standardized names are auto-recognized:
```
RECEIPT - 20241208 - Amazon Order - HOME.pdf
CONTRACT - 20240115 - Lease Agreement - PROPERTY.pdf
```

Format: `TYPE - YYYYMMDD - Description - CATEGORY.ext`

These automatically use the archive pipeline.

---

## Workflow Examples

### Quick Voice Note (Hands-Free)

1. Open Telegram
2. Hold record button
3. Say: "Hashtag ideas. I just had a thought about improving the search algorithm by..."
4. Release to send

Result: Note tagged `#ideas` with your thought.

### Photo with Context

1. Take photo of whiteboard
2. Open Telegram → PAI channel
3. Caption: `#meeting @product-team /describe Q1 planning session`
4. Send

Result: Note with Vision AI description, tagged appropriately.

### Document Archival

1. Receive email with PDF attachment
2. Save PDF with name: `RECEIPT - 20241208 - Office Supplies - WORK.pdf`
3. Forward to Telegram PAI channel
4. No caption needed (auto-detected)

Result: Archived to Dropbox, note created with link.

### Research Capture

1. Find interesting article
2. Copy URL
3. Telegram caption: `/wisdom #research/ml`
4. Send URL

Result: Article extracted, wisdom patterns applied, tagged for research.

---

## Tips

### Consistent Tagging

Create a personal tag taxonomy and stick to it:
```
#project/[name]     - Work projects
#area/[name]        - Life areas (health, finance, etc.)
#type/[name]        - Content types (meeting, article, idea)
@[name]             - People (underscore for spaces)
```

### Scope Everything

Get in the habit of adding scope:
- `~work` - Default, visible in work context
- `~private` - Personal, hidden from work searches

### Quick Capture, Refine Later

Capture fast, refine in Obsidian:
1. Send to Telegram with minimal tags
2. Later in Obsidian, add more tags, links, structure

### Use Hierarchical Tags

Instead of flat tags, use hierarchy:
```
#project/pai/ingest    (specific)
#project/pai           (broader)
#project               (broadest)
```

This enables both specific and broad searches.
