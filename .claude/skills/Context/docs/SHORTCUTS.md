# Capture Shortcuts

Quick capture methods for macOS and iOS.

## macOS Shortcuts

### Multi-Select Files to PAI

Send selected files from Finder to your vault via Telegram.

**Setup:**
1. Create an Automator Quick Action or Shortcuts automation
2. Input: Files from Finder
3. Action: Run shell script

```bash
#!/bin/bash
# Send selected files to PAI via Telegram

for file in "$@"; do
    /path/to/bin/ingest/ingest direct --file "$file" --caption "#from-finder [source:finder][device:mac]"
done
```

**Usage:**
1. Select files in Finder
2. Right-click → Quick Actions → "Send to PAI"

### Clipboard to PAI

Send clipboard contents to your vault.

**Option 1: Shell alias**

Add to `~/.zshrc`:
```bash
alias clip2pai='pbpaste | /path/to/bin/ingest/ingest direct --caption "#clipboard [source:clipboard][device:mac]"'
```

Usage: `clip2pai`

**Option 2: macOS Shortcut**

Create a Shortcut with:
1. Get Clipboard
2. Run Shell Script: `echo "$input" | /path/to/bin/ingest/ingest direct --caption "#clipboard [source:clipboard][device:mac]"`

Assign a keyboard shortcut (e.g., `⌘⇧V`).

### Screenshot to PAI

Capture and send screenshots.

```bash
#!/bin/bash
# Capture screenshot and send to PAI

SCREENSHOT="/tmp/pai-screenshot-$(date +%Y%m%d-%H%M%S).png"
screencapture -i "$SCREENSHOT"

if [ -f "$SCREENSHOT" ]; then
    /path/to/bin/ingest/ingest direct --file "$SCREENSHOT" --caption "#screenshot /describe [source:screenshot][device:mac]"
    rm "$SCREENSHOT"
fi
```

---

## iOS Shortcuts

### Share Sheet Integration

Create iOS Shortcuts that appear in the Share Sheet.

#### Text/URL to PAI

1. Create new Shortcut
2. Set "Show in Share Sheet" with input types: Text, URL
3. Actions:
   - Get Shortcut Input
   - Get Clipboard (if no input)
   - Run SSH Script or send via Telegram API

**Simple version (via Telegram):**
1. Get Shortcut Input
2. Send Message via Telegram (to your PAI channel)
   - Message: `[source:ios-shortcut][device:iphone] {Shortcut Input}`

#### Clipboard Share

1. Create new Shortcut: "PAI Clipboard"
2. Actions:
   - Get Clipboard
   - Send Message via Telegram
   - Message format: `[source:clipboard][device:iphone]\n{Clipboard}`

**Tip:** Add to Home Screen for one-tap capture.

#### Voice Memo to PAI

1. Create new Shortcut
2. Input: Audio files
3. Actions:
   - Get Shortcut Input
   - Send File via Telegram (to your PAI channel)

The ingest daemon will automatically transcribe and process.

---

## Metadata Tags

All shortcuts should include metadata tags for traceability:

| Tag | Purpose | Example |
|-----|---------|---------|
| `[source:X]` | Where content came from | `clipboard`, `finder`, `share-sheet` |
| `[device:X]` | Which device captured | `mac`, `iphone`, `ipad` |
| `[user:X]` | Who captured (multi-user) | `john`, `shared` |

**Example caption:**
```
[source:clipboard][device:iphone][user:john] #ideas ~work
```

This metadata appears in note frontmatter:
```yaml
---
source_shortcut: clipboard
source_device: iphone
source_user: john
tags:
  - ideas
scope: work
---
```

---

## Quick Reference

| Action | macOS | iOS |
|--------|-------|-----|
| Clipboard → PAI | `clip2pai` alias | "PAI Clipboard" shortcut |
| Files → PAI | Finder Quick Action | Share Sheet |
| Screenshot → PAI | Custom script | Share Sheet |
| Voice → PAI | Telegram app | Telegram app / Shortcut |
| URL → PAI | Browser bookmarklet | Share Sheet |

---

## Telegram App (Fastest)

For quick captures, the Telegram app itself is often fastest:

1. Open Telegram
2. Go to your PAI channel
3. Send: voice memo, photo, file, or text
4. Add caption with tags: `#meeting ~work`

The ingest daemon handles the rest.
