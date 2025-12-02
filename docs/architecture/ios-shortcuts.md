# iOS Shortcuts Integration Guide

This guide explains how to create iOS Shortcuts that send content to your PAI Inbox (Telegram channel) with proper metadata for tracking.

## Overview

The PAI ingest pipeline accepts content from Telegram with optional metadata in `[key:value]` format. iOS Shortcuts can:

1. Share clipboard content (text, links, rich text)
2. Share photos and screenshots
3. Record and share voice memos
4. Include metadata about source/device

## Metadata Format

Add metadata to your shortcut's caption in this format:

```
[source:shortcut-name][device:iphone][user:your-name] Your content here
```

### Available Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| `source` | Shortcut/app name | `clipboard-share`, `voice-memo`, `photo-capture` |
| `device` | Device type | `iphone`, `ipad`, `mac` |
| `user` | User identifier | `andreas`, `magdalena` |
| `type` | Document type | `RECEIPT`, `CONTRACT`, `DOCUMENT` |
| `category` | Category | `HOME`, `WORK`, `CAR`, `TRAVEL` |

## Clipboard → Telegram Inbox (Rich Text)

This shortcut captures clipboard content (including rich text/HTML from web pages, newsletters, etc.) and sends it to your PAI Inbox.

### Shortcut Configuration:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Get Clipboard                                        │
│    (Retrieves current clipboard content)                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Make HTML from                                       │
│    Input: Clipboard                                     │
│    (Converts rich text to HTML format)                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Save File                                            │
│    Input: HTML from Rich Text                           │
│    Destination: Shortcuts                               │
│    Subpath: clipboard.html                              │
│    Ask Where To Save: OFF                               │
│    Overwrite if File Exists: ON                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Text                                                 │
│    [source:clipboard][device:iphone][user:YOUR_NAME]    │
│    {Clipboard}                                          │
│                                                         │
│    (Metadata line + original clipboard as plain text)   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Get Contents of URL                                  │
│    URL: https://api.telegram.org/bot{TOKEN}/sendDocument│
│    Method: POST                                         │
│    Headers: (none needed)                               │
│    Request Body: Form                                   │
│      • chat_id: YOUR_CHANNEL_ID                         │
│      • document: (File from step 3)                     │
│      • caption: (Text from step 4)                      │
└─────────────────────────────────────────────────────────┘
```

### Setup Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{TOKEN}` | Your Telegram Bot token | `123456:ABC-DEF...` |
| `YOUR_CHANNEL_ID` | Your PAI Inbox channel ID | `-1001234567890` |
| `YOUR_NAME` | Your username for tracking | `andreas` |

### How It Works:

1. **Get Clipboard** - Captures whatever is on your clipboard
2. **Make HTML** - Converts rich text (formatting, links) to HTML
3. **Save File** - Creates temporary `clipboard.html` file
4. **Text** - Builds caption with metadata + plain text preview
5. **Send Document** - Uploads HTML file with caption to Telegram

The PAI ingest pipeline will:
- Extract HTML content and convert to markdown
- Parse metadata from caption (`source`, `device`, `user`)
- Apply AI intent detection for routing
- Save to your Obsidian vault

## Voice Memo Shortcut

For voice memos, you can either:
- Add metadata in the caption (via Wispr Flow dictation)
- Speak the metadata in the audio (using spoken hints)

### Caption Approach (Recommended):

```
1. Record Audio
2. Get Device Details
3. Text: [source:voice-memo][device:📱device]
4. Send Audio to Telegram with caption
```

### Spoken Hints Approach:

When recording, say the hints at the start:
- "Hashtag project pai" → becomes #project-pai
- "At john smith" → becomes @john_smith
- "Forward slash summarize" → runs summarize pattern

## Photo/Screenshot Shortcut

```
1. Receive: Photos, Screenshots
2. Get Device Details
3. Text: [source:photo-capture][device:📱device]
4. Send Photo to Telegram with caption
```

## Document Archive Shortcut

For archiving contracts, receipts, etc:

```
1. Receive: PDF, Documents
2. Text prompt: "Enter document type (CONTRACT/RECEIPT/DOCUMENT)"
3. Text prompt: "Enter category (HOME/WORK)"
4. Text:
   /archive [type:📝type][category:📝category]
5. Send Document to Telegram with caption
```

## Rich Text / Newsletter Clips

When sharing from Safari or email:

```
1. Receive: Rich Text from Share Sheet
2. Get Clipboard (gets both plain text and rich text)
3. Text: [source:newsletter-clip][device:📱device]
4. Create RTF file from rich text
5. Send Document to Telegram with caption
```

**Note:** Rich text is sent as RTF file. The ingest pipeline extracts HTML content and converts to markdown.

## Adding Fabric Pattern Commands

You can add commands to trigger specific processing:

| Command | Effect |
|---------|--------|
| `/summarize` | Runs summarize pattern |
| `/wisdom` | Runs extract_wisdom pattern |
| `/article` | Runs extract_article_wisdom |
| `/meeting-notes` | Runs meeting_notes pattern |
| `/clip` | Saves for later (no auto-patterns) |

**Important:** Use TAGS for metadata like meeting type:
- `#1on1` = Tag indicating a 1:1 meeting
- `#meeting` = Tag indicating a meeting
- `/meeting-notes` = Command to RUN the meeting_notes pattern

### Example with Pattern Command:

```
[source:voice-memo][device:iphone] /wisdom #project/pai
```

This will:
1. Mark source as voice-memo from iPhone
2. Run extract_wisdom pattern on content
3. Tag with project/pai

## Telegram Bot Setup

Your shortcut needs to send to Telegram. Options:

### Option A: Telegram URL Scheme
```
tg://msg?text=YOUR_MESSAGE&to=CHANNEL_USERNAME
```

### Option B: Telegram Bot API
```
POST https://api.telegram.org/bot{TOKEN}/sendMessage
{
  "chat_id": "CHANNEL_ID",
  "text": "YOUR_MESSAGE"
}
```

### Option C: Shortcuts Telegram Action
Use the built-in "Send Message via Telegram" action if available.

## Troubleshooting

### Rich Text Not Extracting

If newsletter clips show only `</body></html>`:
- Ensure content is sent as RTF file, not plain text
- Check that HTML is embedded in the RTF

### Metadata Not Appearing

- Ensure `[key:value]` is at the START of the caption
- No spaces inside brackets: `[device:iphone]` not `[device: iphone]`
- Keys are lowercase: `source`, not `Source`

### Device Detection

Use Shortcuts' "Get Device Details" action to dynamically get:
- Device Model (iPhone, iPad, Mac)
- Device Name (user's custom name)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-02
