# PAI iOS Shortcuts

iOS Shortcuts for capturing content to your PAI system via Telegram.

## Templates

| Shortcut | Installs As | Purpose |
|----------|-------------|---------|
| `clipboard-capture.json` | "PAI Clipboard Capture" | Capture clipboard content (text, rich text → HTML) |
| `file-capture.json` | "PAI File Capture" | Share files directly to PAI |

## Setup

### 1. Configure Telegram Bot

Create a Telegram bot and channel for ingestion:

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Save the bot token (format: `123456789:ABCdefGHI...`)
4. Create a private channel for captures
5. Add your bot as admin to the channel
6. Get channel ID (send a message, then check `https://api.telegram.org/bot<TOKEN>/getUpdates`)

### 2. Set Environment Variables

Add to `~/.claude/.env` (same file used by PAI ingest):

```bash
# Bot for sending from iOS shortcuts (can be same as BOT_TOKEN or separate)
TELEGRAM_SENDER_BOT_TOKEN=your_send_bot_token_here

# Channel to send captures to
TELEGRAM_CHANNEL_ID=your_channel_id_here

# Optional: your name for metadata tagging
PAI_USERNAME=your_name
```

The setup script checks these locations in order:
1. `~/.claude/.env` (recommended - shared with PAI)
2. `shortcuts/.env` (local override)
3. `~/.config/fabric/.env` (legacy)

### 3. Generate Personal Shortcuts

Run the setup script to inject your credentials:

```bash
cd shortcuts
./setup.sh
```

This creates personalized `.shortcut` files in `build/` from the templates.

### 4. Install Shortcuts

**Option A: AirDrop**
- AirDrop the `.shortcut` files from `build/` to your iOS device

**Option B: iCloud Drive**
- Copy files to iCloud Drive, open from Files app on iOS

**Option C: Double-click (Mac)**
- Double-click `.shortcut` files to import directly

## Directory Structure

```
shortcuts/
├── README.md           # This file
├── setup.sh            # Credential injection script
├── .gitignore          # Ignores build/ and .env
├── templates/          # Sanitized templates (committed)
│   ├── clipboard-capture.json
│   └── file-capture.json
└── build/              # Personal shortcuts (gitignored)
    ├── clipboard-capture.shortcut
    └── file-capture.shortcut
```

## How the Shortcuts Work

### Clipboard → PAI

1. Triggered via Share Sheet or Quick Action
2. Asks for optional caption
3. Converts clipboard to HTML (preserves formatting)
4. Sends to Telegram channel with metadata:
   ```
   [source:clipboard][device:iPhone][user:yourname]
   Your caption here
   ```

### File → PAI

1. Triggered via Share Sheet (select files)
2. Asks for optional caption
3. Loops through selected files
4. Sends each to Telegram channel with metadata

## Integration with PAI Ingest

The `ingest` daemon monitors your Telegram channel and automatically:
- Downloads attachments
- Extracts text/metadata
- Creates Obsidian notes with frontmatter
- Applies tag taxonomy rules

See `bin/ingest/` for the ingestion pipeline.
